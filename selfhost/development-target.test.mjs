import test from 'node:test';
import assert from 'node:assert/strict';
import {ownTaskCopy,preferredSoloWorkspace} from '../app/development-target.ts';

test('task navigation resumes its existing own copy even when a different device is preferred online',()=>{
 const saved={id:'saved-copy',owner:'marco',project:'website',taskId:'homepage',status:'completed',archived:0,revoked:0,device:'original-offline-pc'};
 const copies=[{...saved,id:'different-task',taskId:'services',device:'new-online-pc'},{...saved,id:'other-person',owner:'markus'},saved];
 assert.equal(ownTaskCopy(copies,'marco','website','homepage')?.device,'original-offline-pc');
 assert.equal(ownTaskCopy(copies,'marco','website','homepage')?.id,'saved-copy');
 for(const changed of [{owner:'markus'},{project:'other'},{taskId:'other'},{archived:1},{revoked:1},{status:'queued'},{status:'interrupted'}])assert.equal(ownTaskCopy([{...saved,...changed}],'marco','website','homepage'),undefined);
 assert.equal(ownTaskCopy([],'marco','website','homepage'),undefined);
});

test('solo defaults to owned online copy instead of an unrelated first project',()=>{
 const now=Date.now(),devices=[{id:'personal',owner:'marco',seen:now},{id:'offline',owner:'marco',seen:0},{id:'other',owner:'markus',seen:now}];
 const base={owner:'marco',status:'completed',archived:0,revoked:0,taskId:null,created:20};
 const copies=[{...base,id:'foreign',owner:'markus',project:'automation',device:'other',created:500},{...base,id:'older',project:'website',device:'offline'},{...base,id:'ready',project:'website',device:'personal',created:10}];
 assert.equal(preferredSoloWorkspace(copies,'marco',['automation','website'],devices,now)?.id,'ready');
 assert.equal(preferredSoloWorkspace(copies,'marco',['automation'],devices,now),undefined);
 assert.equal(preferredSoloWorkspace(copies,'markus',['automation','website'],devices,now)?.id,'foreign');
});
