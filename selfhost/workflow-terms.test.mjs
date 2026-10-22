import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {jobActions,jobStates,jobStateLabel,copyStateLabel} from '../app/workflow-terms.ts';

const jobStatuses=['queued','running','completed','failed','interrupted','cancelled','cancelling'];

test('every development job action accepted by the Studio API has one visible label',()=>{
 const server=readFileSync(new URL('./server.mjs',import.meta.url),'utf8');
 const operations=server.match(/z\.enum\(\[([^\]]*'inspect'[^\]]*)\]\)/);
 assert.ok(operations,'operation enum not found in server.mjs');
 for(const operation of operations[1].match(/'([^']+)'/g).map(value=>value.slice(1,-1)))assert.ok(jobActions[operation],`missing label for ${operation}`);
 assert.ok(jobActions['local-ai']);
 assert.equal(jobActions.review,'Prüfstand erstellen');
});

test('job states use one label per state and failures never read as success',()=>{
 for(const status of jobStatuses)assert.ok(jobStates[status],`missing label for ${status}`);
 assert.equal(new Set(Object.values(jobStates)).size,Object.keys(jobStates).length);
 assert.equal(jobStateLabel('failed'),'Fehlgeschlagen');
 for(const status of ['failed','interrupted','cancelled','cancelling'])assert.doesNotMatch(jobStateLabel(status),/erfolg|bestanden/i);
 assert.equal(jobStateLabel('unexpected'),'Status unbekannt');
});

test('copy states distinguish ready, interrupted and archived copies',()=>{
 assert.equal(copyStateLabel('completed'),'Bereit');
 assert.equal(copyStateLabel('completed',true),'Abgeschlossen');
 assert.equal(copyStateLabel('interrupted'),'Erstellung unterbrochen');
 assert.equal(copyStateLabel('queued'),'Wartet auf PC');
 assert.equal(copyStateLabel('running'),'Wird erstellt');
});

test('visible app texts use one term per concept and no local state tables',()=>{
 const appDir=new URL('../app/',import.meta.url);
 for(const file of readdirSync(appDir).filter(name=>/\.tsx?$/.test(name)&&name!=='workflow-terms.ts')){
  const source=readFileSync(new URL(file,appDir),'utf8');
  assert.doesNotMatch(source,/Arbeitsbereich/,`${file} still uses Arbeitsbereich`);
  assert.doesNotMatch(source,/Teamprüfung anfordern|'Gestoppt'|Erfolgreich beendet/,`${file} defines its own job labels`);
 }
});
