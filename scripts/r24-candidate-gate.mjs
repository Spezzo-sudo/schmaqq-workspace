/**
 * R24 candidate ancestry gate. Read-only source-control check.
 *
 * Historical release pointers are immutable. Actual Production must still be
 * checked by a privileged operator immediately before any real deployment.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceR23='aef64f85efeeb40f6c0f3a7dc43986a52a20f09f';
const r24EngineeringBase='79df5812686664c425f7dc94e8f2dbdd8eec75fb';

function git(...args) {
  return execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:15000}).trim();
}
function ancestor(older,newer) {
  try {
    execFileSync('git',['merge-base','--is-ancestor',older,newer],{
      cwd:root,stdio:'pipe',timeout:15000
    });
    return true;
  } catch {
    return false;
  }
}
const head=git('rev-parse','HEAD');
assert.match(head,/^[0-9a-f]{40}$/);
assert.notEqual(head,sourceR23,'Candidate must not be the already deployed R23');
assert.ok(ancestor(sourceR23,head),
  'R23 history absent; do not build from an unrelated default branch');
assert.ok(ancestor(r24EngineeringBase,head),
  'Reviewed R24-E baseline must be an ancestor of this R24-F candidate');

const status=JSON.parse(readFileSync(path.join(root,'docs','STATUS.json'),'utf8'));
const known=status.current_production_r23_2026_10_19;
assert.equal(known?.source_commit,sourceR23,
  'Historical Production evidence changed; reconcile before CI');
assert.equal(known?.archive_sha256,
  '1a927d7eba4d5becf749401baaf2ab5f02cd8e004577258c9a3cd069331e6768',
  'Historical pinned R23 archive hash changed');

const diff=git('status','--porcelain','--untracked-files=normal');
assert.equal(diff,'','Candidate must be a clean, tracked Git checkout');
console.log(JSON.stringify({
  result:'PASS',
  candidateSource:head,
  historicalProductionSource:sourceR23,
  engineeringBaseline:r24EngineeringBase,
  limitation:'Git history does not prove current live Production or authorize deployment'
},null,2));
