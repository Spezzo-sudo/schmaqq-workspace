// Read-only report. It never installs packages, removes files or changes services.
import {statfsSync,existsSync,accessSync,constants} from 'node:fs';
import {totalmem,freemem,platform} from 'node:os';
import net from 'node:net';
const target=process.argv[2]??process.cwd(),fs=statfsSync(target),checks=[];
checks.push({name:'Linux VPS',ok:platform()==='linux'}, {name:'Node >=24.15',ok:process.versions.node.split('.').map(Number).some((v,i,a)=>i===0?v>24:i===1&&a[0]===24&&v>=15),value:process.versions.node});
try{await import('node:sqlite');checks.push({name:'SQLite verfügbar',ok:true});}catch{checks.push({name:'SQLite verfügbar',ok:false});}
try{accessSync(target,constants.W_OK);checks.push({name:'Ziel beschreibbar',ok:true});}catch{checks.push({name:'Ziel beschreibbar',ok:false});}
const free=fs.bavail*fs.bsize;checks.push({name:'Mindestens 1 GiB Reserve',ok:free>=1073741824,value:free});
for(const port of [4310,4311]){const available=await new Promise(resolve=>{const server=net.createServer();server.once('error',()=>resolve(false));server.listen(port,'127.0.0.1',()=>server.close(()=>resolve(true)));});checks.push({name:`Lokaler Port ${port} frei`,ok:available});}
console.log(JSON.stringify({checks,memory:{total:totalmem(),available:freemem()},systemd:existsSync('/run/systemd/system'),note:'TLS, Domain, Reverse-Proxy, vorhandene Dienste und tatsächlicher Ressourcenverbrauch sind separat zu prüfen.'},null,2));
process.exitCode=checks.every(c=>c.ok)?0:1;
