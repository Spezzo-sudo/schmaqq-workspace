// Dedicated private SQLite database supplied by the authenticated host. Keep it
// separate from Studio's business transactions. No mutation arguments or tokens
// are persisted: only identity scope, request digest and bounded tool result.
export function createMutationLedger(db,{memberId,grantId,maxEntries=10000}={}){
 const valid=value=>typeof value==='string'&&/^[\w-]{1,100}$/.test(value);
 if(!valid(memberId)||!valid(grantId)||!Number.isSafeInteger(maxEntries)||maxEntries<1||maxEntries>100000)throw new Error('Invalid authenticated mutation scope.');
 db.exec(`PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS mcp_mutations(
 member TEXT NOT NULL,grant_id TEXT NOT NULL,request_key TEXT NOT NULL,
 digest TEXT NOT NULL,state TEXT NOT NULL CHECK(state IN ('pending','complete')),
 result TEXT,created INTEGER NOT NULL,
 PRIMARY KEY(member,grant_id,request_key));`);
 const read=key=>db.prepare('SELECT digest,state,result FROM mcp_mutations WHERE member=? AND grant_id=? AND request_key=?').get(memberId,grantId,key);
 const ambiguous=()=>({isError:true,content:[{type:'text',text:JSON.stringify({error:'Previous operation has an unknown outcome. Reconcile existing Studio jobs before continuing; do not submit it with a new request ID.'})}]});
 async function run(key,digest,invoke){
  if(typeof key!=='string'||!key.length||key.length>150||!/^\w[\w:-]*$/.test(key)||!/^[a-f0-9]{64}$/.test(digest)||typeof invoke!=='function')throw new Error('Invalid mutation record.');
  let previous;
  db.exec('BEGIN IMMEDIATE');
  try{
   previous=read(key);
   if(previous&&previous.digest!==digest)throw Object.assign(new Error('Request ID already used with different arguments.'),{code:-32602});
   if(!previous){
    const count=db.prepare('SELECT count(*) AS n FROM mcp_mutations WHERE member=? AND grant_id=?').get(memberId,grantId).n;
    if(count>=maxEntries)throw new Error('Persistent mutation limit reached; reconcile the connection before renewal.');
    db.prepare("INSERT INTO mcp_mutations VALUES(?,?,?,?,'pending',NULL,?)").run(memberId,grantId,key,digest,Date.now());
   }
   db.exec('COMMIT');
  }catch(e){db.exec('ROLLBACK');throw e;}
  if(previous)return previous.state==='complete'?JSON.parse(previous.result):ambiguous();
  // Persist pending BEFORE external work. Crash, cancellation or lost response
  // must not release this key for another execution, including after restart.
  const result=await invoke();
  const encoded=JSON.stringify(result);
  if(typeof encoded!=='string'||Buffer.byteLength(encoded)>32768)throw new Error('Mutation result exceeds ledger limit; reconcile its outcome.');
  db.prepare("UPDATE mcp_mutations SET state='complete',result=? WHERE member=? AND grant_id=? AND request_key=? AND digest=? AND state='pending'").run(encoded,memberId,grantId,key,digest);
  return result;
 }
 return {run};
}
