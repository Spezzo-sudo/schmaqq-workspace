import {readFileSync,writeFileSync,lstatSync,realpathSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// 64 KiB of actual UTF-8 bytes, not JavaScript characters or JSON length.
const limit=64*1024;
const revision=buffer=>createHash('sha256').update(buffer).digest('hex');
export function allowedFile(name){
 return typeof name==='string'&&name.length>0&&name.length<400&&!name.includes('\\')&&!name.includes(':')&&!/[\x00-\x1f]/.test(name)&&!name.startsWith('/')&&name.split('/').every(p=>p&&p!=='.'&&p!=='..'&&!p.startsWith('.env')&&!['.git','.ssh','node_modules'].includes(p))&&!/(?:^|\/)(?:credentials|secrets?)(?:[./]|$)|\.(?:pem|key|p12|pfx)$|\.private\.json$/i.test(name);
}
function target(root,name){
 if(!allowedFile(name))throw new Error('Diese Datei ist im Editor nicht freigegeben.');
 let current=realpathSync(root);
 for(const segment of name.split('/')){current=path.join(current,segment);const stat=lstatSync(current);if(stat.isSymbolicLink())throw new Error('Verknüpfungen sind im Editor gesperrt.');}
 const stat=lstatSync(current);if(!stat.isFile()||stat.nlink!==1||stat.size>limit)throw new Error('Nur normale Textdateien bis 64 KB können bearbeitet werden.');
 return current;
}
export function readSource(root,name){
 const buffer=readFileSync(target(root,name));if(buffer.length>limit||buffer.includes(0))throw new Error('Datei ist zu groß oder keine Textdatei.');
 let content;try{content=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(buffer);}catch{throw new Error('Nur UTF-8-Textdateien werden unterstützt.');}
 return {file:name,content,revision:revision(buffer)};
}
export function saveSource(root,name,expected,content){
 const filename=target(root,name),current=readSource(root,name);
 if(current.revision!==expected)throw new Error('Speicherkonflikt: Die Datei wurde inzwischen geändert. Dein Entwurf bleibt erhalten. Lade den aktuellen Stand zum Vergleich.');
 const buffer=Buffer.from(content,'utf8');if(buffer.length>limit||buffer.includes(0))throw new Error('Nur UTF-8-Text bis 64 KB ist erlaubt.');
 // Runner jobs execute serially. Compare immediately before the synchronous write.
 writeFileSync(filename,buffer);return {file:name,revision:revision(buffer),saved:true};
}
