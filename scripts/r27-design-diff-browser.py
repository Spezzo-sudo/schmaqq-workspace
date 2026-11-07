#!/usr/bin/env python3
"""Browser acceptance for R27: marketing tokens + task-bound review diff + two readers.
All synthetic data on loopback only; the diff is explicitly fixture data.
"""
import argparse,json,os,select,subprocess,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('--node',required=True);p.add_argument('--output',required=True);p.add_argument('--release-dir');p.add_argument('--expected-sha');args=p.parse_args()
out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True,mode=0o700)
env={k:v for k,v in os.environ.items() if not k.startswith(('STUDIO_','GITHUB_','GH_','OPENAI_')) and k not in ('NODE_PATH','NODE_OPTIONS')}
env['R27_FIXTURE_PORT']='45741'
if args.release_dir:
 assert args.expected_sha and len(args.expected_sha)==40
 env['R27_FIXTURE_RELEASE']=str(Path(args.release_dir).resolve())
 env['R27_FIXTURE_SOURCE']=args.expected_sha
child=subprocess.Popen([args.node,str(ROOT/'scripts/r27-browser-fixture.mjs')],cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
meta=None;checks=[];errors=[]
def mark(message):checks.append(message);print('PASS '+message,flush=True)
def login(browser,account,base,viewport):
 ctx=browser.new_context(viewport=viewport)
 page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto(base)
 page.get_by_label('E-Mail',exact=True).fill(account['email'])
 page.get_by_label('Passwort',exact=True).fill(account['password'])
 page.get_by_role('button',name='Studio öffnen',exact=True).click()
 expect(page.locator('.rw-sidebar')).to_be_visible(timeout=15000)
 return ctx,page
try:
 ready,_,_=select.select([child.stdout],[],[],18)
 assert ready,'Fixture did not start'
 meta=json.loads(child.stdout.readline());base=meta['origin']
 accounts=json.loads((Path(meta['fixtureDirectory'])/'fixture.private.json').read_text())['accounts']
 with sync_playwright() as pw:
  browser=pw.chromium.launch(channel='chrome',headless=True)
  ca,marco=login(browser,accounts[0],base,{'width':390,'height':844})
  cb,markus=login(browser,accounts[1],base,{'width':1366,'height':920})
  mark('two-authenticated-and-isolated-browser-sessions')
  marco.goto(base+'/?room=klimafinder-fixture&tab=knowledge')
  ref=marco.get_by_role('region',name='SCHMAQQ-Designsystem – gemeinsame Designvorlage')
  expect(ref).to_be_visible()
  for code in ['#111225','#f1efe8','#d9ff6b','#ff6f59']:
   expect(ref).to_contain_text(code)
  assert '/92aad74781c03c7414d5a7adfd6c0568ad82c99b/' in ref.get_by_role('link',name='Website-Tokens').get_attribute('href')
  colors=marco.locator('.rw-shell').evaluate('(el)=>({ink:getComputedStyle(el).color,paper:getComputedStyle(el).backgroundColor,font:getComputedStyle(el).fontFamily})')
  assert colors['ink']=='rgb(17, 18, 37)' and colors['paper']=='rgb(241, 239, 232)',colors
  assert 'Arial' in colors['font'],colors
  mark('canonical-marketing-palette-and-design-guide-findable-in-project-knowledge')
  marco.screenshot(path=str(out/'01-design-knowledge-mobile.png'),full_page=True)
  link=base+'/?room=klimafinder-fixture&task=task-fixture-first'
  marco.goto(link)
  task=marco.get_by_role('dialog',name='Aufgabe im Projektraum')
  expect(task.get_by_text('Letzte bestätigte Aktion:',exact=False)).to_be_visible(timeout=10000)
  expect(task.get_by_text('Prüfstand von Markus Testkonto',exact=False)).to_be_visible()
  mark('task-inline-latest-activity-only-acknowledged-job')
  task.get_by_role('button',name='Prüfen',exact=True).click()
  diff=task.get_by_role('region',name='Änderungen dieses Prüfstands')
  expect(diff.get_by_text('Codeänderungen ansehen')).to_be_visible()
  expect(diff.get_by_text('nicht',exact=False)).to_be_visible()
  assert diff.locator('.r27-diff-line.add').count()==1
  assert diff.locator('.r27-diff-line.remove').count()==1
  expect(diff.locator('.r27-diff-line.add')).to_contain_text('SCHMAQQ Designfarben')
  expect(diff.locator('.r27-diff-line.remove')).to_contain_text('Alte Designfarben')
  mark('git-review-diff-inline-green-additions-red-deletions-and-commit-bound-label')
  # Reading the same task on another account must not require the author's device.
  markus.goto(link)
  peer=markus.get_by_role('dialog',name='Aufgabe im Projektraum')
  peer.get_by_role('button',name='Prüfen',exact=True).click()
  expect(peer.get_by_role('region',name='Änderungen dieses Prüfstands').locator('.r27-diff-line.add')).to_contain_text('SCHMAQQ Designfarben')
  mark('second-person-can-read-identical-reviewed-git-diff')
  marco.screenshot(path=str(out/'02-task-diff-mobile.png'),full_page=True)
  markus.screenshot(path=str(out/'03-task-diff-desktop.png'),full_page=True)
  assert marco.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
  mark('mobile-task-with-diff-no-page-horizontal-overflow')
  peer.get_by_role('button',name='Codeänderungen schliessen').click()
  expect(peer.get_by_role('region',name='Änderungen dieses Prüfstands')).to_have_count(0)
  mark('review-diff-can-be-closed-without-losing-task')
  assert not errors,errors
  mark('no-uncaught-browser-errors')
  browser.close()
 result={'status':'PASS','checksPassed':len(checks),'checks':checks,'productionChanged':False,'fixtureDiffSynthetic':True,'personalAccountsUsed':False,'releaseSource':args.expected_sha}
 (out/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print('R27_BROWSER=PASS checks='+str(len(checks)))
except Exception as e:
 try:
  if 'marco' in locals() and not marco.is_closed():
   marco.screenshot(path=str(out/'failure.png'),full_page=True)
   (out/'failure-body.txt').write_text(marco.locator('body').inner_text())
 except Exception:pass
 (out/'result.json').write_text(json.dumps({'status':'FAIL','checks':checks,'error':str(e)},indent=2)+'\n')
 raise
finally:
 child.terminate()
 try:child.wait(timeout=7)
 except subprocess.TimeoutExpired:child.kill();child.wait(timeout=5)
 if meta and Path(meta['fixtureDirectory']).name.startswith('schmaqq-r27-browser-'):shutil.rmtree(meta['fixtureDirectory'],ignore_errors=True)
