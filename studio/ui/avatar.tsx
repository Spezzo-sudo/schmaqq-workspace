import {useState} from 'react';
import type {Agent,Member} from './api';
import {initials,q} from './api';
import {resolveAgentAvatar} from './avatars';

export function photoOf(member?:Pick<Member,'id'|'photo'>,project?:string){
 return member?.photo?'/api/auth/photo?member='+q(member.id)+'&v='+q(member.photo)+(project?'&project='+q(project):''):undefined;
}

/** A round picture with initials as the fallback. */
export function Face({agent,name,photo,size=40,working=false,badge=0}:{agent?:Pick<Agent,'name'|'avatar'|'avatarPresetId'|'avatarPackId'|'role'>|null;name?:string;photo?:string;size?:number;working?:boolean;badge?:number}){
 const [failedPhotos,setFailedPhotos]=useState<string[]>([]);
 const look=agent?resolveAgentAvatar(agent):null;
 const sources=look?(size>64?[look.webpPath,look.thumbWebpPath]:[look.thumbWebpPath,look.webpPath]):[photo];
 const src=sources.find(url=>url&&!failedPhotos.includes(url));
 return <span className={'ui-face'+(agent?' agent':' person')} style={{width:size,height:size,fontSize:Math.round(size*.36)}}>
  {/* eslint-disable-next-line @next/next/no-img-element -- a Vite app, not Next */}
  {src?<img key={src} src={src} alt="" style={{objectPosition:look?.objectPosition}} loading="lazy" onError={()=>setFailedPhotos(paths=>[...paths,src])}/>
   :<span aria-hidden="true">{look?look.fallbackCode.slice(0,2):initials(name??'?')}</span>}
  {working&&<i className="ui-face-working" title="arbeitet gerade"/>}
  {badge>0&&<b className="ui-face-badge">{badge>9?'9+':badge}</b>}
 </span>;
}
