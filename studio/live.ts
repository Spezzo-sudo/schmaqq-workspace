// One live connection per browser tab. The server only signals "something changed here";
// the data itself still comes through the normal requests.

export type LiveSignal={type:'room'|'runs';project:string};
type Listener=(signal:LiveSignal)=>void;

const listeners=new Set<Listener>();
let source:EventSource|null=null;

function connect(){
 if(source||typeof EventSource==='undefined')return;
 source=new EventSource('/api/live');
 source.onmessage=event=>{
  let signal:LiveSignal;
  try{signal=JSON.parse(event.data);}catch{return;}
  for(const listener of listeners)listener(signal);
 };
 // The browser reconnects by itself; the slower regular refresh covers the gap.
}

export function onLiveSignal(listener:Listener):()=>void{
 listeners.add(listener);connect();
 return()=>{listeners.delete(listener);if(!listeners.size&&source){source.close();source=null;}};
}

/** True while the live connection is open; then the regular refresh can run much less often. */
export const liveConnected=()=>source?.readyState===1;
