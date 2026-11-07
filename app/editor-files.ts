/** File list for the editor: files in the task's planned area first, everything else on request. */
export function inScope(file:string,scope:string){
 const area=scope.trim().replace(/^\.?\/+/,'').replace(/\/+$/,'');
 return !!area&&(file===area||file.startsWith(area+'/'));
}
export function groupFiles(files:string[],scope:string,filter=''){
 const query=filter.trim().toLowerCase(),visible=files.filter(f=>f.toLowerCase().includes(query));
 const task=visible.filter(f=>inScope(f,scope));
 return {task,other:task.length?visible.filter(f=>!task.includes(f)):visible};
}
/** A single file as planned area can be opened without asking. */
export function autoOpenFile(files:string[],scope:string,last:string|null){
 if(last&&files.includes(last))return last;
 const task=files.filter(f=>inScope(f,scope));
 return task.length===1?task[0]:null;
}
