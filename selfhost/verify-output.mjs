// Some shell verifier functions run with errexit temporarily disabled. Never
// accept a final PASS when an earlier Python/test failure is visible in the log.
const failure=/^Traceback \(most recent call last\):|^FAILED \(|^not ok \d+|^npm (?:ERR!|error) /m;
export function verifyOutput(output){
 if(failure.test(output))throw new Error('Prüflauf enthält einen Testfehler trotz möglicher abschließender PASS-Meldung.');
 if(!/^RESULT=PASS\r?$/m.test(output))throw new Error('Prüflauf bestätigt kein eindeutiges PASS.');
 return output;
}
export function verificationGuard(){
 let pending='',failed=false;
 return {
  feed(chunk){pending+=chunk;const end=pending.lastIndexOf('\n');if(end>=0){failed||=failure.test(pending.slice(0,end+1));pending=pending.slice(end+1);}pending=pending.slice(-10000);},
  finish(tail){if(failed||failure.test(pending))throw new Error('Prüflauf enthält einen Testfehler trotz möglicher abschließender PASS-Meldung.');return verifyOutput(tail);}
 };
}
