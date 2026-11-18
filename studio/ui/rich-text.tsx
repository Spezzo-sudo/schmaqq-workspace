import {Fragment,type ReactNode} from 'react';

// Light formatting for agent answers: paragraphs, lists, bold and code. Everything is built as React
// elements from plain text, so nothing an agent writes can ever become markup.

function inline(text:string):ReactNode[]{
 const parts:ReactNode[]=[];
 const pattern=/(\*\*([^*\n]+)\*\*|`([^`\n]+)`)/g;
 let last=0,match:RegExpExecArray|null;
 while((match=pattern.exec(text))){
  if(match.index>last)parts.push(text.slice(last,match.index));
  parts.push(match[2]!==undefined?<strong key={match.index}>{match[2]}</strong>:<code key={match.index}>{match[3]}</code>);
  last=match.index+match[0].length;
 }
 if(last<text.length)parts.push(text.slice(last));
 return parts;
}

type Block={kind:'p'|'ul'|'ol'|'h'|'pre';lines:string[]};
const bullet=/^\s*[-*•]\s+/,numbered=/^\s*\d{1,2}[.)]\s+/,heading=/^#{1,4}\s+/;

export function richBlocks(text:string):Block[]{
 const blocks:Block[]=[];
 let fence=false;
 for(const line of text.replace(/\r/g,'').split('\n')){
  if(line.trim().startsWith('```')){fence=!fence;if(fence)blocks.push({kind:'pre',lines:[]});continue;}
  const current=blocks.at(-1);
  if(fence){current!.lines.push(line);continue;}
  if(!line.trim()){blocks.push({kind:'p',lines:[]});continue;}
  const kind=bullet.test(line)?'ul':numbered.test(line)?'ol':heading.test(line)?'h':'p';
  const clean=line.replace(kind==='ul'?bullet:kind==='ol'?numbered:kind==='h'?heading:/^$/,'');
  if(current&&current.kind===kind&&kind!=='h'&&(kind!=='p'||current.lines.length))current.lines.push(clean);
  else blocks.push({kind,lines:[clean]});
 }
 return blocks.filter(b=>b.lines.length);
}

export function RichText({text}:{text:string}){
 return <div className="r5-rich">{richBlocks(text).map((block,index)=>{
  if(block.kind==='ul')return <ul key={index}>{block.lines.map((line,i)=><li key={i}>{inline(line)}</li>)}</ul>;
  if(block.kind==='ol')return <ol key={index}>{block.lines.map((line,i)=><li key={i}>{inline(line)}</li>)}</ol>;
  if(block.kind==='h')return <p key={index} className="r5-rich-heading">{inline(block.lines[0])}</p>;
  if(block.kind==='pre')return <pre key={index}>{block.lines.join('\n')}</pre>;
  return <p key={index}>{block.lines.map((line,i)=><Fragment key={i}>{i>0&&<br/>}{inline(line)}</Fragment>)}</p>;
 })}</div>;
}
