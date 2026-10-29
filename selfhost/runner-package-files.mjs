// Explicit release inventory. Keep the runtime-only package independent of the
// developer checkout; runner-package.test.mjs verifies its import closure.
export const runnerSourceFiles=Object.freeze([
 'runner','local-ai','process','files','codex-run','pilot-runner',
 'source-revision','project-setup','github-import','managed-projects','job-client'
].map(name=>'selfhost/'+name+'.mjs'));
