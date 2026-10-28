import http from 'node:http';

/** Local transport harness only. A public deployment needs OAuth resource
 * discovery, scoped grants, durable deduplication and an operational review.
 * resolveConnection authenticates every request, including after revocation.
 * The returned bridge is identity-bound and must never be selected by tool args.
 */
export function createLocalMcpServer({resolveConnection,allowedOrigin}={}){
 if(typeof resolveConnection!=='function')throw new Error('Personal connection resolver required.');
 return http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));};
  try{
   if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return send(403,{error:'Local prototype only.'});
   if(req.url!=='/mcp')return send(404,{error:'Not found.'});
   if(req.headers.origin&&req.headers.origin!==allowedOrigin)return send(403,{error:'Origin not allowed.'});
   if(req.method!=='POST'){res.setHeader('Allow','POST');return send(405,{error:'POST required.'});}
   if(!req.headers['content-type']?.startsWith('application/json'))return send(415,{error:'JSON required.'});
   const token=req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{24,200})$/)?.[1];
   const connection=token?await resolveConnection(token):null;
   if(!connection){res.setHeader('WWW-Authenticate','Bearer');return send(401,{error:'Personal connection required.'});}
   const parts=[];let length=0;
   for await(const chunk of req){length+=chunk.length;if(length>500000)return send(413,{error:'Request too large.'});parts.push(chunk);}
   let input;try{input=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{return send(400,{error:'Invalid JSON.'});}
   const result=await connection.dispatch(input);
   if(result===undefined){res.writeHead(202);res.end();return;}
   send(200,result);
  }catch{send(500,{error:'Local transport failed.'});}
 });
}
