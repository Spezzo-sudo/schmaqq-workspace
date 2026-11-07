// Synthetic local UI fixture. No real accounts, external repositories or VPS.
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudioServer} from '../selfhost/server.mjs';
import {passwordHash,digest} from '../selfhost/store.mjs';
import {startRunner,command} from '../selfhost/runner.mjs';

const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-setup-browser-'));
const origin='http://127.0.0.1:45781';
const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:45782',resetMailer:null,sessionCookie:'setup_fixture_session'});
const now=Date.now(),access='setup-fixture-device-token-not-a-real-credential';
app.db.prepare('INSERT INTO members(id,email,name,role,password,seen) VALUES(?,?,?,?,?,?)').run('setup-owner','setup@fixture.invalid','Setup Testkonto','owner',passwordHash('Synthetic-Setup-2026'),now);
app.db.prepare('INSERT INTO devices(id,owner,name,hash,seen,revoked) VALUES(?,?,?,?,?,0)').run('setup-device','setup-owner','Lokaler Testrechner',digest(access),now);
const projects={};
for(const [id,title,files] of [
 ['setup-node','Node-Beispiel',{'package.json':JSON.stringify({scripts:{test:'node --test',build:'node scripts/build.mjs'}})}],
 ['setup-make','Python-/Make-Beispiel',{'Makefile':'PYTHON ?= python3\nbuild-bootstrap:\n\tpython3 -m venv .venv-build\nbuild:\n\tpython3 tools/build.py --output "$(CURDIR)/build/site"\nbuild-check: build\n\tpython3 tests/check.py\n'}],
 ['setup-unknown','Unbekanntes Projekt',{'README.md':'Ein Projekt ohne vordefinierte Testkonvention.'}],
 ['setup-missing','Fehlendes Programm',{'studio.project.json':JSON.stringify({version:1,check:['studio-missing-fixture-program'],requires:['studio-missing-fixture-program']})}]
]){
 app.db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run(id,title,'Synthetische lokale Einrichtungsprüfung','sage','Test',now);
 app.db.prepare('INSERT INTO workspace_meta VALUES(?,?)').run('room:v1:project:'+id,JSON.stringify({teamShared:true,repository:'https://github.com/fixture/'+id,base:'main',workflow:'pull-request',revision:1}));
 const repo=path.join(dir,id);mkdirSync(repo);
 for(const [name,body] of Object.entries(files))writeFileSync(path.join(repo,name),body);
 const git=(...args)=>command(['git',...args],repo);
 await git('init','-b','main');await git('config','user.name','Setup Fixture');await git('config','user.email','setup@fixture.invalid');await git('add','.');await git('commit','-m','Synthetic setup example');await git('remote','add','origin','https://github.com/fixture/'+id);
 projects[id]={repo,base:'main',check:[],publish:false,allowCodex:false,workflow:'pull-request'};
}
await new Promise(r=>app.server.listen(45781,'127.0.0.1',r));
await new Promise(r=>app.previewServer.listen(45782,'127.0.0.1',r));
console.log(JSON.stringify({origin,fixtureDirectory:dir,synthetic:true}));
await startRunner({server:origin,token:access,stateDir:path.join(dir,'runner'),projects});
