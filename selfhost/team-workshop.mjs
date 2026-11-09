import {metadata} from './team-model.mjs';
import {can} from './project-roles.mjs';
import {deviceHost,executors} from './placement.mjs';

/**
 * Team workshop: a server worker set up for a project by one of its admins can be used by every developer of
 * that project – each in their own working copy, in the same sandbox. PCs stay personal.
 * A project admin can switch it off per project (room:v1:project:<id>.teamWorkshop === false).
 */
export const teamWorkshopOn=(db,project)=>metadata(db,'room:v1:project:'+project)?.teamWorkshop!==false;
const member=(db,id)=>db.prepare('SELECT id,role FROM members WHERE id=?').get(id);

/** Only projects the worker has actually been set up for. */
const setUpFor=(db,device,project)=>{const s=db.prepare('SELECT projects FROM runner_project_state WHERE device=?').get(device);try{return !!s&&JSON.parse(s.projects).some(p=>p.id===project);}catch{return false;}};
/** Server devices of other people this member may use for this project. */
export function teamDevices(db,who,project){
 if(!project||!teamWorkshopOn(db,project)||!can(db,who,project,'develop'))return [];
 return db.prepare('SELECT d.id,d.owner FROM devices d WHERE d.revoked=0 AND d.owner<>?').all(who.id)
  .filter(d=>deviceHost(db,d.id)?.kind==='server'&&can(db,member(db,d.owner),project,'admin')&&setUpFor(db,d.id,project)).map(d=>d.id);
}
/** Same shape as placement executors(), for resolveDevice: own devices plus team workshops of this project. */
export function usableExecutors(db,who,project,now=Date.now()){
 const own=executors(db,who.id,now),team=teamDevices(db,who,project);
 if(!team.length)return own;
 const others=[...new Set(team.map(id=>db.prepare('SELECT owner FROM devices WHERE id=?').get(id).owner))]
  .flatMap(owner=>executors(db,owner,now)).filter(e=>team.includes(e.id)).map(e=>({...e,team:true}));
 return [...own,...others];
}
