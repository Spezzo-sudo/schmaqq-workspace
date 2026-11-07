import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {linuxOperatorSupported} from './deploy/operator-platform.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const options=process.argv.slice(2);
if(options.length>1||options.some(value=>value!=='--local'))throw new Error('Usage: node selfhost/verify.mjs [--local]');
const localOnly=options.includes('--local');
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<24||major===24&&minor<15)throw new Error('Node.js >=24.15.0 erforderlich.');
function run(args){const p=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',windowsHide:true});if(p.error)throw p.error;if(p.status!==0)process.exit(p.status??1);}
run(['selfhost/source-guard.mjs']);
run(['--test',...readdirSync(path.join(root,'selfhost')).filter(f=>f.endsWith('.test.mjs')).sort().map(f=>'selfhost/'+f)]);
run(['node_modules/typescript/bin/tsc','--noEmit','--incremental','false']);
run(['node_modules/vite/bin/vite.js','build','--config','studio/vite.config.ts']);
if(linuxOperatorSupported){
 console.log('Studio verification passed: source guard, backend contracts including Linux operator fixtures, TypeScript and frontend build. Browser acceptance and Production approval are separate.');
}else{
 console.log(JSON.stringify({localDevelopment:'PASS',linuxOperatorRecovery:'NOT_VERIFIED',
  fullVerification:'INCOMPLETE',browserAcceptance:'SEPARATE',releaseApproved:false}));
 console.log('Supported local checks passed. Linux recovery tests are explicitly skipped with a platform reason; no Linux or release PASS is claimed.');
 if(!localOnly){
  console.error('Full verification INCOMPLETE: Linux operator recovery proof still required. Use studio:verify:local only for local development.');
  process.exitCode=2;
 }
}
