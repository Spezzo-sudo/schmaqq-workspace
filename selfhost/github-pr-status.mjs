const slug=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;
const sha=/^[a-f0-9]{40}$/;
const branch=/^[A-Za-z0-9][A-Za-z0-9_.\/-]{0,199}$/;

export function configuredRepos(raw=''){
 if(!raw)return {};
 let input;try{input=JSON.parse(raw);}catch{throw new Error('STUDIO_GITHUB_PROJECT_REPOS ist kein gültiges JSON.');}
 if(!input||Array.isArray(input)||typeof input!=='object')throw new Error('GitHub-Projektzuordnung muss ein Objekt sein.');
 const entries=Object.entries(input);
 if(entries.length>30||entries.some(([project,repo])=>!/^[\w-]{1,100}$/.test(project)||typeof repo!=='string'||!slug.test(repo)||repo.includes('..')))throw new Error('Ungültige GitHub-Projektzuordnung.');
 return Object.fromEntries(entries);
}

/**
 * Read-only PR correlation. A result is NEVER a merge authorization.
 * Studio identity login (OAuth read:user) grants no repository access.
 * Configure an independent minimal read-only credential by the operator.
 */
export function createPullRequestReader({repositories={},readToken='',request=fetch}={}){
 for(const repo of Object.values(repositories))if(typeof repo!=='string'||!slug.test(repo)||repo.includes('..'))throw new Error('Ungültiges GitHub-Repository.');
 return async job=>{
  if(!job||!['review','submit'].includes(job.action)||job.status!=='completed')return {state:'not_ready',mergeReady:false};
  let result;try{result=typeof job.result==='string'?JSON.parse(job.result):job.result;}catch{return {state:'invalid_result',mergeReady:false};}
  if(!result||result.workflow!=='pull-request')return {state:'not_required',mergeReady:false};
  if(!sha.test(result.commit??'')||!branch.test(result.branch??'')||result.branch.includes('..')||result.branch.endsWith('/')||result.branch.includes('//'))return {state:'invalid_result',mergeReady:false};
  const evidence={commit:result.commit,branch:result.branch,mergeReady:false};
  if(job.action==='review'||result.published!==true)return {...evidence,state:'local_only'};
  const repo=repositories[job.project];
  if(!repo||!readToken)return {...evidence,state:'not_configured'};
  const [owner]=repo.split('/');
  const url=new URL('https://api.github.com/repos/'+repo+'/pulls');
  url.searchParams.set('state','all');url.searchParams.set('head',owner+':'+result.branch);url.searchParams.set('per_page','100');
  let response,pulls;
  try{
   response=await request(url.href,{headers:{'Accept':'application/vnd.github+json','User-Agent':'SCHMAQQ-Studio-ReadOnly','Authorization':'Bearer '+readToken},redirect:'error',signal:AbortSignal.timeout(8000)});
   if(!response.ok)return {...evidence,state:'provider_unavailable'};
   pulls=await response.json();
  }catch{return {...evidence,state:'provider_unavailable'};}
  if(!Array.isArray(pulls))return {...evidence,state:'provider_unavailable'};
  const relevant=pulls.filter(pr=>Number.isSafeInteger(pr?.number)&&pr.number>0&&pr.head?.ref===result.branch&&pr.head?.repo?.full_name===repo&&pr.base?.repo?.full_name===repo);
  if(!relevant.length)return {...evidence,state:'not_found',repository:repo};
  const matched=relevant.find(pr=>pr.head.sha===result.commit);
  const pr=matched??relevant[0];
  const info={...evidence,repository:repo,number:pr.number,url:'https://github.com/'+repo+'/pull/'+pr.number,headCommit:pr.head?.sha,ci:'not_verified',reviews:'not_verified'};
  if(!matched)return {...info,state:'stale_commit'};
  if(pr.merged_at)return {...info,state:'already_merged'};
  if(pr.state!=='open')return {...info,state:'closed'};
  return {...info,state:'matched'};
 };
}
