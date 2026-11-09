#!/usr/bin/env node
// Layout check before every package: squeezed text (a column so narrow that only a few words fit per line),
// text running out of its box, sideways scrolling, and two navigations at once – on phone and computer width,
// with every fold-out opened. Needs the local demo (node selfhost/demo.mjs) and Playwright.
//   node selfhost/layout-check.mjs [base-url] [user] [password]
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let playwright;try{playwright=require('playwright');}catch{console.error('Playwright fehlt. Lokal mit installiertem Playwright ausführen.');process.exit(2);}
const [base='http://127.0.0.1:4320',user='marco.demo@fixture.invalid',password=process.env.STUDIO_DEMO_PASSWORD??'']=process.argv.slice(2);
if(!password){console.error('Passwort fehlt (3. Argument oder STUDIO_DEMO_PASSWORD).');process.exit(2);}

const browser=await playwright.chromium.launch();
const findings=[];
for(const [label,viewport] of [['Handy',{width:390,height:844}],['Computer',{width:1280,height:900}]]){
 const page=await (await browser.newContext({viewport})).newPage();
 await page.goto(base+'/');await page.locator('input[name=email]').fill(user);await page.locator('input[type=password]').first().fill(password);await page.keyboard.press('Enter');await page.waitForTimeout(2500);
 const rooms=(await (await page.request.get(base+'/api/rooms')).json()).rooms??[];
 const pages=[['Arbeit',''],['Projekte','?page=projects'],['Gespräche','?page=conversations'],['Team','?page=team'],['Konto','?page=account'],['Anleitung','?page=guide']];
 for(const r of rooms.slice(0,2))for(const tab of ['overview','tasks','talk','knowledge','connect'])pages.push([r.title+' · '+tab,`?room=${r.id}&tab=${tab}`]);
 for(const [name,query] of pages){
  await page.goto(base+'/'+query);await page.waitForTimeout(1800);
  // Open every fold-out (several rounds for nested ones).
  for(let round=0;round<3;round++)await page.evaluate(()=>document.querySelectorAll('details:not([open])').forEach(d=>d.setAttribute('open','')));
  await page.waitForTimeout(400);
  const found=await page.evaluate(()=>{
   const out=[],W=document.documentElement.clientWidth,visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
   if(document.documentElement.scrollWidth>W+1)out.push('Seite scrollt seitlich ('+document.documentElement.scrollWidth+' > '+W+' px)');
   const navs=[...document.querySelectorAll('nav[aria-label="Hauptnavigation"]')].filter(visible);if(navs.length>1)out.push('Zwei Hauptnavigationen gleichzeitig sichtbar');
   for(const e of document.querySelectorAll('p,li,dd,dt,small,label,h2,h3,h4,summary,strong')){
    if(!visible(e))continue;const text=(e.textContent||'').trim();if(text.length<40)continue;const r=e.getBoundingClientRect();
    if(r.width<150)out.push(`Gequetscht (${Math.round(r.width)} px breit): „${text.slice(0,50)}…“`);
    if(r.right>W+1&&getComputedStyle(e).position!=='fixed')out.push(`Läuft rechts raus: „${text.slice(0,50)}…“`);
   }
   return [...new Set(out)].slice(0,8);
  });
  for(const f of found)findings.push(`${label} · ${name}: ${f}`);
 }
}
await browser.close();
if(findings.length){console.log(findings.join('\n'));console.log(`\n${findings.length} Layout-Funde.`);process.exit(1);}
console.log('Layout-Prüfung bestanden: kein gequetschter oder überlaufender Text, kein seitliches Scrollen, ein Menü.');
