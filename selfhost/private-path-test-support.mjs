import {chmodSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';

// Deliberately weaken a disposable fixture so negative tests exercise NTFS
// access rules rather than the unrelated POSIX mode bits exposed by Node.
export function exposeFixture(location, mode = 0o777) {
  if (process.platform !== 'win32') return chmodSync(location, mode);
  const executable = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'icacls.exe');
  execFileSync(executable, [location, '/grant', '*S-1-1-0:(F)'],
    {windowsHide:true, timeout:15000, stdio:'pipe'});
}
