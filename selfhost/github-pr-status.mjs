const slug=/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/;
const sha=/^[a-f0-9]{40}$/;
const branch=/^[A-Za-z0-9][A-Za-z0-9_.\/-]{0,199}$/;
const validBranch=value=>typeof value==='string'&&branch.test(value)&&!value.includes('..')&&!value.includes('//')&&!value.endsWith('/');
const validRepo=value=>typeof value==='string'&&slug.test(value)&&!value.includes('..');
const configuration=value=>{
 if(typeof value==='string'){
  if(!validRepo(value))throw new Error('Ungültiges GitHub-Repository.');
  return {repository:value,base:null};
 }
 if(!value||Array.isArray(value)||typeof value!=='object'||!validRepo(value.repository)||!validBranch(value.base)||Object.keys(value).some(k=>!['repository','base'].includes(k)))throw new Error('GitHub-Projekt benötigt repository und einen expliziten Zielbranch base.');
 return {repository:value.repository,base:value.base};
};

export function configuredRepos(raw=''){
 if(!raw)return {};
 let input;try{input=JSON.parse(raw);}catch{throw new Error('STUDIO_GITHUB_PROJECT_REPOS ist kein gültiges JSON.');}
 if(!input||Array.isArray(input)||typeof input!=='object')throw new Error('GitHub-Projektzuordnung muss ein Objekt sein.');
 const entries=Object.entries(input);
 if(entries.length>30||entries.some(([project,value])=>!/^[\w-]{1,100}$/.test(project)||!configuration(value)))throw new Error('Ungültige GitHub-Projektzuordnung.');
 return Object.fromEntries(entries);
}

/**
 * Read-only PR correlation. A result is NEVER a merge authorization.
 * Studio identity login (OAuth read:user) grants no repository access.
 * Configure an independent minimal read-only credential by the operator.
 */
export function createPullRequestReader({repositories={},readToken='',request=fetch}={}){
 for(const value of Object.values(repositories))configuration(value);
 return async job=>{
  if(!job||!['review','submit'].includes(job.action)||job.status!=='completed')return {state:'not_ready',mergeReady:false};
  let result;try{result=typeof job.result==='string'?JSON.parse(job.result):job.result;}catch{return {state:'invalid_result',mergeReady:false};}
  if(!result||result.workflow!=='pull-request')return {state:'not_required',mergeReady:false};
  if(!sha.test(result.commit??'')||!validBranch(result.branch))return {state:'invalid_result',mergeReady:false};
  const evidence={commit:result.commit,branch:result.branch,mergeReady:false};
  if(job.action==='review'||result.published!==true)return {...evidence,state:'local_only'};
  const setting=Object.hasOwn(repositories,job.project)?repositories[job.project]:null;
  if(!setting||!readToken)return {...evidence,state:'not_configured'};
  const {repository:repo,base:expectedBase}=configuration(setting);
  if(!expectedBase)return {...evidence,state:'base_unverified',repository:repo};
  const url=new URL('https://api.github.com/repos/'+repo+'/pulls');
  // HEAD-only filtering hides fork pull requests. Read a bounded page instead.
  url.searchParams.set('state','all');url.searchParams.set('per_page','100');
  let response,pulls;
  try{
   response=await request(url.href,{headers:{'Accept':'application/vnd.github+json','User-Agent':'SCHMAQQ-Studio-ReadOnly','Authorization':'Bearer '+readToken},redirect:'error',signal:AbortSignal.timeout(8000)});
   if(!response.ok)return {...evidence,state:'provider_unavailable'};
   pulls=await response.json();
  }catch{return {...evidence,state:'provider_unavailable'};}
  if(!Array.isArray(pulls))return {...evidence,state:'provider_unavailable'};
  // One bounded provider page: never assert absence if more could exist.
  if(pulls.length>=100)return {...evidence,state:'listing_incomplete',repository:repo};
  const possible=pulls.filter(pr=>Number.isSafeInteger(pr?.number)&&pr.number>0&&pr.head?.ref===result.branch&&pr.base?.repo?.full_name===repo);
  const internal=possible.filter(pr=>pr.head?.repo?.full_name===repo);
  const forBase=internal.filter(pr=>pr.base?.ref===expectedBase);
  const matched=forBase.find(pr=>pr.head?.sha===result.commit&&pr.state==='open'&&!pr.merged_at)??forBase.find(pr=>pr.head?.sha===result.commit);
  const pr=matched??forBase[0]??internal[0];
  const info=pr=>({...evidence,repository:repo,expectedBase,actualBase:pr.base?.ref??null,number:pr.number,url:'https://github.com/'+repo+'/pull/'+pr.number,headCommit:pr.head?.sha,ci:'not_verified',reviews:'not_verified'});
  if(matched){
   if(matched.merged_at)return {...info(matched),state:'already_merged'};
   if(matched.state!=='open')return {...info(matched),state:'closed'};
   return {...info(matched),state:'matched'};
  }
  if(forBase.length)return {...info(forBase[0]),state:'stale_commit'};
  if(internal.length)return {...info(internal[0]),state:'target_mismatch'};
  const fork=possible.find(pr=>pr.head?.repo?.full_name&&pr.head.repo.full_name!==repo&&pr.head?.sha===result.commit)
    ??possible.find(pr=>pr.head?.repo?.full_name&&pr.head.repo.full_name!==repo);
  if(fork)return {...info(fork),state:'unsupported_fork'};
  return {...evidence,repository:repo,expectedBase,state:'not_found'};
 };
}
