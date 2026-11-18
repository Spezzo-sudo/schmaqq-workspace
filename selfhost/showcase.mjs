import {randomUUID,randomBytes} from 'node:crypto';

// "Bei uns ansehen": after every take-over Studio builds the shared state of a project on its server and shows it at a
// fixed address on the preview domain: <preview origin>/ansehen/<name>-<key>/. The preview domain never shares cookies
// with Studio, so the website's code cannot reach Studio sign-ins; the key makes the address unguessable.

const keyOf=project=>'room:v1:showcase:'+project;
const read=(db,k)=>{const row=db.prepare('SELECT value FROM workspace_meta WHERE key=?').get(k);return row?JSON.parse(row.value):null;};
const write=(db,k,v)=>db.prepare('INSERT INTO workspace_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k,JSON.stringify(v));

/** A readable, unguessable address part: "cafe-sonne-k3f9x2m7". */
export function showcaseSlug(title){
 const name=title.toLowerCase().replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
  .normalize('NFKD').replace(/[^\x00-\x7f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40)||'projekt';
 const alphabet='abcdefghijkmnpqrstuvwxyz23456789',bytes=randomBytes(8);
 return name+'-'+[...bytes].map(b=>alphabet[b%alphabet.length]).join('');
}

/** What the app shows about it: address, when built, whether it is building, why it failed. */
export function showcaseOf(db,project,previewOrigin){
 const s=read(db,keyOf(project));if(!s)return null;
 const job=s.job?db.prepare('SELECT status,result FROM jobs WHERE id=?').get(s.job):null;
 const building=!!job&&['queued','running','cancelling'].includes(job.status);
 let error=null;if(job&&['failed','interrupted'].includes(job.status)){try{error=JSON.parse(job.result??'{}').error??null;}catch{/* unreadable */}error=error||'Das Bauen hat nicht geklappt.';}
 return {url:s.preview?`${previewOrigin}/ansehen/${s.slug}/`:null,at:s.at??null,building,error};
}

/** The project's preview id for an address part, or null. */
export function showcasePreview(db,slug){
 if(!/^[a-z0-9-]{3,90}$/.test(slug))return null;
 const row=db.prepare("SELECT value FROM workspace_meta WHERE key LIKE 'room:v1:showcase:%' AND json_extract(value,'$.slug')=?").get(slug);
 return row?JSON.parse(row.value).preview??null:null;
}

/** "Neuer Link": the old address stops working at once. */
export function renewShowcase(db,project,title){const s=read(db,keyOf(project));if(s)write(db,keyOf(project),{...s,slug:showcaseSlug(title)});}

/** The latest take-over of the project: a finished direct take-over or a merged pull request. */
function lastTakeOver(db,project){
 const job=db.prepare("SELECT max(created) AS at FROM jobs WHERE project=? AND action='integrate' AND status='completed'").get(project)?.at??0;
 const merge=db.prepare("SELECT max(json_extract(value,'$.created')) AS at FROM workspace_meta WHERE key LIKE 'team:v1:event:%' AND json_extract(value,'$.project')=? AND json_extract(value,'$.kind')='github-merge'").get(project)?.at??0;
 return Math.max(job,merge);
}
/** The project's workplace on the server: where its last trial run passed. */
function workplace(db,project){
 return db.prepare("SELECT j.device,d.owner FROM jobs j JOIN devices d ON d.id=j.device WHERE j.project=? AND j.action='probe' AND j.status='completed' AND d.revoked=0 ORDER BY j.created DESC LIMIT 1").get(project)??null;
}

/**
 * Projects that show their result "bei uns" get a fresh build after each take-over (and once when switched on, or when
 * asked with "Neu bauen"). One build per project at a time. Returns the projects a build was queued for.
 */
export function queueShowcases(db,{now=Date.now(),force=null}={}){
 const queued=[];
 const projects=db.prepare("SELECT substr(key,17) AS project,value FROM workspace_meta WHERE key LIKE 'room:v1:project:%' AND json_extract(value,'$.live')='show' AND coalesce(json_extract(value,'$.archived'),0)=0").all();
 for(const {project} of projects){
  const s=read(db,keyOf(project))??{slug:showcaseSlug(db.prepare('SELECT title FROM projects WHERE id=?').get(project)?.title??'projekt')};
  if(s.job&&db.prepare("SELECT 1 FROM jobs WHERE id=? AND status IN ('queued','running','cancelling')").get(s.job))continue;
  const change=lastTakeOver(db,project);
  if(force!==project&&s.preview&&change<=(s.builtFor??0))continue;
  if(force!==project&&!s.preview&&s.job&&change<=(s.builtFor??0))continue; // a failed first build waits for a change or "Neu bauen"
  const place=workplace(db,project);if(!place)continue;
  const job=randomUUID();
  db.prepare('INSERT INTO jobs(id,owner,device,project,action,payload,status,created) VALUES(?,?,?,?,?,?,?,?)').run(job,place.owner,place.device,project,'showcase','{}','queued',now);
  write(db,keyOf(project),{...s,job,builtFor:Math.max(change,1)});
  queued.push(project);
 }
 return queued;
}

/** A finished build: point the address at it and drop the previous build. */
export function storeShowcase(db,job,previewId,{now=Date.now(),commit=null}={}){
 const s=read(db,keyOf(job.project));if(!s||s.job!==job.id)return;
 if(s.preview&&s.preview!==previewId)db.prepare('DELETE FROM previews WHERE id=?').run(s.preview);
 write(db,keyOf(job.project),{...s,preview:previewId,at:now,...(commit?{commit}:{})});
}
