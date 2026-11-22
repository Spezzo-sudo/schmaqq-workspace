import {builtinModules} from 'node:module';
import {cpSync,existsSync,lstatSync,mkdirSync,readFileSync,readdirSync,realpathSync,statSync} from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const builtins=new Set(builtinModules.flatMap(name=>[name,'node:'+name]));
const forward=value=>value.split(path.sep).join('/');
const inside=(parent,child)=>{const relative=path.relative(parent,child);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);};
const entries=['server','store','reviews','workspaces','admin','backup','private-path','ai-routes','oidc','connections','collaboration','change-overview','source-evidence','project-start','github-pr-status','auth-http','workspace-http','login-rate-limit','password-recovery','room-http','overview-http',
 // The server worker runs the runner from the same verified release.
 'runner'].map(name=>'selfhost/'+name+'.mjs')
 // The agent service (Hermes adapter) is installed by the deploy from the same verified release.
 .concat(['selfhost/hermes-agent-worker.mjs','selfhost/hermes-pilot-infer.py']);

function imports(source,filename){
 const result=new Set(),file=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 function visit(node){
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier){
   if(!ts.isStringLiteral(node.moduleSpecifier))throw Error('Nonliteral module in runtime source: '+filename);
   result.add(node.moduleSpecifier.text);
  }
  if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword){
   if(node.arguments.length!==1||!ts.isStringLiteral(node.arguments[0]))throw Error('Nonliteral dynamic runtime import: '+filename);
   result.add(node.arguments[0].text);
  }
  ts.forEachChild(node,visit);
 }
 visit(file);return result;
}

/** Build-time only: TypeScript parses actual imports, not strings or comments.
 * Installed package metadata is checked against package-lock.json. No install,
 * network, environment/profile access or application execution takes place.
 */
export function runtimeInventory(root,{entryFiles=entries,resourceDirectories=['selfhost/deploy']}={}){
 root=realpathSync(root);
 const files=new Set(),packages=new Map(),lock=JSON.parse(readFileSync(path.join(root,'package-lock.json'),'utf8'));
 const dependencyRoot=path.join(root,'node_modules');
 const directPackages=new Set();
 function file(relative){
  const absolute=path.resolve(root,relative);
  if(!inside(root,absolute)||lstatSync(absolute).isSymbolicLink()||!statSync(absolute).isFile()||realpathSync(absolute)!==absolute)throw Error('Unsafe runtime source: '+relative);
  relative=forward(path.relative(root,absolute));if(files.has(relative))return;files.add(relative);
  if(!/\.(?:mjs|cjs|js)$/.test(relative))return;
  for(const name of imports(readFileSync(absolute,'utf8'),relative)){
   if(builtins.has(name))continue;
   if(name.startsWith('.')){file(path.relative(root,path.resolve(path.dirname(absolute),name)));continue;}
   if(name.startsWith('/')||name.includes(':')||name.startsWith('#'))throw Error('Unsupported runtime module: '+name);
   const packageName=name.startsWith('@')?name.split('/').slice(0,2).join('/'):name.split('/')[0];
   directPackages.add(packageName);dependency(packageName,path.dirname(absolute),false);
  }
 }
 function resolvePackage(name,from){
  let folder=from;
  while(inside(root,folder)||folder===root){
   const candidate=path.join(folder,'node_modules',name);
   if(existsSync(path.join(candidate,'package.json')))return candidate;
   const parent=path.dirname(folder);if(parent===folder)break;folder=parent;
  }
  return null;
 }
 function dependency(name,from,optional){
  if(!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name))throw Error('Invalid runtime dependency name.');
  const folder=resolvePackage(name,from);
  if(!folder){if(optional)return;throw Error('Missing installed runtime dependency: '+name);}
  if(!inside(dependencyRoot,folder)||realpathSync(folder)!==folder||lstatSync(folder).isSymbolicLink())throw Error('Runtime dependency outside local node_modules: '+name);
  const relative=forward(path.relative(root,folder));if(packages.has(relative))return;
  const manifest=JSON.parse(readFileSync(path.join(folder,'package.json'),'utf8'));
  if(manifest.name!==name||lock.packages?.[relative]?.version!==manifest.version)throw Error('Runtime dependency does not match lock: '+name);
  packages.set(relative,{name,version:manifest.version,path:relative});
  const optionalNames=manifest.optionalDependencies??{};
  for(const child of Object.keys({...manifest.dependencies,...optionalNames}))dependency(child,folder,Object.hasOwn(optionalNames,child));
  for(const child of Object.keys(manifest.peerDependencies??{}))dependency(child,folder,manifest.peerDependenciesMeta?.[child]?.optional===true);
 }
 function tree(relative){
  const absolute=path.join(root,relative);
  if(lstatSync(absolute).isSymbolicLink())throw Error('Symlink in runtime source: '+relative);
  for(const entry of readdirSync(absolute,{withFileTypes:true})){
   const name=forward(path.join(relative,entry.name));
   if(entry.isDirectory())tree(name);else file(name);
  }
 }
 for(const entry of entryFiles)file(entry);
 for(const directory of resourceDirectories)tree(directory);
 return {files:[...files].sort(),packages:[...packages.values()].sort((a,b)=>a.path.localeCompare(b.path)),directPackages:[...directPackages].sort()};
}

/** Copies only the discovered runtime, never the developer node_modules tree. */
export function copyRuntime({root,destination,inventory=runtimeInventory(root)}){
 root=realpathSync(root);destination=path.resolve(destination);
 if(existsSync(destination))throw Error('Runtime destination must not exist.');
 mkdirSync(destination,{recursive:true});
 for(const relative of inventory.files){
  const target=path.join(destination,relative);mkdirSync(path.dirname(target),{recursive:true});
  cpSync(path.join(root,relative),target,{errorOnExist:true,force:false});
 }
 for(const pkg of inventory.packages){
  const source=path.join(root,pkg.path),target=path.join(destination,pkg.path);mkdirSync(path.dirname(target),{recursive:true});
  cpSync(source,target,{recursive:true,errorOnExist:true,force:false,filter:current=>{
   const relative=path.relative(source,current);
   if(relative.split(path.sep).includes('node_modules'))return false;
   if(lstatSync(current).isSymbolicLink())throw Error('Symlink in runtime dependency: '+pkg.name);
   return true;
  }});
 }
 return inventory;
}
