import {createHash} from 'node:crypto';
import {lstatSync,openSync,closeSync,readSync,fstatSync,realpathSync,constants} from 'node:fs';
import path from 'node:path';
import {command} from './process.mjs';
import {allowedFile} from './files.mjs';

const excluded=/(^|\/)(\.git|\.studio(?:-runner)?|\.env(?:\..*)?|[^/]+\.private\.json)(\/|$)|\.(pem|key)$/i;
const unavailable=reason=>({revision:null,observedAt:Date.now(),reason});
// Git supplies tracked + nonignored untracked inputs. No filters, diff drivers,
// hooks, file contents or filenames are sent to the server. Ignored inputs and
// dependencies are outside this source snapshot, not a reproducible build claim.
export async function sourceRevision(directory,{signal}={}){
 try{
  const root=realpathSync(directory),hash=createHash('sha256');let total=0;
  const git=async(...args)=>{
   let parts=[],size=0;
   await command(['git','-c','core.fsmonitor=false',...args],root,{signal,timeout:20000,onStdout:b=>{size+=b.length;if(size<=2000000)parts.push(b);}});
   if(size>2000000)throw Error('limit');return new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts));
  };
  const head=await git('rev-parse','HEAD'),listing=await git('ls-files','--cached','--others','--exclude-standard','-z');
  const files=[...new Set(listing.split('\0').filter(Boolean))].sort();if(files.length>10000)return unavailable('limit');
  hash.update(head);
  const buffer=Buffer.alloc(65536),observed=[];
  for(const name of files){
   signal?.throwIfAborted();
   if(!allowedFile(name)||excluded.test(name)||path.isAbsolute(name)||name.split('/').some(p=>!p||p==='.'||p==='..'))return unavailable('unsupported_input');
   const full=path.resolve(root,name);if(!full.startsWith(root+path.sep))return unavailable('unsupported_input');
   let current=root,entry,missing=false;
   try{for(const part of name.split('/')){current=path.join(current,part);entry=lstatSync(current);if(entry.isSymbolicLink())return unavailable('unsupported_input');}}
   catch(e){if(e.code==='ENOENT')missing=true;else throw e;}
   if(missing){hash.update(JSON.stringify([name,'missing']));observed.push({full,missing:true});continue;}
   if(!entry.isFile()||entry.nlink>1)return unavailable('unsupported_input');
   if(entry.size>8388608||total+entry.size>67108864)return unavailable('limit');
   hash.update(JSON.stringify([name,entry.mode,entry.size]));
   const fd=openSync(full,constants.O_RDONLY|(constants.O_NOFOLLOW??0));let bytes=0;
   try{
    const before=fstatSync(fd);if(!before.isFile()||before.ino!==entry.ino||before.nlink>1||before.size!==entry.size)return unavailable('changed_during_observation');
    for(;;){const count=readSync(fd,buffer,0,buffer.length,null);if(!count)break;bytes+=count;total+=count;if(bytes>8388608||total>67108864)return unavailable('limit');hash.update(buffer.subarray(0,count));}
    const after=fstatSync(fd);
    if(before.size!==bytes||before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.ctimeMs!==after.ctimeMs)return unavailable('changed_during_observation');
    observed.push({full,ino:after.ino,size:after.size,mtime:after.mtimeMs,ctime:after.ctimeMs});
   }finally{closeSync(fd);}
  }
  for(const entry of observed){
   let stat;try{stat=lstatSync(entry.full);}catch(e){if(e.code!=='ENOENT')throw e;}
   if(entry.missing?!stat:stat?.isFile()&&stat.ino===entry.ino&&stat.size===entry.size&&stat.mtimeMs===entry.mtime&&stat.ctimeMs===entry.ctime)continue;
   return unavailable('changed_during_observation');
  }
  if(head!==await git('rev-parse','HEAD')||listing!==await git('ls-files','--cached','--others','--exclude-standard','-z'))return unavailable('changed_during_observation');
  return {revision:hash.digest('hex'),observedAt:Date.now()};
 }catch(e){signal?.throwIfAborted();return unavailable('unavailable');}
}
export function stableSource(before,after){return before.revision&&before.revision===after.revision?after:unavailable(before.reason??after.reason??'changed_during_run');}
