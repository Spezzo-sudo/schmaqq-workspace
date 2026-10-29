/** SSH ProxyCommand for the server worker: the worker has no direct network, so
 * git over SSH reaches GitHub (ssh.github.com:443) through the allowlist egress
 * proxy with HTTP CONNECT. Usage in ssh: ProxyCommand=node ssh-connect-proxy.mjs %h %p
 */
import net from 'node:net';
import path from 'node:path';
import {existsSync,realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

export function connectThroughProxy({proxy,host,port,stdin=process.stdin,stdout=process.stdout,onError=message=>{process.stderr.write(message+'\n');process.exitCode=1;}}){
 const target=new URL(proxy);
 if(!/^[a-z0-9.-]{1,253}$/i.test(host)||!/^\d{1,5}$/.test(String(port)))return onError('ssh-connect-proxy: invalid target');
 const socket=net.connect(Number(target.port),target.hostname,()=>socket.write(`CONNECT ${host}:${port} HTTP/1.1\r\nHost: ${host}:${port}\r\n\r\n`));
 let header=Buffer.alloc(0),open=false;
 socket.on('data',chunk=>{
  if(open)return;
  header=Buffer.concat([header,chunk]);const end=header.indexOf('\r\n\r\n');if(end<0)return;
  const status=Number(header.toString('latin1').split(' ')[1]);
  if(status!==200){onError('ssh-connect-proxy: proxy refused '+host+' ('+status+')');socket.destroy();return;}
  open=true;const rest=header.subarray(end+4);if(rest.length)stdout.write(rest);
  socket.removeAllListeners('data');socket.pipe(stdout);stdin.pipe(socket);
 });
 socket.on('error',e=>onError('ssh-connect-proxy: '+e.message));
 return socket;
}

if(process.argv[1]&&existsSync(process.argv[1])&&realpathSync(path.resolve(process.argv[1]))===realpathSync(fileURLToPath(import.meta.url))){
 connectThroughProxy({proxy:process.env.HTTPS_PROXY??'http://127.0.0.60:3128',host:process.argv[2],port:process.argv[3]});
}
