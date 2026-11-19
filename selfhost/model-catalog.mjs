// The model catalog of Studio: which models agents can be set to and which thinking levels each one has.
// The seed is the catalog of the installed Codex (`codex debug models`, Codex 0.169.0, 19.11.2026), visible entries only.
// The owner keeps the live list in the app (add, change, switch off); new models do not need a deploy.
// Names are only checked for their spelling, never against a list: a model that is not listed yet can still be typed in.
export const MODEL_ID=/^[a-zA-Z0-9][a-zA-Z0-9_.:\/-]{0,99}$/;
export const EFFORT_ID=/^[a-z]{3,12}$/;
export const SEED_CATALOG=Object.freeze([
 {
  "id": "gpt-6-astra",
  "label": "GPT-6-Astra",
  "efforts": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max",
   "ultra"
  ],
  "defaultEffort": "low",
  "context": 272000,
  "note": "Spitzenmodell für die anspruchsvollste Arbeit"
 },
 {
  "id": "gpt-6.1-sol",
  "label": "GPT-6.1-Sol",
  "efforts": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max",
   "ultra"
  ],
  "defaultEffort": "low",
  "context": 272000,
  "note": "Neuestes Arbeitspferd für Code und Alltag"
 },
 {
  "id": "gpt-6.1-terra",
  "label": "GPT-6.1 Terra",
  "efforts": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max",
   "ultra"
  ],
  "defaultEffort": "low",
  "context": 500000,
  "note": "Codex-Modell, großer Kontext"
 },
 {
  "id": "gpt-6-sol",
  "label": "GPT-6-Sol",
  "efforts": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max",
   "ultra"
  ],
  "defaultEffort": "medium",
  "context": 272000,
  "note": "Vorgänger-Arbeitspferd"
 },
 {
  "id": "gpt-6-luna",
  "label": "GPT-6-Luna",
  "efforts": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "defaultEffort": "medium",
  "context": 272000,
  "note": "Schnell und günstig für leichtere Aufgaben"
 },
 {
  "id": "gpt-5.6-sol",
  "label": "GPT-5.6-Sol",
  "efforts": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max",
   "ultra"
  ],
  "defaultEffort": "low",
  "context": 272000,
  "note": "Ältere Generation, Arbeitspferd"
 },
 {
  "id": "gpt-5.6-terra",
  "label": "GPT-5.6-Terra",
  "efforts": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max",
   "ultra"
  ],
  "defaultEffort": "medium",
  "context": 272000,
  "note": "Ältere ausgewogene Variante"
 },
 {
  "id": "gpt-5.6-luna",
  "label": "GPT-5.6-Luna",
  "efforts": [
   "low",
   "medium",
   "high",
   "xhigh",
   "max"
  ],
  "defaultEffort": "medium",
  "context": 272000,
  "note": "Ältere schnelle Variante"
 },
 {
  "id": "gpt-5.5",
  "label": "GPT-5.5",
  "efforts": [
   "low",
   "medium",
   "high",
   "xhigh"
  ],
  "defaultEffort": "medium",
  "context": 272000,
  "note": "Älteres Codex-Modell"
 }
]);

const KEY='studio:v1:model-catalog';
const clean=entry=>({
  id:String(entry.id),label:String(entry.label??entry.id).slice(0,80),
  efforts:[...new Set((entry.efforts??[]).map(String).filter(e=>EFFORT_ID.test(e)))].slice(0,10),
  defaultEffort:EFFORT_ID.test(entry.defaultEffort??'')?entry.defaultEffort:null,
  context:Number.isInteger(entry.context)?entry.context:null,note:String(entry.note??'').slice(0,200),enabled:entry.enabled!==false
});
export function normalizeCatalog(list){
  const seen=new Set(),out=[];
  for(const entry of Array.isArray(list)?list:[]){
    if(!entry||typeof entry.id!=='string'||!MODEL_ID.test(entry.id)||seen.has(entry.id))continue;
    seen.add(entry.id);out.push(clean(entry));
  }
  return out.slice(0,60);
}
export function readCatalog(db){
  const row=db.prepare('SELECT value FROM workspace_meta WHERE key=?').get(KEY);
  if(!row)return normalizeCatalog(SEED_CATALOG);
  try{const list=normalizeCatalog(JSON.parse(row.value));return list.length?list:normalizeCatalog(SEED_CATALOG);}catch{return normalizeCatalog(SEED_CATALOG);}
}
export function writeCatalog(db,list){
  const clean=normalizeCatalog(list);
  if(!clean.length)throw Object.assign(new Error('Der Katalog braucht mindestens ein Modell.'),{status:400});
  db.prepare('INSERT INTO workspace_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(KEY,JSON.stringify(clean));
  return clean;
}
