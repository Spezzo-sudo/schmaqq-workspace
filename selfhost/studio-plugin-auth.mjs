import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';

const hash=value=>createHash('sha256').update(value).digest('hex');
const random=()=>randomBytes(32).toString('base64url');
const fail=(error='invalid_request',status=400)=>Object.assign(new Error(error),{error,oauthError:error,status});
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const safeUrl=value=>{
 try{const u=new URL(value);if(u.username||u.password||u.hash||!(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)))throw Error();return u;}catch{throw fail();}
};
const scopesSupported=['studio:read','studio:code'];

/** OAuth grant core. Only the trusted host calls authorize after authenticated
 * consent. Clients and redirect URIs are operator-configured, never registered
 * from tool arguments. Plain credentials are returned once, stored only hashed.
 */
export function createPluginAuth({db,issuer,clients,now=Date.now}={}){
 const origin=safeUrl(issuer);
 if(origin.origin!==issuer||origin.pathname!=='/'||origin.search)throw new Error('Plugin issuer must be a canonical HTTPS or loopback origin.');
 if(!Array.isArray(clients)||clients.length>30)throw new Error('Plugin clients must be explicitly configured.');
 const configured=new Map();
 for(const client of clients){
  if(!client||typeof client.id!=='string'||!/^[\w.-]{1,160}$/.test(client.id)||configured.has(client.id)||typeof client.name!=='string'||!client.name.trim()||client.name.length>160||!Array.isArray(client.redirectUris)||!client.redirectUris.length||client.redirectUris.length>10)throw new Error('Invalid plugin client configuration.');
  for(const uri of client.redirectUris){const parsed=safeUrl(uri);if(parsed.href!==uri||uri.includes('*'))throw new Error('Plugin redirect must be exact HTTPS or loopback URI.');}
  configured.set(client.id,{id:client.id,name:client.name,redirectUris:[...client.redirectUris]});
 }
 const resource=issuer+'/mcp';
 db.exec(`CREATE TABLE IF NOT EXISTS plugin_grants(
 id TEXT PRIMARY KEY,member TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
 client TEXT NOT NULL,resource TEXT NOT NULL,scopes TEXT NOT NULL,created INTEGER NOT NULL,
 expires INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS plugin_codes(
 hash TEXT PRIMARY KEY,grant_id TEXT NOT NULL REFERENCES plugin_grants(id) ON DELETE CASCADE,
 redirect TEXT NOT NULL,challenge TEXT NOT NULL,expires INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0,failures INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS plugin_access_tokens(
 hash TEXT PRIMARY KEY,grant_id TEXT NOT NULL REFERENCES plugin_grants(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS plugin_refresh_tokens(
 hash TEXT PRIMARY KEY,grant_id TEXT NOT NULL REFERENCES plugin_grants(id) ON DELETE CASCADE,
 expires INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS plugin_grants_member ON plugin_grants(member);
 CREATE INDEX IF NOT EXISTS plugin_access_grant ON plugin_access_tokens(grant_id);
 CREATE INDEX IF NOT EXISTS plugin_refresh_grant ON plugin_refresh_tokens(grant_id);`);
 const read=(params,key)=>{
  const values=params instanceof URLSearchParams?params.getAll(key):[params?.[key]].filter(v=>v!==undefined);
  if(values.length!==1||typeof values[0]!=='string'||values[0].length>2048)throw fail();
  return values[0];
 };
 const active=id=>db.prepare('SELECT g.* FROM plugin_grants g JOIN members m ON m.id=g.member WHERE g.id=? AND g.revoked=0 AND g.expires>?').get(id,now());
 function validateAuthorization(params){
  if(read(params,'response_type')!=='code')throw fail('unsupported_response_type');
  const client=configured.get(read(params,'client_id'));if(!client)throw fail('invalid_client');
  const redirectUri=read(params,'redirect_uri');if(!client.redirectUris.includes(redirectUri))throw fail();
  if(read(params,'resource')!==resource||read(params,'code_challenge_method')!=='S256')throw fail();
  const challenge=read(params,'code_challenge');if(!/^[A-Za-z0-9_-]{43}$/.test(challenge))throw fail();
  const state=read(params,'state');if(!state||state.length>512||/[\x00-\x1f\x7f]/.test(state))throw fail();
  const scopes=read(params,'scope').split(' ');
  if(!scopes.includes('studio:read')||scopes.some(s=>!scopesSupported.includes(s))||new Set(scopes).size!==scopes.length)throw fail('invalid_scope');
  return {clientId:client.id,clientName:client.name,redirectUri,state,challenge,resource,scopes:scopesSupported.filter(s=>scopes.includes(s))};
 }
 function atomic(fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
 function authorize(request,memberId){
  const checked=validateAuthorization({response_type:'code',client_id:request?.clientId,redirect_uri:request?.redirectUri,state:request?.state,code_challenge:request?.challenge,code_challenge_method:'S256',resource:request?.resource,scope:Array.isArray(request?.scopes)?request.scopes.join(' '):undefined});
  if(typeof memberId!=='string'||!db.prepare('SELECT id FROM members WHERE id=?').get(memberId))throw fail('access_denied',403);
  const code=random(),grantId=randomUUID(),time=now();
  atomic(()=>{
   db.prepare('DELETE FROM plugin_grants WHERE expires<=?').run(time-86400000);
   if(db.prepare('SELECT count(*) AS n FROM plugin_grants WHERE member=? AND expires>?').get(memberId,time).n>=100)throw fail('temporarily_unavailable',429);
   db.prepare('INSERT INTO plugin_grants VALUES(?,?,?,?,?,?,?,0)').run(grantId,memberId,checked.clientId,resource,JSON.stringify(checked.scopes),time,time+30*86400000);
   db.prepare('INSERT INTO plugin_codes VALUES(?,?,?,?,?,0,0)').run(hash(code),grantId,checked.redirectUri,checked.challenge,time+300000);
  });
  return {code,state:checked.state,iss:issuer,redirectUri:checked.redirectUri};
 }
 function issue(grant){
  if(db.prepare('SELECT count(*) AS n FROM plugin_refresh_tokens WHERE grant_id=?').get(grant.id).n>=1000)throw fail('temporarily_unavailable',429);
  const accessToken=random(),refreshToken=random(),time=now(),accessExpiry=Math.min(time+3600000,grant.expires);
  db.prepare('INSERT INTO plugin_access_tokens VALUES(?,?,?)').run(hash(accessToken),grant.id,accessExpiry);
  db.prepare('INSERT INTO plugin_refresh_tokens VALUES(?,?,?,0)').run(hash(refreshToken),grant.id,grant.expires);
  return {access_token:accessToken,token_type:'Bearer',expires_in:Math.floor((accessExpiry-time)/1000),refresh_token:refreshToken,scope:JSON.parse(grant.scopes).join(' ')};
 }
 function exchange(params){
  const type=read(params,'grant_type'),clientId=read(params,'client_id');
  if(!configured.has(clientId))throw fail('invalid_client');
  if(read(params,'resource')!==resource)throw fail('invalid_target');
  if(type==='authorization_code'){
   const code=read(params,'code'),redirect=read(params,'redirect_uri'),verifier=read(params,'code_verifier');
   if(!configured.get(clientId).redirectUris.includes(redirect))throw fail('invalid_grant');
   if(!/^[A-Za-z0-9_-]{43}$/.test(code)||!/^[-A-Za-z0-9._~]{43,128}$/.test(verifier))throw fail('invalid_grant');
   // All invalid checks complete before token issuance. Persist a failed PKCE
   // attempt to bound online guesses without exposing which check failed.
   const row=db.prepare('SELECT c.*,g.client FROM plugin_codes c JOIN plugin_grants g ON g.id=c.grant_id WHERE c.hash=?').get(hash(code));
   if(!row||row.client!==clientId||row.redirect!==redirect||row.expires<=now()||row.used||row.failures>=5)throw fail('invalid_grant');
   const challenge=createHash('sha256').update(verifier).digest('base64url');
   if(!equal(challenge,row.challenge)){db.prepare('UPDATE plugin_codes SET failures=failures+1 WHERE hash=?').run(hash(code));throw fail('invalid_grant');}
   return atomic(()=>{
    const fresh=db.prepare('SELECT used,failures FROM plugin_codes WHERE hash=?').get(hash(code));
    const grant=active(row.grant_id);if(!grant||grant.resource!==resource||fresh.used||fresh.failures>=5)throw fail('invalid_grant');
    db.prepare('UPDATE plugin_codes SET used=1 WHERE hash=?').run(hash(code));return issue(grant);
   });
  }
  if(type==='refresh_token'){
   const value=read(params,'refresh_token');if(!/^[A-Za-z0-9_-]{43}$/.test(value))throw fail('invalid_grant');
   // Commit revocation before reporting replay: throwing inside the transaction
   // would otherwise roll back the security decision.
   const result=atomic(()=>{
    const row=db.prepare('SELECT r.*,g.client FROM plugin_refresh_tokens r JOIN plugin_grants g ON g.id=r.grant_id WHERE r.hash=?').get(hash(value));
    if(!row||row.client!==clientId||row.expires<=now())return null;
    if(row.used){db.prepare('UPDATE plugin_grants SET revoked=1 WHERE id=?').run(row.grant_id);return null;}
    const grant=active(row.grant_id);if(!grant||grant.resource!==resource)return null;
    const requested=params instanceof URLSearchParams?params.getAll('scope'):(params?.scope===undefined?[]:[params.scope]);
    if(requested.length>1||requested.length&&(!(typeof requested[0]==='string')||requested[0].split(' ').some(scope=>!JSON.parse(grant.scopes).includes(scope))))throw fail('invalid_scope');
    db.prepare('UPDATE plugin_refresh_tokens SET used=1 WHERE hash=?').run(hash(value));
    db.prepare('DELETE FROM plugin_access_tokens WHERE grant_id=?').run(grant.id);
    return issue(grant);
   });
   if(!result)throw fail('invalid_grant');return result;
  }
  throw fail('unsupported_grant_type');
 }
 function resolve(accessToken){
  if(typeof accessToken!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(accessToken))return null;
  const row=db.prepare('SELECT t.expires AS access_expires,g.* FROM plugin_access_tokens t JOIN plugin_grants g ON g.id=t.grant_id JOIN members m ON m.id=g.member WHERE t.hash=? AND t.expires>? AND g.expires>? AND g.revoked=0').get(hash(accessToken),now(),now());
  if(!row||row.resource!==resource||!configured.has(row.client))return null;
  return {memberId:row.member,grantId:row.id,scopes:JSON.parse(row.scopes),resource:row.resource,expires:row.access_expires};
 }
 function revoke(grantId,memberId){
  if(!db.prepare('UPDATE plugin_grants SET revoked=1 WHERE id=? AND member=?').run(grantId,memberId).changes)throw fail('access_denied',403);
  return {ok:true};
 }
 function listGrants(memberId){return db.prepare('SELECT id,client,scopes,created,expires,revoked FROM plugin_grants WHERE member=? ORDER BY created DESC,id').all(memberId).map(g=>({...g,grantId:g.id,clientName:configured.get(g.client)?.name??g.client,scopes:JSON.parse(g.scopes)}));}
 return {
  validateAuthorization,authorize,exchange,resolve,revoke,listGrants,
  metadata:()=>({issuer,authorization_endpoint:issuer+'/oauth/authorize',token_endpoint:issuer+'/oauth/token',authorization_response_iss_parameter_supported:true,token_endpoint_auth_methods_supported:['none'],response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],code_challenge_methods_supported:['S256'],scopes_supported:[...scopesSupported]}),
  resourceMetadata:()=>({resource,authorization_servers:[issuer],scopes_supported:[...scopesSupported]})
 };
}
