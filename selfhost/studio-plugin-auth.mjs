import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';

const hash=value=>createHash('sha256').update(value).digest('hex');
const random=()=>randomBytes(32).toString('base64url');
const fail=(error='invalid_request',status=400)=>Object.assign(new Error(error),{error,oauthError:error,status});
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
const safeUrl=value=>{
 try{const u=new URL(value);if(u.username||u.password||u.hash||!(u.protocol==='https:'||u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname)))throw Error();return u;}catch{throw fail();}
};
const scopesSupported=['studio:read','studio:code'];
const exactRedirect=uri=>{if(typeof uri!=='string'||uri.length>500||uri.includes('*'))return false;try{return safeUrl(uri).href===uri;}catch{return false;}};

/** A CIMD client_id: an HTTPS URL with a path, without fragment, query,
 * credentials or dot segments (draft-ietf-oauth-client-id-metadata-document). */
export function isMetadataClientId(value){
 if(typeof value!=='string'||value.length>500||!value.startsWith('https://'))return false;
 try{const u=new URL(value);return u.href===value&&u.pathname.length>1&&!u.search&&!u.hash&&!u.username&&!u.password&&!u.port&&!u.pathname.split('/').some(s=>s==='.'||s==='..');}catch{return false;}
}
/** Only globally routable addresses may be fetched for client metadata. */
export function publicAddress(address){
 if(net.isIPv4(address)){
  const [a,b]=address.split('.').map(Number);
  return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===192&&b===0||a===198&&(b===18||b===19));
 }
 if(!net.isIPv6(address))return false;
 const v=address.toLowerCase();
 if(v.startsWith('::ffff:'))return publicAddress(v.slice(7));
 return !(v==='::'||v==='::1'||/^f[cd]/.test(v)||/^fe[89ab]/.test(v)||v.startsWith('ff')||v.startsWith('2001:db8')||v.startsWith('64:ff9b'));
}
/** Fetch a client metadata document: HTTPS only, public addresses only (the
 * check runs in the socket lookup, so DNS rebinding cannot swap in a private
 * address), no redirects, 5 s and 16 KiB limits. */
export function fetchClientMetadata(url,{timeout=5000,limit=16384}={}){
 return new Promise((resolve,reject)=>{
  const lookup=(host,options,callback)=>dns.lookup(host,{all:true},(error,addresses)=>{
   if(error)return callback(error);
   if(!addresses.length||!addresses.every(a=>publicAddress(a.address)))return callback(new Error('Client metadata host is not public.'));
   if(options?.all)callback(null,addresses);else callback(null,addresses[0].address,addresses[0].family);
  });
  const req=https.get(url,{lookup,timeout,headers:{Accept:'application/json'}},res=>{
   if(res.statusCode!==200){res.resume();return reject(new Error('Client metadata unavailable.'));}
   let size=0;const parts=[];
   res.on('data',chunk=>{size+=chunk.length;if(size>limit){req.destroy();reject(new Error('Client metadata too large.'));}else parts.push(chunk);});
   res.on('end',()=>{try{resolve(JSON.parse(Buffer.concat(parts).toString('utf8')));}catch{reject(new Error('Client metadata is not JSON.'));}});
  });
  req.on('timeout',()=>req.destroy(new Error('Client metadata timeout.')));req.on('error',reject);
 });
}

/** OAuth grant core. Only the trusted host calls authorize after authenticated
 * consent. Operator-configured clients are trusted. With dynamic clients
 * enabled, clients may also register (RFC 7591) or identify themselves by a
 * metadata document URL; those stay untrusted and the consent page says so.
 * Plain credentials are returned once, stored only hashed.
 */
/** Hosts whose assistants may connect without operator configuration. Local
 * programs (Gemini CLI, Claude Code) use loopback redirects and are always allowed. */
