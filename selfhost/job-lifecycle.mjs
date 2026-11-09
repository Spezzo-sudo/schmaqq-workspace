// Job lifecycle independent of the runner: a job whose runner went silent must not stay
// "running" forever and lock other work. Runners send a heartbeat about every second.
export const HEARTBEAT_LIMIT_MS=120000;
export const QUEUE_LIMIT_MS=30*60000;
export const lostText='Die Verbindung zur Werkstatt ist abgerissen. Der Auftrag wurde abgebrochen; was die Werkstatt bis dahin gemacht hat, bitte vor einem neuen Versuch prüfen.';
export const unreachableText='Die Werkstatt war über 30 Minuten nicht erreichbar. Der Auftrag wurde nicht ausgeführt. Starte ihn neu, sobald die Werkstatt wieder läuft.';
export function expireStaleJobs(db,now=Date.now()){
 const lost=db.prepare("UPDATE jobs SET status='interrupted',lease=NULL,result=? WHERE status IN ('running','cancelling') AND COALESCE(heartbeat,started,created)<?").run(JSON.stringify({error:lostText}),now-HEARTBEAT_LIMIT_MS).changes;
 const waiting=db.prepare("UPDATE jobs SET status='interrupted',result=? WHERE status='queued' AND created<? AND device IN (SELECT id FROM devices WHERE seen<?)").run(JSON.stringify({error:unreachableText}),now-QUEUE_LIMIT_MS,now-QUEUE_LIMIT_MS).changes;
 return {lost:Number(lost),waiting:Number(waiting)};
}
// One copy, one active job at a time; other copies on the same machine queue behind it.
export function activeJobInCopy(db,worktree){
 return db.prepare("SELECT id FROM jobs WHERE (id=? OR json_extract(payload,'$.worktree')=?) AND status IN ('queued','running','cancelling') LIMIT 1").get(worktree,worktree)??null;
}
