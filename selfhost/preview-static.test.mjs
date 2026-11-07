import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createStudioServer} from './server.mjs';

test('static preview answers root-absolute paths only for the preview opened in this browser',async t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-preview-static-'));
 const studio=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin:'http://127.0.0.1:44710',previewOrigin:'http://127.0.0.1:44711',resetMailer:null});
 await new Promise(r=>studio.previewServer.listen(44711,'127.0.0.1',r));
 t.after(async()=>{await new Promise(r=>studio.previewServer.close(r));studio.db.close();rmSync(dir,{recursive:true,force:true});});
 const b64=s=>Buffer.from(s).toString('base64');
 const site='a'.repeat(43),other='b'.repeat(43);
 const add=(id,files)=>studio.db.prepare('INSERT INTO previews VALUES(?,?,?,?)').run(id,'job-'+id[0],Date.now(),JSON.stringify(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,b64(v)]))));
 add(site,{'index.html':'<script src="/assets/app.js"></script>','assets/app.js':'site-js','bewilligung/index.html':'canton','site.webmanifest':'{}'});
 add(other,{'assets/app.js':'other-js','secret.html':'other'});
 const get=(p,cookie)=>fetch('http://127.0.0.1:44711'+p,{headers:cookie?{Cookie:cookie}:{},redirect:'manual'});

 const opened=await get('/'+site+'/index.html');
 assert.equal(opened.status,200);
 const cookies=opened.headers.getSetCookie();
 const remembered=cookies.find(c=>c.startsWith('schmaqq_static='));
 assert.ok(remembered.includes('HttpOnly')&&remembered.includes('Path=/'),'Opening a preview remembers it');
 assert.ok(cookies.some(c=>c.startsWith('schmaqq_live=;')&&c.includes('Max-Age=0')),'and forgets a live preview');
 const cookie=remembered.split(';')[0];

 assert.equal((await get('/assets/app.js')).status,404,'Without the cookie root paths stay unknown');
 const asset=await get('/assets/app.js',cookie);
 assert.equal(asset.status,200);assert.equal(await asset.text(),'site-js');
 assert.equal(asset.headers.get('content-type'),'text/javascript');
 assert.equal(await (await get('/bewilligung/',cookie)).text(),'canton','Directory paths use their index.html');
 assert.equal((await get('/site.webmanifest',cookie)).headers.get('content-type'),'application/manifest+json');
 assert.equal((await get('/secret.html',cookie)).status,404,'Files of another preview are not reachable through the cookie');
 assert.equal((await get('/assets/app.js','schmaqq_static=../../etc')).status,404,'Malformed ids are ignored');
 assert.equal(await (await get('/'+other+'/assets/app.js',cookie)).text(),'other-js','Explicit preview links keep working');
});
