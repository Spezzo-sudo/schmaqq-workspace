import test from 'node:test';
import assert from 'node:assert/strict';
import {agentRunSummary,agentRunActive,agentStepLabel,workDuration,agentExecutionStatus} from '../studio/room-model.ts';

const run={id:'r',owner:'o',project:'p',agent:'mara',message:'m',model:'x',created:1000,updated:1000,completedMessage:null,errorCode:null};

test('work line: one plain sentence per state, with stop and retry only where they make sense',()=>{
 const line=(extra,now=61000,online=true)=>agentRunSummary({...run,...extra},'Mara',now,online);
 assert.deepEqual(line({status:'queued',position:1}),{tone:'waiting',text:'Mara fängt gleich an',canStop:true,canRetry:false});
 assert.equal(line({status:'queued',position:3}).text,'Wartet · Platz 3');
 assert.match(line({status:'queued',position:1},61000,false).text,/gerade nicht erreichbar/);
 assert.deepEqual(line({status:'running',started:1000}),{tone:'working',text:'Mara arbeitet · 1 min',canStop:true,canRetry:false});
 assert.equal(line({status:'cancelling'}).canStop,false);
 assert.deepEqual(line({status:'completed',started:1000,finished:15000}),{tone:'done',text:'Hat 14 s gearbeitet',canStop:false,canRetry:false});
 assert.deepEqual(line({status:'cancelled'}),{tone:'stopped',text:'Gestoppt',canStop:false,canRetry:true});
 assert.deepEqual(line({status:'failed',errorCode:'timeout'}),{tone:'failed',text:'Keine Antwort. Das hat zu lange gedauert.',canStop:false,canRetry:true});
 assert.equal(line({status:'failed',errorCode:'something-new'}).text,'Keine Antwort. Dabei ist ein Fehler passiert.');
});

test('work line: durations, step names and wording never mention an engine or an error code',()=>{
 assert.deepEqual([workDuration(200),workDuration(59400),workDuration(60000),workDuration(135000)],['1 s','59 s','1 min','2 min 15 s']);
 assert.equal(agentStepLabel('project.read_context'),'Projektstand gelesen');
 assert.equal(agentStepLabel('task.propose'),'Aufgabe vorgeschlagen');
 assert.equal(agentStepLabel('unknown.tool'),'Arbeitsschritt');
 const texts=['queued','running','cancelling','completed','cancelled','failed'].flatMap(status=>
  ['timeout','provider-unavailable','quota-exceeded','protocol-error','crash',null].map(errorCode=>agentRunSummary({...run,status,errorCode},'Mara',5000,false).text));
 for(const text of texts)assert.doesNotMatch(text,/hermes|codex|worker|provider|protocol|timeout|crash/i,text);
 assert.deepEqual(['queued','running','cancelling','completed','failed','cancelled'].map(status=>agentRunActive({status})),[true,true,true,false,false,false]);
});

test('agent status: an unreachable AI access is shown as such instead of "ready"',()=>{
 const agent={id:'mara',name:'Mara',model:'x',role:'frontend',capabilities:['chat']};
 assert.equal(agentExecutionStatus(agent,[],[],{configured:true,online:true,runs:[]}).label,'Bereit');
 const away=agentExecutionStatus(agent,[],[],{configured:true,online:false,runs:[]});
 assert.deepEqual([away.state,away.label],['idle','Gerade nicht erreichbar']);
 assert.equal(agentExecutionStatus(agent,[],[],{configured:true,online:false,runs:[{...run,status:'queued'}]}).state,'running');
});
