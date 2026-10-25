#!/usr/bin/env python3
"""Actual Chrome: one-owner -> inline invite -> separate account -> real handoff.
No live Studio accounts, email, provider, or GitHub writes.
"""
import argparse,os,select,json,subprocess,shutil
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
root=Path(__file__).resolve().parent.parent
ap=argparse.ArgumentParser();ap.add_argument('--node',required=True);ap.add_argument('--output',required=True);ap.add_argument('--release-dir');ap.add_argument('--expected-sha');a=ap.parse_args()
out=Path(a.output).resolve();out.mkdir(parents=True,exist_ok=True,mode=0o700)
env={k:v for k,v in os.environ.items() if not k.startswith(('STUDIO_','GH_','GITHUB_','OPENAI_')) and k not in ('NODE_OPTIONS','NODE_PATH')}
env['R26_FIXTURE_PORT']='45711'
if a.release_dir:
 assert a.expected_sha and len(a.expected_sha)==40
 env['R26_FIXTURE_RELEASE']=str(Path(a.release_dir).resolve())
 env['R26_FIXTURE_SOURCE']=a.expected_sha
p=subprocess.Popen([a.node,str(root/'scripts/r26-owner-fixture.mjs')],cwd=root,env=env,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
meta=None;checks=[];errors=[]
def mark(x):checks.append(x);print('PASS '+x,flush=True)
try:
 ready,_,_=select.select([p.stdout],[],[],15)
 assert ready,'Isolated fixture failed to start'
 meta=json.loads(p.stdout.readline());base=meta['origin']
 credentials=json.loads((Path(meta['privateDir'])/'fixture.private.json').read_text())['owner']
 with sync_playwright() as pw:
  browser=pw.chromium.launch(channel='chrome',headless=True)
  marco=browser.new_context(viewport={'width':390,'height':844})
  page=marco.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base);page.get_by_label('E-Mail',exact=True).fill(credentials['email'])
  page.get_by_label('Passwort',exact=True).fill(credentials['password'])
  page.get_by_role('button',name='Studio öffnen',exact=True).click()
  expect(page.locator('.rw-sidebar')).to_be_visible()
  page.goto(base+'/?room=website&task=task-r26-onboard')
  task=page.get_by_role('dialog',name='Aufgabe im Projektraum')
  task.get_by_role('button',name='Mit dem Team',exact=True).click()
  expect(task.get_by_text('Noch kein zweites Teamkonto',exact=True)).to_be_visible()
  expect(task.get_by_role('button',name='Markus direkt hier einladen',exact=True)).to_be_visible()
  mark('one-owner-task-has-direct-invite-not-technical-menu')
  task.get_by_role('button',name='Markus direkt hier einladen',exact=True).click()
  field=task.get_by_label('E-Mail-Adresse',exact=True)
  field.fill('markus@fixture.invalid')
  # Take screenshots before any one-time invitation token exists on screen.
  page.screenshot(path=str(out/'01-owner-mobile-inline-invite.png'),full_page=True)
  task.get_by_role('button',name='Einladungslink erstellen',exact=True).click()
  token_field=task.locator('.r26-inline-invite input.invite-link')
  expect(token_field).to_be_visible()
  link=token_field.input_value()
  assert link.startswith(base+'/?invite=') and len(link)>60
  assert 'markus@fixture.invalid' not in link
  mark('owner-creates-one-time-personal-invite-without-leaving-task')
  other=browser.new_context(viewport={'width':390,'height':844});joined=other.new_page()
  joined.on('pageerror',lambda e:errors.append(str(e)))
  joined.goto(link)
  expect(joined.get_by_role('heading',name='Dein Platz im Team.')).to_be_visible()
  joined.get_by_label('Dein Name').fill('Markus Testkonto')
  joined.get_by_label('Passwort',exact=True).fill('synthetic-password-not-shared-12345')
  joined.get_by_role('button',name='Dem Team beitreten',exact=True).click()
  expect(joined.locator('.rw-sidebar')).to_be_visible(timeout=15000)
  mark('recipient-joins-as-separate-member-with-own-password')
  resp=marco.request.post(base+'/api/auth/register',data={'invite':link.split('invite=')[1],'name':'Repeated','password':'test-passphrase-long-12345'},headers={'Origin':base,'Content-Type':'application/json'})
  assert resp.status in (403,409),'Invite replay must be rejected'
  mark('invite-reuse-rejected')
  page.reload()
  task=page.get_by_role('dialog',name='Aufgabe im Projektraum')
  task.get_by_role('button',name='Mit dem Team',exact=True).click()
  person=task.locator('.r26-person').filter(has_text='Markus Testkonto')
  expect(person).to_be_visible(timeout=12000)
  person.get_by_role('button',name='Übergeben',exact=True).click()
  expect(task.get_by_text('Markus Testkonto ist verantwortlich',exact=False).first).to_be_visible()
  mark('owner-hands-task-to-new-member')
  joined.goto(base+'/?room=website&task=task-r26-onboard')
  other_task=joined.get_by_role('dialog',name='Aufgabe im Projektraum')
  expect(other_task.get_by_text('Markus Testkonto ist verantwortlich',exact=False).first).to_be_visible()
  other_task.get_by_label('Kommentar zur Aufgabe').fill('Verstanden. Ich prüfe jetzt die Vorlage und melde mich hier zurück.')
  other_task.get_by_role('button',name='Kommentar senden',exact=True).click()
  expect(task.get_by_text('Verstanden. Ich prüfe jetzt die Vorlage und melde mich hier zurück.',exact=True)).to_be_visible(timeout=12000)
  assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth+1')
  mark('new-teammate-replies-on-same-task-visible-to-owner')
  assert not errors,'Browser exceptions: '+str(errors)
  mark('no-uncaught-browser-errors')
  browser.close()
 result={'status':'PASS','checks':checks,'checksPassed':len(checks),'twoSeparateAccounts':True,'realPersonalAccounts':False,'liveDataUsed':False,'productionChanged':False,'releaseSource':a.expected_sha}
 (out/'result.json').write_text(json.dumps(result,indent=2)+'\n')
 print('R26_ONBOARDING_BROWSER=PASS')
except Exception as e:
 try:
  if 'page' in locals() and not page.is_closed():
   page.screenshot(path=str(out/'failure.png'),full_page=True)
   (out/'failure-body.txt').write_text(page.locator('body').inner_text())
 except Exception:pass
 (out/'result.json').write_text(json.dumps({'status':'FAIL','checks':checks,'error':str(e)},indent=2))
 raise
finally:
 p.terminate()
 try:p.wait(timeout=7)
 except subprocess.TimeoutExpired:p.kill();p.wait()
 if meta and Path(meta['privateDir']).name.startswith('schmaqq-r26-owner-'):
  shutil.rmtree(meta['privateDir'],ignore_errors=True)