export const defaultClientHosts=Object.freeze(['claude.ai','claude.com','chatgpt.com']);
export function createPluginAuth({db,issuer,clients,now=Date.now,dynamic=false,fetchMetadata=fetchClientMetadata,clientHosts=defaultClientHosts}={}){
 const hosts=new Set(clientHosts.map(h=>String(h).trim().toLowerCase()).filter(Boolean));
 const loopback=uri=>{const u=new URL(uri);return u.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(u.hostname);};
 // A self-identified client may only send codes back to its own trusted host or to this computer.
 const trustedRedirect=uri=>exactRedirect(uri)&&(loopback(uri)||hosts.has(new URL(uri).hostname));
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
 CREATE INDEX IF NOT EXISTS plugin_refresh_grant ON plugin_refresh_tokens(grant_id);
 CREATE TABLE IF NOT EXISTS plugin_clients(
 id TEXT PRIMARY KEY,name TEXT NOT NULL,redirect_uris TEXT NOT NULL,kind TEXT NOT NULL,created INTEGER NOT NULL,fetched INTEGER NOT NULL);`);
 function clientFor(id){
  if(configured.has(id))return {...configured.get(id),trusted:true,kind:'configured'};
  if(!dynamic||typeof id!=='string')return null;
  const row=db.prepare('SELECT * FROM plugin_clients WHERE id=?').get(id);
  if(!row)return null;
  const redirectUris=JSON.parse(row.redirect_uris);
  // Re-checked on every use, so narrowing the trusted hosts also ends existing connections.
  if(!redirectUris.every(trustedRedirect)||row.kind==='metadata'&&!hosts.has(new URL(row.id).hostname))return null;
  return {id:row.id,name:row.name,redirectUris,trusted:false,kind:row.kind};
 }
 /** Load or refresh a metadata-document client before authorization. */
 async function prepareClient(id){
  if(!dynamic||configured.has(id)||!isMetadataClientId(id)||!hosts.has(new URL(id).hostname))return;
  const row=db.prepare('SELECT fetched FROM plugin_clients WHERE id=?').get(id);
  if(row&&now()-row.fetched<3600000)return;
  let doc;try{doc=await fetchMetadata(id);}catch{throw fail('invalid_client');}
  const redirects=doc?.redirect_uris;
  // Studio's token endpoint only offers "none" (public client + PKCE). A client may
  // prefer another method (ChatGPT: private_key_jwt) as long as it also lists "none".
  const publicClient=doc?.token_endpoint_auth_method===undefined||doc.token_endpoint_auth_method==='none'||Array.isArray(doc.token_endpoint_auth_methods_supported)&&doc.token_endpoint_auth_methods_supported.includes('none');
  if(!doc||typeof doc!=='object'||doc.client_id!==id||!Array.isArray(redirects)||!redirects.length||redirects.length>10||!redirects.every(trustedRedirect)||!publicClient)throw fail('invalid_client');
  const name=typeof doc.client_name==='string'&&doc.client_name.trim()?doc.client_name.trim().slice(0,120):new URL(id).hostname;
  db.prepare("INSERT INTO plugin_clients VALUES(?,?,?,'metadata',?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,redirect_uris=excluded.redirect_uris,fetched=excluded.fetched").run(id,name,JSON.stringify(redirects),now(),now());
 }
 /** RFC 7591 registration for public clients. Bounded in rate and count;
  * unused registrations expire after seven days. */
 function register(body){
  if(!dynamic)throw fail('invalid_request',404);
  const value=body&&typeof body==='object'&&!Array.isArray(body)?body:{};
  const redirects=value.redirect_uris;
  if(!Array.isArray(redirects)||!redirects.length||redirects.length>5||!redirects.every(trustedRedirect))throw fail('invalid_redirect_uri');
  if(value.token_endpoint_auth_method!==undefined&&value.token_endpoint_auth_method!=='none')throw fail('invalid_client_metadata');
  const grants=value.grant_types??['authorization_code'],responses=value.response_types??['code'];
  if(!Array.isArray(grants)||!grants.length||grants.some(g=>!['authorization_code','refresh_token'].includes(g))||!Array.isArray(responses)||responses.some(r=>r!=='code'))throw fail('invalid_client_metadata');
  const name=typeof value.client_name==='string'&&value.client_name.trim()?value.client_name.trim().slice(0,120):'Unbenannte Anwendung';
  const time=now(),id='dyn_'+randomBytes(18).toString('base64url');
  atomic(()=>{
   db.prepare("DELETE FROM plugin_clients WHERE kind='registered' AND created<? AND id NOT IN (SELECT client FROM plugin_grants)").run(time-7*86400000);
   if(db.prepare("SELECT count(*) AS n FROM plugin_clients WHERE kind='registered' AND created>?").get(time-3600000).n>=30||db.prepare("SELECT count(*) AS n FROM plugin_clients WHERE kind='registered'").get().n>=500)throw fail('temporarily_unavailable',429);
   db.prepare("INSERT INTO plugin_clients VALUES(?,?,?,'registered',?,?)").run(id,name,JSON.stringify(redirects),time,time);
  });
  return {client_id:id,client_id_issued_at:Math.floor(time/1000),client_name:name,redirect_uris:[...redirects],token_endpoint_auth_method:'none',grant_types:grants,response_types:['code']};
 }
 const read=(params,key)=>{
  const values=params instanceof URLSearchParams?params.getAll(key):[params?.[key]].filter(v=>v!==undefined);
  if(values.length!==1||typeof values[0]!=='string'||values[0].length>2048)throw fail();
  return values[0];
 };
 const optional=(params,key,fallback)=>{
  const present=params instanceof URLSearchParams?params.has(key):params?.[key]!==undefined;
  return present?read(params,key):fallback;
 };
 const active=id=>db.prepare('SELECT g.* FROM plugin_grants g JOIN members m ON m.id=g.member WHERE g.id=? AND g.revoked=0 AND g.expires>?').get(id,now());
 function validateAuthorization(params){
  if(read(params,'response_type')!=='code')throw fail('unsupported_response_type');
  const client=clientFor(read(params,'client_id'));if(!client)throw fail('invalid_client');
  const redirectUri=read(params,'redirect_uri');if(!client.redirectUris.includes(redirectUri))throw fail();
  // RFC 8707: a missing resource means this server's only resource; a present one must match exactly.
  if(optional(params,'resource',resource)!==resource||read(params,'code_challenge_method')!=='S256')throw fail();
  const challenge=read(params,'code_challenge');if(!/^[A-Za-z0-9_-]{43}$/.test(challenge))throw fail();
  // OAuth 2.1: PKCE carries CSRF protection, so state is optional; when present it is returned unchanged.
  const state=optional(params,'state','');if(state.length>512||/[\x00-\x1f\x7f]/.test(state))throw fail();
  // Without a requested scope the consent page shows and grants all supported scopes.
  const scopes=optional(params,'scope',scopesSupported.join(' ')).split(' ');
  if(!scopes.includes('studio:read')||scopes.some(s=>!scopesSupported.includes(s))||new Set(scopes).size!==scopes.length)throw fail('invalid_scope');
  return {clientId:client.id,clientName:client.name,trusted:client.trusted,clientKind:client.kind,redirectHost:new URL(redirectUri).host,redirectUri,state,challenge,resource,scopes:scopesSupported.filter(s=>scopes.includes(s))};
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
  const type=read(params,'grant_type'),clientId=read(params,'client_id'),client=clientFor(clientId);
  if(!client)throw fail('invalid_client');
  if(optional(params,'resource',resource)!==resource)throw fail('invalid_target');
  if(type==='authorization_code'){
   const code=read(params,'code'),redirect=read(params,'redirect_uri'),verifier=read(params,'code_verifier');
   if(!client.redirectUris.includes(redirect))throw fail('invalid_grant');
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
  if(!row||row.resource!==resource||!clientFor(row.client))return null;
  return {memberId:row.member,grantId:row.id,scopes:JSON.parse(row.scopes),resource:row.resource,expires:row.access_expires};
 }
 function revoke(grantId,memberId){
  if(!db.prepare('UPDATE plugin_grants SET revoked=1 WHERE id=? AND member=?').run(grantId,memberId).changes)throw fail('access_denied',403);
  return {ok:true};
 }
 function listGrants(memberId){return db.prepare('SELECT id,client,scopes,created,expires,revoked FROM plugin_grants WHERE member=? ORDER BY created DESC,id').all(memberId).map(g=>({...g,grantId:g.id,clientName:clientFor(g.client)?.name??g.client,scopes:JSON.parse(g.scopes)}));}
 return {
  validateAuthorization,authorize,exchange,resolve,revoke,listGrants,prepareClient,register,
  metadata:()=>({issuer,authorization_endpoint:issuer+'/oauth/authorize',token_endpoint:issuer+'/oauth/token',authorization_response_iss_parameter_supported:true,token_endpoint_auth_methods_supported:['none'],response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],code_challenge_methods_supported:['S256'],scopes_supported:[...scopesSupported],
   ...(dynamic?{registration_endpoint:issuer+'/oauth/register',client_id_metadata_document_supported:true}:{})}),
  resourceMetadata:()=>({resource,authorization_servers:[issuer],scopes_supported:[...scopesSupported]})
 };
}
