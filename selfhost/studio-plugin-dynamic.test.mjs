import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {createStudioServer} from './server.mjs';
import {createInvite} from './store.mjs';
import {publicAddress,isMetadataClientId,fetchClientMetadata,createPluginAuth} from './studio-plugin-auth.mjs';

const redirectUri='http://127.0.0.1:44977/callback';
const metadataUrl='https://client.fixture.example/oauth/client.json';
/** In-memory OAuthClientProvider as an MCP host (Claude, Gemini CLI, ...) implements it. */
class MemoryProvider{
 constructor(clientMetadataUrl){this.saved={};this.clientMetadataUrl=clientMetadataUrl;}
 get redirectUrl(){return redirectUri;}
 get clientMetadata(){return {client_name:'Fremder MCP-Client',redirect_uris:[redirectUri],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'none'};}
 clientInformation(){return this.saved.client;} saveClientInformation(value){this.saved.client=value;}
 tokens(){return this.saved.tokens;} saveTokens(value){this.saved.tokens=value;}
 redirectToAuthorization(url){this.authorizationUrl=url;}
 saveCodeVerifier(value){this.saved.verifier=value;} codeVerifier(){return this.saved.verifier;}
}

test('official MCP SDK client connects through dynamic registration and through a client metadata document',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-oauth-dynamic-')),origin='http://127.0.0.1:44976',resource=origin+'/mcp';
 const documents=new Map([[metadataUrl,{client_id:metadataUrl,client_name:'Beispiel-Assistent',redirect_uris:[redirectUri],token_endpoint_auth_method:'none'}],
  // Shape of ChatGPT's published document (29.10.2026): prefers private_key_jwt, also supports none.
  ['https://chatgpt.fixture.example/oauth/client.json',{client_id:'https://chatgpt.fixture.example/oauth/client.json',client_name:'ChatGPT',redirect_uris:[redirectUri],token_endpoint_auth_method:'private_key_jwt',token_endpoint_auth_methods_supported:['none','private_key_jwt'],grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_signing_alg:'RS256',jwks_uri:'https://chatgpt.fixture.example/oauth/jwks.json'}],
  ['https://client.fixture.example/oauth/jwt-only.json',{client_id:'https://client.fixture.example/oauth/jwt-only.json',redirect_uris:[redirectUri],token_endpoint_auth_method:'private_key_jwt',token_endpoint_auth_methods_supported:['private_key_jwt']}],
  ['https://client.fixture.example/oauth/wrong.json',{client_id:'https://other.example/x',redirect_uris:[redirectUri]}],
  ['https://client.fixture.example/oauth/wildcard.json',{client_id:'https://client.fixture.example/oauth/wildcard.json',redirect_uris:['https://*.example/cb']}]]);
 let fetches=0;
 documents.set('https://evil.fixture.example/oauth/client.json',{client_id:'https://evil.fixture.example/oauth/client.json',redirect_uris:['https://evil.fixture.example/cb']});
 documents.set('https://client.fixture.example/oauth/foreign-redirect.json',{client_id:'https://client.fixture.example/oauth/foreign-redirect.json',redirect_uris:['https://evil.fixture.example/cb']});
 const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44978',seedProjects:true,resetMailer:null,pluginDynamicClients:true,
  pluginClientHosts:['client.fixture.example','chatgpt.fixture.example','claude.ai'],
  pluginClients:[{id:'trusted-client',name:'Hinterlegter Client',redirectUris:[redirectUri]}],
  pluginFetchMetadata:async url=>{fetches++;if(!documents.has(url))throw new Error('unreachable');return documents.get(url);}});
 await new Promise(r=>app.server.listen(44976,'127.0.0.1',r));
 const clients=[];
 t.after(async()=>{for(const c of clients)await c.close().catch(()=>{});await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const request=async(route,value,cookie)=>{const r=await fetch(origin+route,{method:value?'POST':'GET',headers:{...(value?{'Content-Type':'application/json',Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},body:value?JSON.stringify(value):undefined});return {status:r.status,data:await r.json().catch(()=>null),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 const marco=(await request('/api/auth/register',{invite:createInvite(app.db,'marco@dynamic.fixture.invalid','owner'),name:'Marco',password:'synthetic-personal-password-2026'})).cookie;

 const discovery=(await request('/.well-known/oauth-authorization-server')).data;
 assert.equal(discovery.registration_endpoint,origin+'/oauth/register');assert.equal(discovery.client_id_metadata_document_supported,true);

 async function connectWith(provider,expectWarning){
  const first=new StreamableHTTPClientTransport(new URL(resource),{authProvider:provider});
  await assert.rejects(new Client({name:'sdk-client',version:'1.0.0'}).connect(first),/Unauthorized/i);
  assert.ok(provider.authorizationUrl,'The SDK asks the person to authorize in the browser');
  const params=Object.fromEntries(provider.authorizationUrl.searchParams);
  assert.equal(params.resource,resource);assert.equal(params.code_challenge_method,'S256');
  const page=await (await fetch(provider.authorizationUrl,{headers:{Cookie:marco}})).text();
  assert.equal(/Nicht von SCHMAQQ hinterlegt/.test(page),expectWarning);assert.match(page,/127\.0\.0\.1:44977/);
  const consent=await request('/api/plugin/consent',{params,approve:true},marco);assert.equal(consent.status,200,JSON.stringify(consent.data));
  await first.finishAuth(new URL(consent.data.redirect).searchParams.get('code'));
  const client=new Client({name:'sdk-client',version:'1.0.0'});clients.push(client);
  await client.connect(new StreamableHTTPClientTransport(new URL(resource),{authProvider:provider}));
  return client;
 }

 // Dynamic client registration (RFC 7591), as Claude and Gemini CLI use it.
 const registered=new MemoryProvider();
 const dcr=await connectWith(registered,true);
 assert.match(registered.saved.client.client_id,/^dyn_/);
 const tools=(await dcr.listTools()).tools.map(tool=>tool.name);
 assert.ok(tools.includes('list_executors')&&tools.includes('list_workspaces')&&tools.includes('start_code_job'));
 const copies=await dcr.callTool({name:'list_workspaces',arguments:{project:'website'}});
 assert.equal(copies.isError,undefined,JSON.stringify(copies));assert.deepEqual(JSON.parse(copies.content[0].text).workspaces,[]);
 const executors=await dcr.callTool({name:'list_executors',arguments:{project:'website'}});
 assert.equal(executors.isError,undefined,JSON.stringify(executors));assert.equal(JSON.parse(executors.content[0].text).mode,'auto');
 const placed=await dcr.callTool({name:'start_code_job',arguments:{requestId:'auto-without-executor',device:'auto',project:'website',operation:'inspect'}});
 assert.equal(placed.isError,true);assert.match(placed.content[0].text,/409/,'auto placement reports that no executor is set up');
 // A task is found by its title, and its context carries the complete stored completion criteria.
 const criteria=('Fundstellen mit Datei und Zeile; Hypothesen getrennt von Nachweisen. '+'Detail. '.repeat(400)).slice(0,4000).trim();
 const created=await request('/api/room',{action:'task',id:'analysis-task',project:'website',title:'Klimafinder Hauptseite analysieren',description:'Nur lesen. '.repeat(180).trim(),kind:'general',criteria:criteria.slice(0,4000)},marco);assert.equal(created.status,200,JSON.stringify(created.data));
 for(let i=0;i<30;i++)await request('/api/room',{action:'message',id:'filler-'+i,project:'website',body:'Lange Raumnachricht '.repeat(12)},marco);
 const found=JSON.parse((await dcr.callTool({name:'list_tasks',arguments:{project:'website',query:'hauptseite'}})).content[0].text);
 assert.deepEqual(found.tasks.map(t=>[t.title,t.kind,t.status]),[['Klimafinder Hauptseite analysieren','general','todo']]);assert.equal(found.complete,true);
 assert.deepEqual(JSON.parse((await dcr.callTool({name:'list_tasks',arguments:{project:'website',query:'gibt es nicht'}})).content[0].text).tasks,[]);
 const context=JSON.parse((await dcr.callTool({name:'project_context',arguments:{project:'website',task:found.tasks[0].id}})).content[0].text);
 assert.equal(context.taskContract.criteria,criteria.slice(0,4000));assert.equal(context.taskContract.kind,'general');assert.equal(context.taskContract.revision,0);
 assert.ok(context.text.includes(criteria.slice(0,4000)),'Criteria are never cut from the text');assert.ok(context.text.length<=8000);assert.equal(context.truncated,true);
 assert.match((await dcr.callTool({name:'list_tasks',arguments:{project:'missing-project'}})).content[0].text,/404/);
 assert.match((await dcr.callTool({name:'project_context',arguments:{project:'website',task:'missing-task'}})).content[0].text,/400/);

 // Client ID metadata document (URL as client_id).
 const byDocument=new MemoryProvider(metadataUrl);
 const cimd=await connectWith(byDocument,true);
 assert.equal(byDocument.saved.client.client_id,metadataUrl);assert.equal(fetches,1);
 // A ChatGPT-shaped document that prefers private_key_jwt but also lists none is accepted.
 const chatgpt=new MemoryProvider('https://chatgpt.fixture.example/oauth/client.json');
 await connectWith(chatgpt,true);assert.equal(chatgpt.saved.client.client_id,'https://chatgpt.fixture.example/oauth/client.json');
 assert.equal((await cimd.callTool({name:'list_projects',arguments:{}})).isError,undefined);
 const grants=(await request('/api/plugin/grants',null,marco)).data.grants;
 assert.ok(grants.some(g=>g.clientName==='Beispiel-Assistent'));assert.ok(grants.some(g=>g.clientName==='Fremder MCP-Client'));

 // Narrowing the trusted hosts ends existing connections of clients outside the list.
 const narrowed=createPluginAuth({db:app.db,issuer:origin,clients:[],dynamic:true,clientHosts:['claude.ai']});
 assert.equal(narrowed.resolve(byDocument.saved.tokens.access_token),null);
 assert.ok(createPluginAuth({db:app.db,issuer:origin,clients:[],dynamic:true,clientHosts:['client.fixture.example']}).resolve(byDocument.saved.tokens.access_token));
 // Revocation applies to dynamic clients exactly as to configured ones.
 for(const grant of grants)assert.equal((await request('/api/plugin/revoke',{grantId:grant.id},marco)).status,200);
 const revoked=await fetch(resource,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+byDocument.saved.tokens.access_token},body:'{}'});assert.equal(revoked.status,401);

 // Rejected metadata documents and registrations.
 const base={response_type:'code',redirect_uri:redirectUri,state:'s',code_challenge:'a'.repeat(43),code_challenge_method:'S256',resource};
 for(const client_id of ['https://evil.fixture.example/oauth/client.json','https://client.fixture.example/oauth/foreign-redirect.json','https://client.fixture.example/oauth/jwt-only.json','https://client.fixture.example/oauth/wrong.json','https://client.fixture.example/oauth/wildcard.json','https://client.fixture.example/oauth/missing.json','http://client.fixture.example/oauth/client.json'])
  assert.equal((await fetch(origin+'/oauth/authorize?'+new URLSearchParams({...base,client_id}),{headers:{Cookie:marco}})).status,400,client_id);
 const trustedPage=await (await fetch(origin+'/oauth/authorize?'+new URLSearchParams({...base,client_id:'trusted-client'}),{headers:{Cookie:marco}})).text();
 assert.doesNotMatch(trustedPage,/Nicht von SCHMAQQ hinterlegt/);
 const register=body=>fetch(origin+'/oauth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 for(const redirect_uris of [['https://evil.example/cb'],['https://claude.ai.evil.example/cb'],['http://evil.example/cb'],['https://evil.example/cb#x'],['https://*.example/cb'],[]])assert.equal((await register({redirect_uris})).status,400,JSON.stringify(redirect_uris));
 assert.equal((await register({redirect_uris:[redirectUri],token_endpoint_auth_method:'client_secret_basic'})).status,400);
 assert.equal((await register({redirect_uris:[redirectUri],grant_types:['client_credentials']})).status,400);
 let limited=0;for(let i=0;i<32;i++)if((await register({redirect_uris:['https://claude.ai/api/mcp/auth_callback'],client_name:'Claude'})).status===429)limited++;
 assert.ok(limited>=1,'Registration is rate limited');
 const wrongClient=await fetch(origin+'/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:'dyn_unknown',redirect_uri:redirectUri,code:'a'.repeat(43),code_verifier:'b'.repeat(43)})});
 assert.equal(wrongClient.status,400);
});

test('dynamic clients stay disabled unless explicitly enabled',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'studio-oauth-static-')),origin='http://127.0.0.1:44979';
 const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:44980',resetMailer:null,pluginClients:[{id:'only',name:'Only',redirectUris:[redirectUri]}]});
 await new Promise(r=>app.server.listen(44979,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const meta=await (await fetch(origin+'/.well-known/oauth-authorization-server')).json();
 assert.equal(meta.registration_endpoint,undefined);assert.equal(meta.client_id_metadata_document_supported,undefined);
 assert.equal((await fetch(origin+'/oauth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({redirect_uris:[redirectUri]})})).status,404);
 assert.equal((await fetch(origin+'/oauth/authorize?'+new URLSearchParams({client_id:metadataUrl,response_type:'code',redirect_uri:redirectUri,state:'s',code_challenge:'a'.repeat(43),code_challenge_method:'S256'}))).status,400);
});

test('client metadata fetches only reach public HTTPS addresses',async()=>{
 for(const address of ['127.0.0.1','10.1.2.3','172.20.0.1','192.168.1.1','169.254.169.254','100.64.0.1','0.0.0.0','::1','::','fd00::1','fe80::1','::ffff:192.168.1.1','::ffff:127.0.0.1'])assert.equal(publicAddress(address),false,address);
 for(const address of ['8.8.8.8','1.1.1.1','2606:4700:4700::1111'])assert.equal(publicAddress(address),true,address);
 for(const id of [metadataUrl,'https://claude.ai/oauth/claude-code-client-metadata'])assert.equal(isMetadataClientId(id),true,id);
 for(const id of ['https://example.com','https://example.com/','http://example.com/x','https://example.com/x?y=1','https://example.com/x#f','https://u:p@example.com/x','https://example.com:8443/x','dyn_abc'])assert.equal(isMetadataClientId(id),false,id);
 await assert.rejects(fetchClientMetadata('https://localhost/client.json',{timeout:2000}),/not public|ENOTFOUND|EAI_AGAIN/);
});
