import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { z } from 'zod';
const initialProjects=[['website','Schmaqq Website','Unser Auftritt. Klar, eigenständig und bereit für neue Kunden.','sage','Im Aufbau'],['bewertungen','Bewertungen','Bewertungen prüfen und Kunden strukturiert begleiten.','sand','Verfügbar'],['automation','Automatisierung','Aus wiederkehrenden Handgriffen verlässliche Abläufe machen.','violet','In Entwicklung'],['firmenscan','Firmenscan','Digitale Sichtbarkeit und Unternehmenssignale verständlich machen.','blue','In Entwicklung'],['sicherheit','Sicherheit','Domain, E-Mail und technische Grundlagen im Blick.','rose','In Entwicklung']];
const id=z.string().min(1).max(100),title=z.string().trim().min(1).max(160),body=z.string().trim().max(12000);
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('project'),title,description:body,color:z.enum(['sage','sand','violet','blue','rose']),stage:z.enum(['Im Aufbau','In Entwicklung','Verfügbar'])}),
 z.object({action:z.literal('task'),project:id,title,description:body,priority:z.enum(['Normal','Hoch']),assignee:id.nullable()}),
 z.object({action:z.literal('status'),id,status:z.enum(['todo','doing','review','done'])}),
 z.object({action:z.literal('assign'),id,assignee:id.nullable()}),
 z.object({action:z.literal('message'),id,channel:id,body:z.string().trim().min(1).max(4000)}),
 z.object({action:z.literal('document'),id:id.optional(),title,body,revision:z.number().int().positive().optional()}),
]);
function db(){if(!env.DB)throw new Error('Datenbank ist nicht verbunden.');return env.DB;}
function json(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
async function member(user:{userId:string;displayName:string;email:string}){await db().prepare('INSERT INTO members(id,name,email,seen) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email,seen=excluded.seen').bind(user.userId,user.displayName,user.email,Date.now()).run();}
export async function GET(){
 const user=await getChatGPTUser();if(!user)return json({error:'Bitte mit ChatGPT anmelden.'},401);
 try{await member(user);await db().batch(initialProjects.map(p=>db().prepare('INSERT OR IGNORE INTO projects(id,title,description,color,stage,created) VALUES(?,?,?,?,?,?)').bind(...p,0)));
 const result=await db().batch([db().prepare('SELECT * FROM projects ORDER BY created,id'),db().prepare('SELECT * FROM tasks ORDER BY created DESC'),db().prepare('SELECT * FROM members ORDER BY name'),db().prepare('SELECT * FROM (SELECT * FROM messages ORDER BY created DESC LIMIT 500) ORDER BY created'),db().prepare('SELECT * FROM documents ORDER BY updated DESC'),db().prepare('SELECT * FROM activities ORDER BY created DESC LIMIT 30')]);
 return json(Object.fromEntries(['projects','tasks','members','messages','documents','activities'].map((k,i)=>[k,result[i].results])));
 }catch(e){console.error('workspace read',e);return json({error:'Der Workspace konnte nicht geladen werden. Bitte erneut versuchen.'},503);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return json({error:'Bitte mit ChatGPT anmelden.'},401);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Ungültiger Ursprung.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'JSON erforderlich.'},415);
 let raw;try{const text=await request.text();if(text.length>24000)return json({error:'Eingabe zu lang.'},413);raw=JSON.parse(text);}catch{return json({error:'Ungültige Eingabe.'},400);}
 const parsed=schema.safeParse(raw);if(!parsed.success)return json({error:'Bitte prüfe die Eingaben.'},400);
 const v=parsed.data,now=Date.now(),uid=crypto.randomUUID();
 try{await member(user);const database=db();let statement:D1PreparedStatement,activity='';
 if(v.action==='project'){statement=database.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?)').bind(uid,v.title,v.description,v.color,v.stage,now);activity=`Projekt „${v.title}“ angelegt`;}
 else if(v.action==='task'){
 if(!await database.prepare('SELECT id FROM projects WHERE id=?').bind(v.project).first())return json({error:'Projekt nicht gefunden.'},404);
 if(v.assignee&&!await database.prepare('SELECT id FROM members WHERE id=?').bind(v.assignee).first())return json({error:'Mitglied nicht gefunden.'},400);
 statement=database.prepare('INSERT INTO tasks(id,project,title,description,status,priority,assignee,created) VALUES(?,?,?,?,?,?,?,?)').bind(uid,v.project,v.title,v.description,'todo',v.priority,v.assignee,now);activity=`Aufgabe „${v.title}“ angelegt`;
 }else if(v.action==='status'||v.action==='assign'){
 const task=await database.prepare('SELECT title FROM tasks WHERE id=?').bind(v.id).first<{title:string}>();if(!task)return json({error:'Aufgabe nicht gefunden.'},404);
 if(v.action==='assign'&&v.assignee&&!await database.prepare('SELECT id FROM members WHERE id=?').bind(v.assignee).first())return json({error:'Mitglied nicht gefunden.'},400);
 statement=v.action==='status'?database.prepare('UPDATE tasks SET status=? WHERE id=?').bind(v.status,v.id):database.prepare('UPDATE tasks SET assignee=? WHERE id=?').bind(v.assignee,v.id);
 const labels={todo:'Offen',doing:'In Arbeit',review:'Review',done:'Erledigt'};activity=v.action==='status'?`„${task.title}“ → ${labels[v.status]}`:`Zuständigkeit für „${task.title}“ geändert`;
 }else if(v.action==='message'){
 if(v.channel!=='general'&&!await database.prepare('SELECT id FROM projects WHERE id=?').bind(v.channel).first())return json({error:'Raum nicht gefunden.'},404);
 await database.prepare('INSERT OR IGNORE INTO messages VALUES(?,?,?,?,?)').bind(v.id,v.channel,user.userId,v.body,now).run();return json({ok:true});
 }else{
 if(v.id){const result=await database.prepare('UPDATE documents SET title=?,body=?,author=?,updated=?,revision=revision+1 WHERE id=? AND revision=?').bind(v.title,v.body,user.userId,now,v.id,v.revision??0).run();if(!result.meta.changes)return json({error:'Das Dokument wurde inzwischen geändert. Kopiere deinen Entwurf und öffne die aktuelle Version.'},409);return json({ok:true});}
 statement=database.prepare('INSERT INTO documents(id,title,body,author,revision,updated) VALUES(?,?,?,?,1,?)').bind(uid,v.title,v.body,user.userId,now);activity=`Dokument „${v.title}“ angelegt`;
 }
 await database.batch([statement,database.prepare('INSERT INTO activities VALUES(?,?,?,?)').bind(crypto.randomUUID(),user.userId,activity,now)]);return json({ok:true,id:uid});
 }catch(e){console.error('workspace write',e);return json({error:'Speichern fehlgeschlagen. Deine Eingabe bleibt erhalten.'},503);}
}
