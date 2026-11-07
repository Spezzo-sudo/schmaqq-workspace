import {execFileSync} from 'node:child_process';

/**
 * Packs a release folder as plain ustar. Every tar (GNU on Linux, bsdtar on Windows and
 * macOS) then stores paths over 100 characters in the standard prefix field instead of
 * GNU "@LongLink" entries, which the release verifier deliberately refuses.
 * A path that ustar cannot represent makes tar fail, so packaging stops instead of
 * producing an archive that cannot be verified.
 */
export function packArchive(archive, directory, options = {}) {
  execFileSync('tar', ['--format=ustar', '-czf', archive, '-C', directory, '.'], {windowsHide: true, timeout: 60000, ...options});
}
