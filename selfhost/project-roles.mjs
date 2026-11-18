import {metadata,storeMetadata,teamError} from './team-model.mjs';
import {transaction} from './store.mjs';
import {hiddenPractice} from './practice.mjs';

/**
 * Roles per project. Stored as workspace metadata `room:v1:roles:<project>`:
 *   {members:{<memberId>:['admin'|'developer'|'reviewer'|'viewer', ...]}, review:'second'|'admin-alone'}
 * - Existing projects are upgraded once, preserving all effective roles.
 * - New projects start with the creator and any explicitly selected people.
 * - Permissions: view (read), talk (write and ask agents), develop (tasks, files, jobs, submit), review ("Passt"/"Ändern"),
 *   admin (roles, review rule, project settings, take over changes).
 * - review:'admin-alone' lets an admin approve their own change. Default for new projects: 'second'.
 */
export const roleNames=Object.freeze(['admin','developer','reviewer','viewer']);
export const participantRoles=Object.freeze(['developer','reviewer']);
const key=project=>'room:v1:roles:'+project;
const grants={admin:['view','talk','develop','review','admin'],developer:['view','talk','develop'],reviewer:['view','talk','review'],viewer:['view']};
const removed=(db,id)=>!!metadata(db,'member:v1:removed:'+id);

export function projectRoles(db,project){return metadata(db,key(project));}
export function rolesOf(db,member,project){
 if(!member||removed(db,member.id)||hiddenPractice(db,project,member.id))return [];
 const record=projectRoles(db,project);
 if(!record)return legacyRoles(db,member,project);
 return (record.members?.[member.id]??[]).filter(r=>roleNames.includes(r));
}
export function can(db,member,project,permission){return rolesOf(db,member,project).some(r=>grants[r].includes(permission));}
const messages={view:'Du bist in diesem Projekt nicht dabei.',talk:'Deine Rolle erlaubt es nicht, hier zu schreiben.',develop:'Deine Rolle erlaubt es nicht, hier etwas zu ändern.',review:'Deine Rolle erlaubt es nicht, hier etwas freizugeben.',admin:'Das darf nur die Projektleitung.'};
export function requirePermission(db,member,project,permission){if(!can(db,member,project,permission))throw teamError(403,messages[permission]);}
export function reviewRule(db,project){return projectRoles(db,project)?.review==='admin-alone'?'admin-alone':'second';}
/** May this person approve their own change in this project? Only an admin, only with the rule 'admin-alone'. */
export function selfApproval(db,memberId,project){
 if(reviewRule(db,project)!=='admin-alone')return false;
 const member=db.prepare('SELECT id,role FROM members WHERE id=?').get(memberId);
 return can(db,member,project,'admin');
}
/** Capture access to projects created before membership was explicitly selected. */
export function preserveProjectRoles(db,{seedProjects=false}={}){
 const migrated='room:v1:project-memberships-ready';
 if(metadata(db,migrated))return;
 transaction(db,()=>{
  if(metadata(db,migrated))return;
  const owners=db.prepare("SELECT id FROM members WHERE role='owner'").all().filter(m=>!removed(db,m.id));
  for(const {id:project} of db.prepare('SELECT id FROM projects WHERE created>0 OR ?=0').all(Number(seedProjects))){
   const record=projectRoles(db,project)??legacyRecord(db,project);
   for(const owner of owners)if(!hiddenPractice(db,project,owner.id))record.members[owner.id]=['admin'];
   storeMetadata(db,key(project),record);
  }
  storeMetadata(db,migrated,true);
 });
}

export function startRoles(db,project,creator,selected=[]){
 const members={[creator]:['admin']};
 for(const id of new Set(selected)){
  if(id===creator)continue;
  if(removed(db,id)||!db.prepare('SELECT 1 FROM members WHERE id=?').get(id))throw teamError(400,'Dieses Studio-Konto gibt es nicht mehr.');
  members[id]=participantRoles;
 }
 storeMetadata(db,key(project),{members,review:'second'});
}
export function setRoles(db,project,memberId,roles){
 const record=projectRoles(db,project)??legacyRecord(db,project);
 const members={...record.members};if(roles.length)members[memberId]=roles;else delete members[memberId];
 if(record.members[memberId]?.includes('admin')&&!Object.entries(members).some(([id,roles])=>roles.includes('admin')&&!removed(db,id))){
  throw teamError(409,'Gib zuerst jemand anderem die Projektleitung.');
 }
 storeMetadata(db,key(project),{...record,members});
}
export function setReviewRule(db,project,rule){const record=projectRoles(db,project)??legacyRecord(db,project);storeMetadata(db,key(project),{...record,review:rule});}
function legacyRoles(db,member,project){
 const creator=metadata(db,'room:v1:project:'+project)?.createdBy;
 return member.role==='owner'||creator===member.id?['admin']:participantRoles;
}
function legacyRecord(db,project){
 const members={};for(const m of db.prepare('SELECT id,role FROM members').all())if(!removed(db,m.id)&&!hiddenPractice(db,project,m.id))members[m.id]=legacyRoles(db,m,project);
 return {members,review:'second'};
}
