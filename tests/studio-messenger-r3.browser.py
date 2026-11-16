# Local-only browser regression. Start the isolated demo with STUDIO_DEMO_NAME=r3-test first.
import json, time, uuid
from urllib.parse import urlparse
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'.studio/r3-evidence'
config=json.loads((ROOT/'.studio/r3-test/demo.private.json').read_text())
origin=config['origin']
assert urlparse(origin).hostname in ('127.0.0.1','localhost'), 'This test is only allowed on an isolated local demo'
assert all(a['email'].endswith('@fixture.invalid') for a in config['accounts'])
checks=[]

def record(name):
 checks.append(name);print('PASS '+name,flush=True)

with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/opt/google/chrome/chrome',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 context=browser.new_context(viewport={'width':1440,'height':960},device_scale_factor=1)
 page=context.new_page();page.set_default_timeout(15000)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 def login(ctx,index):
  a=config['accounts'][index]
  r=ctx.request.post(origin+'/api/auth/login',data={'email':a['email'],'password':a['password']},headers={'Origin':origin})
  assert r.status==200,('login',r.status)
 def api(body,ctx=context,route='/api/room'):
  r=ctx.request.post(origin+route,data=body,headers={'Origin':origin});assert r.status==200,(route,r.status,r.text()[:300]);return r.json()
 login(context,0)
 current=context.request.get(origin+'/api/room?project=website').json()
 if not any(a['name']=='Mara' for a in current.get('agents',[])):
  agents={}
  for preset,name,role in [('leitwolf','Leitwolf','coordinator'),('mara','Mara','frontend'),('frau-kern','Frau Kern','reviewer'),('dachs','Dachs','debugger')]:
   a=api({'action':'agent','id':'r3-seed-'+preset,'project':'website','name':name,'avatarPresetId':preset,'role':role,'model':'Kein Modell verbunden','purpose':'Isoliertes Testprofil für die Messenger-Abnahme','capabilities':['chat']})
   agents[preset]=a['agentId']
  api({'action':'message','id':'r3-seed-msg-1','project':'website','body':'TEST R3: Unser neuer Arbeitsplatz bleibt übersichtlich. Aufgaben, Dateien und Prüfungen öffnen wir direkt im Gespräch.'})
  api({'action':'message','id':'r3-seed-msg-2','project':'website','body':'TEST R3: Der Entwurf ist vorbereitet. Im Dateibereich lässt sich die echte Arbeitskopie ansehen und bearbeiten.','senderAgent':agents['mara'],'recipient':agents['leitwolf'],'replyTo':'r3-seed-msg-1'})
  api({'action':'message','id':'r3-seed-msg-3','project':'website','body':'TEST R3: Gut. Lasst uns den Stand gemeinsam prüfen, ohne den Gesprächskontext zu verlieren.','recipient':agents['mara']})
 try:
  page.goto(origin+'/?room=website&tab=talk&chat=all',wait_until='networkidle')
  expect(page.locator('#rw-message')).to_be_visible()
  expect(page.get_by_role('heading',name='Gespräche',exact=True)).to_be_visible()
  assert not errors,errors
  record('real backend login and messenger render')
  page.screenshot(path=str(OUT/'r3-desktop-chat.png'),full_page=False)
  # A project draft and an addressed view must not overwrite each other.
  page.locator('#rw-message').fill('R3 Gruppentext bleibt erhalten')
  page.get_by_role('tab',name='Kontakte',exact=True).click()
  page.locator('.rw-contact-meta-btn').filter(has_text='Mara').click()
  expect(page.locator('#rw-message')).to_have_value('')
  page.locator('#rw-message').fill('R3 Mara-Entwurf bleibt separat')
  page.get_by_role('tab',name='Chats',exact=True).click()
  page.get_by_role('button',name='Projektteam',exact=False).first.click()
  expect(page.locator('#rw-message')).to_have_value('R3 Gruppentext bleibt erhalten')
  page.locator('.rw-contact-meta-btn').filter(has_text='Mara').click()
  expect(page.locator('#rw-message')).to_have_value('R3 Mara-Entwurf bleibt separat')
  record('independent drafts across conversation views')
  # A profile lives in the inspector; its edit configuration is still complete.
  page.locator('.rw-messenger-header').get_by_role('button',name='Profil von Mara öffnen').click()
  expect(page.locator('.r3-inspector')).to_be_visible()
  expect(page.locator('.rw-fg-profile')).to_be_visible()
  assert page.locator('.r3-inspector-body').evaluate('(el)=>el.scrollWidth <= el.clientWidth+1'), 'profile inspector overflow'
  assert page.locator('.r3-contact-scroll').evaluate('(el)=>el.scrollWidth <= el.clientWidth+1'), 'conversation list overflow'
  page.screenshot(path=str(OUT/'r3-desktop-profile.png'),full_page=False)
  page.get_by_role('button',name='Profil bearbeiten',exact=True).click()
  expect(page.get_by_label('Name des Agenten',exact=True)).to_have_value('Mara')
  page.get_by_label('Beschreibung & Auftrag im Projekt',exact=True).fill('TEST R3: Profil im Detailbereich gespeichert')
  page.get_by_role('button',name='Agentenprofil speichern',exact=True).click()
  expect(page.locator('.rw-fg-profile')).to_be_visible()
  expect(page.locator('.rw-fg-profile')).to_contain_text('TEST R3: Profil im Detailbereich gespeichert')
  page.get_by_role('button',name='Detailbereich schliessen',exact=True).click()
  expect(page.locator('#rw-message')).to_have_value('R3 Mara-Entwurf bleibt separat')
  record('profile inspector edits persist without losing chat draft')
  # Tasks, knowledge, settings and model context share one inspector.
  page.get_by_role('button',name='Aufgaben öffnen',exact=True).click()
  expect(page.locator('.r3-inspector')).to_be_visible()
  expect(page.locator('.r3-inspector .team-task-list')).to_be_visible()
  page.get_by_label('Bereich wählen',exact=True).select_option('knowledge')
  expect(page.locator('.r3-inspector')).to_contain_text('Wissen')
  page.get_by_label('Bereich wählen',exact=True).select_option('activity')
  expect(page.locator('.r3-inspector')).to_contain_text('Kontext')
  page.get_by_label('Bereich wählen',exact=True).select_option('connect')
  expect(page.locator('.r3-inspector')).to_contain_text('Einrichtung')
  page.get_by_role('button',name='Detailbereich schliessen',exact=True).click()
  expect(page.locator('#rw-message')).to_have_value('R3 Mara-Entwurf bleibt separat')
  record('all existing project tools integrated without losing draft')
  # Actual file tree backed by a local sample runner, not browser fixture data.
  page.get_by_role('button',name='Projektdateien öffnen',exact=True).click()
  expect(page.get_by_label('Arbeitskopie für Projektdateien')).to_be_visible(timeout=30000)
  expect(page.locator('.r3-file-tree')).to_be_visible(timeout=45000)
  expect(page.get_by_role('textbox',name='Dateiinhalt',exact=True)).to_be_visible(timeout=30000)
  page.screenshot(path=str(OUT/'r3-desktop-files.png'),full_page=False)
  text=page.get_by_role('textbox',name='Dateiinhalt',exact=True)
  original=text.input_value();marker='\n<!-- TEST R3: saved through the real runner editor -->\n'
  text.fill(original+marker)
  page.locator('.r3-editor-toolbar').get_by_role('button',name='Speichern',exact=True).click()
  expect(page.locator('.r3-editor-toolbar')).to_contain_text('Revisionengebundener Dateizugriff',timeout=30000)
  page.reload(wait_until='networkidle')
  expect(page.get_by_role('textbox',name='Dateiinhalt',exact=True)).to_have_value(original+marker,timeout=45000)
  record('authorized file tree, revision-bound save and reload persistence')
  page.get_by_role('button',name='Zur Aufgabe',exact=True).click()
  expect(page.get_by_role('dialog',name='Gemeinsame Aufgabe',exact=True)).to_be_visible()
  page.get_by_role('button',name='Aufgabe schließen',exact=True).click()
  expect(page.locator('.r3-inspector .source-editor')).to_be_visible(timeout=30000)
  assert page.locator('#source-editor').count()==1, 'duplicate editor instances'
  record('original task workflow opens from files and returns to a single editor')
  page.get_by_role('button',name='Detailbereich schliessen',exact=True).click()
  # True cross-account persistence, no reload-reset mocks.
  message='TEST R3 reale Nachricht '+str(uuid.uuid4())[:8]
  page.locator('#rw-message').fill(message)
  page.get_by_role('button',name='Nachricht senden',exact=True).click()
  expect(page.locator('.rw-message-content>p').filter(has_text=message)).to_be_visible()
  page.reload(wait_until='networkidle')
  expect(page.locator('.rw-message-content>p').filter(has_text=message)).to_be_visible()
  other=browser.new_context(viewport={'width':1280,'height':850});login(other,1)
  second=other.new_page();second.goto(origin+'/?room=website&chat=all',wait_until='networkidle')
  expect(second.locator('.rw-message-content>p').filter(has_text=message)).to_be_visible()
  other.close();record('message survives reload and appears for second authenticated user')
  # Mobile list -> chat -> profile, no horizontal overflow.
  mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
  login(mobile,0);m=mobile.new_page();m.set_default_timeout(15000)
  m.on('pageerror',lambda e:errors.append(str(e)))
  m.goto(origin+'/?room=website&tab=talk',wait_until='networkidle')
  expect(m.locator('.rw-messenger-rail')).to_be_visible()
  expect(m.locator('.rw-messenger-main')).not_to_be_visible()
  m.screenshot(path=str(OUT/'r3-mobile-list.png'),full_page=False)
  m.get_by_role('button',name='Projektteam',exact=False).first.click()
  expect(m.locator('#rw-message')).to_be_visible()
  assert m.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mobile horizontal overflow'
  box=m.locator('#rw-message').bounding_box();assert box and box['y']+box['height']<=844,'composer outside viewport'
  m.screenshot(path=str(OUT/'r3-mobile-chat.png'),full_page=False)
  m.set_viewport_size({'width':390,'height':470})
  m.wait_for_timeout(150)
  compact=m.locator('#rw-message').bounding_box()
  assert compact and compact['y']+compact['height']<=470, 'composer hidden in reduced viewport'
  m.set_viewport_size({'width':390,'height':844})
  m.get_by_role('button',name='Nachrichtenoptionen',exact=True).click()
  expect(m.get_by_label('Empfänger im Projekt',exact=True)).to_be_visible()
  assert m.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'composer menu overflow'
  m.get_by_role('button',name='Nachrichtenoptionen schliessen',exact=True).click()
  m.get_by_role('button',name='Aufgaben öffnen',exact=True).click()
  expect(m.get_by_role('dialog')).to_be_visible()
  assert m.locator('.rw-messenger-main').get_attribute('inert') is not None
  m.keyboard.press('Escape');expect(m.locator('.r3-inspector')).not_to_be_visible()
  m.get_by_role('button',name='Zur Gesprächsliste',exact=True).click()
  expect(m.locator('.rw-messenger-rail')).to_be_visible()
  m.get_by_role('button',name='Projektteam',exact=False).first.click()
  m.go_back(wait_until='networkidle')
  expect(m.locator('.rw-messenger-rail')).to_be_visible()
  mobile.close();record('390px navigation, reduced viewport, overlays, focus and browser Back')
  assert not errors,errors
  record('no browser JavaScript errors')
  (OUT/'browser-result.json').write_text(json.dumps({'passed':checks,'errors':errors},ensure_ascii=False,indent=2))
 except Exception as e:
  page.screenshot(path=str(OUT/'r3-browser-failure.png'),full_page=False)
  (OUT/'browser-result.json').write_text(json.dumps({'passed':checks,'failed':str(e),'errors':errors},ensure_ascii=False,indent=2))
  raise
 finally:
  browser.close()
