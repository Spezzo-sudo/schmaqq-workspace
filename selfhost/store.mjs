import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, createHash, scryptSync, timingSafeEqual } from 'node:crypto';

export const digest=value=>createHash('sha256').update(value).digest('hex');
export const token=()=>randomBytes(32).toString('base64url');
export function passwordHash(value){const salt=token();return `${salt}:${scryptSync(value,salt,64).toString('hex')}`;}
export function passwordValid(value,hash){const [salt,expected]=hash.split(':');if(!salt||!expected||!/^[a-f0-9]{128}$/.test(expected))return false;const actual=scryptSync(value,salt,64);return timingSafeEqual(actual,Buffer.from(expected,'hex'));}
export function openStore(filename){
 mkdirSync(path.dirname(filename),{recursive:true});const db=new DatabaseSync(filename);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS members(id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL,seen INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,member TEXT NOT NULL REFERENCES members(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS invites(hash TEXT PRIMARY KEY,email TEXT NOT NULL,role TEXT NOT NULL,expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,title TEXT NOT NULL,description TEXT NOT NULL,color TEXT NOT NULL,stage TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,project TEXT NOT NULL REFERENCES projects(id),title TEXT NOT NULL,description TEXT NOT NULL,status TEXT NOT NULL,priority TEXT NOT NULL,assignee TEXT REFERENCES members(id),created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,channel TEXT NOT NULL,author TEXT NOT NULL REFERENCES members(id),body TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,author TEXT NOT NULL REFERENCES members(id),revision INTEGER NOT NULL DEFAULT 1,updated INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS activities(id TEXT PRIMARY KEY,author TEXT NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES members(id),name TEXT NOT NULL,hash TEXT UNIQUE NOT NULL,seen INTEGER NOT NULL DEFAULT 0,revoked INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES members(id),device TEXT NOT NULL REFERENCES devices(id),project TEXT NOT NULL REFERENCES projects(id),action TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,created INTEGER NOT NULL,started INTEGER,result TEXT,lease TEXT,heartbeat INTEGER);
 CREATE INDEX IF NOT EXISTS jobs_device_status ON jobs(device,status,created);
 CREATE INDEX IF NOT EXISTS messages_channel ON messages(channel,created);
 CREATE TABLE IF NOT EXISTS workspace_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
 db.exec('CREATE TABLE IF NOT EXISTS previews(id TEXT PRIMARY KEY,job TEXT NOT NULL,created INTEGER NOT NULL,manifest TEXT NOT NULL);');
 db.exec(`CREATE TABLE IF NOT EXISTS job_events(job TEXT NOT NULL REFERENCES jobs(id),seq INTEGER NOT NULL,type TEXT NOT NULL,text TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(job,seq));`);
 db.exec(`CREATE TABLE IF NOT EXISTS code_reviews(seq INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT UNIQUE NOT NULL,job TEXT NOT NULL REFERENCES jobs(id),commit_sha TEXT NOT NULL,reviewer TEXT NOT NULL REFERENCES members(id),decision TEXT NOT NULL,body TEXT NOT NULL,created INTEGER NOT NULL);CREATE INDEX IF NOT EXISTS code_reviews_job ON code_reviews(job,commit_sha,seq);`);
 db.exec(`CREATE TABLE IF NOT EXISTS workspaces(job TEXT PRIMARY KEY REFERENCES jobs(id),title TEXT NOT NULL,scope TEXT NOT NULL DEFAULT '',task TEXT REFERENCES tasks(id),archived INTEGER NOT NULL DEFAULT 0,revision INTEGER NOT NULL DEFAULT 1);`);
 db.exec(`CREATE TABLE IF NOT EXISTS ai_resources(device TEXT PRIMARY KEY REFERENCES devices(id),models TEXT NOT NULL,status TEXT NOT NULL,allow_team INTEGER NOT NULL,projects TEXT NOT NULL,codex TEXT NOT NULL,updated INTEGER NOT NULL);CREATE TABLE IF NOT EXISTS ai_grants(device TEXT NOT NULL REFERENCES devices(id),member TEXT NOT NULL REFERENCES members(id),PRIMARY KEY(device,member));`);
 db.exec(`CREATE TABLE IF NOT EXISTS task_comments(id TEXT PRIMARY KEY,task TEXT NOT NULL REFERENCES tasks(id),author TEXT NOT NULL REFERENCES members(id),body TEXT NOT NULL,created INTEGER NOT NULL);CREATE INDEX IF NOT EXISTS task_comments_task ON task_comments(task,created);`);
 const seed=db.prepare('INSERT OR IGNORE INTO projects VALUES(?,?,?,?,?,?)');
 for(const p of [['website','Schmaqq Website','Unser Auftritt und unsere Plattform.','sage','Im Aufbau'],['bewertungen','Bewertungen','Unser erster digitaler Service.','sand','Verfügbar'],['automation','Automatisierung','Verlässliche digitale Abläufe.','violet','In Entwicklung'],['firmenscan','Firmenscan','Unternehmenssignale verständlich machen.','blue','In Entwicklung'],['sicherheit','Sicherheit','Technische Grundlagen im Blick.','rose','In Entwicklung']])seed.run(...p,0);
 return db;
}
export function createInvite(db,email,role='member'){
 const value=token();db.prepare('INSERT INTO invites VALUES(?,?,?,?)').run(digest(value),email.toLowerCase(),role,Date.now()+48*3600000);return value;
}
export function transaction(db,fn){db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}
