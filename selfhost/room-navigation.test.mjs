import test from 'node:test';
import assert from 'node:assert/strict';
import {readRoomRoute,roomResumeURL} from '../studio/room-model.ts';

test('room navigation: mobile planning has an empty optional project context',()=>{
 assert.deepEqual(readRoomRoute(''),{room:'',tab:'talk',task:'',page:'rooms'});
 assert.deepEqual(readRoomRoute('?room=project-1&task=task-1&tab=tasks'),{room:'project-1',tab:'tasks',task:'task-1',page:'rooms'});
});
test('room navigation: older project/task links lead to the same new room rather than another workspace',()=>{
 assert.deepEqual(readRoomRoute('?view=task&project=project-1&task=task-1'),{room:'project-1',tab:'talk',task:'task-1',page:'rooms'});
 assert.equal(readRoomRoute('?view=docs&project=project-1').tab,'knowledge');
 assert.equal(readRoomRoute('?view=development&project=project-1').tab,'connect');
 assert.equal(readRoomRoute('?view=team').page,'team');
 assert.equal(readRoomRoute('?project=all&view=tasks').room,'');
 assert.equal(readRoomRoute('?task=task-1').task,'');
});
test('room navigation: reauthentication restores only an allowed internal destination',()=>{
 assert.equal(roomResumeURL('?room=project-1&task=task-1&pane=work&tab=tasks'), '/?room=project-1&tab=tasks&task=task-1&pane=work');
 assert.equal(roomResumeURL('?view=task&project=project-1&task=task-1&setup=secret'), '/?room=project-1&task=task-1');
 assert.equal(roomResumeURL('?room=https://attacker.invalid&task=task-1&returnTo=https://attacker.invalid'), '/');
 assert.equal(roomResumeURL('?room=project-1&pane=evil&invite=secret&tab=evil'), '/?room=project-1');
 assert.equal(roomResumeURL('?page=team'), '/?page=team');
});
