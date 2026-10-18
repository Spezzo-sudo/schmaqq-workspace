// Opt-in offline publisher handoff. Never enable with a production repository.
// Device bearer auth + independently approved exact review snapshot are required.
// All destination configuration is server-owned and points to a disposable fixture.
import {randomUUID} from 'node:crypto';
import {existsSync,lstatSync,realpathSync,statSync,writeFileSync,unlinkSync} from 'node:fs';
import path from 'node:path';
import {z} from 'zod';
import {reviewState,completeReview} from './reviews.mjs';
import {validatePublisherRequest} from './publisher-contract.mjs';
import {publishLocalBundle} from './publisher-local.mjs';

const fail=(status,message)=>Object.assign(new Error(message),{status});
const sha=z.string().regex(/^[a-f0-9]{40}$/);
const submission=z.object({
 reviewJob:z.string().uuid(),projectId:z.string().min(1).max(96),
 githubRepositoryId:z.string().regex(/^[1-9][0-9]*$/),
 branch:z.string().min(1).max(120),commit:sha,expectedBaseCommit:sha,
 bundleBase64:z.string().min(136).max(6991000),
}).strict();

export function createPublisherHandoffRoute({fixture,db,device,readJSON}){
 const attempts=new Map(),active=new Set();
 return async function publisherHandoffRoute({route,method,req,send}){
  if(route!=='/api/runner/publisher-handoff')return false;
  // Disabled even for authenticated users on normal Studio deployments.
  if(!fixture)throw fail(404,'Schnittstelle nicht verfügbar.');
  if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');
  const d=device(req); // Revoked, missing and forged bearer tokens are rejected.
  const declared=Number(req.headers['content-length']);
  if(Number.isFinite(declared)&&declared>7100000)throw fail(413,'Upload überschreitet die zulässige Grösse.');
  // Per-device, process-local abuse throttle. A distributed publisher will need a shared store.
  const now=Date.now(),previous=attempts.get(d.id);
  const bucket=!previous||now-previous.start>=60000?{start:now,count:0}:previous;
  if(++bucket.count>8)throw fail(429,'Bitte vor der nächsten Übergabe warten.');
  attempts.set(d.id,bucket);
  if(active.has(d.id))throw fail(409,'Eine Übergabe dieses Gerätes läuft bereits.');
  active.add(d.id);
  try{
  if(!req.headers['content-type']?.match(/^application\/json(?:\s*;|$)/i))throw fail(415,'JSON erforderlich.');
  let payload;
  try{payload=submission.parse(await readJSON(req,7100000));}
  catch(e){if(e.status)throw e;throw fail(400,'Ungültige Übergabedaten.');}
  if(payload.projectId!==fixture.binding?.internalProjectId||payload.githubRepositoryId!==String(fixture.binding?.githubRepositoryId))
   throw fail(403,'Repository gehört nicht zu dieser Übergabe.');
  const source=db.prepare("SELECT * FROM jobs WHERE id=? AND owner=? AND device=? AND project=? AND action='review' AND status='completed'")
   .get(payload.reviewJob,d.owner,d.id,payload.projectId);
  if(!source)throw fail(403,'Eigener abgeschlossener Prüfstand auf diesem Gerät fehlt.');
  if(reviewState(db,source)!=='approved')throw fail(409,'Unabhängige Freigabe für diesen Prüfstand fehlt.');
  const checked=JSON.parse(source.result??'{}');
  if(!completeReview(checked)||typeof checked.checks!=='string')throw fail(409,'Prüfnachweis nicht vollständig.');
  if(checked.commit!==payload.commit||checked.base!==payload.expectedBaseCommit||checked.branch!==payload.branch)
   throw fail(409,'Eingereichter Git-Stand weicht von der geprüften Revision ab.');
  const origin=JSON.parse(source.payload??'{}');
  const prepared=db.prepare("SELECT id FROM jobs WHERE id=? AND owner=? AND device=? AND project=? AND action='prepare' AND status='completed'")
   .get(origin.worktree??'',d.owner,d.id,payload.projectId);
  if(!prepared||db.prepare('SELECT archived FROM workspaces WHERE job=?').get(prepared.id)?.archived)
   throw fail(409,'Eigene aktive Arbeitskopie fehlt.');
  // The client supplies no destination path, token or idempotency key.
  const request=validatePublisherRequest(fixture.binding,{
   projectId:payload.projectId,githubRepositoryId:payload.githubRepositoryId,
   branch:payload.branch,commit:payload.commit,expectedBaseCommit:payload.expectedBaseCommit,
   idempotencyKey:'review-'+source.id,
  });
  if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(payload.bundleBase64))
   throw fail(400,'Git-Bundle ist nicht kanonisch kodiert.');
  const bytes=Buffer.from(payload.bundleBase64,'base64');
  if(bytes.length<100||bytes.length>5000000||bytes.toString('base64')!==payload.bundleBase64)
   throw fail(413,'Git-Bundle ist zu gross oder ungültig.');
  // Only an operator-supplied fixture under os.tmpdir is allowed by publisher-local.
  const incoming=path.join(fixture.fixtureRoot,'incoming');
  if(!existsSync(incoming)||lstatSync(incoming).isSymbolicLink()||!statSync(incoming).isDirectory()||realpathSync(incoming)!==incoming)
   throw fail(503,'Isolierter Übergabebereich fehlt.');
  const temporary=path.join(incoming,'handoff-'+randomUUID()+'.bundle');
  try{
   writeFileSync(temporary,bytes,{flag:'wx',mode:0o600});
   let outcome;
   try{outcome=publishLocalBundle({binding:fixture.binding,request,fixtureRoot:fixture.fixtureRoot,bundlePath:temporary});}
   catch(e){if(e.message?.startsWith('Local publisher rejected:'))throw fail(400,'Bundle oder Git-Referenz unzulässig.');throw e;}
   send({ok:true,branch:outcome.branch,commit:outcome.commit,created:outcome.created,replayed:outcome.replayed});
  }finally{if(existsSync(temporary))unlinkSync(temporary);}
  return true;
  }finally{active.delete(d.id);}
 };
}
