import {roomRequest} from './room-model';

export type GithubApp={configured:boolean;canCreate:boolean};
export type GithubAccess={repository:string|null;base:string;configured:boolean;access:boolean;protected:boolean|null};
const unavailable:GithubAccess={repository:null,base:'main',configured:false,access:false,protected:null};

/** Studio's own address to return to after GitHub, without earlier GitHub notices. */
export function returnHere(){const url=new URL(location.href);url.searchParams.delete('github_app');url.searchParams.delete('github_app_error');return url.pathname+url.search;}

/** Whether Studio has a GitHub App and reaches this project's repository. Never throws. */
export async function githubState(project:string):Promise<{app:GithubApp;access:GithubAccess}>{
 try{
  const [app,access]=await Promise.all([roomRequest<GithubApp>('/api/github-app'),roomRequest<GithubAccess>('/api/github-app/access?project='+encodeURIComponent(project))]);
  return {app,access};
 }catch{return {app:{configured:false,canCreate:false},access:unavailable};}
}

/** Notice after GitHub sent the person back to Studio; removes the marker from the address. */
export function githubNotice():{notice:string;error:string}|null{
 const params=new URLSearchParams(location.search),done=params.get('github_app'),failed=params.get('github_app_error');
 if(!done&&!failed)return null;
 history.replaceState(null,'',returnHere());
 return {notice:done==='created'?'Studio ist jetzt bei GitHub angemeldet. Gib Studio als Nächstes Zugriff auf euren Code.':done==='installed'?'Studio hat jetzt Zugriff auf GitHub.':'',error:failed?'GitHub hat den Vorgang nicht abgeschlossen. Bitte erneut versuchen.':''};
}

/** Opens GitHub: 'create' registers Studio once (owner), 'install' grants access to repositories. */
export async function linkGithub(kind:'create'|'install'){
 if(kind==='create'){
  // GitHub's manifest flow expects a form POST; GitHub shows the requested permissions before anything is created.
  const {action,manifest}=await roomRequest<{action:string;manifest:string}>('/api/github-app/create',{returnTo:returnHere()});
  const form=document.createElement('form');form.method='post';form.action=action;
  const field=document.createElement('input');field.type='hidden';field.name='manifest';field.value=manifest;
  form.appendChild(field);document.body.appendChild(form);form.submit();
 }else{
  const {url}=await roomRequest<{url:string}>('/api/github-app/install',{returnTo:returnHere()});location.assign(url);
 }
}
