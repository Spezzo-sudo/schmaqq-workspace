import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const paths=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z','--','.'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean);
const forbidden=/(^|\/)(\.studio|\.studio-runner|node_modules|studio-dist|\.sites-runtime|\.wrangler)\/|\.private\.json$|\.(sqlite|sqlite-wal|sqlite-shm|pem|key|tsbuildinfo)$|(^|\/)\.env($|\.)/i;
const secret= /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{30,}/;
const findings=[];
for(const name of paths){
 if(forbidden.test(name)&&!name.endsWith('.example')){findings.push(name+': excluded runtime/credential/generated path');continue;}
 const data=readFileSync(path.join(root,name));if(data.includes(0))continue;
 const lines=data.toString('utf8').split('\n');for(let i=0;i<lines.length;i++)if(secret.test(lines[i]))findings.push(name+':'+(i+1)+': possible credential; value withheld');
}
if(findings.length){console.error(findings.join('\n'));process.exitCode=1;}
else console.log('Source guard passed ('+paths.length+' files); excludes known runtime paths and credential formats. This is not a complete secret audit.');
