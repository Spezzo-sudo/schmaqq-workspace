import type {EditorSnapshot} from './editor-drafts';
/** A successful save remembers the preceding content only in this mounted editor.
 * Recovery stages a draft; it never replaces the current revision for conflict checks. */
export function precedingContent(snapshot:EditorSnapshot,text:string,succeeded:boolean):string|undefined{
 return succeeded&&snapshot.content!==text?snapshot.content:undefined;
}
export function recoveryDraft(snapshot:EditorSnapshot,draft:string,previous:string|undefined):string|null{
 return draft===snapshot.content&&previous!==undefined&&previous!==snapshot.content?previous:null;
}
