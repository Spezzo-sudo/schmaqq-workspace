import {createPrivateKey} from 'node:crypto';
import {existsSync,lstatSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import path from 'node:path';
import {SignJWT} from 'jose';
import {token,digest} from './store.mjs';
import {metadata,storeMetadata} from './team-model.mjs';

// One GitHub App per Studio instance. The owner creates it with GitHub's manifest flow
// (one click, no copying of keys), then installs it on chosen repositories. Studio uses
// short-lived installation tokens restricted to a single repository for each operation.
// The app's private key stays in a 0600 file next to the database; it never enters
// SQLite, logs, URLs, browser responses or job payloads.

const fail=(status,message)=>Object.assign(new Error(message),{status});
const repoName=/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
// Path segments such as '..' would let a crafted name address other API routes.
const validRepository=value=>typeof value==='string'&&repoName.test(value)&&value.split('/').every(s=>s!=='.'&&s!=='..');
export const githubAppPermissions=Object.freeze({contents:'write',pull_requests:'write',metadata:'read'});

export function githubAppManifest(origin){
 const host=new URL(origin).host;
 return {
  name:`SCHMAQQ Studio ${host}`.slice(0,34),
  url:origin,
  hook_attributes:{url:origin+'/api/github-app/webhook',active:false},
  redirect_url:origin+'/api/github-app/created',
  setup_url:origin+'/api/github-app/installed',
  setup_on_update:true,
  public:false,
  default_permissions:{...githubAppPermissions},
  default_events:[]
 };
}

export function createGithubApp({db,origin,credentialsFile,api='https://api.github.com',web='https://github.com',request=fetch,now=Date.now}){
 const tokens=new Map();
 function credentials(){
  if(!existsSync(credentialsFile))return null;
  const info=lstatSync(credentialsFile);
  if(!info.isFile()||info.isSymbolicLink()||info.nlink!==1||info.size>32000)throw Error('GitHub-App-Zugang ist keine reguläre private Datei.');
  const value=JSON.parse(readFileSync(credentialsFile,'utf8'));
  if(!Number.isSafeInteger(value?.id)||typeof value.slug!=='string'||!/^[a-z0-9-]{1,100}$/.test(value.slug)||typeof value.pem!=='string'||!value.pem.includes('PRIVATE KEY'))throw Error('GitHub-App-Zugang unvollständig.');
  return value;
 }
 function saveCredentials(value){
  if(existsSync(credentialsFile))throw fail(409,'Für dieses Studio gibt es bereits eine GitHub-App.');
  const temporary=path.join(path.dirname(credentialsFile),token()+'.private.json');
  writeFileSync(temporary,JSON.stringify(value),{flag:'wx',mode:0o600});renameSync(temporary,credentialsFile);
 }
 async function call(method,route,{bearer,body}={}){
  let response;
  try{
   response=await request(api+route,{method,headers:{Accept:'application/vnd.github+json','User-Agent':'SCHMAQQ-Studio','X-GitHub-Api-Version':'2022-11-28',...(bearer?{Authorization:'Bearer '+bearer}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'error',signal:AbortSignal.timeout(15000)});
  }catch{throw fail(502,'GitHub ist gerade nicht erreichbar. Bitte später erneut versuchen.');}
  // Raw provider errors can echo request details; only the status leaves this function.
  if(!response.ok)throw Object.assign(fail(response.status===404?404:409,'GitHub hat die Anfrage abgelehnt.'),{githubStatus:response.status});
  return response.status===204?null:response.json();
 }
 async function appJwt(){
  const c=credentials();if(!c)throw fail(409,'Die GitHub-App ist noch nicht eingerichtet.');
  const seconds=Math.floor(now()/1000);
  return new SignJWT({}).setProtectedHeader({alg:'RS256'}).setIssuedAt(seconds-60).setExpirationTime(seconds+540).setIssuer(String(c.id)).sign(createPrivateKey(c.pem));
 }
 function installations(){return metadata(db,'github-app:v1:installations',{});}
 async function addInstallation(id,member){
  if(!Number.isSafeInteger(id)||id<=0)throw fail(400,'Installation ungültig.');
  // Only installations of this very app are accepted; GitHub answers 404 for any other id.
  const installation=await call('GET',`/app/installations/${id}`,{bearer:await appJwt()});
  const login=installation?.account?.login;
  if(installation?.id!==id||typeof login!=='string'||!/^[-a-zA-Z0-9]{1,100}$/.test(login))throw fail(409,'GitHub hat die Installation nicht bestätigt.');
  storeMetadata(db,'github-app:v1:installations',{...installations(),[id]:{account:login,addedBy:member,added:now()}});
  return {id,account:login};
 }
 async function installationFor(repository){
  if(!validRepository(repository))throw fail(400,'Repository ungültig.');
  try{return await call('GET',`/repos/${repository}/installation`,{bearer:await appJwt()});}
  catch(e){if(e.githubStatus===404)throw fail(409,'Studio hat noch keinen Zugriff auf dieses Repository. In GitHub bei der Studio-App das Repository hinzufügen.');throw e;}
 }
 /** Short-lived token for exactly one repository. Cached until five minutes before expiry. */
 async function repositoryToken(repository){
  const cached=tokens.get(repository.toLowerCase());
  if(cached&&cached.expires-300000>now())return cached.token;
  const installation=await installationFor(repository);
  const created=await call('POST',`/app/installations/${installation.id}/access_tokens`,{bearer:await appJwt(),body:{repositories:[repository.split('/')[1]],permissions:{...githubAppPermissions}}});
  const expires=Date.parse(created?.expires_at??'');
  if(typeof created?.token!=='string'||!created.token||created.token.length>4096||!Number.isFinite(expires))throw fail(502,'GitHub hat keinen gültigen Zugang ausgestellt.');
  tokens.set(repository.toLowerCase(),{token:created.token,expires});
  return created.token;
 }
 async function repositories(){
  const result=[];
  for(const id of Object.keys(installations())){
   const created=await call('POST',`/app/installations/${id}/access_tokens`,{bearer:await appJwt(),body:{permissions:{metadata:'read'}}});
   for(let page=1;page<=10;page++){
    const list=await call('GET',`/installation/repositories?per_page=100&page=${page}`,{bearer:created.token});
    for(const r of list?.repositories??[])if(validRepository(r?.full_name))result.push({repository:r.full_name,private:r.private===true,base:typeof r.default_branch==='string'?r.default_branch:'main'});
    if((list?.repositories?.length??0)<100)break;
   }
  }
  return result.sort((a,b)=>a.repository.localeCompare(b.repository));
 }
 /** Whether the target branch requires changes to go through pull requests (or is at least protected). */
 async function branchProtected(repository,branch){
  if(!/^[\w./-]{1,100}$/.test(branch)||branch.includes('..'))throw fail(400,'Zielbranch ungültig.');
  const info=await call('GET',`/repos/${repository}/branches/${encodeURIComponent(branch)}`,{bearer:await repositoryToken(repository)});
  return info?.protected===true;
 }
 function status(member){
  const c=credentials(),list=installations();
  return {
   configured:!!c,
   canCreate:!c&&member.role==='owner',
   manageUrl:c?`${web}/apps/${c.slug}`:null,
   installations:Object.entries(list).map(([id,v])=>({id:Number(id),account:v.account}))
  };
 }
 // Browser redirects from github.com are cross-site, so the Strict session cookie is absent there.
 // Each attempt is bound to the member, a Lax browser cookie and a single-use state instead.
 function attempt(member,purpose){
  const state=token(),browser=token();
  const open=Object.fromEntries(Object.entries(metadata(db,'github-app:v1:attempts',{})).filter(([,v])=>v.expires>=now()&&v.member!==member.id));
  if(Object.keys(open).length>=50)throw fail(429,'Zu viele offene Vorgänge. Bitte später erneut versuchen.');
  storeMetadata(db,'github-app:v1:attempts',{...open,[digest(state)]:{member:member.id,browser:digest(browser),purpose,expires:now()+600000}});
  return {state,browser};
 }
 function claim(state,browser,purpose){
  if(typeof state!=='string'||state.length>100||typeof browser!=='string'||browser.length>100)throw fail(400,'state');
  const all=metadata(db,'github-app:v1:attempts',{}),key=digest(state),found=all[key];
  if(!found)throw fail(400,'state');
  delete all[key];storeMetadata(db,'github-app:v1:attempts',all);
  if(found.expires<now()||found.browser!==digest(browser)||found.purpose!==purpose)throw fail(400,'state');
  const member=db.prepare('SELECT * FROM members WHERE id=?').get(found.member);if(!member)throw fail(400,'member');
  return member;
 }
 function startCreation(member){
  if(member.role!=='owner')throw fail(403,'Nur der Inhaber kann die GitHub-App für Studio anlegen.');
  if(credentials())throw fail(409,'Für dieses Studio gibt es bereits eine GitHub-App.');
  const {state,browser}=attempt(member,'create');
  return {browser,action:`${web}/settings/apps/new?state=${encodeURIComponent(state)}`,manifest:JSON.stringify(githubAppManifest(origin))};
 }
 function startInstallation(member){
  const c=credentials();if(!c)throw fail(409,'Die GitHub-App ist noch nicht eingerichtet.');
  const {state,browser}=attempt(member,'install');
  return {browser,url:`${web}/apps/${c.slug}/installations/new?state=${encodeURIComponent(state)}`};
 }
 async function finishCreation(state,browser,code){
  const member=claim(state,browser,'create');
  if(member.role!=='owner')throw fail(403,'owner');
  if(typeof code!=='string'||!/^[\w-]{1,200}$/.test(code))throw fail(400,'code');
  const app=await call('POST',`/app-manifests/${code}/conversions`);
  if(!Number.isSafeInteger(app?.id)||typeof app.slug!=='string'||!/^[a-z0-9-]{1,100}$/.test(app.slug)||typeof app.pem!=='string'||!app.pem.includes('PRIVATE KEY'))throw fail(502,'GitHub hat keine vollständige App zurückgegeben.');
  saveCredentials({id:app.id,slug:app.slug,pem:app.pem,clientId:app.client_id??null,clientSecret:app.client_secret??null,webhookSecret:app.webhook_secret??null,owner:app.owner?.login??null,created:now()});
  return {slug:app.slug};
 }
 async function finishInstallation(state,browser,installation){
  const member=claim(state,browser,'install');
  return addInstallation(installation,member.id);
 }
 return {status,startCreation,startInstallation,finishCreation,finishInstallation,repositories,repositoryToken,branchProtected,configured:()=>!!credentials()};
}

export function createGithubAppRoutes({app,user,sessionCookie,secure}){
 const name=sessionCookie+'_github_app';
 const binding=(value,age)=>`${name}=${value}; Path=/api/github-app; HttpOnly; SameSite=Lax; Max-Age=${age}${secure?'; Secure':''}`;
 const cookie=req=>req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1);
 const back=(res,destination)=>{res.setHeader('Set-Cookie',binding('',0));res.writeHead(303,{Location:destination});res.end();};
 return async({route,method,req,res,url,send})=>{
  if(!route.startsWith('/api/github-app'))return false;
  if(route==='/api/github-app'&&method==='GET'){send(app?app.status(user(req)):{configured:false,canCreate:false,installations:[]});return true;}
  if(!app)throw fail(409,'GitHub-App ist in dieser Umgebung nicht verfügbar.');
  if(route==='/api/github-app/create'&&method==='POST'){const {browser,...form}=app.startCreation(user(req));res.setHeader('Set-Cookie',binding(browser,600));send(form);return true;}
  if(route==='/api/github-app/install'&&method==='POST'){const {browser,url:target}=app.startInstallation(user(req));res.setHeader('Set-Cookie',binding(browser,600));send({url:target});return true;}
  if(route==='/api/github-app/repositories'&&method==='GET'){user(req);send({repositories:await app.repositories()});return true;}
  if(route==='/api/github-app/created'&&method==='GET'){
   let destination='/?github_app_error=create';
   try{await app.finishCreation(url.searchParams.get('state'),cookie(req),url.searchParams.get('code'));destination='/?github_app=created';}
   catch{/* Codes and provider details never enter URLs or logs. */}
   back(res,destination);return true;
  }
  if(route==='/api/github-app/installed'&&method==='GET'){
   let destination='/?github_app_error=install';
   try{await app.finishInstallation(url.searchParams.get('state'),cookie(req),Number(url.searchParams.get('installation_id')));destination='/?github_app=installed';}
   catch{/* see above */}
   back(res,destination);return true;
  }
  return false;
 };
}
