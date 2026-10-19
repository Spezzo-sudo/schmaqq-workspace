import {cpSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, existsSync, lstatSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function git(...args) {
  return execFileSync('git', args, {cwd: root, encoding: 'utf8', timeout: 20000}).trim();
}
if (git('status', '--porcelain', '--untracked-files=normal')) {
  throw new Error('Refusing a release from a dirty or untracked source tree. Commit and review first.');
}
const sourceCommit = git('rev-parse', 'HEAD');
const sourceTree = git('rev-parse', 'HEAD^{tree}');
if (!/^[0-9a-f]{40}$/.test(sourceCommit) || !/^[0-9a-f]{40}$/.test(sourceTree)) {
  throw new Error('Git source identity cannot be verified.');
}

// Always rebuild the browser bundle from this clean, committed source.
// Reusing a stale ignored studio-dist would falsely attest to the new HEAD.
const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
if (!existsSync(vite)) throw new Error('Install pinned dependencies before packaging.');
execFileSync(process.execPath, [vite, 'build', '--config', 'studio/vite.config.ts'], {
  cwd: root, stdio: 'inherit', timeout: 120000
});
if (!existsSync(path.join(root, 'studio-dist/index.html'))) {
  throw new Error('Studio frontend build failed to produce index.html.');
}
if (git('status', '--porcelain', '--untracked-files=normal')) {
  throw new Error('Source changed while building; abort release.');
}

const version = new Date().toISOString().replace(/[:.]/g, '-');
const directory = path.join(root, '.studio', 'releases', version);
mkdirSync(directory, {recursive: true});

function copy(source, dest = source) {
  cpSync(path.join(root, source), path.join(directory, dest), {
    recursive: true, errorOnExist: true, force: false
  });
}
for (const file of [
  'server', 'store', 'reviews', 'workspaces', 'admin', 'backup', 'ai-routes',
  'oidc', 'connections', 'collaboration', 'change-overview', 'source-evidence',
  'project-start', 'github-pr-status'
]) copy('selfhost/' + file + '.mjs');
copy('studio-dist');
copy('node_modules/zod');
copy('node_modules/jose');
copy('selfhost/deploy');

writeFileSync(path.join(directory, 'package.json'), JSON.stringify({
  name: 'schmaqq-studio-runtime', private: true, type: 'module',
  engines: {node: '>=24.15.0'}, scripts: {start: 'node selfhost/server.mjs'}
}, null, 2));

const lockSha256 = createHash('sha256').update(readFileSync(path.join(root, 'package-lock.json'))).digest('hex');
writeFileSync(path.join(directory, 'release-source.json'), JSON.stringify({
  format: 1, sourceCommit, sourceTree, lockSha256, nodeVersion: process.version,
  createdUtc: new Date().toISOString()
}, null, 2) + '\n');

const manifest = [];
function inspect(folder) {
  for (const entry of readdirSync(folder, {withFileTypes: true})) {
    const full = path.join(folder, entry.name);
    if (lstatSync(full).isSymbolicLink()) throw new Error('Symlink in release: ' + entry.name);
    if (entry.isDirectory()) inspect(full);
    else if (entry.isFile()) {
      const bytes = readFileSync(full);
      manifest.push({
        path: path.relative(directory, full).split(path.sep).join('/'),
        bytes: bytes.length,
        sha256: createHash('sha256').update(bytes).digest('hex')
      });
    } else throw new Error('Unsupported release entry.');
  }
}
inspect(directory);
manifest.sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(path.join(directory, 'release-manifest.json'), JSON.stringify({version, files: manifest}, null, 2));
const archive = directory + '.tar.gz';
execFileSync('tar', ['-czf', archive, '-C', directory, '.'], {windowsHide: true, timeout: 60000});
console.log(JSON.stringify({
  directory, archive, sourceCommit, sourceTree, files: manifest.length,
  unpackedBytes: manifest.reduce((sum, file) => sum + file.bytes, 0),
  archiveBytes: statSync(archive).size
}, null, 2));
