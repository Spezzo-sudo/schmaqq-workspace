import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyOutput,verificationGuard} from './verify-output.mjs';

test('a trailing PASS cannot hide an earlier Python or test failure',()=>{
 assert.throws(()=>verifyOutput('Traceback (most recent call last):\nUnicodeDecodeError\nRESULT=PASS\n'),/Testfehler/);
 assert.throws(()=>verifyOutput('FAILED (failures=1)\nRESULT=PASS\n'),/Testfehler/);
 assert.throws(()=>verifyOutput('not ok 1 - failing test\nRESULT=PASS\n'),/Testfehler/);
 assert.throws(()=>verifyOutput('RESULT=FAIL\n'),/kein eindeutiges PASS/);
 assert.equal(verifyOutput('all tests OK\nRESULT=PASS\n'),'all tests OK\nRESULT=PASS\n');
 const guard=verificationGuard();guard.feed('Trace');guard.feed('back (most recent call last):\n');guard.feed('normal output\n'.repeat(10000));
 assert.throws(()=>guard.finish('RESULT=PASS\n'),/Testfehler/);
});
