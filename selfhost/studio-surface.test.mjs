import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// The app is built from docs/OBERFLAECHE.md, nothing else (owner, 18.11.2026: "damit man nicht mehr in alte Muster
// verfällt"). This test keeps it that way: a new screen or file means updating that list first, then this test.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const studio=path.join(root,'studio');
const files=dir=>readdirSync(dir).flatMap(f=>{const p=path.join(dir,f);return statSync(p).isDirectory()?files(p):[path.relative(studio,p).split(path.sep).join('/')];});

const ALLOWED=['env.d.ts','index.html','main.tsx','vite.config.ts',
 'ui/account.tsx','ui/api.ts','ui/app.tsx','ui/avatar.tsx','ui/avatars.ts','ui/chat.tsx','ui/diff.ts','ui/info.tsx','ui/live.ts','ui/login.tsx',
 'ui/model.ts','ui/next-step.ts','ui/parts.tsx','ui/people.tsx','ui/project.tsx','ui/rich-text.tsx','ui/start.tsx','ui/task.tsx','ui/ui.css'];

test('the app consists of exactly the files of the screen list; the old interface does not come back',()=>{
 assert.deepEqual(files(studio).sort(),[...ALLOWED].sort());
});

test('one stylesheet, and nothing from the former app or website is pulled in',()=>{
 for(const f of files(studio).filter(f=>/\.(tsx?|css)$/.test(f))){
  const source=readFileSync(path.join(studio,f),'utf8');
  assert.doesNotMatch(source,/from\s+['"]\.\.\/(\.\.\/)?app\//,f+' imports the former app');
  if(f!=='main.tsx')assert.doesNotMatch(source,/import\s+['"][^'"]+\.css['"]/,f+' imports a stylesheet');
  assert.doesNotMatch(source,/lucide-react/,f+' uses a second icon set');
 }
 assert.match(readFileSync(path.join(studio,'main.tsx'),'utf8'),/import '\.\/ui\/ui\.css';/);
});

/** What a person can read: string literals and JSX text, without comments. */
function visibleText(source){
 const code=source.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|[^:'"`])\/\/.*$/gm,'$1');
 const strings=[...code.matchAll(/'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`|>([^<>{}]+)</g)].map(m=>m[1]??m[2]??m[3]??'');
 return strings.join('\n');
}
test('no words the screen list forbids: engines, models, technical setup terms',()=>{
 const forbidden=/Arbeitskopie|Werkstatt|Worker|Runner|Deploy-Key|Deploy-Schlüssel|Connector|Pull Request|Branch|Commit|Field Guild|Legacy|Bisherige Ansicht|gpt-\d|\bCodex\b|\bHermes\b|Modellzugang|\bModell\b|studio\.project\.json(?! an)/;
 for(const f of files(studio).filter(f=>/\.tsx$/.test(f)||f==='ui/next-step.ts'||f==='ui/model.ts')){
  const text=visibleText(readFileSync(path.join(studio,f),'utf8'));
  const hit=text.split('\n').find(line=>forbidden.test(line));
  assert.equal(hit,undefined,f+': '+hit);
 }
});

test('the screen list exists and names every screen the app has',()=>{
 const list=readFileSync(path.join(root,'docs/OBERFLAECHE.md'),'utf8');
 for(const screen of ['Anmelden','Start','Menü','Projekt','Direktchat','Karte (Aufgabe)','Projektinfo','Agent einstellen','Agentenprofil','Mein Konto','Projekte und Archiv','So funktioniert Studio'])
  assert.match(list,new RegExp('### '+screen.replace(/[()]/g,'\\$&')),screen);
});
