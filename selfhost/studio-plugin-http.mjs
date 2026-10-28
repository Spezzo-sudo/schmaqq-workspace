import {randomBytes} from 'node:crypto';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import {ListToolsRequestSchema,CallToolRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {createPluginAuth} from './studio-plugin-auth.mjs';
import {createStudioMcp} from './studio-mcp.mjs';
import {createMutationLedger} from './studio-mcp-ledger.mjs';

const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fail=(status,message)=>Object.assign(new Error(message),{status});
const scopesFor=name=>['start_code_job','cancel_code_job'].includes(name)?['studio:read','studio:code']:['studio:read'];
const canonical=params=>{
 const result={};for(const [key,value] of params){if(Object.hasOwn(result,key))throw fail(400,'Doppelte OAuth-Parameter.');result[key]=value;}return result;
};
async function readForm(req){
 if(!req.headers['content-type']?.startsWith('application/x-www-form-urlencoded'))throw fail(415,'Formular erforderlich.');
 let length=0;const parts=[];for await(const p of req){length+=p.length;if(length>16000)throw fail(413,'Formular zu gross.');parts.push(p);}return canonical(new URLSearchParams(Buffer.concat(parts).toString('utf8')));
}

export function createPluginHttpRoutes({db,ledgerDb,origin,clients,dynamic=false,fetchMetadata,user,readJSON,execute,now=Date.now}){
 const auth=createPluginAuth({db,issuer:origin,clients,now,dynamic,...(fetchMetadata?{fetchMetadata}:{})});
 const metadataUrl=origin+'/.well-known/oauth-protected-resource';
 const challenge=`Bearer resource_metadata="${metadataUrl}"`;
 const redirects=(request,values)=>{const url=new URL(request.redirectUri);for(const [key,value] of Object.entries(values))if(key!=='state'||value)url.searchParams.set(key,value);return url.href;};
 const csrf=req=>{if(req.headers.origin!==origin)throw fail(403,'Ungueltiger Ursprung.');if(!req.headers['content-type']?.includes('application/json'))throw fail(415,'JSON erforderlich.');};
 const routes=new Set(['/mcp','/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp','/.well-known/oauth-authorization-server','/oauth/authorize','/oauth/token','/oauth/register','/api/plugin/consent','/api/plugin/grants','/api/plugin/revoke']);
 async function route({req,res,url,send}){
  if(!routes.has(url.pathname))return false;
  if(req.headers.origin&&req.headers.origin!==origin)throw fail(403,'Ungueltiger Ursprung.');
  if(url.pathname.startsWith('/.well-known/')){
   if(req.method!=='GET')throw fail(405,'GET erforderlich.');
   send(url.pathname.endsWith('oauth-authorization-server')?auth.metadata():auth.resourceMetadata());return true;
  }
  if(url.pathname==='/oauth/token'){
   if(req.method!=='POST')throw fail(405,'POST erforderlich.');
   try{send(auth.exchange(await readForm(req)));}catch(e){send({error:e.oauthError??e.error??'invalid_grant',error_description:'Anmeldung nicht abgeschlossen oder abgelaufen.'},e.status??400);}return true;
  }
  if(url.pathname==='/oauth/register'){
   if(!dynamic){send({error:'Registrierung nicht aktiviert.'},404);return true;}
   if(req.method!=='POST')throw fail(405,'POST erforderlich.');
   if(!req.headers['content-type']?.includes('application/json'))throw fail(415,'JSON erforderlich.');
   try{send(auth.register(await readJSON(req,8000)),201);}catch(e){send({error:e.oauthError??'invalid_client_metadata',error_description:'Registrierung abgelehnt.'},e.status??400);}return true;
  }
  if(url.pathname==='/oauth/authorize'){
   if(req.method!=='GET')throw fail(405,'GET erforderlich.');
   const params=canonical(url.searchParams);await auth.prepareClient(params.client_id);
   const authorization=auth.validateAuthorization(params),nonce=randomBytes(18).toString('base64');
   let member;try{member=user(req);}catch{}
   const encoded=JSON.stringify(params).replace(/</g,'\\u003c');
   // Self-registered names are chosen by the client itself; the redirect host is what actually receives the code.
   const origin_=authorization.trusted?'':`<p class="warn"><strong>Nicht von SCHMAQQ hinterlegt.</strong> Der Name stammt von der Anwendung selbst${authorization.clientKind==='metadata'?' (veroeffentlicht unter '+escape(new URL(authorization.clientId).host)+')':''}. Nach der Freigabe geht es zurueck zu <strong>${escape(authorization.redirectHost)}</strong>. Nur erlauben, wenn du diese Verbindung gerade selbst gestartet hast.</p>`;
   const content=member?`<p>Du bist als <strong>${escape(member.name)}</strong> angemeldet.</p>${origin_}<p><strong>${escape(authorization.clientName)}</strong> moechte:</p><ul><li>Gemeinsame Projekte und Ergebnisse lesen.</li>${authorization.scopes.includes('studio:code')?'<li>Code in deinen freigegebenen Arbeitskopien bearbeiten, Tests und Vorschauen starten. Projektprogramme koennen auf Dateien und Netzwerk zugreifen.</li>':''}</ul><p>Andere private Rechner und GitHub-Veroeffentlichungen werden dadurch nicht freigegeben.</p><button id="approve">Verbindung erlauben</button> <button id="deny">Ablehnen</button>`:`<p>Melde dich zuerst mit deinem eigenen Studio-Konto an.</p><p><a href="/" target="_blank" rel="noopener">Studio-Anmeldung oeffnen</a></p><button id="reload">Anmeldung pruefen</button>`;
   res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`);
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});
   res.end(`<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Studio verbinden</title><style nonce="${nonce}">body{font:18px system-ui;background:#f6f4ef;color:#183d36;max-width:680px;margin:8vh auto;padding:24px;line-height:1.6}button{font:inherit;padding:10px 16px;margin:8px 8px 8px 0;cursor:pointer}a{color:inherit}.warn{background:#fff3d6;border-left:4px solid #b7791f;padding:10px 14px}</style><main><h1>ChatGPT oder Codex mit Studio verbinden</h1>${content}<p id="status" role="status"></p></main><script nonce="${nonce}">const params=${encoded};const status=document.getElementById('status');document.getElementById('reload')?.addEventListener('click',()=>location.reload());async function decide(approve){document.querySelectorAll('button').forEach(b=>b.disabled=true);try{const r=await fetch('/api/plugin/consent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({params,approve})});const d=await r.json();if(!r.ok)throw Error(d.error||'Verbindung fehlgeschlagen');location.assign(d.redirect);}catch(e){status.textContent=e.message;document.querySelectorAll('button').forEach(b=>b.disabled=false);}}document.getElementById('approve')?.addEventListener('click',()=>decide(true));document.getElementById('deny')?.addEventListener('click',()=>decide(false));${member?'':"fetch('/api/auth/session').then(r=>{if(r.ok)location.reload()}).catch(()=>{});"}</script></html>`);return true;
  }
  if(url.pathname==='/api/plugin/consent'){
   if(req.method!=='POST')throw fail(405,'POST erforderlich.');csrf(req);const member=user(req),value=await readJSON(req,12000);
   if(typeof value.approve!=='boolean')throw fail(400,'Bitte Entscheidung bestaetigen.');
   const request=auth.validateAuthorization(value.params);
   if(!value.approve){send({redirect:redirects(request,{error:'access_denied',state:request.state,iss:origin})});return true;}
   const approved=auth.authorize(request,member.id);
   send({redirect:redirects(request,{code:approved.code,state:approved.state,iss:approved.iss})});return true;
  }
  if(url.pathname==='/api/plugin/grants'){
   if(req.method!=='GET')throw fail(405,'GET erforderlich.');send({grants:auth.listGrants(user(req).id)});return true;
  }
  if(url.pathname==='/api/plugin/revoke'){
   if(req.method!=='POST')throw fail(405,'POST erforderlich.');csrf(req);const member=user(req),value=await readJSON(req,2048);auth.revoke(value.grantId,member.id);send({ok:true});return true;
  }
  if(req.method!=='POST'){res.setHeader('Allow','POST');send({error:'POST erforderlich.'},405);return true;}
  if(!req.headers['content-type']?.includes('application/json'))throw fail(415,'JSON erforderlich.');
  const access=req.headers.authorization?.match(/^Bearer ([\w-]{24,200})$/)?.[1],identity=access?auth.resolve(access):null;
  if(!identity){res.setHeader('WWW-Authenticate',challenge);send({error:'Persoenliche Studio-Verbindung erforderlich.'},401);return true;}
  const body=await readJSON(req,500000);
  const bridge=createStudioMcp({request:(path,value)=>execute(identity.memberId,path,value),mutationLedger:createMutationLedger(ledgerDb,{memberId:identity.memberId,grantId:identity.grantId})});
  const required=name=>scopesFor(name).every(scope=>identity.scopes.includes(scope));
  const server=new Server({name:'schmaqq-studio',version:'0.2.0'},{capabilities:{tools:{}},instructions:'Use project_context before changes. Read file revisions before saving. Queue bounded jobs, then poll get_code_job. A preview is a capability link. Never retry an unknown mutation with a new requestId.'});
  server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:bridge.tools.filter(t=>required(t.name)).map(t=>({...t,securitySchemes:[{type:'oauth2',scopes:scopesFor(t.name)}]}))}));
  server.setRequestHandler(CallToolRequestSchema,async message=>{
   if(!required(message.params.name))return {isError:true,content:[{type:'text',text:'Diese Verbindung hat keine Berechtigung fuer Codeauftraege.'}],_meta:{'mcp/www_authenticate':[challenge+', error="insufficient_scope", error_description="Authorize studio:code to run code jobs"']}};
   const reply=await bridge.dispatch({jsonrpc:'2.0',id:1,method:'tools/call',params:message.params});
   return reply.result??{isError:true,content:[{type:'text',text:reply.error.message}]};
  });
  const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  res.once('close',()=>{transport.close().catch(()=>{});server.close().catch(()=>{});});
  await server.connect(transport);await transport.handleRequest(req,res,body);return true;
 }
 return {route,auth};
}
