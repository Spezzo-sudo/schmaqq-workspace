import test from 'node:test';
import assert from 'node:assert/strict';
import {ownTaskCopy} from '../app/development-target.ts';

test('task navigation resumes its existing own copy even when a different device is preferred online',()=>{
 const saved={id:'saved-copy',owner:'marco',project:'website',taskId:'homepage',status:'completed',archived:0,revoked:0,device:'original-offline-pc'};
 const copies=[{...saved,id:'different-task',taskId:'services',device:'new-online-pc'},{...saved,id:'other-person',owner:'markus'},saved];
 assert.equal(ownTaskCopy(copies,'marco','website','homepage')?.device,'original-offline-pc');
 assert.equal(ownTaskCopy(copies,'marco','website','homepage')?.id,'saved-copy');
 for(const changed of [{owner:'markus'},{project:'other'},{taskId:'other'},{archived:1},{revoked:1},{status:'queued'},{status:'interrupted'}])assert.equal(ownTaskCopy([{...saved,...changed}],'marco','website','homepage'),undefined);
 assert.equal(ownTaskCopy([],'marco','website','homepage'),undefined);
});
