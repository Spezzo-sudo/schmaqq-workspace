import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {createEgressProxy} from './deploy/worker/egress-proxy.mjs';

// Sends one CONNECT request and returns the proxy's status line, plus the tunnel if it opened.
function connectThrough(port,target){
 return new Promise((resolve,reject)=>{
  const socket=net.connect(port,'127.0.0.1',()=>socket.write(`CONNECT ${target} HTTP/1.1\r\nHost: ${target}\r\n\r\n`));
  let data='';socket.on('error',reject);
  socket.on('data',chunk=>{data+=chunk;const end=data.indexOf('\r\n\r\n');if(end>=0){socket.removeAllListeners('data');resolve({status:Number(data.split(' ')[1]),socket,rest:data.slice(end+4)});}});
  socket.on('close',()=>resolve({status:Number(data.split(' ')[1])||0,socket}));
 });
}

test('egress proxy tunnels only allowed hosts on 443 to public addresses',async t=>{
 // Upstream stand-in: an echo server. The proxy connects to it instead of the real address.
 const upstream=net.createServer(s=>s.pipe(s));await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const resolved={'studio.schmaqq.com':['187.77.68.24'],'registry.npmjs.org':['104.16.1.35'],'github.com':['10.0.0.5'],'codeload.github.com':['140.82.121.10','127.0.0.1']};
 const denied=[];
 const proxy=createEgressProxy({
  lookup:(host,cb)=>resolved[host]?cb(null,resolved[host].map(address=>({address}))):cb(new Error('nx')),
  connect:()=>net.connect(upstream.address().port,'127.0.0.1'),log:m=>denied.push(m)});
 await new Promise(r=>proxy.listen(0,'127.0.0.1',r));const port=proxy.address().port;
 t.after(()=>{proxy.close();upstream.close();});

 const ok=await connectThrough(port,'studio.schmaqq.com:443');
 assert.equal(ok.status,200);
 ok.socket.write('ping');const echoed=await new Promise(r=>ok.socket.once('data',d=>r(String(d))));assert.equal(echoed,'ping');ok.socket.destroy();

 assert.equal((await connectThrough(port,'example.com:443')).status,403,'Hosts outside the list are refused');
 assert.equal((await connectThrough(port,'studio.schmaqq.com:22')).status,403,'Only port 443');
 assert.equal((await connectThrough(port,'187.77.68.24:443')).status,403,'No IP literals');
 assert.equal((await connectThrough(port,'github.com:443')).status,403,'An allowed name pointing to a private address is refused');
 assert.equal((await connectThrough(port,'codeload.github.com:443')).status,403,'Any private address among the answers is refused');
 const plain=await fetch(`http://127.0.0.1:${port}/http://example.com/`);assert.equal(plain.status,405,'Plain HTTP is not proxied');
 assert.ok(denied.some(m=>m.includes('example.com'))&&denied.every(m=>!m.includes('ping')),'Denials log the host only');
});
