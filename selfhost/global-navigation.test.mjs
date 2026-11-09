import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readRoomRoute,roomResumeURL} from '../studio/room-model.ts';

test('global Studio sections have distinct bookmarkable routes',()=>{
 for(const page of ['rooms','projects','conversations','team','account','guide']){
  const query=page==='rooms'?'':'?page='+page;
  const route=readRoomRoute(query);
  assert.equal(route.page,page);
  assert.equal(route.room,'');
  const restored=readRoomRoute(roomResumeURL(query).split('?')[1]?'?'+roomResumeURL(query).split('?')[1]:'');
  assert.equal(restored.page,page);
 }
});

test('existing project conversation and task links remain valid',()=>{
 const route=readRoomRoute('?room=klimafinder&tab=talk&task=task-123');
 assert.equal(route.page,'rooms');
 assert.equal(route.room,'klimafinder');
 assert.equal(route.tab,'talk');
 assert.equal(route.task,'task-123');
 assert.equal(roomResumeURL('?room=klimafinder&tab=talk&task=task-123'), '/?room=klimafinder&task=task-123');
 assert.equal(readRoomRoute('?project=klimafinder&view=chat').tab,'talk');
 assert.equal(readRoomRoute('?page=team').page,'team');
 assert.equal(readRoomRoute('?room=klimafinder&tab=tasks').tab,'tasks');
});

test('unknown pages and unsafe redirects cannot become navigation targets',()=>{
 assert.equal(readRoomRoute('?page=https%3A%2F%2Fevil.example').page,'rooms');
 assert.equal(roomResumeURL('?page=bad&room=..%2F..&task=bad%2Ftask'),'/');
});

test('mobile global bar does not replace the project conversation component',()=>{
 const page=readFileSync(new URL('../studio/team-workspace.tsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../studio/studio-navigation.css',import.meta.url),'utf8');
 assert.match(page,/<Conversation key=\{room\.project\.id\}/);
 assert.match(page,/route\.page==='conversations'/);
 assert.match(page,/tab:'talk'/);
 assert.match(page,/studio-mobile-nav/);
 assert.match(css,/\.team-shell \.team-areas\{position:static/);
 assert.match(css,/\.team-shell \.studio-mobile-nav\{position:fixed/);
 assert.match(css,/\n\.team-shell \.studio-mobile-nav\{display:none\}/,'above 650 px only the sidebar navigates');
 assert.doesNotMatch(page,/Codex in Studio ausführen/);
});

test('every former-view function has a place in the new navigation',()=>{
 const page=readFileSync(new URL('../studio/team-workspace.tsx',import.meta.url),'utf8');
 const general=readFileSync(new URL('../studio/studio-general.tsx',import.meta.url),'utf8');
 assert.match(page,/<GeneralChat /);
 assert.match(page,/<GeneralKnowledge\/>/);
 assert.match(page,/<DownloadAll\/>/);
 assert.match(page,/<ProjectBriefing /);
 assert.match(page,/<PluginGrants\/>/);
 assert.match(page,/studio-account-button/);
 assert.doesNotMatch(page,/studio-more/);
 assert.match(general,/channel:'general'/);
 assert.match(general,/filter\(d=>!d\.project\)/);
});
