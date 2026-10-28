"""Only three changed onboarding paths; uses an already running private fixture.

python -B scripts/onboarding-start-browser.py --qa-root PATH --fixture PATH
No backend suite, GitHub call, Runner installation or model inference.
"""
import argparse,json,sys,time,traceback,uuid
from pathlib import Path
from urllib.parse import urlparse

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--qa-root',type=Path,required=True)
    parser.add_argument('--fixture',type=Path,required=True)
    args=parser.parse_args();sys.path.insert(0,str(args.qa_root.resolve()))
    import qa
    from playwright.sync_api import sync_playwright,expect
    out=args.fixture/'focused-browser';out.mkdir();cfg=json.loads((args.fixture/'login.private.json').read_text(encoding='utf-8'))
    origin=cfg['origin'];assert origin=='http://127.0.0.1:47850','Only owned fixture accepted'
    errors=[];checks=[];started=time.monotonic();result={}
    def check(name):checks.append({'name':name,'status':'PASS'})
    with sync_playwright() as p:
        browser=p.chromium.launch(channel='msedge',headless=True)
        try:
            context=browser.new_context(viewport={'width':1280,'height':900},locale='de-DE',service_workers='block')
            def route(r):
                u=urlparse(r.request.url)
                if u.scheme in ('data','blob','about') or r.request.url.startswith(origin+'/'):r.continue_()
                else:r.abort('blockedbyclient')
            context.route('**/*',route);page=context.new_page();page.set_default_timeout(12000)
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(origin);page.get_by_label('E-Mail',exact=True).fill(cfg['email']);page.get_by_label('Passwort',exact=True).fill(cfg['password']);page.get_by_role('button',name='Studio öffnen',exact=True).click()
            expect(page.locator('.team-home')).to_be_visible()
            # Fixture setup through the authenticated API, not a repeated project UI test.
            response=context.request.post(origin+'/api/room',headers={'Origin':origin},data={'action':'create','id':str(uuid.uuid4()),'title':'Morgen Start','description':'Gezielte Prüfung des neuen Einstiegs'})
            assert response.status==200,response.text();project=response.json()['project']
            page.goto(origin+'/?room='+project+'&tab=connect')
            page.get_by_role('button',name='Vorhandenes Repository verbinden',exact=True).click()
            dialog=page.get_by_role('dialog');dialog.get_by_label('HTTPS-Adresse',exact=True).fill('https://github.com/example/morgen-fixture')
            dialog.get_by_role('button',name='Im Projekt speichern',exact=True).click();expect(dialog).to_have_count(0)
            expect(page.get_by_text('Repository-Adresse gespeichert · keine Zugriffsbestätigung.',exact=True)).to_be_visible()
            page.reload();expect(page.get_by_text('Repository-Adresse gespeichert · keine Zugriffsbestätigung.',exact=True)).to_be_visible()
            page.screenshot(path=str(out/'01-reference-only.png'),full_page=True)
            check('repository-reference-status-survives-reload')
            page.get_by_role('button',name='Projekt auf meinem Rechner einrichten',exact=True).click()
            page.locator('summary').filter(has_text='Erweiterte lokale Einrichtung').click()
            expect(page.get_by_text('Entwicklung → PC verbinden',exact=False)).to_have_count(0)
            page.get_by_role('button',name='Rechnerverbindung öffnen',exact=True).click()
            expect(page.get_by_role('heading',name='Deinen PC verbinden',exact=True)).to_be_visible()
            expect(page.get_by_role('heading',name='Deinen PC verbinden',exact=True).locator('..').locator('..')).to_be_focused()
            page.screenshot(path=str(out/'02-runner-target.png'),full_page=True)
            check('current-guidance-and-direct-runner-target')
            page.get_by_role('button',name='Zum Projekt und Bereitschaft prüfen',exact=True).click()
            readiness=page.get_by_role('region',name='Deine Projektbereitschaft',exact=True)
            expect(readiness).to_be_visible();expect(readiness).to_contain_text('Noch nicht geprüft')
            expect(page.get_by_text('Dein Rechner ist noch nicht verbunden.',exact=False)).to_be_visible()
            expect(readiness.locator('..')).to_be_focused()
            page.screenshot(path=str(out/'03-readiness-missing-runner.png'),full_page=True)
            devices=context.request.get(origin+'/api/development').json()
            assert not devices['devices'] and not devices['jobs'],'Readiness action registered a device or queued work'
            page.set_viewport_size({'width':390,'height':844});readiness.scroll_into_view_if_needed()
            page.wait_for_timeout(400) # Let the existing responsive navigation transition settle.
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+2')
            page.screenshot(path=str(out/'04-readiness-mobile.png'),full_page=True)
            check('visible-readiness-without-false-success-or-new-jobs')
            assert not errors,errors;result={'status':'PASS'}
        except Exception:result={'status':'FAIL','error':traceback.format_exc()}
        finally:
            result.update(checks=checks,errors=errors,seconds=round(time.monotonic()-started,2),scope='Three changed UI paths only; deterministic browser, NOT Terra execution')
            (out/'summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
            browser.close()
    print(json.dumps({'status':result['status'],'checks':len(checks),'output':str(out)}))
    return 0 if result['status']=='PASS' else 1

if __name__=='__main__':raise SystemExit(main())
