export type FileTreeNode={name:string;path:string;kind:'file'|'directory';children:FileTreeNode[]};

/** Presentation only: retain the exact authorized relative path for every file. */
export function buildFileTree(files:string[]):FileTreeNode[]{
 const roots:FileTreeNode[]=[];
 for(const file of [...new Set(files)].sort()){
  if(!file||file.startsWith('/')||file.includes('\\')||/[\x00-\x1f]/.test(file))continue;
  const parts=file.split('/');
  if(parts.some(p=>!p||p==='.'||p==='..'))continue;
  let siblings=roots;
  for(let i=0;i<parts.length;i++){
   const path=parts.slice(0,i+1).join('/'),kind=i===parts.length-1?'file':'directory';
   let node=siblings.find(n=>n.path===path&&n.kind===kind);
   if(!node){node={name:parts[i],path,kind,children:[]};siblings.push(node);}
   siblings=node.children;
  }
 }
 const sort=(nodes:FileTreeNode[])=>{nodes.sort((a,b)=>a.kind===b.kind?a.name.localeCompare(b.name):a.kind==='directory'?-1:1);nodes.forEach(n=>sort(n.children));};
 sort(roots);return roots;
}
