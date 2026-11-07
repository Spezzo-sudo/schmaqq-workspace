#!/usr/bin/env python3
"""R26 real Chrome test: persistent task handoff, edits and mobile self-guided path.
Uses solely disposable accounts, local Git runners and loopback test server.
"""
import argparse,json,os,select,subprocess,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--node',required=True)
parser.add_argument('--output',required=True)
parser.add_argument('--release-dir')
parser.add_argument('--expected-sha')
args=parser.parse_args()
out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True,mode=0o700)
env={k:v for k,v in os.environ.items() if not k.startswith(('STUDIO_','GH_','GITHUB_','OPENAI_')) and k not in ('NODE_OPTIONS','NODE_PATH')}
env['R25_FIXTURE_PORT']='45661'
if args.release_dir:
 assert args.expected_sha and len(args.expected_sha)==40,'Immutable verification needs a pinned source SHA'
 env['R25_FIXTURE_RELEASE']=str(Path(args.release_dir).resolve())
 env['R25_FIXTURE_SOURCE']=args.expected_sha
child=subprocess.Popen([args.node,str(ROOT/'scripts/r25-room-fixture.mjs')],cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
metadata=None;checks=[];errors=[]
def mark(x):checks.append(x);print('PASS '+x,flush=True)
def login(browser,who,origin,viewport):
 ctx=browser.new_context(viewport=viewport)
 page=ctx.new_page()
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(origin)
 page.get_by_label('E-Mail',exact=True).fill(who['email'])
 page.get_by_label('Passwort',exact=True).fill(who['password'])
 page.get_by_role('button',name='Studio öffnen',exact=True).click()
 expect(page.locator('.rw-sidebar')).to_be_visible(timeout=15000)
 return ctx,page
try:
 ready,_,_=select.select([child.stdout],[],[],15)
 assert ready,'Fixture failed to start in 15s'
 metadata=json.loads(child.stdout.readline())
 origin=metadata['origin'];directory=Path(metadata['fixtureDirectory'])
 cfg=json.loads((directory/'fixture.private.json').read_text())
 a_account,b_account=cfg['accounts'][:2]
 with sync_playwright() as pw:
  browser=pw.chromium.launch(channel='chrome',headless=True)
  a,pa=login(browser,a_account,origin,{'width':1440,'height':1000})
  b,pb=login(browser,b_account,origin,{'width':1280,'height':900})
  mark('two-real-separated-sessions')
  pa.goto(origin+'/?room=klimafinder-fixture')
  expect(pa.get_by_role('heading',name='Klimafinder.ch',exact=True)).to_be_visible()
  expect(pa.get_by_text('Hier geht es weiter',exact=True)).to_be_visible()
  mark('room-surfaces-existing-work-without-hunting-through-tabs')
  pa.get_by_role('button',name='Neue Aufgabe',exact=True).click()
  modal=pa.get_by_role('dialog')
  modal.get_by_label('Titel',exact=True).fill('R26 Designvorlage einbauen')
  modal.get_by_label('Gewünschtes Ergebnis',exact=True).fill('Bestehende SCHMAQQ-Vorlage verwenden, statt einen neuen Stil erfinden.')
  modal.get_by_role('button',name='Aufgabe anlegen',exact=True).click()
  task=pa.get_by_role('dialog',name='Aufgabe im Projektraum')
  expect(task.get_by_role('heading',name='R26 Designvorlage einbauen',exact=True)).to_be_visible()
  assert task.locator('.rw-task-tabs').count()==0
  assert task.locator('.r26-mode-choice').count()==3
  assert task.get_by_text('Noch niemand zuständig',exact=False).count()>0
  mark('one-task-one-flow-no-four-hidden-tabs')
  task.get_by_role('button',name='Auftrag präzisieren',exact=True).click()
  task.get_by_label('Aufgabentitel bearbeiten').fill('R26 SCHMAQQ-Stil übernehmen')
  task.get_by_label('Aufgabenbeschreibung bearbeiten').fill('Designreferenz: bestehender SCHMAQQ-Stil. Ergebnis: mobile Aufgabe und Vorschau.')
  task.get_by_role('button',name='Änderung speichern',exact=True).click()
  expect(task.get_by_role('heading',name='R26 SCHMAQQ-Stil übernehmen')).to_be_visible()
  expect(task.locator('.r26-brief')).to_contain_text('Designreferenz')
  mark('edit-brief-directly-in-same-task')
  task.get_by_role('button',name='Mit dem Team',exact=True).click()
  person=task.locator('.r26-person').filter(has_text='Markus Testkonto')
  expect(person).to_be_visible()
  person.get_by_role('button',name='Übergeben',exact=True).click()
  expect(task.get_by_text('Markus Testkonto ist verantwortlich',exact=False).first).to_be_visible()
  expect(task.get_by_text('Bearbeitung noch nicht gestartet',exact=False).first).to_be_visible()
  task_url=pa.url
  mark('handoff-does-not-falsely-start-execution')
  pb.goto(task_url)
  remote=pb.get_by_role('dialog',name='Aufgabe im Projektraum')
  expect(remote.get_by_role('heading',name='R26 SCHMAQQ-Stil übernehmen')).to_be_visible()
  expect(remote.get_by_text('Markus Testkonto ist verantwortlich',exact=False).first).to_be_visible()
  remote.get_by_role('button',name='Selbst bearbeiten',exact=True).click()
  expect(remote.get_by_text('Selbst weiterarbeiten',exact=True)).to_be_visible()
  editor=remote.locator('.r26-work-details').first
  expect(editor.get_by_text('Code bearbeiten und Tests ausführen')).to_be_visible()
  mark('recipient-gets-same-task-and-direct-work-choice')
  remote.get_by_label('Kommentar zur Aufgabe').fill('Marco, die Designreferenz passt. Ich beginne mit dem Konzept.')
  remote.get_by_role('button',name='Kommentar senden',exact=True).click()
  expect(task.get_by_text('Marco, die Designreferenz passt. Ich beginne mit dem Konzept.',exact=True)).to_be_visible(timeout=14000)
  mark('second-person-comment-arrives-in-original-task')
  pa.screenshot(path=str(out/'01-task-desktop.png'),full_page=True)
  task.get_by_role('button',name='Aufgabe schließen').click()
  pa.goto(task_url)
  reopened=pa.get_by_role('dialog',name='Aufgabe im Projektraum')
  expect(reopened.get_by_role('heading',name='R26 SCHMAQQ-Stil übernehmen')).to_be_visible()
  mark('task-can-be-resumed-at-same-deep-link')
  reopened.get_by_role('button',name='Mit KI',exact=True).click()
  expect(reopened.get_by_role('heading',name='Noch kein Modell für diesen Raum erreichbar')).to_be_visible()
  assert reopened.get_by_role('button',name='Mit diesem Kontext starten').count()==0
  mark('unavailable-ai-honestly-identified')
  # Exercise the inherited real local Git runner through R26's simplified entry.
  pa.goto(origin+'/?room=klimafinder-fixture&task=task-fixture-code')
  code_task=pa.get_by_role('dialog',name='Aufgabe im Projektraum')
  code_task.get_by_role('button',name='Selbst bearbeiten',exact=True).click()
  expect(code_task.get_by_text('Selbst weiterarbeiten',exact=True)).to_be_visible()
  code_task.locator('.r26-work-details summary').first.click()
  git_check=code_task.get_by_role('button',name='Git jetzt prüfen',exact=True)
  expect(git_check).to_be_visible(timeout=20000)
  git_check.click()
  start=code_task.get_by_role('button',name='Bearbeitung starten',exact=True)
  expect(start).to_be_enabled(timeout=30000)
  start.click()
  expect(code_task.locator('#source-editor')).to_be_visible(timeout=40000)
  mark('simplified-entry-reaches-real-Git-worktree-editor')
  mobile,pm=login(browser,a_account,origin,{'width':390,'height':844})
  pm.goto(task_url)
  mobile_task=pm.get_by_role('dialog',name='Aufgabe im Projektraum')
  expect(mobile_task.get_by_role('heading',name='R26 SCHMAQQ-Stil übernehmen')).to_be_visible()
  mobile_task.get_by_role('button',name='Mit dem Team',exact=True).click()
  expect(mobile_task.get_by_text('Markus Testkonto ist verantwortlich',exact=False).first).to_be_visible()
  assert pm.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1'),'Mobile horizontal scroll'
  pm.screenshot(path=str(out/'02-task-mobile.png'),full_page=True)
  mark('mobile-handoff-without-local-path-or-overflow')
  mobile_task.get_by_label('Kommentar zur Aufgabe').fill('Kurze Rückfrage vom Handy; Entwurf nicht gesendet.')
  pm.reload()
  expect(pm.get_by_role('dialog',name='Aufgabe im Projektraum').get_by_label('Kommentar zur Aufgabe')).to_have_value('Kurze Rückfrage vom Handy; Entwurf nicht gesendet.')
  mark('mobile-draft-kept-on-reload')
  assert not errors,'Browser exceptions: '+str(errors)
  mark('no-uncaught-browser-errors')
  browser.close()
 result={'status':'PASS','checks':checks,'checksPassed':len(checks),'productionChanged':False,'realPersonalAccountsUsed':False,'purpose':'isolated R26 task/handoff UX','releaseSource':args.expected_sha}
 (out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
 print('R26_BROWSER=PASS checks='+str(len(checks)))
except Exception as e:
 try:
  if 'pa' in globals() and not pa.is_closed():
   pa.screenshot(path=str(out/'failure.png'),full_page=True)
   (out/'failure-body.txt').write_text(pa.locator('body').inner_text())
 except Exception:pass
 (out/'result.json').write_text(json.dumps({'status':'FAIL','checks':checks,'error':str(e)},indent=2)+'\n')
 raise
finally:
 child.terminate()
 try:child.wait(timeout=7)
 except subprocess.TimeoutExpired:child.kill();child.wait(timeout=4)
 if metadata and Path(metadata['fixtureDirectory']).name.startswith('schmaqq-r25-browser-'):shutil.rmtree(metadata['fixtureDirectory'],ignore_errors=True)
