// R26 isolated browser fixture: one real auth identity only. Not production.
import{mkdtempSync,chmodSync,writeFileSync,readFileSync}from'node:fs';
import{tmpdir}from'node:os';
import path from'node:path';
import{fileURLToPath,pathToFileURL}from'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=process.env.R26_FIXTURE_RELEASE?path.resolve(process.env.R26_FIXTURE_RELEASE):root;
if(process.env.R26_FIXTURE_RELEASE){
 const attestation=JSON.parse(readFileSync(path.join(runtime,'release-source.json'),'utf8'));
 if(attestation.sourceCommit!==process.env.R26_FIXTURE_SOURCE)throw Error('Immutable fixture source mismatch');
}
const{createStudioServer}=await import(pathToFileURL(path.join(runtime,'selfhost/server.mjs')).href);
const{passwordHash,token}=await import(pathToFileURL(path.join(runtime,'selfhost/store.mjs')).href);
const dir=mkdtempSync(path.join(tmpdir(),'schmaqq-r26-owner-'));chmodSync(dir,0o700);
const port=Number(process.env.R26_FIXTURE_PORT??45711),previewPort=port+1;
if(port<45000||port>49000)throw Error('Fixture only on a high loopback port');
const origin='http://127.0.0.1:'+port;
const app=createStudioServer({filename:path.join(dir,'studio.sqlite'),origin,previewOrigin:'http://127.0.0.1:'+previewPort,resetMailer:null,demoMode:true,sessionCookie:'room_owner_session',staticDir:path.join(runtime,'studio-dist')});
const owner={id:'synthetic-owner',name:'Marco Testkonto',email:'marco@fixture.invalid',password:token().slice(0,24)};
app.db.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(owner.id,owner.name,owner.email,passwordHash(owner.password),'owner',Date.now());
app.db.prepare('UPDATE projects SET title=?,description=? WHERE id=?').run('SCHMAQQ Testprojekt','Ein Team mit getrennten persönlichen Konten.','website');
app.db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run('task-r26-onboard','website','Designvorlage gemeinsam übernehmen','Ein klarer Auftrag für Marco und Markus','todo','Normal',null,Date.now());
writeFileSync(path.join(dir,'fixture.private.json'),JSON.stringify({owner,origin}),{mode:0o600});
await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(port,'127.0.0.1',resolve);});
await new Promise((resolve,reject)=>{app.previewServer.once('error',reject);app.previewServer.listen(previewPort,'127.0.0.1',resolve);});
console.log(JSON.stringify({origin,privateDir:dir}));let stopped=false;
async function stop(){if(stopped)return;stopped=true;await new Promise(resolve=>app.server.close(resolve));await new Promise(resolve=>app.previewServer.close(resolve));app.db.close();process.exit(0);}
process.once('SIGTERM',stop);process.once('SIGINT',stop);
