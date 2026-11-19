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
import {queueShowcases} from '../selfhost/showcase.mjs';

const out=path.resolve(process.argv[2]??'studio-walkthrough');mkdirSync(out,{recursive:true});
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright');
const dir=mkdtempSync(path.join(os.tmpdir(),'studio-walkthrough-')),filename=path.join(dir,'s.sqlite');
const db=openStore(filename,{seedProjects:false}),me=randomUUID(),colleague=randomUUID(),session=randomBytes(32).toString('base64url'),worker='w'.repeat(43);
db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(me,'Neu','neu@fixture.invalid',passwordHash(randomBytes(12).toString('hex')),'owner',Date.now());
db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(colleague,'Lena Weber','lena@fixture.invalid',passwordHash(randomBytes(12).toString('hex')),'member',Date.now());
db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(session),me,Date.now()+3600000);db.close();
const app=createStudioServer({filename,origin:'http://127.0.0.1:4466',previewOrigin:'http://127.0.0.1:4467',resetMailer:null,hermesWorkers:[{owner:me,token:worker}]});
await new Promise(r=>app.server.listen(4466,'127.0.0.1',r));await new Promise(r=>app.previewServer.listen(4467,'127.0.0.1',r));
const host='http://127.0.0.1:4466',errors=[];
const post=async(route,body,token)=>{const r=await fetch(host+route,{method:'POST',headers:{Origin:host,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{Cookie:'studio_session='+session})},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(route+': '+d.error);return d;};
const browser=await chromium.launch({...(process.env.CHROME?{executablePath:process.env.CHROME}:{}),args:['--no-sandbox']});
async function screen(name,url,width,act=async()=>{},options={}){
 const ctx=await browser.newContext({viewport:{width,height:width>1000?900:844},...options});
 await ctx.addCookies([{name:'studio_session',value:session,url:host}]);
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
 await page.goto(host+url);await page.waitForTimeout(1200);await act(page);await page.waitForTimeout(800);
 const tapHighlight=await page.locator('button,a,input,textarea,select,summary,[role=button],[tabindex]').evaluateAll(elements=>
  elements.find(el=>getComputedStyle(el).webkitTapHighlightColor!=='rgba(0, 0, 0, 0)')?.outerHTML.split('>')[0]);
 if(tapHighlight)throw new Error(name+' hat noch eine Browser-Markierung beim Tippen: '+tapHighlight);
 await page.screenshot({path:path.join(out,name+'.png')});const text=await page.locator('body').innerText();await ctx.close();return text;
}
const expect=(text,what)=>{if(!text.includes(what))throw new Error('Nicht gefunden: '+what);};
try{
 expect(await screen('01-start','/',390),'Keine aktiven Projekte');
 expect(await screen('01b-project-create','/',390,async page=>{
  await page.getByRole('button',{name:'Projekt anlegen',exact:true}).click();
  if(await page.getByRole('checkbox',{name:'Lena Weber'}).isChecked())throw new Error('Studio-Konto war vorausgewählt.');
 }),'Wer ist dabei?');
 const project=(await post('/api/room',{action:'create',id:randomUUID(),title:'Café Sonne',description:'Eine Website'})).project;
 expect(await screen('02-project','/?p='+project,390,async p=>{
  const stream=p.locator('.ui-stream'),portrait=stream.locator('.ui-intro .ui-face');
  const [chat,face]=await Promise.all([stream.boundingBox(),portrait.boundingBox()]);
  if(!chat||!face||face.y<chat.y||face.y+face.height>chat.y+chat.height||
     await stream.evaluate(el=>el.scrollTop)!==0)throw new Error('Begrüßung im leeren Chat ist beim Öffnen abgeschnitten.');
  const tab=p.getByRole('tab',{name:'Chat',exact:true});
  await tab.tap();
  if(await tab.evaluate(el=>el.matches(':focus-visible')))throw new Error('Antippen zeigt den Tastaturrahmen.');
  await p.keyboard.press('Tab');
  await tab.focus();
  if(await tab.evaluate(el=>getComputedStyle(el).outlineColor)!=='rgb(17, 18, 37)'||
     await tab.evaluate(el=>getComputedStyle(el).outlineStyle)!=='solid')throw new Error('Sichtbarer Tastaturrahmen fehlt.');
  await tab.blur();
 },{viewport:{width:390,height:620},isMobile:true,hasTouch:true}),'Ich bin Herr Grau, eure Projektleitung');
 expect(await screen('03-hire','/?p='+project,390,async p=>{await p.getByRole('button',{name:'Team erweitern',exact:true}).click();await p.getByRole('button',{name:'Agent einstellen',exact:true}).click();}),'Kundendienst');
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
 expect(await screen('04-plan','/?p='+project,390,async p=>{
  const bottom=await p.locator('.ui-stream').evaluate(el=>el.scrollHeight-el.clientHeight-el.scrollTop);
  if(bottom>1)throw new Error('Chat öffnet nicht bei der neuesten Nachricht.');
 }),'Plan annehmen');
 const accepted=await screen('05-accepted','/?p='+project,390,p=>p.getByText('Plan annehmen').click());
 expect(accepted,'@Otto bitte übernimm: Startseite mit Öffnungszeiten');expect(accepted,'Otto');
 expect(await screen('06-tasks','/?p='+project+'&tab=tasks',390),'Startseite mit Öffnungszeiten');
 expect(await screen('07-info','/?p='+project+'&info=1',390),'GitHub einrichten');
 expect(await screen('07b-new-code','/?p='+project+'&info=1',390,async p=>{
  const input=p.getByLabel('Link zu deinem Projekt auf GitHub'),arrow=p.getByRole('button',{name:'Weiter nach unten',exact:true});
  await p.locator('.ui-screen.info').evaluate(el=>{el.scrollTop=0;});
  await arrow.waitFor({state:'visible'});await input.focus();await arrow.waitFor({state:'hidden'});
  await input.scrollIntoViewIfNeeded();}),'Auf GitHub anlegen');
 expect(await screen('06b-task','/?p='+project+'&tab=tasks',390,p=>p.getByText('Startseite mit Öffnungszeiten').first().click()),'braucht das Projekt zuerst seinen Code');
 // "Bei uns ansehen": a server workplace builds the shared state; the fixed address shows it.
 const device=randomUUID(),deviceToken=randomUUID();
 app.db.prepare('INSERT INTO devices(id,owner,name,hash,seen,revoked) VALUES(?,?,?,?,?,0)').run(device,me,'Server',digest(deviceToken),Date.now());
 app.db.prepare("INSERT INTO jobs(id,owner,device,project,action,payload,status,created,result) VALUES(?,?,?,?,'probe','{}','completed',?,'{}')").run(randomUUID(),me,device,project,Date.now());
 const meta=(await (await fetch(host+'/api/room?project='+project,{headers:{Cookie:'studio_session='+session}})).json()).meta;
 await post('/api/team',{action:'live',project,revision:meta.revision,live:'show'});queueShowcases(app.db);
 const show=(await post('/api/runner/poll',{},deviceToken)).job;
 await post('/api/runner/report',{id:show.id,lease:show.lease,ok:true,result:{previewBundle:{'index.html':Buffer.from('<!doctype html><meta charset="utf-8"><body style="font-family:sans-serif;padding:40px"><h1>Café Sonne</h1><p>Mo–Fr 7–18 Uhr</p></body>').toString('base64')}}},deviceToken);
 expect(await screen('07c-ansehen','/?p='+project+'&info=1',390),'Ansehen ›');
 const url=(await (await fetch(host+'/api/room?project='+project,{headers:{Cookie:'studio_session='+session}})).json()).showcase.url;
 const page=await browser.newPage();await page.goto(url);expect(await page.locator('body').innerText(),'Mo–Fr 7–18 Uhr');await page.screenshot({path:path.join(out,'07d-seite.png')});await page.close();
 expect(await screen('08-account','/?page=account&bereich=ki',390),'Einmal verbinden, dann kann jeder Agent');
 await post('/api/room',{action:'create',id:randomUUID(),title:'Internes Projekt',description:'Nur für das eigene Team'});
 const team=await browser.newContext({viewport:{width:390,height:844}});
 await team.addCookies([{name:'studio_session',value:session,url:host}]);
 const leadPage=await team.newPage();leadPage.on('pageerror',e=>errors.push('Projektteam: '+e.message));
 await leadPage.goto(host+'/?p='+project+'&info=1');
 await leadPage.getByRole('button',{name:'+ Team erweitern',exact:true}).click();
 const dialog=leadPage.getByRole('dialog');
 await dialog.getByLabel('Studio-Konto').waitFor();
 await leadPage.screenshot({path:path.join(out,'team-erweitern-390.png')});
 await dialog.getByLabel('Studio-Konto').selectOption(colleague);
 await dialog.getByRole('button',{name:'Dazunehmen',exact:true}).click();
 await leadPage.getByText('Lena Weber',{exact:true}).waitFor();
 await leadPage.getByRole('button',{name:'+ Team erweitern',exact:true}).click();
 await dialog.getByLabel('E-Mail',{exact:true}).fill('fruehschicht@fixture.invalid');
 await dialog.getByRole('button',{name:'Einladungslink erstellen'}).click();
 const inviteField=dialog.getByLabel('Einladungslink');
 await inviteField.waitFor();
 const guest=await browser.newContext({viewport:{width:390,height:844}});
 const guestPage=await guest.newPage();guestPage.on('pageerror',e=>errors.push('Einladung: '+e.message));
 await guestPage.goto(await inviteField.inputValue());
 await guestPage.getByLabel('Dein Name',{exact:true}).fill('Robin Früh');
 await guestPage.locator('input[name=password]').fill(randomBytes(14).toString('hex'));
 await guestPage.getByRole('button',{name:'Beitreten'}).click();
 await guestPage.waitForURL(host+'/?p='+project);
 await guestPage.getByRole('button',{name:'Projektinfo'}).waitFor();
 const guestRooms=await guestPage.request.get(host+'/api/rooms').then(r=>r.json());
 if(guestRooms.rooms.map(r=>r.id).join(',')!==project)throw new Error('Einladung hat andere Projekte geöffnet.');
 await dialog.getByRole('button',{name:'Schließen'}).click();
 await leadPage.getByRole('button',{name:'Robin Früh verwalten'}).click();
 leadPage.once('dialog',d=>d.accept());
 await dialog.getByRole('button',{name:'Aus dem Projekt nehmen'}).click();
 await leadPage.getByRole('button',{name:'Robin Früh verwalten'}).waitFor({state:'hidden'});
 const afterRemoval=await guestPage.request.get(host+'/api/room?project='+project);
 if(afterRemoval.status()!==403)throw new Error('Projekt bleibt nach dem Herausnehmen sichtbar.');
 await guestPage.waitForURL(host+'/');
 await guestPage.getByText('Keine aktiven Projekte',{exact:false}).first().waitFor();
 await guest.close();await team.close();

 for(const width of [390,1440]){
  expect(await screen('projektinfo-'+width,'/?p='+project+'&info=1',width,async p=>{
   const person=p.getByText('Lena Weber',{exact:true});
   await person.scrollIntoViewIfNeeded();
  }),'Macht mit');
  expect(await screen('mein-konto-team-'+width,'/?page=account&bereich=verwaltung',width,async p=>{
   const section=p.locator('#invite');
   await section.getByRole('checkbox',{name:'Café Sonne'}).check();
   if(await section.getByRole('checkbox',{name:'Internes Projekt'}).isChecked())throw new Error('Falsches Projekt vorausgewählt.');
   await section.getByLabel('E-Mail',{exact:true}).fill('neues-mitglied@fixture.invalid');
   await section.getByRole('button',{name:'Einladen',exact:true}).scrollIntoViewIfNeeded();
  }),'Für welche Projekte?');
 }
 for(const width of [390,1440]){
  expect(await screen('konto-uebersicht-'+width,'/?page=account',width),'Studio verwalten');
 }
 expect(await screen('13-profil','/?page=account',390,async p=>{
  await p.getByRole('button',{name:'Profil',exact:true}).click();
  const png=await p.evaluate(()=>{
   const c=document.createElement('canvas');c.width=c.height=32;
   const g=c.getContext('2d');g.fillStyle='#305c42';g.fillRect(0,0,32,32);return c.toDataURL().split(',')[1];
  });
  await p.locator('input[type=file]').setInputFiles({name:'foto.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  await p.getByRole('button',{name:'Foto speichern',exact:true}).click();
  await p.getByText('Foto gespeichert.',{exact:true}).waitFor();
  const src=await p.locator('.ui-profile-card img').getAttribute('src');
  await p.screenshot({path:path.join(out,'profilfoto-390.png')});
  if(!src||(await p.request.get(host+src)).status()!==200)throw new Error('Profilfoto fehlt.');
  const anonymous=await browser.newContext();
  try{if((await anonymous.request.get(host+src)).status()!==401)throw new Error('Profilfoto ist öffentlich.');}finally{await anonymous.close();}
  await p.getByRole('button',{name:'Foto entfernen',exact:true}).click();
  await p.getByText('Foto entfernt.',{exact:true}).waitFor();
  if((await p.request.get(host+src)).status()!==404)throw new Error('Entferntes Profilfoto ist noch abrufbar.');
  await p.getByRole('button',{name:'Zurück',exact:true}).click();
  await p.getByRole('navigation',{name:'Mein Konto',exact:true}).waitFor();
 }),'Mein Konto');
 expect(await screen('09-guide','/?page=guide',390),'Herr Grau plant');
 expect(await screen('11-start-with-projects','/',390),'Café Sonne');
 expect(await screen('10-desktop','/?p='+project+'&tab=tasks',1440),'Café Sonne');
 expect(await screen('14-scroll','/?page=guide',390,async p=>{
  const arrow=p.getByRole('button',{name:'Weiter nach unten',exact:true});
  await arrow.waitFor({state:'visible'});
  await arrow.click();
  await p.waitForFunction(()=>document.querySelector('.ui-screen.page').scrollTop>0);
  await p.locator('.ui-screen.page').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await arrow.waitFor({state:'hidden'});
  await p.emulateMedia({reducedMotion:'reduce'});
  const home=p.getByRole('link',{name:'SCHMAQQ Studio – Start'});
  if(await home.locator('svg g').first().evaluate(el=>getComputedStyle(el).animationName)!=='none')throw new Error('Logo bewegt sich trotz reduzierter Bewegung.');
  await home.click();
  await p.waitForURL(host+'/');
 }),'Café Sonne');
 expect(await screen('15-logo','/',390,async p=>{
  const logo=p.getByRole('link',{name:'SCHMAQQ Studio – Start'}),mark=logo.locator('svg');
  const box=await mark.boundingBox();
  await mark.click({position:{x:box.width-2,y:box.height/2}});
  const wave=await mark.locator('g').evaluateAll(parts=>parts.map(el=>({name:getComputedStyle(el).animationName,delay:parseFloat(el.style.animationDelay)})));
  if(wave[0].name!=='ui-mark-wave'||wave[0].delay<=wave.at(-1).delay)throw new Error('Logo-Welle beginnt nicht am rechten Tipp-Punkt.');
  await p.waitForTimeout(150);
  await p.screenshot({path:path.join(out,'schmaqq-rote-welle-390.png')});
 }),'Café Sonne');
 expect(await screen('12-navigation','/',390,async page=>{
  const open=page.getByRole('button',{name:/Menü öffnen/}),menu=page.getByRole('navigation',{name:'Menü',exact:true});
  if(await open.locator('.ui-face').textContent()!=='N'||!await open.locator('svg').isVisible())throw new Error('Menüknopf zeigt kein eindeutiges Kürzel mit Pfeil.');
  await open.click();await menu.getByRole('button',{name:'Schließen',exact:true}).click();await menu.waitFor({state:'hidden'});
  await open.click();await page.goBack();await menu.waitFor({state:'hidden'});
  await open.click();await page.keyboard.press('Escape');await menu.waitFor({state:'hidden'});
  await page.getByRole('button',{name:/Internes Projekt/}).first().click();
  await page.getByRole('button',{name:'Projektinfo',exact:true}).click();
  await page.getByRole('button',{name:'Mehr',exact:true}).click();
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'Archivieren',exact:true}).click();
  await page.waitForURL(host+'/');
  await page.goBack();
  await page.getByText('Dieses Projekt ist archiviert.',{exact:true}).waitFor();
 }),'Archiv öffnen');
 if(errors.length)throw new Error('Fehler auf der Seite:\n'+errors.join('\n'));
 console.log('WALKTHROUGH=PASS ('+out+')');
}finally{await browser.close();app.server.close();app.previewServer.close();rmSync(dir,{recursive:true,force:true});}
