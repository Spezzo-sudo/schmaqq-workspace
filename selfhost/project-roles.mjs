import {metadata,storeMetadata,teamError} from './team-model.mjs';

/**
 * Roles per project. Stored as workspace metadata `room:v1:roles:<project>`:
 *   {members:{<memberId>:['admin'|'developer'|'reviewer'|'viewer', ...]}, review:'second'|'admin-alone'}
 * - The Studio owner is always admin of every project.
 * - Projects without a record keep the earlier rule: every member develops and reviews, admin is the owner
 *   and whoever created the project.
 * - Permissions: view (read, talk), develop (tasks, files, jobs, submit), review ("Passt"/"Ändern"),
 *   admin (roles, review rule, project settings, take over changes).
 * - review:'admin-alone' lets an admin approve their own change. Default for new projects: 'second'.
 */
export const roleNames=Object.freeze(['admin','developer','reviewer','viewer']);
const key=project=>'room:v1:roles:'+project;
const grants={admin:['view','develop','review','admin'],developer:['view','develop'],reviewer:['view','review'],viewer:['view']};
const removed=(db,id)=>!!metadata(db,'member:v1:removed:'+id);

export function projectRoles(db,project){return metadata(db,key(project));}
export function rolesOf(db,member,project){
 if(!member||removed(db,member.id))return [];
 if(member.role==='owner')return ['admin'];
 const record=projectRoles(db,project);
 if(!record)return metadata(db,'room:v1:project:'+project)?.createdBy===member.id?['admin']:['developer','reviewer'];
 return (record.members?.[member.id]??[]).filter(r=>roleNames.includes(r));
}
export function can(db,member,project,permission){return rolesOf(db,member,project).some(r=>grants[r].includes(permission));}
const messages={view:'Du bist in diesem Projekt nicht eingetragen.',develop:'In diesem Projekt darfst du nichts ändern. Der Projekt-Admin kann dir die Rolle „Entwickler“ geben.',review:'In diesem Projekt darfst du nicht freigeben. Der Projekt-Admin kann dir die Rolle „Prüfer“ geben.',admin:'Das darf nur der Projekt-Admin.'};
export function requirePermission(db,member,project,permission){if(!can(db,member,project,permission))throw teamError(403,messages[permission]);}
export function reviewRule(db,project){return projectRoles(db,project)?.review==='admin-alone'?'admin-alone':'second';}
/** May this person approve their own change in this project? Only an admin, only with the rule 'admin-alone'. */
export function selfApproval(db,memberId,project){
 if(reviewRule(db,project)!=='admin-alone')return false;
 const member=db.prepare('SELECT id,role FROM members WHERE id=?').get(memberId);
 return can(db,member,project,'admin');
}
/** New project: creator is admin, everyone else in the team develops and reviews; the admin can narrow it. */
export function startRoles(db,project,creator){
 const members={};
 for(const m of db.prepare('SELECT id FROM members').all())if(!removed(db,m.id))members[m.id]=m.id===creator?['admin']:['developer','reviewer'];
 storeMetadata(db,key(project),{members,review:'second'});
}
export function setRoles(db,project,memberId,roles){
 const record=projectRoles(db,project)??legacyRecord(db,project);
 const members={...record.members};if(roles.length)members[memberId]=roles;else delete members[memberId];
 storeMetadata(db,key(project),{...record,members});
}
export function setReviewRule(db,project,rule){const record=projectRoles(db,project)??legacyRecord(db,project);storeMetadata(db,key(project),{...record,review:rule});}
function legacyRecord(db,project){
 const members={};for(const m of db.prepare('SELECT id,role FROM members').all())if(!removed(db,m.id))members[m.id]=rolesOf(db,m,project).filter(r=>m.role!=='owner'||r!=='admin');
 return {members,review:'second'};
}
