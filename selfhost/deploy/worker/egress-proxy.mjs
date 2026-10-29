/** Allowlist egress proxy for the server worker.
 * The worker has no direct network access (no internet, no DNS, no local sockets);
 * its programs reach the outside only through this HTTPS CONNECT proxy. Only
 * listed host names on port 443 are tunnelled, and only to public addresses: the
 * proxy resolves the name itself and connects to the checked address, so DNS
 * tricks cannot point an allowed name at the server's own services.
 * Plain HTTP requests are refused. Denials are logged with host name only.
 */
import http from 'node:http';
import net from 'node:net';
import dns from 'node:dns';
import path from 'node:path';
import {existsSync,realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {publicAddress} from '../../studio-plugin-auth.mjs';

export const defaultAllow=Object.freeze(['studio.schmaqq.com','registry.npmjs.org','github.com','codeload.github.com','objects.githubusercontent.com']);
const hostPattern=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function createEgressProxy({allow=defaultAllow,maxConnections=64,idleMs=600000,
 lookup=(host,cb)=>dns.lookup(host,{all:true},cb),connect=(address,port)=>net.connect({host:address,port}),log=message=>console.error(message)}={}){
 const allowed=new Set(allow.map(h=>String(h).trim().toLowerCase()).filter(Boolean));
 let open=0;
 const server=http.createServer((req,res)=>{res.writeHead(405,{'Content-Type':'text/plain'});res.end('Only HTTPS CONNECT to allowed hosts.\n');});
 server.on('connect',(req,client)=>{
  const deny=(reason,status=403)=>{log(`egress denied: ${reason}`);client.end(`HTTP/1.1 ${status} Forbidden\r\nConnection: close\r\n\r\n`);};
  client.on('error',()=>{});
  const match=/^([^:\s]+):(\d{1,5})$/.exec(req.url??'');
  const host=match?.[1].toLowerCase(),port=Number(match?.[2]);
  if(!match||port!==443||!hostPattern.test(host))return deny('invalid target '+String(req.url).slice(0,100));
  if(!allowed.has(host))return deny('host not allowed '+host);
  if(open>=maxConnections)return deny('too many connections',503);
  open++;let closed=false;const done=()=>{if(!closed){closed=true;open--;}};client.once('close',done);
  lookup(host,(error,addresses)=>{
   if(error||!addresses?.length)return deny('dns failure '+host,502);
   const list=addresses.map(a=>typeof a==='string'?a:a.address);
   if(!list.every(publicAddress))return deny('non-public address for '+host);
   const upstream=connect(list[0],port);
   upstream.setTimeout(idleMs,()=>upstream.destroy());client.setTimeout(idleMs,()=>client.destroy());
   upstream.once('connect',()=>{client.write('HTTP/1.1 200 Connection Established\r\n\r\n');upstream.pipe(client);client.pipe(upstream);});
   upstream.on('error',()=>{if(!client.destroyed)client.end('HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n');});
   client.once('close',()=>upstream.destroy());upstream.once('close',()=>client.destroy());
  });
 });
 return server;
}

// Real paths: the unit starts .../current/selfhost/... through the release symlink.
if(process.argv[1]&&existsSync(process.argv[1])&&realpathSync(path.resolve(process.argv[1]))===realpathSync(fileURLToPath(import.meta.url))){
 const [host,port]=(process.env.EGRESS_LISTEN??'127.0.0.60:3128').split(':');
 const allow=process.env.EGRESS_ALLOW?process.env.EGRESS_ALLOW.split(','):defaultAllow;
 createEgressProxy({allow}).listen(Number(port),host,()=>console.log(`egress proxy on ${host}:${port}, allowed: ${allow.join(', ')}`));
}
