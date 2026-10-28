import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalMcpServer} from './studio-mcp-http.mjs';
import {createStudioMcp} from './studio-mcp.mjs';

test('local MCP transport authenticates every request, handles tools, denies foreign origin and revocation',async t=>{
 const token='synthetic_local_connection_2026';let revoked=false,calls=0;
 const connection=createStudioMcp({request:async()=>{calls++;return {status:200,data:{rooms:[]}};}});
 const server=createLocalMcpServer({resolveConnection:async value=>value===token&&!revoked?connection:null});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 const url='http://127.0.0.1:'+server.address().port+'/mcp';
 const request=(body,headers={})=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...headers},body:JSON.stringify(body)});
 const init={jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26'}};
 assert.equal((await request(init,{Authorization:''})).status,401);
 assert.equal((await request(init,{Origin:'https://untrusted.invalid'})).status,403);
 assert.equal((await (await request(init)).json()).result.serverInfo.name,'schmaqq-studio-local-prototype');
 const tools=await (await request({jsonrpc:'2.0',id:2,method:'tools/list'})).json();assert.equal(tools.result.tools.length,6);
 const result=await (await request({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'list_projects',arguments:{}}})).json();assert.equal(result.result.isError,undefined);assert.equal(calls,1);
 assert.equal((await request({jsonrpc:'2.0',method:'notifications/initialized'})).status,202);
 revoked=true;assert.equal((await request(init)).status,401);
});
