// A change as files and lines, and which files lie outside the project's area. Pure functions, tested directly.

export function splitDiff(diff:string){
 const files:{name:string;added:number;removed:number;lines:string[]}[]=[];
 for(const line of diff.split('\n')){
  const head=/^diff --git a\/(\S+) b\/(\S+)$/.exec(line);
  if(head){files.push({name:head[2],added:0,removed:0,lines:[]});continue;}
  const f=files.at(-1);if(!f||/^(index |--- |\+\+\+ |new file mode|deleted file mode)/.test(line))continue;
  if(line.startsWith('+'))f.added++;else if(line.startsWith('-'))f.removed++;
  f.lines.push(line);
 }
 return files;
}
export function outsideScope(diff:string,scope:string[]=[],neighbours:{id:string;title:string;scope:string[]}[]=[]){
 if(!scope.length)return [];
 const inside=(file:string,paths:string[])=>paths.some(p=>file===p.replace(/\/$/,'')||file.startsWith(p));
 return splitDiff(diff).map(f=>f.name).filter(f=>!inside(f,scope)).map(file=>({file,owner:neighbours.find(n=>inside(file,n.scope))?.title??null}));
}
