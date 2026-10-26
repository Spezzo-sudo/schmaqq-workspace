import {readFileSync,writeFileSync,lstatSync,realpathSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// 64 KiB of actual UTF-8 bytes, not JavaScript characters or JSON length.
const limit=64*1024;
const revision=buffer=>createHash('sha256').update(buffer).digest('hex');
export function allowedFile(name){
 return typeof name==='string'&&name.length>0&&name.length<400&&!name.includes('\\')&&!name.includes(':')&&!/[\x00-\x1f]/.test(name)&&!name.startsWith('/')&&name.split('/').every(p=>p&&p!=='.'&&p!=='..'&&!/^\.env/i.test(p)&&!['.git','.ssh','node_modules'].includes(p.toLowerCase()))&&!/(?:^|\/)(?:credentials|secrets?)(?:[./]|$)|\.(?:pem|key|p12|pfx)$|\.private\.json$/i.test(name);
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

export function createSource(root,name,content=''){
 if(!allowedFile(name)||name.split('/').some(p=>/^(?:\.git|\.ssh|node_modules|con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)||/[. ]$/.test(p)))throw new Error('Dieser Dateipfad ist nicht erlaubt.');
 const buffer=Buffer.from(content,'utf8');if(buffer.length>limit||buffer.includes(0))throw new Error('Nur UTF-8-Text bis 64 KB ist erlaubt.');
 let dir=realpathSync(root);const parts=name.split('/');
 for(const part of parts.slice(0,-1)){
  dir=path.join(dir,part);
  if(!existsSync(dir))mkdirSync(dir);
  const info=lstatSync(dir);if(!info.isDirectory()||info.isSymbolicLink())throw new Error('Der Zielordner darf keine Verknüpfung sein.');
 }
 const filename=path.join(dir,parts.at(-1));
 try{writeFileSync(filename,buffer,{flag:'wx'});}catch(e){if(e.code==='EEXIST')throw new Error('Diese Datei existiert bereits. Sie wurde nicht überschrieben.');throw e;}
 return readSource(root,name);
}
