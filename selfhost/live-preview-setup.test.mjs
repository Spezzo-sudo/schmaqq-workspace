import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {LocalRunner} from './runner.mjs';
import {connectManagedProject,detectProject} from './managed-projects.mjs';

test('project setup stores a live preview command and port, also with an unknown static build',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'serve-setup-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const runner=new LocalRunner({stateDir:path.join(dir,'state'),projects:{},kind:'server',launcher:{url:'http://127.0.0.62:3129',keyFile:'x'}});
 runner.git=async(cwd,...args)=>{if(args.includes('clone')){const target=args.at(-1);mkdirSync(target,{recursive:true});writeFileSync(path.join(target,'package.json'),JSON.stringify({scripts:{test:'node --test',build:'next build',start:'next start'}}));}return '';};
 const job={project:'shop',payload:{repository:'https://github.com/owner/shop',base:'main',automatic:true,publish:false,allowCodex:false,workflow:'pull-request',serve:{argv:['npm','start'],port:3000}}};
 assert.equal((await connectManagedProject(runner,job)).configured,true);
 assert.deepEqual(runner.config.projects.shop.preview,{serve:{argv:['npm','start'],port:3000}});
 assert.deepEqual(runner.config.projects.shop.check,['node','--test']);
 const saved=JSON.parse(readFileSync(path.join(dir,'state','connected-projects.private.json'),'utf8'));
 assert.deepEqual(saved.shop.preview.serve,{argv:['npm','start'],port:3000},'Survives a runner restart');
 assert.throws(()=>detectProject(runner.config.projects.shop.repo),/nicht automatisch erkannt/,'Without a live preview the unknown build still stops');
 for(const serve of [{argv:[],port:3000},{argv:['npm','start'],port:80},{argv:['npm','start'],port:'3000'}])
  await assert.rejects(connectManagedProject(runner,{...job,project:'other',payload:{...job.payload,serve}}),/Live-Vorschau-Konfiguration ungültig/);
 runner.close();
});
