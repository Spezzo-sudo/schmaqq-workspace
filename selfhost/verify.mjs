import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<24||major===24&&minor<15)throw new Error('Node.js >=24.15.0 erforderlich.');
function run(args){const p=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true});if(p.error)throw p.error;if(p.status!==0)process.exit(p.status??1);}
run(['selfhost/source-guard.mjs']);
run(['--test',...readdirSync(path.join(root,'selfhost')).filter(f=>f.endsWith('.test.mjs')).sort().map(f=>'selfhost/'+f)]);
run(['node_modules/typescript/bin/tsc','--noEmit','--incremental','false']);
run(['node_modules/vite/bin/vite.js','build','--config','studio/vite.config.ts']);
console.log('Studio verification passed: source guard, backend contracts, TypeScript and frontend build. Browser acceptance is separate.');
