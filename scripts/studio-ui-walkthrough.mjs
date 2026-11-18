// Walk through the Studio app like a newcomer, on a throwaway local server (never production):
// start → create a project → hire → ask the lead → a test agent proposes a plan → accept → the colleague starts.
// Phone (390 px) and desktop (1440 px). Fails on any page error. Screenshots go to the given folder.
//
// Usage: node scripts/studio-ui-walkthrough.mjs <screenshot-folder>
//   PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs  CHROME=/path/to/chrome   (optional)
// Requires a built app: npm run studio:build
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {createStudioServer} from '../selfhost/server.mjs';
import {openStore,digest,passwordHash} from '../selfhost/store.mjs';

const out=path.resolve(process.argv[2]??'studio-walkthrough');mkdirSync(out,{recursive:true});
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const dir=mkdtempSync(path.join(os.tmpdir(),'studio-walkthrough-')),filename=path.join(dir,'s.sqlite');
const db=openStore(filename,{seedProjects:false}),me=randomUUID(),session=randomBytes(32).toString('base64url'),worker='w'.repeat(43);
db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(me,'Neu','neu@fixture.invalid',passwordHash(randomBytes(12).toString('hex')),'owner',Date.now());
db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(session),me,Date.now()+3600000);db.close();
const app=createStudioServer({filename,origin:'http://127.0.0.1:4466',previewOrigin:'http://127.0.0.1:4467',resetMailer:null,hermesWorkers:[{owner:me,token:worker}]});
await new Promise(r=>app.server.listen(4466,'127.0.0.1',r));
const host='http://127.0.0.1:4466',errors=[];
const post=async(route,body,token)=>{const r=await fetch(host+route,{method:'POST',headers:{Origin:host,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{Cookie:'studio_session='+session})},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(route+': '+d.error);return d;};
const browser=await chromium.launch({...(process.env.CHROME?{executablePath:process.env.CHROME}:{}),args:['--no-sandbox']});
async function screen(name,url,width,act=async()=>{}){
 const ctx=await browser.newContext({viewport:{width,height:width>1000?900:844}});
 await ctx.addCookies([{name:'studio_session',value:session,url:host}]);
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
 await page.goto(host+url);await page.waitForTimeout(1200);await act(page);await page.waitForTimeout(800);
 await page.screenshot({path:path.join(out,name+'.png')});const text=await page.locator('body').innerText();await ctx.close();return text;
}
const expect=(text,what)=>{if(!text.includes(what))throw new Error('Nicht gefunden: '+what);};
try{
 expect(await screen('01-start','/',390),'Noch kein Projekt');
 const project=(await post('/api/room',{action:'create',id:randomUUID(),title:'Café Sonne',description:'Eine Website'})).project;
 expect(await screen('02-project','/?p='+project,390),'Ich bin Herr Grau, eure Projektleitung');
 expect(await screen('03-hire','/?p='+project,390,p=>p.getByText('Einstellen',{exact:true}).first().click()),'Kundendienst');
 for(const [name,role,face] of [['Otto','developer','otto'],['Frau Kern','reviewer','frau-kern']])
  await post('/api/room',{action:'agent',id:randomUUID(),project,name,role,avatarPresetId:face,model:'x',permissions:{readProject:true,writeMessages:true,manageTasks:false,editCode:false,prepareReviews:false,delegateAgents:false}});
 const room=await (await fetch(host+'/api/room?project='+project,{headers:{Cookie:'studio_session='+session}})).json(),lead=room.agents.find(a=>a.lead);
 const message=randomUUID();
 await post('/api/room',{action:'message',id:message,project,body:'@Herr Grau Wir brauchen eine Website mit Öffnungszeiten.'});
 await post('/api/agent-runs',{project,agent:lead.id,message});
 const job=(await post('/api/agent-worker/claim',{},worker)).job;
 await post('/api/agent-worker/tool',{run:job.run,lease:job.lease,callId:randomUUID().slice(0,16),tool:'plan.propose',args:{goal:'Website für das Café',tasks:[
  {title:'Startseite mit Öffnungszeiten',done_when:'Öffnungszeiten stehen oben.',kind:'code',who:'Otto'},{title:'Texte liefern',done_when:'Zwei Sätze liegen vor.',kind:'general',who:'Mensch'}],hire:[]}},worker);
 await post('/api/agent-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'Gerne, hier ist ein Plan.'},worker);
 expect(await screen('04-plan','/?p='+project,390),'Plan annehmen');
 const accepted=await screen('05-accepted','/?p='+project,390,p=>p.getByText('Plan annehmen').click());
 expect(accepted,'@Otto bitte übernimm: Startseite mit Öffnungszeiten');expect(accepted,'Otto');
 expect(await screen('06-tasks','/?p='+project+'&tab=tasks',390),'Startseite mit Öffnungszeiten');
 expect(await screen('07-info','/?p='+project+'&info=1',390),'Wo liegt euer Code?');
 expect(await screen('07b-new-code','/?p='+project+'&info=1',390,async p=>{await p.getByText('Neu anfangen').click();await p.locator('.ui-inline input').scrollIntoViewIfNeeded();}),'leeres Repository');
 expect(await screen('06b-task','/?p='+project+'&tab=tasks',390,p=>p.getByText('Startseite mit Öffnungszeiten').first().click()),'braucht das Projekt zuerst seinen Code');
 expect(await screen('08-account','/?page=account',390),'Einmal verbinden, dann kann jeder Agent');
 expect(await screen('09-guide','/?page=guide',390),'Herr Grau plant');
 expect(await screen('11-start-with-projects','/',390),'Café Sonne');
 expect(await screen('10-desktop','/?p='+project+'&tab=tasks',1440),'Café Sonne');
 if(errors.length)throw new Error('Fehler auf der Seite:\n'+errors.join('\n'));
 console.log('WALKTHROUGH=PASS ('+out+')');
}finally{await browser.close();app.server.close();rmSync(dir,{recursive:true,force:true});}
