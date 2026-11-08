import {randomUUID} from 'node:crypto';
import {metadata,storeMetadata} from './team-model.mjs';

/**
 * Invitation-only team access.
 * - Only the owner creates invitation links. Members may propose a person; the owner approves.
 * - Every account remembers who invited it.
 * - The owner sees open invitations and can withdraw them.
 * - The owner can remove a member: sessions, AI assistant grants, PCs/servers and ChatGPT sign-in end at once.
 *   The account row stays so messages and tasks keep their author; it can never sign in again.
 */
const inviteKey=hash=>'invite:v1:'+hash,invitedKey=member=>'member:v1:invited:'+member,removedKey=member=>'member:v1:removed:'+member;
const requestPrefix='invite-request:v1:';
const hasTable=(db,name)=>!!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);

export function noteInvite(db,hash,by){storeMetadata(db,inviteKey(hash),{by:by??null,created:Date.now()});}
/** Call inside the registration transaction, before the invitation row is deleted. */
export function consumeInvite(db,hash,member){
 const meta=metadata(db,inviteKey(hash));
 storeMetadata(db,invitedKey(member),{by:meta?.by??null,at:Date.now()});
 db.prepare('DELETE FROM workspace_meta WHERE key=?').run(inviteKey(hash));
}
export const isRemoved=(db,member)=>!!metadata(db,removedKey(member));
export const invitedBy=(db,member)=>metadata(db,invitedKey(member))?.by??null;

export function openInvites(db){
 const name=id=>id?db.prepare('SELECT name FROM members WHERE id=?').get(id)?.name??null:null;
 db.prepare('DELETE FROM invites WHERE expires<=?').run(Date.now());
 return db.prepare('SELECT hash,email,role,expires FROM invites ORDER BY expires DESC').all()
  .map(i=>({id:i.hash,email:i.email,role:i.role,expires:i.expires,invitedBy:name(metadata(db,inviteKey(i.hash))?.by)}));
}
export function withdrawInvite(db,id){
 if(typeof id!=='string'||!/^[a-f0-9]{64}$/.test(id))return false;
 const done=db.prepare('DELETE FROM invites WHERE hash=?').run(id).changes>0;
 db.prepare('DELETE FROM workspace_meta WHERE key=?').run(inviteKey(id));
 return done;
}

export function proposeInvite(db,email,by){
 const open=inviteRequests(db).filter(r=>r.status==='pending');
 if(open.some(r=>r.email===email))return {duplicate:true};
 if(open.filter(r=>r.by===by).length>=5)return {limit:true};
 const id=randomUUID();storeMetadata(db,requestPrefix+id,{email,by,created:Date.now(),status:'pending'});return {id};
}
export function inviteRequests(db){
 return db.prepare('SELECT key,value FROM workspace_meta WHERE key LIKE ? ORDER BY key').all(requestPrefix+'%')
  .map(r=>({id:r.key.slice(requestPrefix.length),...JSON.parse(r.value)})).sort((a,b)=>b.created-a.created);
}
export function decideRequest(db,id,status,decidedBy){
 if(typeof id!=='string'||!/^[\w-]{1,64}$/.test(id))return null;
 const key=requestPrefix+id,request=metadata(db,key);
 if(!request||request.status!=='pending')return null;
 storeMetadata(db,key,{...request,status,decidedBy,decided:Date.now()});
 return request;
}

export function removeMember(db,member,by){
 storeMetadata(db,removedKey(member),{by,at:Date.now()});
 db.prepare('DELETE FROM sessions WHERE member=?').run(member);
 db.prepare('UPDATE devices SET revoked=1 WHERE owner=?').run(member);
 if(hasTable(db,'plugin_grants'))db.prepare('UPDATE plugin_grants SET revoked=1 WHERE member=?').run(member);
 if(hasTable(db,'oidc_identities'))db.prepare('DELETE FROM oidc_identities WHERE member=?').run(member);
 for(const r of inviteRequests(db))if(r.by===member&&r.status==='pending')storeMetadata(db,requestPrefix+r.id,{...r,status:'withdrawn'});
}
