import {randomUUID} from 'node:crypto';
import {resolveDevice} from './placement.mjs';
import {activeJobInCopy} from './job-lifecycle.mjs';
import {accountState} from './codex-account.mjs';
import {taskContract,metadata} from './team-model.mjs';
import {can} from './project-roles.mjs';
import {canCode} from './agent-roles.mjs';

// Code runs by agents (Schritt 5): an agent asked inside a code task changes code in the asking person's own working
// copy, with that person's own ChatGPT sign-in, on the project's Werkstatt. Nothing is shared, reviewed or merged by
// the agent: the change waits in the copy, and the person looks at it and hands it in like their own work.

const fail=(status,message)=>Object.assign(new Error(message),{status});
const PROMPT_LIMIT=12000;

/** What the agent run is allowed to do here, or why not (shown to the model as a short reason). */
export function codeRunBlocker(db,{member,task,agent}){
 if(!canCode(agent))return 'Code ändert die Entwicklung im Team, nicht dieser Agent.';
 if(!task)return 'Code ändern geht nur im Gespräch einer Code-Aufgabe.';
 if(taskContract(db,task).kind!=='code')return 'Das ist keine Code-Aufgabe.';
 if(task.status==='done')return 'Die Aufgabe ist abgeschlossen.';
 if(!can(db,member,task.project,'develop'))return 'Code ändern braucht die Entwicklerrolle im Projekt.';
 if(task.assignee&&task.assignee!==member.id)return 'Die Aufgabe gehört einer anderen Person.';
 return null;
}

function signedIn(db,member){
 const jobs=db.prepare("SELECT id,device,project,payload,status,created,result FROM jobs WHERE owner=? AND action='codex-account' ORDER BY created DESC LIMIT 10").all(member.id);
 return accountState(jobs).connected;
}

/** The instruction for Codex: the task's goal and done-when, the project's area, and what the agent wants changed. */
export function codePrompt({task,contract,scope=[],agent,instruction}){
 return [
  `Aufgabe: ${task.title}`,
  task.description?`Worum es geht: ${task.description.slice(0,3000)}`:'',
  `Fertig, wenn: ${contract.criteria||'die Aufgabe erfüllt ist und die Tests grün sind.'}`,
  scope.length?`Ändere nur Dateien unter: ${scope.join(', ')}. Brauchst du etwas außerhalb, ändere es nicht und schreibe es in deine Antwort.`:'',
  `Auftrag von ${agent.name} (Agent im Team):`,
  instruction,
  'Arbeite nur in diesem Repository. Committe nicht, pushe nicht und veröffentliche nichts; die Person prüft die Änderung selbst.'
 ].filter(Boolean).join('\n\n').slice(0,PROMPT_LIMIT);
}

/**
 * Queue a code run in the person's working copy of the task. Without a copy, one is prepared first on the project's
 * Werkstatt; the Werkstatt works one job after the other, so the code run starts once the copy is ready.
 * Must run inside a transaction.
 */
export function queueAgentCodeRun(db,{member,task,agent,run,instruction,now=Date.now()}){
 const blocker=codeRunBlocker(db,{member,task,agent});
 if(blocker)throw fail(403,blocker);
 const copy=db.prepare("SELECT w.job,j.device FROM workspaces w JOIN jobs j ON j.id=w.job WHERE w.task=? AND w.archived=0 AND j.owner=? AND j.action='prepare' AND j.status IN ('queued','running','completed') ORDER BY j.created DESC LIMIT 1").get(task.id,member.id);
 const placed=resolveDevice(db,{member,project:task.project,device:'auto',...(copy?{worktree:copy.job}:{})});
 if(placed.kind==='server'&&!signedIn(db,member))throw fail(409,'Für Programmierläufe muss die Person zuerst unter „Mein Konto → Anmeldung für Programmierläufe“ ihr ChatGPT verbinden.');
 if(copy&&activeJobInCopy(db,copy.job))throw fail(409,'In der Arbeitskopie läuft gerade schon etwas. Bitte warten.');
 const project=metadata(db,'room:v1:project:'+task.project,{}),contract=taskContract(db,task);
 const placement={mode:placed.mode,kind:placed.kind,reason:placed.reason};
 let worktree=copy?.job;
 if(!worktree){
  worktree=randomUUID();
  db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created) VALUES(?,?,?,?,?,?,?,?)').run(worktree,member.id,placed.device,task.project,'prepare',JSON.stringify({placement}),'queued',now);
  db.prepare('INSERT INTO workspaces(job,title,scope,task) VALUES(?,?,?,?)').run(worktree,task.title,'',task.id);
  db.prepare("UPDATE tasks SET assignee=?,status=CASE WHEN status='todo' THEN 'doing' ELSE status END WHERE id=?").run(member.id,task.id);
 }
 const job=randomUUID();
 const payload={worktree,prompt:codePrompt({task,contract,scope:project.scope??[],agent,instruction}),
  contractRevision:contract.revision,contractSnapshot:{title:task.title,description:task.description,criteria:contract.criteria},
  ...(project.repository?{expectedRepository:project.repository,expectedBase:project.base??'main'}:{}),
  placement,agent:{id:agent.id,name:agent.name,run:run.id}};
 db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created) VALUES(?,?,?,?,?,?,?,?)').run(job,member.id,placed.device,task.project,'codex',JSON.stringify(payload),'queued',now+1);
 if(task.status==='review')db.prepare("UPDATE tasks SET status='doing' WHERE id=?").run(task.id);
 return {job,worktree,prepared:!copy,device:placed.name};
}
