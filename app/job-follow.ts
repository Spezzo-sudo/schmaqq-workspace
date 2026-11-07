'use client';
import {useEffect,useState} from 'react';
import type {Job} from './development-model';
export type JobEvent={seq:number;type:string;text:string;created:number};
const open=['queued','running','cancelling'];

/** Follow one development job and its log until it finishes; used by the result dialog and the inline result. */
export function useJobFollow(id:string|null,onFinished:()=>Promise<void>|void){
 const [job,setJob]=useState<Job|null>(null),[events,setEvents]=useState<JobEvent[]>([]),[error,setError]=useState('');
 useEffect(()=>{
  if(!id)return;let alive=true,timer:ReturnType<typeof setTimeout>,after=0,finished=false;setEvents([]);setJob(null);setError('');
  const load=async()=>{try{
   if(document.hidden)return;
   const r=await fetch('/api/development/job?id='+encodeURIComponent(id));if(!r.ok)throw new Error('Prüfstand konnte nicht geladen werden.');
   const d=await r.json() as {job:Job};if(!alive)return;setJob(d.job);setError('');
   const logs=await fetch('/api/development/events?job='+encodeURIComponent(id)+'&after='+after);
   if(logs.ok){const data=await logs.json() as {events:JobEvent[]};if(alive&&data.events.length){after=data.events.at(-1)!.seq;setEvents(previous=>[...previous,...data.events].slice(-200));}}
   finished=!open.includes(d.job.status);
   if(finished)await onFinished();
  }catch(e){if(alive)setError(e instanceof Error?e.message:'Prüfstand konnte nicht geladen werden.');}finally{if(alive&&!finished)timer=setTimeout(load,2000);}};
  const visible=()=>{if(!document.hidden&&!finished){clearTimeout(timer);load();}};load();document.addEventListener('visibilitychange',visible);return()=>{alive=false;clearTimeout(timer);document.removeEventListener('visibilitychange',visible)};
 // onFinished is a stable refresh callback; restarting on its identity would duplicate polling.
 },[id]);
 return {job:job?.id===id?job:null,events,error};
}
