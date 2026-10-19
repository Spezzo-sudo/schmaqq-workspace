import {createHash} from 'node:crypto';
import {createReadStream, lstatSync, readFileSync, readdirSync, realpathSync, statSync} from 'node:fs';
import {basename, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const sha40 = /^[0-9a-f]{40}$/;
const sha256 = /^[0-9a-f]{64}$/;
const refuse = reason => {throw new Error('Release verification refused: ' + reason);};

function jsonFile(pathname) {
  try {return JSON.parse(readFileSync(pathname, 'utf8'));}
  catch {refuse('manifest or metadata is not valid JSON');}
}

function fileNames(root) {
  const found = [];
  function walk(folder, prefix = '') {
    for (const entry of readdirSync(folder, {withFileTypes: true})) {
      const name = prefix ? prefix + '/' + entry.name : entry.name;
      const item = join(folder, entry.name);
      const stat = lstatSync(item);
      if (stat.isSymbolicLink()) refuse('symlinks are forbidden in release payloads');
      if (stat.isDirectory()) walk(item, name);
      else if (stat.isFile()) found.push(name);
      else refuse('non-regular release entry');
      if (found.length > 10000) refuse('too many release entries');
    }
  }
  walk(root);
  return found;
}

async function hashFile(pathname) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(pathname)) hash.update(chunk);
  return hash.digest('hex');
}

export async function verifyRelease({
  directory, expectedSource, archive = null, archiveSha256 = null, allowLegacy = false
} = {}) {
  if (typeof directory !== 'string' || !directory) refuse('release directory required');
  if (!sha40.test(expectedSource ?? '')) refuse('explicit 40-character source commit required');
  if (Boolean(archive) !== Boolean(archiveSha256)) refuse('archive and SHA256 must be provided together');
  if (archiveSha256 && !sha256.test(archiveSha256)) refuse('invalid archive SHA256');

  const root = realpathSync(resolve(directory));
  if (!statSync(root).isDirectory()) refuse('release root is not a directory');
  const manifest = jsonFile(join(root, 'release-manifest.json'));
  if (!Array.isArray(manifest?.files) || manifest.files.length < 1 || manifest.files.length > 10000) {
    refuse('release manifest has no valid file list');
  }

  const listed = new Map();
  for (const entry of manifest.files) {
    const name = entry?.path;
    if (typeof name !== 'string' || !name || name.length > 400 || name.startsWith('/') ||
        name.includes('\\') || name.split('/').some(part => !part || part === '.' || part === '..') ||
        name === 'release-manifest.json' || listed.has(name)) {
      refuse('unsafe or duplicated manifest path');
    }
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !sha256.test(entry.sha256 ?? '')) {
      refuse('malformed manifest file metadata');
    }
    listed.set(name, entry);
  }

  const present = new Set(fileNames(root));
  if (present.size !== listed.size + 1 || !present.has('release-manifest.json') ||
      [...listed.keys()].some(name => !present.has(name)) ||
      [...present].some(name => name !== 'release-manifest.json' && !listed.has(name))) {
    refuse('release contains missing or unexpected files');
  }

  for (const [name, entry] of listed) {
    const pathname = join(root, ...name.split('/'));
    if (statSync(pathname).size !== entry.bytes || await hashFile(pathname) !== entry.sha256) {
      refuse('release file size or hash mismatch: ' + name);
    }
  }

  let attestation;
  if (listed.has('release-source.json')) {
    const source = jsonFile(join(root, 'release-source.json'));
    if (source?.format !== 1 || source.sourceCommit !== expectedSource ||
        !sha40.test(source.sourceTree ?? '') || !sha256.test(source.lockSha256 ?? '')) {
      refuse('embedded source attestation does not match expected commit');
    }
    attestation = 'embedded';
  } else {
    // R23 and older archives carry an externally approved digest, not an
    // embedded Git commit. Never report their source as independently attested.
    if (!allowLegacy || !archiveSha256) refuse('legacy source requires explicit pinned archive SHA256 and --allow-legacy');
    attestation = 'legacy-external-only';
  }

  let verifiedArchive = null;
  if (archive) {
    const archivePath = resolve(archive);
    if (!lstatSync(archivePath).isFile()) refuse('archive must be a regular file, not a symlink');
    verifiedArchive = await hashFile(archivePath);
    if (verifiedArchive !== archiveSha256) refuse('release archive SHA256 mismatch');
  }

  return {
    status: 'PASS', files: listed.size, expectedSource, sourceAttestation: attestation,
    archiveSha256: verifiedArchive, releaseName: basename(root)
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--allow-legacy') {options.allowLegacy = true; continue;}
    const key = {
      '--release': 'directory', '--source': 'expectedSource',
      '--archive': 'archive', '--archive-sha256': 'archiveSha256'
    }[args[i]];
    if (!key || i + 1 >= args.length || options[key] !== undefined) refuse('invalid command-line arguments');
    options[key] = args[++i];
  }
  try {console.log(JSON.stringify(await verifyRelease(options), null, 2));}
  catch (error) {console.error(error.message); process.exitCode = 1;}
}
