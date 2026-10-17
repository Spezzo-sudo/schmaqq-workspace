// Deliberately exercises only the isolated local example created by demo.mjs.
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const directory=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../.studio/local-demo');
const settings=JSON.parse(readFileSync(path.join(directory,'demo.private.json'),'utf8'));
assert.equal(settings.origin,'http://127.0.0.1:4320');
async function request(route,data,cookie){const r=await fetch(settings.origin+route,{method:data?'POST':'GET',headers:{...(data?{Origin:settings.origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});const value=await r.json();assert.ok(r.ok,value.error);return {value,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const accounts=[];for(const a of settings.accounts){const login=await request('/api/auth/login',{email:a.email,password:a.password});assert.match(login.cookie,/^studio_demo_session=/);accounts.push({...a,cookie:login.cookie});}
const [a,b]=accounts;
async function wait(id,cookie){for(let n=0;n<60;n++){const {value}=await request('/api/development/job?id='+id,null,cookie);if(value.job.status==='completed')return value.job.result;if(['failed','cancelled','interrupted'].includes(value.job.status))throw new Error(JSON.stringify(value.job.result));await new Promise(r=>setTimeout(r,1000));}throw new Error('Demo runner timeout');}
for(const a of accounts)await wait(a.worktree,a.cookie);
async function job(account,operation,extra={}){const {value}=await request('/api/development',{action:'job',operation,device:account.device,project:'website',worktree:account.worktree,...extra},account.cookie);return {id:value.id,result:await wait(value.id,account.cookie)};}
const opened=await job(a,'read-file',{file:'site/index.html'});
const content=opened.result.content.replace('</h1>','</h1>\n<p>Gemeinsam geprüft: lokaler Zwei-Personen-Probelauf.</p>');
await job(a,'save-file',{file:'site/index.html',revision:opened.result.revision,content});
const checked=await job(a,'check');assert.match(checked.result.checks,/bestanden/);
const preview=await job(a,'preview');const page=await (await fetch(preview.result.url)).text();assert.match(page,/Zwei-Personen-Probelauf/);
const review=await job(a,'review');assert.match(review.result.diff,/Zwei-Personen-Probelauf/);
const feedback=await request('/api/development/reviews',{id:randomUUID(),job:review.id,commit:review.result.commit,decision:'approved',body:'Lokaler Probelauf: Änderung und Tests mit zweitem Testkonto geprüft.'},b.cookie);assert.equal(feedback.value.state,'approved');
await job(b,'check');
const state=(await request('/api/development',null,a.cookie)).value;assert.equal(state.workspaces.filter(w=>w.status==='completed').length,2);
const summary={checkedAt:new Date().toISOString(),testOnly:true,accounts:2,runners:2,checks:['Two private sessions','Two prepared worktrees','Read/write source','Real checks on both runners','Built preview','Review by second account'],review:review.id,preview:preview.result.url};
writeFileSync(path.join(directory,'verified.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
