import test from 'node:test';
import assert from 'node:assert/strict';
import {runLine,runActive,duration,jobOf,introOf,JOBS,teamOrder,taskState} from '../studio/ui/model.ts';
import {splitDiff,outsideScope} from '../studio/ui/diff.ts';

// What the app says about agents and their work (studio/ui/model.ts). No engine names, no technical codes.

test('a run is one honest line: waiting, working with its last real step, failed with a reason, stopped',()=>{
 const base={id:'r',owner:'o',project:'p',agent:'a',message:'m',created:0,updated:0,completedMessage:null,errorCode:null};
 assert.equal(runLine({...base,status:'queued',position:1},'Otto',0).text,'Otto fängt gleich an');
 assert.equal(runLine({...base,status:'queued',position:3},'Otto',0).text,'Otto wartet (Platz 3)');
 assert.match(runLine({...base,status:'queued'},'Otto',0,false).text,/KI-Zugang ist gerade nicht erreichbar/);
 const working=runLine({...base,status:'running',started:0,steps:[{tool:'code.change',at:1}]},'Otto',65000);
 assert.deepEqual([working.tone,working.text,working.stop],['work','Otto ändert den Code · 1 min 5 s',true]);
 assert.equal(runLine({...base,status:'running',started:0,steps:[{tool:'web.read',at:1}]},'Eule',3000).text,'Eule liest eine Webseite · 3 s');
 const failed=runLine({...base,status:'failed',errorCode:'quota-exceeded'},'Otto',0);
 assert.deepEqual([failed.tone,failed.retry],['fail',true]);assert.match(failed.text,/Kontingent/);
 assert.equal(runLine({...base,status:'cancelled'},'Otto',0).text,'Otto wurde gestoppt.');
 assert.equal(runLine({...base,status:'completed'},'Otto',0),null,'a finished run is its answer in the chat, not a line');
 assert.ok(runActive({status:'cancelling'}));assert.ok(!runActive({status:'completed'}));
 assert.equal(duration(400),'1 s');assert.equal(duration(120000),'2 min');
 for(const code of ['timeout','provider-unavailable','model-unavailable','quota-exceeded','protocol-error'])
  assert.doesNotMatch(runLine({...base,status:'failed',errorCode:code},'X',0).text,/gpt|codex|hermes|modell/i,code);
});

test('the company: the role decides the job, the lead leads, everyone introduces themselves in one sentence',()=>{
 const lead={name:'Herr Grau',role:'advisor',lead:true},otto={name:'Otto',role:'developer'},kern={name:'Frau Kern',role:'reviewer'},eule={name:'Eule',role:'researcher'};
 assert.deepEqual([jobOf(lead).title,jobOf(lead).lead,jobOf(lead).code],['Leitung',true,false],'the lead does not code');
 assert.deepEqual([jobOf(otto).title,jobOf(otto).code],['Entwicklung',true]);
 assert.deepEqual([jobOf(kern).title,jobOf(kern).review],['Prüfung',true]);
 assert.deepEqual([jobOf(eule).title,jobOf(eule).web],['Recherche',true]);
 assert.equal(jobOf({role:'coordinator'}).title,'Beratung');
 assert.match(introOf(lead),/^Ich bin Herr Grau, eure Projektleitung\. Sagt mir, was ihr erreichen wollt/);
 assert.equal(introOf(otto),'Ich bin Otto, Entwicklung im Team. Ich ändere den Code eurer Aufgaben und sage euch, was ich geändert habe.');
 for(const j of JOBS)assert.match(j.me,/^Ich /,j.role);
 const order=teamOrder([{...otto,id:'o',created:2,active:true},{...lead,id:'l',created:5,active:true},{...kern,id:'k',created:1,active:false}]);
 assert.deepEqual(order.map(a=>a.name),['Herr Grau','Otto'],'lead first, former colleagues not in the team');
});

test('a task says where it stands in one word',()=>{
 const t=(status,kind='code',result=null)=>taskState({status,contract:{kind},completion:{result}});
 assert.equal(t('todo').label,'Offen');assert.equal(t('doing').label,'In Arbeit');
 assert.equal(t('review').label,'Zum Freigeben');assert.equal(t('doing','code',{integrated:false}).label,'Zum Freigeben');
 assert.equal(t('done').label,'Erledigt');assert.equal(t('doing','general',{integrated:false}).label,'In Arbeit');
});

test('a change shows as files with added and removed lines; files outside the project area are named with their owner',()=>{
 const diff='diff --git a/site/index.html b/site/index.html\nindex 1..2 100644\n--- a/site/index.html\n+++ b/site/index.html\n@@ -1 +1 @@\n-<h1>Alt</h1>\n+<h1>Neu</h1>\ndiff --git a/api/x.js b/api/x.js\nnew file mode 100644\n--- /dev/null\n+++ b/api/x.js\n@@ -0,0 +1,2 @@\n+a\n+b';
 assert.deepEqual(splitDiff(diff).map(f=>[f.name,f.added,f.removed]),[['site/index.html',1,1],['api/x.js',2,0]]);
 assert.deepEqual(outsideScope(diff,['site/'],[{id:'b',title:'Backend',scope:['api/']}]),[{file:'api/x.js',owner:'Backend'}]);
 assert.deepEqual(outsideScope(diff,[]),[],'without an area nothing is outside');
});
