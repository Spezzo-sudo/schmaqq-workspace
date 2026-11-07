import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,existsSync,rmSync,readdirSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import os from 'node:os';
import path from 'node:path';
import {runtimeInventory,copyRuntime} from './runtime-package.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function temporary(t){
 const folder=mkdtempSync(path.join(os.tmpdir(),'studio-runtime-package-'));
 t.after(()=>{assert.ok(path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep));rmSync(folder,{recursive:true,force:true});});
 return folder;
}
function write(root,name,body){const target=path.join(root,name);mkdirSync(path.dirname(target),{recursive:true});writeFileSync(target,body);}
function fixture(t){
 const folder=temporary(t),source=path.join(folder,'source');mkdirSync(source);
 write(source,'selfhost/server.mjs',`// import bad from 'not-a-real-dependency';
import value from 'runtime-one';
export {default as child} from './child.mjs';
export const load=()=>import('./lazy.mjs');
export default value;
`);
 write(source,'selfhost/child.mjs',`export default 'child';`);
 write(source,'selfhost/lazy.mjs',`export default 'lazy';`);
 write(source,'selfhost/deploy/preflight.mjs',`import os from 'node:os';export default os.platform();`);
 write(source,'selfhost/deploy/settings.json','{"example":true}');
 write(source,'node_modules/runtime-one/package.json',JSON.stringify({name:'runtime-one',version:'1.0.0',type:'module',main:'index.js',dependencies:{'runtime-two':'1.0.0'},optionalDependencies:{'missing-platform-package':'1.0.0'},peerDependencies:{'missing-optional-peer':'*'},peerDependenciesMeta:{'missing-optional-peer':{optional:true}}}));
 write(source,'node_modules/runtime-one/index.js',`import value from 'runtime-two';export default value;`);
 write(source,'node_modules/runtime-two/package.json',JSON.stringify({name:'runtime-two',version:'1.0.0',type:'module',main:'index.js'}));
 write(source,'node_modules/runtime-two/index.js',`export default 'real-runtime-value';`);
 write(source,'node_modules/dev-only/package.json',JSON.stringify({name:'dev-only',version:'1.0.0'}));
 write(source,'package-lock.json',JSON.stringify({lockfileVersion:3,packages:{'node_modules/runtime-one':{version:'1.0.0'},'node_modules/runtime-two':{version:'1.0.0'},'node_modules/dev-only':{version:'1.0.0',dev:true}}}));
 return {folder,source,options:{entryFiles:['selfhost/server.mjs']}};
}

test('runtime inventory parses real static and dynamic imports, includes runtime dependency closure and omits dev packages',t=>{
 const f=fixture(t),inventory=runtimeInventory(f.source,f.options);
 assert.ok(inventory.files.includes('selfhost/lazy.mjs'));
 assert.ok(inventory.files.includes('selfhost/child.mjs'));
 assert.ok(inventory.files.includes('selfhost/deploy/settings.json'));
 assert.deepEqual(inventory.packages.map(p=>p.name),['runtime-one','runtime-two']);
 const destination=path.join(f.folder,'runtime');copyRuntime({root:f.source,destination,inventory});
 assert.equal(existsSync(path.join(destination,'node_modules/dev-only')),false);
 write(destination,'package.json','{"type":"module"}');
 const output=execFileSync(process.execPath,['--input-type=module','-e',`const result=await import(${JSON.stringify(pathToFileURL(path.join(destination,'selfhost/server.mjs')).href)});console.log(result.default,await result.load());`],{cwd:destination,encoding:'utf8',windowsHide:true});
 assert.match(output,/real-runtime-value/);assert.match(output,/lazy/);
 assert.throws(()=>copyRuntime({root:f.source,destination,inventory}),/must not exist/);
});

test('runtime inventory rejects lock drift, missing required dependencies and nonliteral dynamic imports',t=>{
 const f=fixture(t);
 write(f.source,'node_modules/runtime-two/package.json',JSON.stringify({name:'runtime-two',version:'2.0.0'}));
 assert.throws(()=>runtimeInventory(f.source,f.options),/does not match lock/);
 write(f.source,'node_modules/runtime-two/package.json',JSON.stringify({name:'runtime-two',version:'1.0.0',dependencies:{'required-but-missing':'1.0.0'}}));
 assert.throws(()=>runtimeInventory(f.source,f.options),/Missing installed runtime dependency/);
 write(f.source,'selfhost/server.mjs',`const target='./child.mjs';await import(target);`);
 assert.throws(()=>runtimeInventory(f.source,f.options),/Nonliteral dynamic/);
});

test('actual Studio runtime imports and creates disabled and enabled synthetic plugin hosts without developer modules',t=>{
 const folder=temporary(t),destination=path.join(folder,'runtime');
 const inventory=copyRuntime({root,destination});
 assert.ok(inventory.files.includes('selfhost/studio-plugin-auth.mjs'));
 assert.ok(inventory.files.includes('selfhost/team-model.mjs'));
 assert.ok(inventory.packages.some(p=>p.name==='@modelcontextprotocol/sdk'));
 assert.ok(inventory.packages.some(p=>p.name==='zod'));
 assert.ok(inventory.packages.every(p=>!['typescript','vite','react','next'].includes(p.name)));
 write(destination,'package.json','{"type":"module"}');
 const source=`import {createStudioServer} from ${JSON.stringify(pathToFileURL(path.join(destination,'selfhost/server.mjs')).href)};
import path from 'node:path';
for(const enabled of [false,true]){
const app=createStudioServer({filename:path.join(process.cwd(),enabled?'enabled.sqlite':'disabled.sqlite'),origin:'http://127.0.0.1:45401',previewOrigin:'http://127.0.0.1:45402',resetMailer:null,pluginClients:enabled?[{id:'runtime-test',name:'Runtime test',redirectUris:['http://127.0.0.1:45403/callback']}]:[]});
await new Promise(done=>app.server.close(done));app.db.close();
}
console.log('isolated disabled/enabled runtime factory passed');`;
 const output=execFileSync(process.execPath,['--input-type=module','-e',source],{cwd:destination,env:{...process.env,STUDIO_PLUGIN_CLIENTS:'[]'},encoding:'utf8',windowsHide:true,timeout:30000});
 assert.match(output,/runtime factory passed/);
 function bytes(dir){let result=0;for(const name of readdirSync(dir)){const file=path.join(dir,name),stats=statSync(file);result+=stats.isDirectory()?bytes(file):stats.size;}return result;}
 t.diagnostic(JSON.stringify({sourceModules:inventory.files.length,runtimePackages:inventory.packages.length,runtimeBytes:bytes(destination)}));
});
