import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {PassThrough} from 'node:stream';
import {readFileSync} from 'node:fs';
import {connectThroughProxy} from './deploy/worker/ssh-connect-proxy.mjs';
import {defaultAllow} from './deploy/worker/egress-proxy.mjs';

test('ssh traffic is tunnelled through the proxy with CONNECT and refused targets fail loudly',async t=>{
 // Fake proxy: accepts ssh.github.com:443 and echoes, refuses everything else.
 const proxy=net.createServer(socket=>{let head='';socket.on('data',function first(d){head+=d;if(!head.includes('\r\n\r\n'))return;socket.off('data',first);
  if(head.startsWith('CONNECT ssh.github.com:443 ')){socket.write('HTTP/1.1 200 Connection Established\r\n\r\nSSH-2.0-fake\r\n');socket.on('data',x=>socket.write(x));}
  else socket.end('HTTP/1.1 403 Forbidden\r\n\r\n');});});
 await new Promise(r=>proxy.listen(0,'127.0.0.1',r));t.after(()=>proxy.close());
 const url='http://127.0.0.1:'+proxy.address().port;
 const stdin=new PassThrough(),stdout=new PassThrough();let received='';stdout.on('data',d=>received+=d);
 const socket=connectThroughProxy({proxy:url,host:'ssh.github.com',port:'443',stdin,stdout,onError:m=>assert.fail(m)});
 await new Promise(r=>setTimeout(r,200));stdin.write('client-hello');await new Promise(r=>setTimeout(r,200));
 assert.match(received,/^SSH-2\.0-fake\r\nclient-hello$/,'Banner after CONNECT and payload are passed through');socket.destroy();
 const errors=[];connectThroughProxy({proxy:url,host:'evil.example',port:'22',stdin:new PassThrough(),stdout:new PassThrough(),onError:m=>errors.push(m)});
 await new Promise(r=>setTimeout(r,200));assert.match(errors[0],/proxy refused evil\.example \(403\)/);
 connectThroughProxy({proxy:url,host:'bad host;',port:'443',onError:m=>errors.push(m)});assert.match(errors[1],/invalid target/);
});

test('GitHub access is pinned and allowed only through ssh.github.com',()=>{
 assert.ok(defaultAllow.includes('ssh.github.com'));
 const known=readFileSync(new URL('./deploy/worker/github_known_hosts',import.meta.url),'utf8').trim();
 // Published by GitHub (SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU).
 assert.equal(known,'github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl');
 const script=readFileSync(new URL('./deploy/worker/connect-github.sh',import.meta.url),'utf8');
 assert.ok(script.includes('SSHCMD="env SHELL=/bin/sh ssh'),'ProxyCommand must not depend on the nologin shell');
 for(const option of ['StrictHostKeyChecking=yes','IdentitiesOnly=yes','HostKeyAlias=github.com','HostName=ssh.github.com','Port=443'])assert.ok(script.includes(option),option);
});
