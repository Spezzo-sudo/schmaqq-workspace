import {randomUUID} from 'node:crypto';
import {transaction} from './store.mjs';
import {metadata,storeMetadata,teamError} from './team-model.mjs';

/**
 * Practice round: a personal project only its owner sees, to walk the whole way once without risk.
 * Review rule 'admin-alone', so one person can go through "Anschauen" and "Fertig" alone. Deleted with one tap.
 */
const key=project=>'room:v1:practice:'+project;
export const practiceOwner=(db,project)=>metadata(db,key(project))?.owner??null;
/** Practice projects of other people are invisible. */
export const hiddenPractice=(db,project,member)=>{const owner=practiceOwner(db,project);return !!owner&&owner!==member;};

export function createPracticeRoute({db,user,readJSON,parse}){
 return async({route,method,req,send})=>{
  if(route!=='/api/practice')return false;
  const member=user(req);
  const mine=db.prepare("SELECT key FROM workspace_meta WHERE key LIKE 'room:v1:practice:%' AND json_extract(value,'$.owner')=?").get(member.id);
  const current=mine?mine.key.slice('room:v1:practice:'.length):null;
  if(method==='GET'){send({project:current});return true;}
  if(method!=='POST')throw teamError(405,'Methode nicht erlaubt.');
  const v=await readJSON(req,1024);
  if(v?.action==='start'){
   if(current){send({project:current});return true;}
   const project=randomUUID(),task=randomUUID(),now=Date.now();
   transaction(db,()=>{
    db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').run(project,'Übung – '+member.name.split(' ')[0],'Dein persönliches Übungsprojekt. Nur du siehst es. Probier hier alles aus und lösch es danach.','sage','Im Aufbau',now);
    storeMetadata(db,'room:v1:project:'+project,{revision:0,repository:null,teamShared:false,createdBy:member.id,base:'main',workflow:'pull-request',live:'manual',liveHow:'In der Übung einfach „Ist jetzt live“ tippen.'});
    storeMetadata(db,'room:v1:roles:'+project,{members:{[member.id]:['admin']},review:'admin-alone'});
    storeMetadata(db,key(project),{owner:member.id,created:now});
    db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?)').run(task,project,'Übung: Schreib einen Satz über dein Lieblingsprojekt','Geh den ganzen Weg einmal: Loslegen, Ergebnis aufschreiben, anschauen und freigeben, abschliessen. In der Übung darfst du dich selbst freigeben.','todo','Normal',member.id,now);
    storeMetadata(db,'team:v1:task:'+task,{kind:'general',criteria:'Ein Satz steht da.',requiresReview:true,blocked:'',cancelled:false,revision:0});
    db.prepare('INSERT INTO messages VALUES(?,?,?,?,?)').run(randomUUID(),project,member.id,'Hier ist das Projektgespräch. Schreib etwas – aus jeder Nachricht kann später eine Aufgabe werden.',now);
   });
   send({project});return true;
  }
  if(v?.action==='delete'){
   if(!current)throw teamError(404,'Es gibt keine Übung.');
   transaction(db,()=>{
    const tasks=db.prepare('SELECT id FROM tasks WHERE project=?').all(current).map(t=>t.id);
    if(db.prepare("SELECT 1 FROM jobs WHERE project=?").get(current))throw teamError(409,'In der Übung läuft noch etwas. Später erneut versuchen.');
    for(const t of tasks){db.prepare('DELETE FROM task_comments WHERE task=?').run(t);db.prepare("DELETE FROM workspace_meta WHERE key LIKE ? OR key LIKE ?").run('team:v1:%'+t,'room:v1:%'+t);}
    db.prepare('DELETE FROM tasks WHERE project=?').run(current);
    db.prepare('DELETE FROM messages WHERE channel=?').run(current);
    const notes=db.prepare("SELECT substr(key,14) AS id FROM workspace_meta WHERE key LIKE 'room:v1:note:%' AND json_extract(value,'$.project')=?").all(current);
    for(const n of notes)db.prepare('DELETE FROM documents WHERE id=?').run(n.id);
    db.prepare("DELETE FROM workspace_meta WHERE json_valid(value) AND json_extract(value,'$.project')=?").run(current);
    db.prepare('DELETE FROM workspace_meta WHERE key IN (?,?,?)').run('room:v1:project:'+current,'room:v1:roles:'+current,key(current));
    db.prepare('DELETE FROM projects WHERE id=?').run(current);
   });
   send({ok:true});return true;
  }
  throw teamError(400,'Unbekannte Aktion.');
 };
}
