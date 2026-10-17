type JobInput={device:string;project:string;operation:string;worktree?:string;source?:string;prompt?:string;title?:string;scope?:string;task?:string;issue?:number};

// Preparing a copy and inspecting Git operate on the repository, not a worktree.
export function developmentJob(input:JobInput){
 return {action:'job',...input,
  worktree:['inspect','prepare','integrate'].includes(input.operation)?undefined:input.worktree||undefined,
  source:input.source||undefined};
}
