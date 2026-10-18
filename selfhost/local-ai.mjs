import {command} from './process.mjs';

function endpoint(config){
 const url=new URL(config.baseURL??'http://127.0.0.1:11434');
 if(url.protocol!=='http:'||!['127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('Lokale KI muss eine feste Loopback-Adresse ohne Zugangsdaten verwenden.');
 return url;
}
async function json(url,{signal,...options}={}){
 const response=await fetch(url,{...options,signal,redirect:'error'});if(!response.ok)throw new Error('Lokaler Modelldienst antwortet mit Status '+response.status+'.');
 const reader=response.body.getReader();let size=0;const parts=[];try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>120000)throw new Error('Modellantwort überschreitet das Größenlimit.');parts.push(Buffer.from(chunk.value));}}finally{await reader.cancel().catch(()=>{});}
 return JSON.parse(Buffer.concat(parts).toString('utf8'));
}
export async function localModels(config,signal){
 if(!config?.enabled)return [];
 const data=await json(new URL('/api/tags',endpoint(config)),{signal:signal??AbortSignal.timeout(5000)});
 return (data.models??[]).filter(m=>typeof m.name==='string'&&config.models?.includes(m.name)&&!m.remote_host&&!m.remote_model&&!/:cloud\b/.test(m.name)).map(m=>m.name).slice(0,30);
}
export async function aiCapabilities(config){
 const local=config.ai?.ollama;let models=[],status=local?.enabled?'unreachable':'disabled';
 if(local?.enabled){try{models=await localModels(local);status=models.length?'ready':'no-models';}catch{}}
 let codex='disabled';if(Object.values(config.projects??{}).some(p=>p.allowCodex)){try{const output=await command([config.codex??'codex','login','status'],undefined,{timeout:8000});codex=/chatgpt/i.test(output)?'chatgpt':'not-connected';}catch{codex='not-connected';}}
 return {models,status,allowTeam:local?.allowTeam===true,projects:config.ai?.projects??[],codex,development:Object.entries(config.projects??{}).slice(0,30).map(([id,p])=>({id,check:Array.isArray(p.check)&&p.check.length>0,preview:!!(p.preview?.build?.length&&p.preview?.directory||p.preview?.argv?.length&&p.preview?.url),allowCodex:p.allowCodex===true,publish:p.publish!==false}))};
}
export async function runLocalAi(config,job,signal){
 const local=config.ai?.ollama;
 if(!local?.enabled||!config.ai?.projects?.includes(job.project))throw new Error('Lokale KI ist für dieses Projekt auf diesem PC nicht freigegeben.');
 if(job.owner!==job.runnerOwner&&local.allowTeam!==true)throw new Error('Team-Nutzung ist auf diesem PC gesperrt.');
 const timeout=Math.min(Math.max(local.timeoutMs??120000,1000),180000),combined=AbortSignal.any([AbortSignal.timeout(timeout),...(signal?[signal]:[])]);
 if(!(await localModels(local,combined)).includes(job.payload.model))throw new Error('Modell ist nicht lokal vorhanden oder nicht freigegeben.');
 const data=await json(new URL('/api/chat',endpoint(local)),{method:'POST',headers:{'Content-Type':'application/json'},signal:combined,body:JSON.stringify({model:job.payload.model,messages:[{role:'user',content:job.payload.prompt}],stream:false,keep_alive:0,options:{num_predict:Math.min(Math.max(local.maxOutputTokens??1024,64),4096)}})});
 if(data.done!==true||typeof data.message?.content!=='string')throw new Error('Modell hat keine abgeschlossene Textantwort geliefert.');
 return {provider:'ollama',model:job.payload.model,output:data.message.content.slice(0,24000),truncated:data.message.content.length>24000,outputTokens:Number.isSafeInteger(data.eval_count)?data.eval_count:null};
}
