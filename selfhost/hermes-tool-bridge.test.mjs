import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID} from 'node:crypto';
import {createStudioServer} from './server.mjs';
import {openStore,digest,passwordHash} from './store.mjs';
import {setRoles} from './project-roles.mjs';
import {execute,toolGrant} from './hermes-agent-worker.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const adapter=path.join(here,'hermes-pilot-infer.py');
const fullPermissions={readProject:true,writeMessages:true,manageTasks:true,editCode:false,prepareReviews:false,delegateAgents:false};

async function fixture(t){
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-hermes-tools-'));
 const filename=path.join(dir,'pilot.sqlite'),origin='http://127.0.0.1:49151';
 const privateDb=openStore(filename,{seedProjects:false});
 const members=[{id:randomUUID(),email:'alice@fixture.invalid',name:'Alice'},{id:randomUUID(),email:'bob@fixture.invalid',name:'Bob'}];
 for(const m of members){
  m.session=randomBytes(32).toString('base64url');
  privateDb.prepare('INSERT INTO members VALUES(?,?,?,?,?,?)').run(m.id,m.name,m.email,passwordHash('fixture-password-not-for-real'),'member',Date.now());
  privateDb.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(m.session),m.id,Date.now()+120000);
  m.cookie='studio_session='+m.session;
 }
 privateDb.close();
 const secrets=members.map(m=>({owner:m.id,token:randomBytes(32).toString('base64url')}));
 const app=createStudioServer({filename,origin,previewOrigin:'http://127.0.0.1:49152',resetMailer:null,hermesWorkers:secrets});
 await new Promise((resolve,reject)=>{app.server.once('error',reject);app.server.listen(0,'127.0.0.1',resolve);});
 t.after(async()=>{await new Promise(resolve=>app.server.close(resolve));app.db.close();rmSync(dir,{recursive:true,force:true});});
 const host='http://127.0.0.1:'+app.server.address().port;
 async function post(route,body,{cookie,token}={}){
  const r=await fetch(host+route,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
  return {status:r.status,data:await r.json()};
 }
 async function get(route,{cookie}={}){const r=await fetch(host+route,{headers:cookie?{Cookie:cookie}:{}});return {status:r.status,data:await r.json()};}
 async function setup({permissions=fullPermissions}={}){
  const [alice]=members;
  const project=(await post('/api/room',{action:'create',id:randomUUID(),title:'Pilot',description:'Isolierte Testdaten'},{cookie:alice.cookie})).data.project;
  const agentResult=await post('/api/room',{action:'agent',id:randomUUID(),project,name:'Mara',role:'frontend',avatarPresetId:'mara',model:'pilot-codex',permissions},{cookie:alice.cookie});
  assert.equal(agentResult.status,200);
  const agent=agentResult.data.agentId,message=randomUUID();
  assert.equal((await post('/api/room',{action:'message',id:message,project,recipient:agent,body:'Plane bitte die mobile Suche als Aufgabe.'},{cookie:alice.cookie})).status,200);
  assert.equal((await post('/api/agent-runs',{project,agent,message},{cookie:alice.cookie})).status,202);
  const job=(await post('/api/hermes-worker/claim',{},{token:secrets[0].token})).data.job;
  return {project,agent,message,job};
 }
 const tool=(job,tool,args,callId=randomBytes(12).toString('base64url'),token=secrets[0].token)=>post('/api/hermes-worker/tool',{run:job.run,lease:job.lease,callId,tool,args},{token});
 const room=async(project,member=members[0])=>(await get('/api/room?project='+project,{cookie:member.cookie})).data;
 return {app,members,secrets,post,get,setup,tool,room,origin,host,dir};
}

test('tool bridge: only agents allowed to plan tasks receive the two Studio tools; others stay no-tools',async t=>{
 const f=await fixture(t);
 const plain=await f.setup({permissions:{...fullPermissions,manageTasks:false}});
 assert.deepEqual(plain.job.toolPolicy,{mode:'no-tools',allowed:[]});
 assert.equal((await f.tool(plain.job,'project.read_context',{})).status,403,'no tool without grant');
 assert.deepEqual(toolGrant({mode:'no-tools',allowed:[]}),[]);
 assert.throws(()=>toolGrant({mode:'studio-tools-r1',allowed:['shell']}));
 assert.throws(()=>toolGrant({mode:'studio-tools-r1',allowed:['task.propose','task.propose']}));
 assert.throws(()=>toolGrant({mode:'all',allowed:[]}));
});

