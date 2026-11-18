import type {Agent} from './api';
import {initials} from './api';
import {resolveAgentAvatar} from './avatars';

/** A round picture: the agent's portrait, or a person's initials. */
export function Face({agent,name,size=40,working=false,badge=0}:{agent?:Pick<Agent,'name'|'avatar'|'avatarPresetId'|'avatarPackId'|'role'>|null;name?:string;size?:number;working?:boolean;badge?:number}){
 const look=agent?resolveAgentAvatar(agent):null;
 return <span className={'ui-face'+(agent?' agent':' person')} style={{width:size,height:size,fontSize:Math.round(size*.36)}}>
  {/* eslint-disable-next-line @next/next/no-img-element -- a Vite app, not Next */}
  {look?.thumbWebpPath?<img src={size>64?look.webpPath!:look.thumbWebpPath} alt="" style={{objectPosition:look.objectPosition}} loading="lazy"/>
   :<span aria-hidden="true">{agent?look?.fallbackCode.slice(0,2):initials(name??'?')}</span>}
  {working&&<i className="ui-face-working" title="arbeitet gerade"/>}
  {badge>0&&<b className="ui-face-badge">{badge>9?'9+':badge}</b>}
 </span>;
}
