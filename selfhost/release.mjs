import {cpSync,mkdirSync,readFileSync,readdirSync,statSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(!existsSync(path.join(root,'studio-dist/index.html')))throw new Error('Zuerst studio:build ausführen.');
const version=new Date().toISOString().replace(/[:.]/g,'-'),directory=path.join(root,'.studio','releases',version);
mkdirSync(directory,{recursive:true});
function copy(source,dest=source){cpSync(path.join(root,source),path.join(directory,dest),{recursive:true,errorOnExist:true,force:false});}
for(const file of ['server','store','reviews','workspaces','admin','backup','ai-routes','oidc','connections','collaboration','change-overview','source-evidence','project-start','github-pr-status'])copy(`selfhost/${file}.mjs`);
copy('studio-dist');copy('node_modules/zod');copy('node_modules/jose');copy('selfhost/deploy');
writeFileSync(path.join(directory,'package.json'),JSON.stringify({name:'schmaqq-studio-runtime',private:true,type:'module',engines:{node:'>=24.15.0'},scripts:{start:'node selfhost/server.mjs'}},null,2));
const manifest=[];function inspect(folder){for(const entry of readdirSync(folder,{withFileTypes:true})){const full=path.join(folder,entry.name);if(entry.isDirectory())inspect(full);else{const data=readFileSync(full);manifest.push({path:path.relative(directory,full).split(path.sep).join('/'),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}}}inspect(directory);
writeFileSync(path.join(directory,'release-manifest.json'),JSON.stringify({version,files:manifest},null,2));
const archive=directory+'.tar.gz';execFileSync('tar',['-czf',archive,'-C',directory,'.'],{windowsHide:true});
console.log(JSON.stringify({directory,archive,files:manifest.length,unpackedBytes:manifest.reduce((sum,f)=>sum+f.bytes,0),archiveBytes:statSync(archive).size},null,2));
