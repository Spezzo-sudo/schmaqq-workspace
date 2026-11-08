import test from 'node:test';
import assert from 'node:assert/strict';
import {groupEvents,when} from '../studio/project-overview-model.ts';

const task=(over={})=>({id:'t1',project:'p',title:'Analyse',description:'',status:'doing',priority:'normal',assignee:'me',
 contract:{kind:'general',criteria:'',requiresReview:false,blocked:'',cancelled:false,revision:0},completion:{ready:false,missing:['Das erreichte Ergebnis bitte zuerst festhalten.'],result:null},...over});
const names=new Map([['me','Marco'],['other','Markus']]);

test('history groups repeated work per person and task and keeps milestones apart',()=>{
 const h=3600000,e=(id,kind,body,created,taskId='t1',actor='me')=>({id,actor,project:'p',task:taskId,kind,body,created});
 const events=[e('1','save-file','Datei gespeichert',10*h),e('2','save-file','Datei gespeichert',9*h),e('3','save-file','Datei gespeichert',8*h),
  e('4','result','Ergebnis eingereicht: Analyse',7*h),e('5','save-file','Datei gespeichert',6*h,'t2'),e('6','save-file','Datei gespeichert',5*h,'t2','other'),
  e('7','save-file','Datei gespeichert',-2*h,'t2','other')];
 const groups=groupEvents(events,new Map([['t1','Analyse'],['t2','Design']]));
 assert.deepEqual(groups.map(g=>[g.body,g.count,g.task,g.actor]),[['3 Dateien gespeichert',3,'t1','me'],['Ergebnis eingereicht',1,'t1','me'],
  ['Datei gespeichert',1,'t2','me'],['Datei gespeichert',1,'t2','other'],['Datei gespeichert',1,'t2','other']],'Title suffix removed; gaps over six hours split');
 assert.equal(groups[0].latest,10*h);
});

test('times read as today, yesterday or a short date',()=>{
 const now=new Date(2026,9,30,10,0).getTime();
 assert.match(when(new Date(2026,9,30,8,5).getTime(),now),/^heute 08:05$/);
 assert.match(when(new Date(2026,9,29,23,17).getTime(),now),/^gestern 23:17$/);
 assert.match(when(new Date(2026,9,20,9,0).getTime(),now),/^20\.10\., 09:00$/);
});
