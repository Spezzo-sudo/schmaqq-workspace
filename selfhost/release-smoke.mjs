import {mkdtempSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
import {once} from 'node:events';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
const release=path.resolve(process.argv[2]??'');
const manifest=JSON.parse(readFileSync(path.join(release,'release-manifest.json'),'utf8'));
for(const f of manifest.files){assert.ok(!f.path.includes('..')&&!f.path.startsWith('/')&&!f.path.includes('\\'));assert.ok(!/\.sqlite|\.private\.json|setup-link|\.env$/.test(f.path));const buffer=readFileSync(path.join(release,f.path));assert.equal(createHash('sha256').update(buffer).digest('hex'),f.sha256);}
const data=mkdtempSync(path.join(os.tmpdir(),'studio-release-')),origin='http://127.0.0.1:44323';
const env={...process.env,STUDIO_DATA_DIR:data,STUDIO_ORIGIN:origin,STUDIO_PREVIEW_ORIGIN:'http://127.0.0.1:44324',STUDIO_BIND:'127.0.0.1',PORT:'44323',STUDIO_PREVIEW_PORT:'44324'};
const child=spawn(process.execPath,['selfhost/server.mjs'],{cwd:release,env,windowsHide:true,stdio:'pipe'});let log='';child.stdout.on('data',b=>log+=b);child.stderr.on('data',b=>log+=b);
try{
 let ready=false;for(let i=0;i<60;i++){try{ready=(await fetch(origin+'/healthz')).ok;}catch{}if(ready)break;if(child.exitCode!==null)throw new Error(log);await new Promise(r=>setTimeout(r,100));}assert.ok(ready,log);
 assert.ok(existsSync(path.join(data,'studio.sqlite')));assert.ok(!existsSync(path.join(release,'.studio')));
 const html=await (await fetch(origin)).text();assert.match(html,/<script/);const asset=html.match(/src="([^"]+\.js)"/)[1];assert.equal((await fetch(new URL(asset,origin))).status,200);
 assert.equal((await fetch(origin+'/api/development')).status,401);
 assert.equal((await fetch(origin+'/api/development/github-pr?job=none')).status,401);
 const setup=new URL(readFileSync(path.join(data,'setup-link.txt'),'utf8')).searchParams.get('setup');
 const response=await fetch(origin+'/api/auth/bootstrap',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({setup,email:'smoke@fixture.invalid',name:'Release test',password:'fixture-password-12345'})});assert.equal(response.status,200);
 const cookie=response.headers.get('set-cookie').split(';')[0];const state=await (await fetch(origin+'/api/development',{headers:{Cookie:cookie}})).json();assert.deepEqual(state.workspaces,[]);assert.deepEqual(state.activeDeviceIds,[]);
 // A fresh install has no projects: create one the way the app does, then a task in it.
 const created=await fetch(origin+'/api/room',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({action:'create',id:'3a9d5c2e-7b1f-4e6a-8c0d-2f4b6a8e1c33',title:'Release-Probe',description:'Fixture'})});assert.equal(created.status,200,await created.clone().text());const projectId=(await created.json()).project;
 const createTask=await fetch(origin+'/api/room',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({action:'task',id:'0f2c1a7e-5d3b-4c8e-9a1f-6b2d4e8c0a11',project:projectId,title:'Release collaboration test',description:'Fixture',kind:'general',criteria:'',mine:true})});assert.equal(createTask.status,200,await createTask.clone().text());
 const project=await (await fetch(origin+'/api/collaboration?project='+encodeURIComponent(projectId),{headers:{Cookie:cookie}})).json();assert.equal(project.tasks.length,1);
 const comment=await fetch(origin+'/api/collaboration/task',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({action:'comment',task:project.tasks[0].id,id:'release-smoke-comment',body:'Durable task discussion'})});assert.equal(comment.status,200);
 const backup=path.join(data,'backup.sqlite');execFileSync(process.execPath,['selfhost/backup.mjs',backup],{cwd:release,env,windowsHide:true});const db=new DatabaseSync(backup);assert.equal(db.prepare('SELECT count(*) AS n FROM members').get().n,1);assert.equal(db.prepare('SELECT body FROM task_comments WHERE id=?').get('release-smoke-comment').body,'Durable task discussion');db.close();
 console.log('Release verified: manifest, isolated data directory, HTTP assets, authentication, workspace schema, task discussion and consistent backup. No VPS deployment performed.');
}finally{if(child.exitCode===null){const closed=once(child,'close');child.kill();await closed;}assert.ok(data.startsWith(path.join(os.tmpdir(),'studio-release-')));rmSync(data,{recursive:true,force:true});}
