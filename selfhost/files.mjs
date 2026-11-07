import {readFileSync,writeFileSync,lstatSync,realpathSync,mkdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// 64 KiB of actual UTF-8 bytes, not JavaScript characters or JSON length.
const limit=64*1024;
const revision=buffer=>createHash('sha256').update(buffer).digest('hex');
export function allowedFile(name){
 return typeof name==='string'&&name.length>0&&name.length<400&&!name.includes('\\')&&!name.includes(':')&&!/[\x00-\x1f]/.test(name)&&!name.startsWith('/')&&name.split('/').every(p=>p&&p!=='.'&&p!=='..'&&!/^\.env/i.test(p)&&!['.git','.ssh','node_modules'].includes(p.toLowerCase()))&&!/(?:^|\/)(?:credentials|secrets?)(?:[./]|$)|\.(?:pem|key|p12|pfx)$|\.private\.json$/i.test(name);
}
// Larger files can only be read, in sections of at most `limit` bytes; editing keeps the 64 KiB limit.
export const readableLimit=4*1024*1024;
function target(root,name,max=limit){
 if(!allowedFile(name))throw new Error('Diese Datei ist im Editor nicht freigegeben.');
 let current=realpathSync(root);
 for(const segment of name.split('/')){current=path.join(current,segment);const stat=lstatSync(current);if(stat.isSymbolicLink())throw new Error('Verknüpfungen sind im Editor gesperrt.');}
 const stat=lstatSync(current);
 if(!stat.isFile()||stat.nlink!==1)throw new Error('Nur normale Textdateien bis 64 KB können bearbeitet werden.');
 if(stat.size>max)throw new Error(max===limit&&stat.size<=readableLimit?'Datei ist größer als 64 KB. Lesen ist abschnittsweise mit offset möglich (beginnend bei 0); Bearbeiten nur bis 64 KB.':'Nur normale Textdateien bis 64 KB können bearbeitet werden.');
 return current;
}
function textBuffer(buffer){
 if(buffer.includes(0))throw new Error('Datei ist zu groß oder keine Textdatei.');
 try{return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(buffer);}catch{throw new Error('Nur UTF-8-Textdateien werden unterstützt.');}
}
export function readSource(root,name){
 const buffer=readFileSync(target(root,name));if(buffer.length>limit)throw new Error('Datei ist zu groß oder keine Textdatei.');
 return {file:name,content:textBuffer(buffer),revision:revision(buffer)};
}
/** One contiguous byte section of a text file up to 4 MiB. Sections end on a UTF-8 character
 * boundary (preferably after a line break), so consecutive reads from nextOffset have no gaps.
 * `expected` is the whole-file revision of an earlier section; a changed file is reported. */
export function readSourceSection(root,name,offset,expected){
 const buffer=readFileSync(target(root,name,readableLimit));
 if(buffer.length>readableLimit)throw new Error('Datei ist größer als 4 MB und kann nicht gelesen werden.');
 textBuffer(buffer);
 const current=revision(buffer);
 if(expected&&expected!==current)throw new Error('Die Datei wurde seit dem vorherigen Abschnitt geändert. Erneut bei offset 0 beginnen.');
 if(!Number.isInteger(offset)||offset<0||offset>buffer.length)throw new Error('Ungültiger Leseabschnitt.');
 if(offset<buffer.length&&(buffer[offset]&0xc0)===0x80)throw new Error('Der Abschnitt beginnt mitten in einem Zeichen. nextOffset des vorherigen Abschnitts verwenden.');
 let end=Math.min(buffer.length,offset+limit);
 if(end<buffer.length){
  while(end>offset&&(buffer[end]&0xc0)===0x80)end--;
  const newline=buffer.lastIndexOf(0x0a,end-1);if(newline>=offset+limit/2)end=newline+1;
 }
 let line=1;for(let i=buffer.indexOf(0x0a);i!==-1&&i<offset;i=buffer.indexOf(0x0a,i+1))line++;
 return {file:name,content:buffer.subarray(offset,end).toString('utf8'),revision:current,partial:true,offset,end,size:buffer.length,startLine:line,nextOffset:end<buffer.length?end:null,complete:end>=buffer.length};
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
