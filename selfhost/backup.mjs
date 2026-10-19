import {DatabaseSync} from 'node:sqlite';
import {existsSync, chmodSync, lstatSync, mkdirSync, realpathSync, statSync} from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.env.STUDIO_DATA_DIR ?? '.studio');
const source = path.join(dataDir, 'studio.sqlite');
const destination = path.resolve(process.argv[2] ??
  path.join(dataDir, 'backups', 'studio-' + Date.now() + '.sqlite'));

function existsIncludingDanglingSymlink(file) {
  try {lstatSync(file); return true;}
  catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}
if (destination === source) throw new Error('Backup destination must differ from source database.');
if (!existsSync(source) || !lstatSync(source).isFile()) {
  throw new Error('Studio source database must exist as a regular file.');
}
if (existsIncludingDanglingSymlink(destination)) {
  throw new Error('Backup destination already exists; refusing to overwrite.');
}

const priorUmask = process.umask(0o077);
try {
  const parent = path.dirname(destination);
  mkdirSync(parent, {recursive: true, mode: 0o700});
  if (realpathSync(parent) !== parent) {
    throw new Error('Backup destination parent must not contain symlinks.');
  }
  // Do not allow another Unix account to race the backup filename or
  // replace it through a group/world-writable destination directory.
  if ((statSync(parent).mode & 0o022) !== 0) {
    throw new Error('Backup destination parent must not be group/world writable.');
  }
  if (existsIncludingDanglingSymlink(destination)) {
    throw new Error('Backup destination appeared during validation.');
  }

  // SQLite creates a transactionally consistent snapshot, including WAL changes.
  // Only the new destination is written; the running Studio service is not stopped.
  const db = new DatabaseSync(source, {readOnly: true});
  try {db.prepare('VACUUM INTO ?').run(destination);}
  finally {db.close();}
  chmodSync(destination, 0o600);

  const check = new DatabaseSync(destination, {readOnly: true});
  let integrity;
  let foreignKeys;
  try {
    integrity = check.prepare('PRAGMA integrity_check').all();
    foreignKeys = check.prepare('PRAGMA foreign_key_check').all();
  } finally {check.close();}
  if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok' || foreignKeys.length !== 0) {
    throw new Error('Backup validation failed; retain evidence but do not restore this snapshot.');
  }
  if ((statSync(destination).mode & 0o077) !== 0) {
    throw new Error('Backup snapshot permissions are not private.');
  }
  console.log(JSON.stringify({
    backup: destination, integrity: 'ok', foreignKeyFailures: 0, mode: '0600'
  }));
} finally {
  process.umask(priorUmask);
}
