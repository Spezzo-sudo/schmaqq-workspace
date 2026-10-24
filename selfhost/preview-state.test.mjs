import test from 'node:test';
import assert from 'node:assert/strict';
import {previewState} from '../app/preview-state.ts';
import {readRoute,writeRoute} from '../app/workspace-model.ts';

test('preview distinguishes unsaved, changed, unverified, running and failed snapshots',()=>{
 assert.match(previewState({dirty:true,status:'completed',freshness:'same'}).text,/ungespeicherte/);
 assert.equal(previewState({dirty:false,status:'completed',changedAfter:true,freshness:'same'}).tone,'warning');
 assert.equal(previewState({dirty:false,status:'completed',freshness:'unverified'}).tone,'warning');
 assert.match(previewState({dirty:false,status:'completed',freshness:'same'}).text,/zuletzt abgeglichenen/);
 assert.match(previewState({dirty:false,status:'running'}).text,/vorbereitet/);
 assert.match(previewState({dirty:false,status:'failed'}).text,/nicht erfolgreich/);
 assert.match(previewState({dirty:false}).text,/Noch keine/);
});

test('preview tab survives a deep link and reload like the other task tabs',()=>{
 const route={view:'task',project:'project',task:'task',tab:'preview'};
 const url=writeRoute(new URL('http://studio.test/'),route);
 assert.deepEqual(readRoute(url.search,['overview','help','settings']),route);
});
