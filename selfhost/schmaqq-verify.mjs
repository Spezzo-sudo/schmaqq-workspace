import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {command} from './process.mjs';
import {verificationGuard} from './verify-output.mjs';

// Invoke the repository's canonical verifier, including on Windows with Git Bash.
// Generated shims/evidence live outside application source.
const [mode='marketing-contract',bash='bash',python='python3']=process.argv.slice(2);
if(!['state','marketing-contract','quick','full','build'].includes(mode))throw new Error('Unbekannter Prüfmodus.');
if(!existsSync(path.resolve('schmaqq'))||!existsSync(path.resolve('scripts/schmaqq-verify.sh')))throw new Error('Keine Schmaqq-Arbeitskopie.');
const studioRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const toolsDir=path.join(studioRoot,'.studio','schmaqq-tools');mkdirSync(toolsDir,{recursive:true});
const env={...process.env,PYTHONUTF8:'1',PYTHONIOENCODING:'utf-8',NEXT_TELEMETRY_DISABLED:'1',INTAKE_ENABLED:'false',BILLING_ENABLED:'false',GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'never'};
const shellPath=value=>process.platform==='win32'?value.replaceAll('\\','/').replace(/^([A-Za-z]):/,(_,letter)=>'/'+letter.toLowerCase()):value;
const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
if(process.platform==='win32'){
 if(!path.isAbsolute(python)||!existsSync(python))throw new Error('Für Windows einen absoluten Python-Pfad konfigurieren.');
 writeFileSync(path.join(toolsDir,'python3'),'#!/bin/sh\nexec '+quote(shellPath(python))+' "$@"\n',{mode:0o700});
 env.PATH=toolsDir+path.delimiter+(env.PATH??env.Path??'');delete env.Path;
}
const evidence=path.join(studioRoot,'.studio','netzkontor-evidence');mkdirSync(evidence,{recursive:true});
env.SCHMAQQ_VERIFY_ROOT=shellPath(evidence);
const guard=verificationGuard();
try{console.log(guard.finish(await command([bash,'./schmaqq','verify',mode],process.cwd(),{env,timeout:1800000,onOutput:chunk=>guard.feed(chunk)})));}
catch(e){console.error(e.message);process.exitCode=1;}
