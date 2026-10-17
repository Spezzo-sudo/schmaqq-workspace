import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<24||major===24&&minor<15)throw new Error('Studio benötigt Node.js >=24.15.0. Runtime zuerst in der Umgebung auswählen.');
const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
// npm_execpath is available when invoked through npm; otherwise resolve its CLI
// next to the running Node installation, or use the standard command on Linux.
function run(command,args){const p=spawnSync(command,args,{cwd,stdio:'inherit',windowsHide:true});if(p.error)throw p.error;if(p.status!==0)process.exit(p.status??1);}
if(process.env.npm_execpath)run(process.execPath,[process.env.npm_execpath,'ci','--no-audit','--no-fund']);
else if(process.platform==='win32')throw new Error('Unter Windows bitte npm ci und npm run studio:build ausführen. Dieser Setup-Einstieg ist für Cloud/Linux.');
else run('npm',['ci','--no-audit','--no-fund']);
run(process.execPath,[path.join(cwd,'node_modules/vite/bin/vite.js'),'build','--config','studio/vite.config.ts']);
