import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';

test('real personal consent -> PKCE exchange -> official MCP client, scopes, refresh, revocation and unchanged device rights',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-oauth-http-')),origin='http://127.0.0.1:44972';
 const clientId='local-client',redirectUri='http://127.0.0.1:44973/callback';
 const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,seedProjects:true,resetMailer:null,pluginClients:[{id:clientId,name:'Personal test client',redirectUris:[redirectUri]}]});
 const clients=[];
 await new Promise(r=>app.server.listen(44972,'127.0.0.1',r));
 t.after(async()=>{for(const c of clients)await c.close();await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 async function request(route,value,cookie){
  const r=await fetch(origin+route,{method:value?'POST':'GET',headers:{...(value?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},body:value?JSON.stringify(value):undefined});
  return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
 const people=[];
 for(const name of ['Marco','Markus']){
  const res=await request('/api/auth/register',{invite:createInvite(app.db,name+'@oauth.fixture.invalid',people.length?'member':'owner'),name,password:'synthetic-personal-password-2026'});assert.equal(res.status,200);people.push(res.cookie);
 }
 const [marco,markus]=people;
 const resource=origin+'/mcp';
 const meta=await request('/.well-known/oauth-protected-resource');assert.equal(meta.data.resource,resource);
 const discovery=await request('/.well-known/oauth-authorization-server');assert.equal(discovery.data.issuer,origin);assert.ok(discovery.data.code_challenge_methods_supported.includes('S256'));
 const missing=await fetch(resource,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(missing.status,401);assert.match(missing.headers.get('www-authenticate'),/resource_metadata/);
 const verifier='p'.repeat(64),challenge=createHash('sha256').update(verifier).digest('base64url');
 const form=async values=>{const r=await fetch(origin+'/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(values)});return {status:r.status,data:await r.json()};};
 async function authorize(cookie,scope){
  const params={client_id:clientId,redirect_uri:redirectUri,response_type:'code',scope,state:'state-to-return',code_challenge:challenge,code_challenge_method:'S256',resource};
  const page=await fetch(origin+'/oauth/authorize?'+new URLSearchParams(params),{headers:{Cookie:cookie}});assert.equal(page.status,200);assert.match(await page.text(),/Verbindung erlauben/);assert.match(page.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  const anonymous=await request('/api/plugin/consent',{params,approve:true});assert.equal(anonymous.status,401);
  const consent=await request('/api/plugin/consent',{params,approve:true},cookie);assert.equal(consent.status,200,JSON.stringify(consent.data));
  const callback=new URL(consent.data.redirect);assert.equal(callback.searchParams.get('state'),params.state);assert.equal(callback.searchParams.get('iss'),origin);
  const code=callback.searchParams.get('code');
  const result=await form({grant_type:'authorization_code',client_id:clientId,redirect_uri:redirectUri,code,code_verifier:verifier,resource});assert.equal(result.status,200,JSON.stringify(result.data));
  assert.equal((await form({grant_type:'authorization_code',client_id:clientId,redirect_uri:redirectUri,code,code_verifier:verifier,resource})).status,400,'authorization code cannot be reused');
  return result.data;
 }
 async function connect(token){
  const client=new Client({name:'real-local-sdk-client',version:'0.1.0'});
  await client.connect(new StreamableHTTPClientTransport(new URL(resource),{requestInit:{headers:{Authorization:'Bearer '+token}}}));clients.push(client);return client;
 }
 const readToken=await authorize(marco,'studio:read'),read=await connect(readToken.access_token);
 assert.ok(!(await read.listTools()).tools.some(tool=>tool.name==='start_code_job'));
 const denied=await read.callTool({name:'start_code_job',arguments:{requestId:'forbidden',device:'unknown',project:'website',operation:'prepare'}});assert.equal(denied.isError,true);assert.equal(app.db.prepare('SELECT count(*) AS n FROM jobs').get().n,0);
 const codeToken=await authorize(marco,'studio:read studio:code'),codeClient=await connect(codeToken.access_token);
 const own=(await request('/api/development',{action:'device',name:'Own isolated worker'},marco)).data;
 const args={requestId:'one-real-job',device:own.id,project:'website',operation:'inspect'};
 const queued=await codeClient.callTool({name:'start_code_job',arguments:args});assert.equal(queued.isError,undefined,JSON.stringify(queued));
 const jobId=JSON.parse(queued.content[0].text).id;
 const refreshed=await form({grant_type:'refresh_token',refresh_token:codeToken.refresh_token,client_id:clientId,resource});assert.equal(refreshed.status,200);
 const afterRefresh=await connect(refreshed.data.access_token);
 const repeated=await afterRefresh.callTool({name:'start_code_job',arguments:args});assert.equal(JSON.parse(repeated.content[0].text).id,jobId);assert.equal(app.db.prepare('SELECT count(*) AS n FROM jobs').get().n,1);
 const otherToken=await authorize(markus,'studio:read studio:code'),other=await connect(otherToken.access_token);
 const foreign=await other.callTool({name:'start_code_job',arguments:{...args,requestId:'foreign'}});assert.equal(foreign.isError,true);assert.match(foreign.content[0].text,/403/);
 const fakeHeader=await fetch(origin+'/api/development',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'X-Studio-Member':'marco',Authorization:'Bearer '+refreshed.data.access_token},body:JSON.stringify({action:'job',...args})});assert.equal(fakeHeader.status,401,'plugin token cannot impersonate cookie API directly');
 const grants=await request('/api/plugin/grants',null,marco);assert.equal(grants.status,200);assert.ok(!JSON.stringify(grants.data).includes(codeToken.access_token));
 for(const grant of grants.data.grants)assert.equal((await request('/api/plugin/revoke',{grantId:grant.id??grant.grantId},marco)).status,200);
 const revoked=await fetch(resource,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+refreshed.data.access_token},body:'{}'});assert.equal(revoked.status,401);
});
