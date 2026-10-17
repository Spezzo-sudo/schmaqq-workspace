import {createHash} from 'node:crypto';
import {token,digest,transaction} from './store.mjs';

const fail=(status,message)=>Object.assign(new Error(message),{status});
export function createConnectionRoutes({db,origin,sessionCookie,user,provider}){
 const p=provider===undefined?(process.env.STUDIO_GITHUB_CLIENT_ID&&process.env.STUDIO_GITHUB_CLIENT_SECRET?{
  clientId:process.env.STUDIO_GITHUB_CLIENT_ID,secret:process.env.STUDIO_GITHUB_CLIENT_SECRET,
  authorize:'https://github.com/login/oauth/authorize',tokenUrl:'https://github.com/login/oauth/access_token',userUrl:'https://api.github.com/user'
 }:null):provider;
 if(p&&new URL(origin).protocol!=='https:'&&!['127.0.0.1','[::1]','localhost'].includes(new URL(origin).hostname))throw new Error('GitHub-Verbindung benötigt HTTPS oder Loopback.');
 const callback=origin+'/api/connections/github/callback',cookieName=sessionCookie+'_github';
 const cookie=(req,name)=>req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1);
 const binding=(value,age)=>`${cookieName}=${value}; Path=/api/connections/github; HttpOnly; SameSite=Lax; Max-Age=${age}${origin.startsWith('https:')?'; Secure':''}`;
 db.exec(`CREATE TABLE IF NOT EXISTS github_connections(member TEXT PRIMARY KEY REFERENCES members(id),subject TEXT NOT NULL UNIQUE,login TEXT NOT NULL,verified INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS github_attempts(hash TEXT PRIMARY KEY,browser TEXT NOT NULL,member TEXT NOT NULL REFERENCES members(id),session_hash TEXT NOT NULL,verifier TEXT NOT NULL,expires INTEGER NOT NULL,claimed INTEGER NOT NULL DEFAULT 0);`);
 return async({route,method,req,res,url,send})=>{
  if(!route.startsWith('/api/connections'))return false;
  if(route==='/api/connections'&&method==='GET'){
   const m=user(req),account=db.prepare('SELECT login,verified FROM github_connections WHERE member=?').get(m.id);
   send({github:{enabled:!!p,account:account??null,repositoryAccess:false,reason:p?'':'Die GitHub-App muss einmalig vom Studio-Betreiber eingerichtet werden.'}});return true;
  }
  if(route==='/api/connections/github/disconnect'&&method==='POST'){
   const m=user(req);transaction(db,()=>{db.prepare('DELETE FROM github_connections WHERE member=?').run(m.id);db.prepare('DELETE FROM github_attempts WHERE member=?').run(m.id);});
   send({ok:true});return true;
  }
  if(route==='/api/connections/github/start'&&method==='POST'){
   const m=user(req);if(!p)throw fail(409,'Die GitHub-App ist für dieses Studio noch nicht eingerichtet.');
   db.prepare('DELETE FROM github_attempts WHERE expires<?').run(Date.now());
   if(db.prepare('SELECT count(*) AS n FROM github_attempts').get().n>=100)throw fail(429,'Zu viele offene Verbindungen. Bitte später erneut versuchen.');
   const state=token(),browser=token(),verifier=token();
   // One outstanding attempt per member. Never persist provider access tokens.
   transaction(db,()=>{db.prepare('DELETE FROM github_attempts WHERE member=?').run(m.id);db.prepare('INSERT INTO github_attempts(hash,browser,member,session_hash,verifier,expires) VALUES(?,?,?,?,?,?)').run(digest(state),digest(browser),m.id,digest(cookie(req,sessionCookie)),verifier,Date.now()+600000);});
   const target=new URL(p.authorize);for(const [key,value] of Object.entries({client_id:p.clientId,redirect_uri:callback,scope:'read:user',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256',prompt:'select_account'}))target.searchParams.set(key,value);
   res.setHeader('Set-Cookie',binding(browser,600));send({url:target.href});return true;
  }
  if(route!=='/api/connections/github/callback'||method!=='GET')return false;
  let destination='/?view=models&connection_error=github';
  try{
   const state=url.searchParams.get('state'),browser=cookie(req,cookieName);
   if(!p||!state||state.length>100||!browser||browser.length>100)throw fail(400,'state');
   const attempt=db.prepare('UPDATE github_attempts SET claimed=1 WHERE hash=? AND browser=? AND expires>? AND claimed=0 RETURNING *').get(digest(state),digest(browser),Date.now());
   if(!attempt||url.searchParams.has('error'))throw fail(400,'state');
   const validSession=()=>db.prepare('SELECT 1 FROM sessions WHERE hash=? AND member=? AND expires>?').get(attempt.session_hash,attempt.member,Date.now());
   if(!validSession()||(cookie(req,sessionCookie)&&digest(cookie(req,sessionCookie))!==attempt.session_hash))throw fail(400,'session');
   const code=url.searchParams.get('code');if(!code||code.length>4096)throw fail(400,'code');
   const response=await fetch(p.tokenUrl,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:p.clientId,client_secret:p.secret,code,redirect_uri:callback,code_verifier:attempt.verifier}),redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!response.ok)throw fail(400,'exchange');const tokens=await response.json();
   if(typeof tokens.access_token!=='string'||!tokens.access_token||tokens.access_token.length>10000)throw fail(400,'token');
   const profile=await fetch(p.userUrl,{headers:{Accept:'application/vnd.github+json','User-Agent':'SCHMAQQ-Studio',Authorization:'Bearer '+tokens.access_token},redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!profile.ok)throw fail(400,'profile');const account=await profile.json();
   if(!Number.isSafeInteger(account.id)||account.id<=0||typeof account.login!=='string'||!/^[-a-zA-Z0-9]{1,100}$/.test(account.login))throw fail(400,'identity');
   transaction(db,()=>{
    if(!validSession()||!db.prepare('DELETE FROM github_attempts WHERE hash=? AND claimed=1 AND expires>? RETURNING hash').get(attempt.hash,Date.now()))throw fail(400,'session');
    const other=db.prepare('SELECT member FROM github_connections WHERE subject=?').get(String(account.id));if(other&&other.member!==attempt.member)throw fail(409,'already linked');
    db.prepare('INSERT INTO github_connections VALUES(?,?,?,?) ON CONFLICT(member) DO UPDATE SET subject=excluded.subject,login=excluded.login,verified=excluded.verified').run(attempt.member,String(account.id),account.login,Date.now());
   });
   destination='/?view=models&connection=github';
  }catch{/* Codes, credentials and raw provider errors must never enter reports or URLs. */}
  res.setHeader('Set-Cookie',binding('',0));res.writeHead(303,{Location:destination});res.end();return true;
 };
}