test('tool bridge: message -> tool call -> proposal card -> approval -> exactly one Studio task',async t=>{
 const f=await fixture(t),[alice,bob]=f.members;
 const {project,job,message}=await f.setup();
 assert.equal(job.toolPolicy.mode,'studio-tools-r2');
 assert.deepEqual(job.toolPolicy.allowed,['project.read_context','task.propose'],'planning is for the lead only');
 assert.deepEqual(job.toolPolicy.tools.map(t=>[t.id,t.name]),[['project.read_context','studio_project_read_context'],['task.propose','studio_task_propose']]);
 // The worker accepts exactly what Studio describes, and nothing malformed.
 assert.deepEqual(toolGrant(job.toolPolicy).map(t=>t.id),['project.read_context','task.propose']);
 assert.deepEqual(toolGrant({mode:'studio-tools-r1',allowed:['task.propose']}).map(t=>t.name),['studio_task_propose'],'the first Studio version still works');
 const broken=change=>({...job.toolPolicy,tools:job.toolPolicy.tools.map((t,i)=>i?t:{...t,...change})});
 for(const change of [{name:'terminal'},{name:'studio_task_propose'},{id:'other.tool'},{description:''},{parameters:{type:'array'}}])assert.throws(()=>toolGrant(broken(change)),/Unsafe/,JSON.stringify(change));
 assert.throws(()=>toolGrant({...job.toolPolicy,tools:[]}),/Unsafe/);
 const context=await f.tool(job,'project.read_context',{});
 assert.equal(context.status,200);
 assert.equal(context.data.result.trust,'untrusted-project-data');
 assert.match(context.data.result.context,/Plane bitte die mobile Suche/);
 const callId='propose-call-0001';
 const proposed=await f.tool(job,'task.propose',{title:'Mobile Suche',description:'Suchfeld auf 390 px prüfen',kind:'general'},callId);
 assert.equal(proposed.status,200);assert.equal(proposed.data.result.status,'awaiting-approval');
 const retry=await f.tool(job,'task.propose',{title:'Mobile Suche',description:'Suchfeld auf 390 px prüfen',kind:'general'},callId);
 assert.equal(retry.data.result.proposal,proposed.data.result.proposal,'network retry reuses the proposal');
 assert.equal((await f.tool(job,'task.propose',{title:'Zweiter Vorschlag'})).status,429,'one proposal per run');
 assert.equal((await f.room(project)).tasks.length,0,'a proposal never creates a task');
 assert.equal((await f.room(project)).messages.filter(m=>m.proposalCard).length,0,'drafts are invisible until the run completes');
 const finished=await f.post('/api/hermes-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'Ich schlage eine Aufgabe vor.'},{token:f.secrets[0].token});
 assert.equal(finished.status,200);
 const card=(await f.room(project)).messages.find(m=>m.id===finished.data.message).proposalCard;
 assert.deepEqual({title:card.title,status:card.status,canDecide:card.canDecide},{title:'Mobile Suche',status:'pending',canDecide:true});
 const bobView=(await f.room(project,bob)).messages.find(m=>m.id===finished.data.message).proposalCard;
 assert.equal(bobView.canDecide,false);
 assert.equal((await f.post('/api/agent-proposals/decide',{proposal:card.id,decision:'accept'},{cookie:bob.cookie})).status,403,'only the commissioning person decides');
 const [a,b]=await Promise.all([1,2].map(()=>f.post('/api/agent-proposals/decide',{proposal:card.id,decision:'accept'},{cookie:alice.cookie})));
 assert.equal(a.status,200);assert.equal(b.status,200);assert.equal(a.data.task,b.data.task,'double click yields the same task');
 const again=await f.post('/api/agent-proposals/decide',{proposal:card.id,decision:'accept'},{cookie:alice.cookie});
 assert.equal(again.data.task,a.data.task);assert.equal(again.data.reused,true);
 assert.equal((await f.post('/api/agent-proposals/decide',{proposal:card.id,decision:'reject'},{cookie:alice.cookie})).status,409);
 const state=await f.room(project);
 assert.equal(state.tasks.length,1);assert.equal(state.tasks[0].title,'Mobile Suche');assert.equal(state.tasks[0].status,'todo');
 assert.equal(state.messages.find(m=>m.id===finished.data.message).proposalCard.status,'accepted');
 const steps=f.app.db.prepare('SELECT tool FROM agent_run_steps WHERE run=? ORDER BY seq').all(job.run);
 assert.deepEqual(steps.map(c=>c.tool),['project.read_context','task.propose'],'every tool call is audited once');
 const listed=(await f.get('/api/agent-runs?project='+project,{cookie:alice.cookie})).data.runs[0];
 assert.deepEqual(listed.steps.map(c=>c.tool),['project.read_context','task.propose'],'the person sees the work steps');
 assert.ok(message);
});

test('tool bridge: forged arguments, foreign worker, stale lease and reused call ids are refused',async t=>{
 const f=await fixture(t);
 const {job}=await f.setup();
 assert.equal((await f.tool(job,'project.read_context',{project:'other-project'})).status,400,'project is bound to the run');
 assert.equal((await f.tool(job,'task.propose',{title:'x',owner:'someone'})).status,400);
 assert.equal((await f.tool(job,'shell.exec',{cmd:'id'})).status,400,'unknown tool');
 assert.equal((await f.tool(job,'project.read_context',{},undefined,f.secrets[1].token)).status,404,'other person worker');
 assert.equal((await f.post('/api/hermes-worker/tool',{run:job.run,lease:'Z'.repeat(43),callId:'abcdefgh1',tool:'project.read_context',args:{}},{token:f.secrets[0].token})).status,403);
 assert.equal((await f.tool(job,'task.propose',{title:'A'},'reuse-call-1')).status,200);
 assert.equal((await f.tool(job,'task.propose',{title:'B'},'reuse-call-1')).status,409,'same call id with other content');
 for(let i=0;i<3;i++)assert.equal((await f.tool(job,'project.read_context',{})).status,200);
 assert.equal((await f.tool(job,'project.read_context',{})).status,429,'bounded reads');
});

test('tool bridge: cancel during execution discards the draft and rejects late tool calls',async t=>{
 const f=await fixture(t),[alice]=f.members;
 const {project,job}=await f.setup();
 const proposal=(await f.tool(job,'task.propose',{title:'Wird abgebrochen'})).data.result.proposal;
 assert.equal((await f.post('/api/agent-runs/cancel',{run:job.run},{cookie:alice.cookie})).data.status,'cancelling');
 assert.equal((await f.tool(job,'project.read_context',{})).status,409);
 const finished=await f.post('/api/hermes-worker/finish',{run:job.run,lease:job.lease,status:'completed',output:'Zu spät'},{token:f.secrets[0].token});
 assert.equal(finished.data.status,'cancelled');
 assert.equal((await f.post('/api/agent-proposals/decide',{proposal,decision:'accept'},{cookie:alice.cookie})).status,404);
 assert.equal((await f.room(project)).tasks.length,0);
});

test('tool bridge: revoked agent permission or project role blocks publishing and approval',async t=>{
 const f=await fixture(t),[alice]=f.members;
 const first=await f.setup();
 await f.tool(first.job,'task.propose',{title:'Ohne Freigabe'});
 assert.equal((await f.post('/api/room',{action:'agent',id:randomUUID(),project:first.project,agentId:first.agent,name:'Mara',role:'frontend',model:'pilot-codex',permissions:{...fullPermissions,manageTasks:false}},{cookie:alice.cookie})).status,200);
 const done=await f.post('/api/hermes-worker/finish',{run:first.job.run,lease:first.job.lease,status:'completed',output:'Antwort ohne Karte'},{token:f.secrets[0].token});
 assert.equal(done.status,200);
 assert.equal((await f.room(first.project)).messages.find(m=>m.id===done.data.message).proposalCard,null);

 const second=await f.setup();
 await f.tool(second.job,'task.propose',{title:'Rolle entzogen'});
 const finished=await f.post('/api/hermes-worker/finish',{run:second.job.run,lease:second.job.lease,status:'completed',output:'Vorschlag'},{token:f.secrets[0].token});
 const card=(await f.room(second.project)).messages.find(m=>m.id===finished.data.message).proposalCard;
 assert.equal(card.status,'pending');
 setRoles(f.app.db,second.project,alice.id,['viewer']);
 assert.equal((await f.post('/api/agent-proposals/decide',{proposal:card.id,decision:'accept'},{cookie:alice.cookie})).status,403);
 assert.equal((await f.room(second.project)).tasks.length,0);
});

// Stub of the Hermes v0.20.5 surface used by the adapter (tag v2026.8.19), plus a scripted mock model.
const STUB={
 'tools/__init__.py':'',
 'tools/registry.py':`
class Entry:
    def __init__(self, name, toolset, schema, handler):
        self.name, self.toolset, self.schema, self.handler = name, toolset, schema, handler
class ToolRegistry:
    def __init__(self):
        self._tools = {"terminal": Entry("terminal", "terminal", {"name": "terminal"}, lambda a, **k: "shell")}
    def register(self, name, toolset, schema, handler, **kw):
        self._tools[name] = Entry(name, toolset, schema, handler)
    def get_entry(self, name, scope=None):
        return self._tools.get(name)
    def get_tool_names_for_toolset(self, toolset):
        return sorted(n for n, e in self._tools.items() if e.toolset == toolset)
registry = ToolRegistry()
`,
 'toolsets.py':`
TOOLSETS = {"terminal": {"description": "shell", "tools": ["terminal"], "includes": []}}
def validate_toolset(name):
    return name in TOOLSETS
def resolve_toolset(name):
    from tools.registry import registry
    t = TOOLSETS.get(name)
    return sorted(set(t["tools"]) | set(registry.get_tool_names_for_toolset(name))) if t else []
`,
 'tools/tool_search.py':`
# Mirrors Hermes > v2026.8.19: non-core tools are deferred behind bridge tools unless tool search is "off".
BRIDGE_TOOL_NAMES = ("tool_search", "tool_describe", "tool_call")
class ToolSearchConfig:
    def __init__(self, enabled):
        self.enabled = enabled
    @classmethod
    def from_raw(cls, raw):
        value = str((raw or {}).get("enabled", "auto")).lower() if isinstance(raw, dict) else "auto"
        return cls(value if value in ("auto", "on", "off") else "auto")
def load_config():
    return ToolSearchConfig.from_raw(None)
`,
 'model_tools.py':`
from tools.registry import registry
from toolsets import resolve_toolset
CORE = {"terminal"}
def get_tool_definitions(enabled_toolsets=None, disabled_toolsets=None, quiet_mode=False):
    names = set()
    for ts in enabled_toolsets or []:
        names.update(resolve_toolset(ts))
    defs = [{"type": "function", "function": {**registry.get_entry(n).schema, "name": n}} for n in sorted(names)]
    from tools.tool_search import BRIDGE_TOOL_NAMES, load_config as _load_ts_config
    if _load_ts_config().enabled != "off" and any(n not in CORE for n in names):
        defs = [d for d in defs if d["function"]["name"] in CORE] + [{"type": "function", "function": {"name": n}} for n in BRIDGE_TOOL_NAMES]
    return defs
`,
 'hermes_cli/__init__.py':'',
 'hermes_cli/oneshot.py':`
import json, os
from model_tools import get_tool_definitions
from tools.registry import registry
def run_oneshot(prompt, model, provider, toolsets, skills):
    valid = {t["function"]["name"] for t in get_tool_definitions(enabled_toolsets=toolsets, quiet_mode=True)}
    log = []
    for call in json.loads(os.environ.get("MOCK_MODEL_PLAN", "[]")):
        if call["name"] not in valid:
            log.append("rejected:" + call["name"])
            continue
        log.append(registry.get_entry(call["name"]).handler(call["args"], task_id="x"))
    print("Mock-Antwort. " + " | ".join(log)[:1500])
    return 0
`
};

function stubHermes(dir){
 const root=path.join(dir,'hermes-stub');
 for(const [file,body] of Object.entries(STUB)){mkdirSync(path.dirname(path.join(root,file)),{recursive:true});writeFileSync(path.join(root,file),body);}
 return root;
}
const pythonEnv=(dir,plan=[])=>({PATH:process.env.PATH,HOME:dir,HERMES_HOME:dir,PYTHONPATH:stubHermes(dir),PYTHONDONTWRITEBYTECODE:'1',HERMES_SAFE_MODE:'1',HERMES_IGNORE_USER_CONFIG:'1',HERMES_IGNORE_RULES:'1',MOCK_MODEL_PLAN:JSON.stringify(plan)});

test('python adapter: --check proves zero toolset and exactly two Studio tools on the Hermes surface',t=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'schmaqq-hermes-py-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const env=pythonEnv(dir);
 const check=spawnSync('python3',[adapter,'--check'],{env,cwd:dir,encoding:'utf8'});
 assert.equal(check.stdout.trim(),'HERMES_ZERO_TOOLSET=PASS\nHERMES_STUDIO_TOOLSET=PASS',check.stderr);
 const unsafe=spawnSync('python3',[adapter,'--check'],{env:{...env,HERMES_SAFE_MODE:'0'},cwd:dir,encoding:'utf8'});
 assert.equal(unsafe.status,3);
 // Without the adapter's Tool Search pin, the stubbed Hermes surface is tool_search/tool_describe/tool_call, not the grant.
 const probe=spawnSync('python3',['-c','import sys;sys.argv=["x"];from model_tools import get_tool_definitions;from tools.registry import registry;registry.register("studio_task_propose","schmaqq_studio_tools_r1",{},None);import toolsets;toolsets.TOOLSETS["schmaqq_studio_tools_r1"]={"tools":["studio_task_propose"]};print(",".join(t["function"]["name"] for t in get_tool_definitions(enabled_toolsets=["schmaqq_studio_tools_r1"])))'],{env,cwd:dir,encoding:'utf8'});
 assert.equal(probe.stdout.trim(),'tool_search,tool_describe,tool_call',probe.stderr);
 const badGrant=spawnSync('python3',[adapter],{env,cwd:dir,encoding:'utf8',input:JSON.stringify({model:'m',prompt:'p',tools:['terminal']})});
 assert.equal(badGrant.status,3,'adapter refuses unknown tool grants');
});

