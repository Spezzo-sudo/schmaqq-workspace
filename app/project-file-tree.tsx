import {useMemo} from 'react';
import {ChevronRight,FileText,Folder} from 'lucide-react';
import {buildFileTree,type FileTreeNode} from './file-tree-model';

export default function ProjectFileTree({files,selected,disabled,onOpen}:{files:string[];selected?:string;disabled:boolean;onOpen:(path:string)=>void}){
 const roots=useMemo(()=>buildFileTree(files),[files]);
 const render=(nodes:FileTreeNode[],depth=0)=>nodes.map(node=><li key={node.kind+':'+node.path}>
  {node.kind==='directory'?<details open={depth===0||!!selected?.startsWith(node.path+'/')}><summary><ChevronRight size={13} className="r3-tree-chevron"/><Folder size={15}/><span>{node.name}</span></summary><ul>{render(node.children,depth+1)}</ul></details>
   :<button type="button" className={'r3-tree-file'+(selected===node.path?' selected':'')} title={node.path} aria-current={selected===node.path?'true':undefined} disabled={disabled} onClick={()=>onOpen(node.path)}><FileText size={14}/><span>{node.name}</span></button>}
 </li>);
 return roots.length?<ul className="r3-file-tree" aria-label="Ordnerstruktur">{render(roots)}</ul>:<p className="muted">Keine passenden Dateien.</p>;
}
