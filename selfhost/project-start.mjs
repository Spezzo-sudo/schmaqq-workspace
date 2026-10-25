import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {transaction} from './store.mjs';
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function projectReadiness(db,member){
 const reports=db.prepare('SELECT d.id AS device,s.projects,s.updated,r.codex,r.updated AS codexUpdated FROM devices d LEFT JOIN runner_project_state s ON s.device=d.id LEFT JOIN ai_resources r ON r.device=d.id WHERE d.owner=? AND d.revoked=0').all(member).map(r=>({...r,projects:r.projects?JSON.parse(r.projects):null}));
 const inspections=db.prepare(`SELECT device,project,status,created,ready FROM (SELECT device,project,status,created,json_extract(result,'$.ready') AS ready,ROW_NUMBER() OVER (PARTITION BY device,project ORDER BY created DESC,rowid DESC) AS n FROM jobs WHERE owner=? AND action='inspect') WHERE n=1`).all(member);
 return {reports,inspections};
}
export async function projectStartRoute({route,method,req,db,user,send,readJSON,parse}){
 if(route!=='/api/project-start')return false;
 const member=user(req);if(method!=='POST')throw fail(405,'Methode nicht erlaubt.');
 const value=parse(z.object({id:z.string().uuid(),title:z.string().trim().min(1).max(160),description:z.string().trim().max(12000),mode:z.enum(['existing','new','github'])}),await readJSON(req));
 let project;
 transaction(db,()=>{
  const existing=db.prepare('SELECT * FROM project_starts WHERE id=?').get(value.id);
  if(existing){if(existing.owner!==member.id||existing.title!==value.title||existing.description!==value.description||existing.mode!==value.mode)throw fail(409,'Dieser Projektstart wurde bereits mit anderen Angaben gespeichert.');project=existing.project;return;}
  project=randomUUID();
  db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run(project,value.title,value.description,'sage','Im Aufbau',Date.now());
  db.prepare('INSERT INTO project_starts VALUES(?,?,?,?,?,?)').run(value.id,project,member.id,value.mode,value.title,value.description);
  db.prepare('INSERT INTO activities VALUES(?,?,?,?)').run(randomUUID(),member.id,'Projekt vorbereitet: '+value.title,Date.now());
 });send({ok:true,project});return true;
}