test('end to end with mock model: worker bridge -> python adapter -> proposal -> approval -> one task',async t=>{
 const f=await fixture(t),[alice]=f.members;
 const {project,job}=await f.setup();
 const plan=[
  {name:'studio_project_read_context',args:{}},
  {name:'terminal',args:{cmd:'cat ~/.codex/auth.json'}},
  {name:'studio_task_propose',args:{title:'Mobile Suche umsetzen',description:'Aus dem Chat abgeleitet',kind:'general'}}
 ];
 // python -I would drop PYTHONPATH; the production worker runs the pinned interpreter without -I.
 const status=await execute({backend:f.host,origin:f.origin,token:f.secrets[0].token},job,pythonEnv(f.dir,plan),{runtime:'python3',maxMs:20000,heartbeatMs:500});
 assert.equal(status,'completed');
 const state=await f.room(project);
 const answer=state.messages.find(m=>m.origin==='verified-run');
 assert.match(answer.body,/rejected:terminal/,'a forged non-granted tool name never runs');
 assert.match(answer.body,/awaiting-approval/);
 assert.equal(answer.proposalCard.title,'Mobile Suche umsetzen');
 assert.equal(state.tasks.length,0);
 const accepted=await f.post('/api/agent-proposals/decide',{proposal:answer.proposalCard.id,decision:'accept'},{cookie:alice.cookie});
 assert.equal(accepted.status,200);
 const after=await f.room(project);
 assert.equal(after.tasks.length,1);assert.equal(after.tasks[0].id,accepted.data.task);
});

test('job prompt: tool guidance matches the grant (no blanket "no actions" when task.propose is granted)',async()=>{
 const {jobPrompt}=await import('./hermes-agent-worker.mjs');
 const job={profile:{name:'Mara',role:'frontend'},context:'',prompt:'Schlag mir eine Aufgabe vor.'};
 const none=jobPrompt(job,[]),both=jobPrompt(job,['project.read_context','task.propose']),read=jobPrompt(job,['project.read_context']);
 assert.match(none,/Nur antworten\. Keine Aktionen/);
 assert.doesNotMatch(none,/studio_task_propose/);
 assert.doesNotMatch(both,/Nur antworten/);
 assert.match(both,/rufe genau einmal studio_task_propose auf/);
 assert.match(both,/studio_project_read_context/);
 assert.doesNotMatch(read,/studio_task_propose auf/);
});
