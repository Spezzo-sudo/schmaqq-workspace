import {randomUUID,createHash} from 'node:crypto';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {token,digest,transaction} from './store.mjs';

const fail=message=>Object.assign(new Error(message),{status:400});
export function createOidcRoutes({db,origin,sessionCookie,user,session,readJSON,provider}){
 const p=provider===undefined?(process.env.STUDIO_CHATGPT_CLIENT_ID?{
  clientId:process.env.STUDIO_CHATGPT_CLIENT_ID,secret:process.env.STUDIO_CHATGPT_CLIENT_SECRET,
  method:process.env.STUDIO_CHATGPT_AUTH_METHOD??'none',issuer:'https://auth.openai.com',
  authorize:'https://auth.openai.com/api/accounts/authorize',tokenUrl:'https://auth.openai.com/api/accounts/oauth/token',jwks:'https://auth.openai.com/.well-known/jwks.json'
 }:null):provider;
 if(p&&(!['none','client_secret_post','client_secret_basic'].includes(p.method)||p.method!=='none'&&!p.secret))throw new Error('OAuth-Client-Konfiguration unvollständig.');
 if(p&&new URL(origin).protocol!=='https:'&&!['127.0.0.1','[::1]','localhost'].includes(new URL(origin).hostname))throw new Error('Anbieter-Anmeldung benötigt HTTPS oder eine lokale Loopback-Adresse.');
 const keys=p?createRemoteJWKSet(new URL(p.jwks),{timeoutDuration:10000}):null;
 const callback=origin+'/api/auth/provider/callback',cookieName=sessionCookie+'_oauth';
 db.exec(`CREATE TABLE IF NOT EXISTS oidc_attempts(hash TEXT PRIMARY KEY,browser TEXT NOT NULL,data TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS oidc_identities(issuer TEXT NOT NULL,client TEXT NOT NULL,subject TEXT NOT NULL,member TEXT NOT NULL REFERENCES members(id),PRIMARY KEY(issuer,client,subject),UNIQUE(issuer,client,member));`);
 const cookie=(req,name)=>req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1);
 const bindingCookie=(value,age)=>`${cookieName}=${value}; Path=/api/auth/provider; HttpOnly; SameSite=Lax; Max-Age=${age}${origin.startsWith('https:')?'; Secure':''}`;
 return async({route,method,req,res,url,send})=>{
  if(route==='/api/auth/providers'&&method==='GET'){
   let connected=false;try{const m=user(req);connected=!!(p&&db.prepare('SELECT 1 FROM oidc_identities WHERE issuer=? AND client=? AND member=?').get(p.issuer,p.clientId,m.id));}catch{}
   send({providers:[{id:'chatgpt',name:'ChatGPT',enabled:!!p,connected,reason:p?'':'Für diesen Workspace ist noch kein offizieller ChatGPT-Login-Client registriert.'}]});return true;
  }
  if(route==='/api/auth/provider/start'&&method==='POST'){
   if(!p)throw fail('ChatGPT-Login ist noch nicht eingerichtet. Bitte den Studio-Zugang verwenden.');
   const v=await readJSON(req);if(v.provider!=='chatgpt'||!['login','link'].includes(v.purpose))throw fail('Ungültiger Anmeldeweg.');
   let member=null,sessionHash=null;
   if(v.purpose==='link'){member=user(req).id;sessionHash=digest(cookie(req,sessionCookie));}
   for(const key of ['invite','setup'])if(v[key]!=null&&(typeof v[key]!=='string'||v[key].length>100))throw fail('Ungültiger Zugangslink.');
   const state=token(),browser=token(),nonce=token(),verifier=token();
   db.prepare('DELETE FROM oidc_attempts WHERE expires<?').run(Date.now());
   if(db.prepare('SELECT count(*) AS n FROM oidc_attempts').get().n>=100)throw fail('Zu viele offene Anmeldungen. Bitte später erneut versuchen.');
   db.prepare('INSERT INTO oidc_attempts VALUES(?,?,?,?)').run(digest(state),digest(browser),JSON.stringify({issuer:p.issuer,client:p.clientId,nonce,verifier,member,sessionHash,invite:v.invite?digest(v.invite):null,setup:v.setup?digest(v.setup):null}),Date.now()+600000);
   const target=new URL(p.authorize);for(const [key,value] of Object.entries({client_id:p.clientId,redirect_uri:callback,response_type:'code',scope:'openid profile email',state,nonce,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}))target.searchParams.set(key,value);
   res.setHeader('Set-Cookie',bindingCookie(browser,600));send({url:target.href});return true;
  }
  if(route!=='/api/auth/provider/callback'||method!=='GET')return false;
  let destination='/?auth_error=provider';
  try{
   if(!p)throw fail('disabled');
   const state=url.searchParams.get('state'),binding=cookie(req,cookieName);
   if(!state||state.length>100||!binding||binding.length>100)throw fail('state');
   const attempt=db.prepare('DELETE FROM oidc_attempts WHERE hash=? AND browser=? AND expires>? RETURNING data').get(digest(state),digest(binding),Date.now());
   if(!attempt||url.searchParams.has('error'))throw fail('state');
   const a=JSON.parse(attempt.data);if(a.issuer!==p.issuer||a.client!==p.clientId)throw fail('configuration');const code=url.searchParams.get('code');if(!code||code.length>4096)throw fail('code');
   const form=new URLSearchParams({grant_type:'authorization_code',client_id:p.clientId,redirect_uri:callback,code,code_verifier:a.verifier});
   const headers={'Content-Type':'application/x-www-form-urlencoded'};
   if(p.method==='client_secret_post')form.set('client_secret',p.secret);
   if(p.method==='client_secret_basic'){const encode=s=>encodeURIComponent(s).replace(/%20/g,'+');headers.Authorization='Basic '+Buffer.from(encode(p.clientId)+':'+encode(p.secret)).toString('base64');}
   const r=await fetch(p.tokenUrl,{method:'POST',headers,body:form,redirect:'error',signal:AbortSignal.timeout(10000)});
   if(!r.ok)throw fail('exchange');const tokens=await r.json();if(typeof tokens.id_token!=='string'||tokens.id_token.length>20000)throw fail('token');
   const {payload}=await jwtVerify(tokens.id_token,keys,{issuer:p.issuer,audience:p.clientId,algorithms:['RS256'],requiredClaims:['exp','iat','sub','nonce'],clockTolerance:5});
   if(payload.nonce!==a.nonce||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>500||(payload.azp!==undefined&&payload.azp!==p.clientId)||(Array.isArray(payload.aud)&&payload.aud.length>1&&payload.azp!==p.clientId))throw fail('claims');
   const member=transaction(db,()=>{
    const identity=db.prepare('SELECT member FROM oidc_identities WHERE issuer=? AND client=? AND subject=?').get(p.issuer,p.clientId,payload.sub);
    if(a.member){
     if(!db.prepare('SELECT 1 FROM sessions WHERE hash=? AND member=? AND expires>?').get(a.sessionHash,a.member,Date.now()))throw fail('session');
     if(identity&&identity.member!==a.member)throw fail('linked');
     if(!identity)db.prepare('INSERT INTO oidc_identities VALUES(?,?,?,?)').run(p.issuer,p.clientId,payload.sub,a.member);
     return a.member;
    }
    if(identity)return identity.member;
    const email=typeof payload.email==='string'?payload.email.toLowerCase():'';
    if(payload.email_verified!==true||!/^\S+@\S+\.\S+$/.test(email)||email.length>200)throw fail('email');
    // Email matching alone must never link an existing Studio account.
    if(db.prepare('SELECT 1 FROM members WHERE email=?').get(email))throw fail('existing');
    let role;
    if(a.setup&&db.prepare("SELECT value FROM workspace_meta WHERE key='bootstrap'").get()?.value===a.setup&&!db.prepare('SELECT 1 FROM members LIMIT 1').get()){
     role='owner';db.prepare("DELETE FROM workspace_meta WHERE key='bootstrap'").run();
    }else{
     const invite=a.invite&&db.prepare('SELECT * FROM invites WHERE hash=? AND expires>?').get(a.invite,Date.now());
     if(!invite||invite.email!==email)throw fail('invite');role=invite.role;db.prepare('DELETE FROM invites WHERE hash=?').run(a.invite);
    }
    const id=randomUUID(),name=typeof payload.name==='string'?payload.name.slice(0,160):email;
    db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(id,name,email,'external-only',role,Date.now());
    db.prepare('INSERT INTO oidc_identities VALUES(?,?,?,?)').run(p.issuer,p.clientId,payload.sub,id);return id;
   });
   session(res,member);destination='/';
  }catch{/* Never expose codes, tokens or raw provider errors in a URL or log. */}
  const existing=res.getHeader('Set-Cookie');res.setHeader('Set-Cookie',[...(existing?[existing]:[]),bindingCookie('',0)]);
  res.writeHead(303,{Location:destination});res.end();return true;
 };
}
