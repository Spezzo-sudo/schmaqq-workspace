export type EditorSnapshot={file:string;content:string;revision:string};
type Draft={snapshot:EditorSnapshot;text:string};
// Memory only: keep drafts across app navigation without persisting source on disk.
const drafts=new Map<string,Draft>();
const warn=(event:BeforeUnloadEvent)=>{if(drafts.size){event.preventDefault();event.returnValue='';}};
export function readDraft(key:string):Draft|undefined{const value=drafts.get(key);return value?{snapshot:{...value.snapshot},text:value.text}:undefined;}
export function storeDraft(key:string,snapshot:EditorSnapshot,text:string){
 if(snapshot.content===text)drafts.delete(key);else drafts.set(key,{snapshot:{...snapshot},text});
 if(typeof window!=='undefined'){window.removeEventListener('beforeunload',warn);if(drafts.size)window.addEventListener('beforeunload',warn);}
}
export function hasDrafts(){return drafts.size>0;}
export function clearDrafts(){drafts.clear();if(typeof window!=='undefined')window.removeEventListener('beforeunload',warn);}
