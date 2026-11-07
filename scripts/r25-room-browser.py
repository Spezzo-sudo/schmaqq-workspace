#!/usr/bin/env python3
"""Real Chromium acceptance of R25 rooms. Only synthetic loopback fixtures.

Starts and stops its own fixture; no real account, mail, provider or repository.
Mock model output is explicitly labelled as synthetic, not model inference.
"""
import argparse
import json
import os
from pathlib import Path
import select
import shutil
import subprocess
import tempfile
import time
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--node', required=True)
parser.add_argument('--output', required=True)
parser.add_argument('--release-dir')
parser.add_argument('--expected-sha')
args = parser.parse_args()
output = Path(args.output).resolve()
output.mkdir(parents=True, exist_ok=True, mode=0o700)
checks, browser_errors = [], []
fixture_dir = None
child = None


def mark(name):
    checks.append(name)
    print('PASS ' + name, flush=True)


def login(browser, account, origin, viewport):
    ctx = browser.new_context(viewport=viewport)
    page = ctx.new_page()
    page.on('pageerror', lambda error: browser_errors.append(str(error)))
    page.goto(origin, wait_until='domcontentloaded')
    page.get_by_label('E-Mail', exact=True).fill(account['email'])
    page.get_by_label('Passwort', exact=True).fill(account['password'])
    page.get_by_role('button', name='Studio öffnen', exact=True).click()
    expect(page.locator('.rw-sidebar')).to_be_visible(timeout=15000)
    return ctx, page


def api(ctx, origin, route, body):
    response = ctx.request.post(origin + route, data=body,
        headers={'Origin': origin, 'Content-Type': 'application/json'})
    assert response.ok, 'Fixture request failed: ' + str(response.status)
    return response.json()


try:
    env = {k: v for k, v in os.environ.items() if not k.startswith(('STUDIO_', 'GH_', 'GITHUB_', 'OPENAI_')) and k not in ('NODE_OPTIONS', 'NODE_PATH')}
    env['R25_FIXTURE_PORT'] = '45631'
    if args.release_dir:
        env['R25_FIXTURE_RELEASE'] = str(Path(args.release_dir).resolve())
        env['R25_FIXTURE_SOURCE'] = args.expected_sha or ''
    child = subprocess.Popen([args.node, str(ROOT / 'scripts/r25-room-fixture.mjs')], cwd=ROOT, env=env,
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    ready, _, _ = select.select([child.stdout], [], [], 15)
    assert ready, 'Fixture did not become ready'
    first = child.stdout.readline()
    assert first.strip().startswith('{'), 'Fixture failed to start'
    metadata = json.loads(first)
    origin = metadata['origin']
    fixture_dir = Path(metadata['fixtureDirectory'])
    assert fixture_dir.name.startswith('schmaqq-r25-browser-')
    settings = json.loads((fixture_dir / 'fixture.private.json').read_text())
    account_a, account_b, account_c = settings['accounts']
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome', headless=True)
        a, pa = login(browser, account_a, origin, {'width': 1440, 'height': 1000})
        b, pb = login(browser, account_b, origin, {'width': 1280, 'height': 900})
        mark('separate-personal-browser-sessions')
        pa.screenshot(path=str(output / '01-workspace-desktop.png'), full_page=True)
        pa.get_by_role('button', name='Neuer Projektraum', exact=True).click()
        dialog = pa.get_by_role('dialog')
        dialog.get_by_label('Projektname', exact=True).fill('R25 gemeinsamer Praxistest')
        dialog.get_by_label('Was möchtet ihr erreichen?', exact=True).fill('Eine Idee gemeinsam bis zum prüfbaren Ergebnis entwickeln.')
        assert dialog.locator('input').count() == 1, 'Project creation must not demand a filesystem path'
        dialog.get_by_role('button', name='Raum eröffnen', exact=True).click()
        expect(pa.get_by_role('heading', name='R25 gemeinsamer Praxistest', exact=True)).to_be_visible()
        assert 'room=' in pa.url
        room_url = pa.url
        room_id = pa.url.split('room=')[1].split('&')[0]
        mark('no-path-no-git-project-created-in-browser')
        message_text = 'Wir brauchen einen klaren Einstieg mit Region und Kontakt.'
        pa.get_by_label('Nachricht an den Projektraum').fill(message_text)
        pa.get_by_role('button', name='Nachricht senden', exact=True).click()
        message = pa.locator('.rw-message').filter(has_text=message_text)
        expect(message).to_be_visible()
        mark('persistent-project-conversation')
        pb.goto(room_url)
        expect(pb.locator('.rw-message').filter(has_text=message_text)).to_be_visible()
        pb.get_by_label('Nachricht an den Projektraum').fill('Ich kann die erste Aufgabe übernehmen.')
        pb.get_by_role('button', name='Nachricht senden', exact=True).click()
        expect(pa.locator('.rw-message').filter(has_text='Ich kann die erste Aufgabe übernehmen.')).to_be_visible(timeout=10000)
        mark('second-person-sees-and-replies-without-context-copy')
        message.get_by_role('button', name='Als Aufgabe', exact=True).click()
        dialog = pa.get_by_role('dialog')
        dialog.get_by_label('Titel', exact=True).fill('Regionale Suche skizzieren')
        dialog.get_by_role('button', name='Aufgabe anlegen', exact=True).click()
        task_dialog = pa.get_by_role('dialog', name='Aufgabe im Projektraum')
        expect(task_dialog.get_by_role('heading', name='Regionale Suche skizzieren', exact=True)).to_be_visible()
        task_url = pa.url
        task_id = task_url.split('task=')[1].split('&')[0]
        mark('message-to-task-preserves-source')
        pb.goto(task_url)
        other_task = pb.get_by_role('dialog', name='Aufgabe im Projektraum')
        other_task.get_by_role('button', name='Ich übernehme', exact=True).click()
        expect(other_task.get_by_label('Aufgabenstatus')).to_have_value('doing')
        other_task.get_by_label('Kommentar zur Aufgabe').fill('Ich beginne mit der Skizze. Welche Regionen sind zuerst wichtig?')
        other_task.get_by_role('button', name='Kommentar senden', exact=True).click()
        expect(task_dialog.get_by_text('Ich beginne mit der Skizze. Welche Regionen sind zuerst wichtig?', exact=True)).to_be_visible(timeout=10000)
        expect(task_dialog.get_by_text('Markus Testkonto', exact=True).first).to_be_visible()
        mark('task-claim-comment-shared-with-second-person')
        task_dialog.get_by_role('button', name='Aufgabe schließen', exact=True).click()
        expect(pa.locator('.rw-message-task')).to_contain_text('Verknüpfte Aufgabe')
        message.get_by_role('button', name='Festhalten', exact=True).click()
        dialog = pa.get_by_role('dialog')
        dialog.get_by_label('Titel', exact=True).fill('Zuerst mobile Regionensuche')
        dialog.get_by_label('Inhalt', exact=True).fill('Wir beginnen mobil und nutzen bestehende Infrastruktur.')
        dialog.get_by_role('button', name='Im Raum festhalten', exact=True).click()
        pa.get_by_role('navigation', name='Bereiche des Projektraums').get_by_role('button', name='Wissen', exact=True).click()
        expect(pa.get_by_role('heading', name='Zuerst mobile Regionensuche', exact=True)).to_be_visible()
        mark('decision-stays-linked-to-project')
        pa.get_by_role('navigation', name='Bereiche des Projektraums').get_by_role('button', name='Raum', exact=True).click()
        draft = 'Noch nicht senden: mein lokaler Gedankenentwurf.'
        pa.get_by_label('Nachricht an den Projektraum').fill(draft)
        pa.get_by_role('navigation', name='Bereiche des Projektraums').get_by_role('button', name='Aufgaben', exact=False).click()
        pa.get_by_role('navigation', name='Bereiche des Projektraums').get_by_role('button', name='Raum', exact=True).click()
        expect(pa.get_by_label('Nachricht an den Projektraum')).to_have_value(draft)
        pa.reload()
        expect(pa.get_by_label('Nachricht an den Projektraum')).to_have_value(draft)
        mark('draft-survives-tab-change-and-reload')
        pa.get_by_label('Nachricht an den Projektraum').fill('')
        pa.get_by_role('navigation', name='Bereiche des Projektraums').get_by_role('button', name='Code & KI', exact=True).click()
        pa.get_by_role('button', name='GitHub-Repository vormerken', exact=True).click()
        dialog = pa.get_by_role('dialog')
        dialog.get_by_label('HTTPS-Adresse', exact=True).fill('https://github.com/example/room-fixture')
        dialog.get_by_role('button', name='Im Raum festhalten', exact=True).click()
        expect(pa.get_by_text('Repository vermerkt. Das ist noch kein Clone und keine GitHub-Zugriffsfreigabe.', exact=True)).to_be_visible()
        pa.get_by_role('button', name='Chat oder Ergebnis verlinken', exact=True).click()
        dialog = pa.get_by_role('dialog')
        dialog.get_by_label('Titel', exact=True).fill('Gemeinsame Konzeptnotiz')
        dialog.get_by_label('HTTPS-Adresse', exact=True).fill('https://example.invalid/concept')
        dialog.get_by_role('button', name='Im Raum festhalten', exact=True).click()
        mark('repository-reference-and-external-link-not-misreported-as-integration')
        pa.get_by_role('button', name='KI dazunehmen', exact=True).click()
        expect(pa.get_by_role('heading', name='Noch kein Modell für diesen Raum erreichbar', exact=True)).to_be_visible()
        mark('offline-model-does-not-block-planning')
        # A real authorized owner toggles sharing in the UI; the synthetic model
        # is reported by the fixture, no actual AI account is called.
        pb.goto(origin + '/?page=team')
        card = pb.locator('.rw-resource-grid article').filter(has_text='Markus · Testrechner')
        card.get_by_text('Mein Modell für das Team freigeben', exact=True).click()
        card.get_by_label('Marco Testkonto', exact=True).check()
        expect(card.get_by_label('Marco Testkonto', exact=True)).to_be_checked()
        pa.goto(origin + '/?room=klimafinder-fixture')
        pa.get_by_role('button', name='KI dazunehmen', exact=True).click()
        selector = pa.get_by_label('Modell und Ausführungsort')
        expect(selector).to_be_visible(timeout=12000)
        selector.select_option(settings['device'] + '::Fixture-Testmodell')
        pa.get_by_label('Deine Frage oder dein Auftrag').fill('Nenne die nächsten Schritte für unsere mobile Suche.')
        consent = pa.locator('.rw-assistant .rw-consent input')
        expect(consent).not_to_be_checked()
        expect(pa.get_by_role('button', name='Mit diesem Kontext starten')).to_be_disabled()
        consent.check()
        pa.get_by_role('button', name='Mit diesem Kontext starten').click()
        expect(pa.get_by_text('Wartet auf Rechner', exact=True)).to_be_visible(timeout=12000)
        run = a.request.get(origin + '/api/room?project=klimafinder-fixture').json()['runs'][0]
        # Exercise the existing runner authentication/lease/report API with a
        # transparent synthetic result instead of pretending to call a model.
        poll = a.request.post(origin + '/api/runner/poll', data={}, headers={'Authorization': 'Bearer ' + settings['access'], 'Content-Type': 'application/json'})
        assert poll.ok
        job = poll.json()['job']
        assert job['id'] == run['id']
        assert 'Klimafinder.ch' in job['payload']['prompt']
        result_text = 'SYNTHETISCHER TEST: Region wählen, Angebote vergleichen, Kontakt aufnehmen.'
        reported = a.request.post(origin + '/api/runner/report', data={'id': job['id'], 'lease': job['lease'], 'ok': True, 'result': {'provider': 'fixture', 'model': 'Fixture-Testmodell', 'output': result_text}}, headers={'Authorization': 'Bearer ' + settings['access'], 'Content-Type': 'application/json'})
        assert reported.ok
        expect(pa.locator('.rw-ai-run pre')).to_contain_text(result_text, timeout=12000)
        c, pc = login(browser, account_c, origin, {'width': 1280, 'height': 900})
        private_room = c.request.get(origin + '/api/room?project=klimafinder-fixture').json()
        assert len(private_room['runs']) == 0
        assert all(result_text not in m['body'] for m in private_room['messages'])
        mark('authorized-team-compute-job-with-project-context-and-private-output')
        pa.get_by_role('button', name='Antwort im Raum teilen', exact=True).click()
        expect(pa.locator('.rw-message.ai')).to_contain_text(result_text)
        pc.goto(origin + '/?room=klimafinder-fixture')
        expect(pc.locator('.rw-message.ai')).to_contain_text(result_text)
        mark('explicit-owner-share-returns-ai-result-to-room')
        pa.bring_to_front()
        pa.get_by_role('button', name='KI-Bereich schließen', exact=True).click()
        expect(pa.locator('.rw-assistant')).to_have_count(0, timeout=10000)
        pa.screenshot(path=str(output / '02-project-room-desktop.png'), full_page=True)
        # A full code path uses real Git worktrees and real Node test/build
        # commands on two disposable runner processes, never real workspaces.
        code_url = origin + '/?room=klimafinder-fixture&task=task-fixture-code'
        pa.goto(code_url)
        code_task = pa.get_by_role('dialog', name='Aufgabe im Projektraum')
        code_task.get_by_role('button', name='Bearbeiten', exact=True).click()
        git_check = code_task.get_by_role('button', name='Git jetzt prüfen', exact=True)
        expect(git_check).to_be_visible(timeout=25000)
        git_check.click()
        start_work = code_task.get_by_role('button', name='Bearbeitung starten', exact=True)
        expect(start_work).to_be_enabled(timeout=30000)
        start_work.click()
        expect(code_task.locator('#source-editor')).to_be_visible(timeout=40000)
        file_button = code_task.locator('.source-file-list').get_by_role('button', name='site/index.html', exact=True)
        expect(file_button).to_be_visible(timeout=30000)
        expect(file_button).to_be_enabled(timeout=30000)
        file_button.click()
        editor = code_task.get_by_label('Dateiinhalt', exact=True)
        expect(editor).to_be_visible(timeout=30000)
        expect(editor).to_be_enabled(timeout=30000)
        editor.fill('<!doctype html><html lang="de"><meta charset="utf-8"><title>R25 Test</title><h1>R25 gemeinsame Vorschau</h1></html>')
        expect(code_task.get_by_role('button', name='Tests starten', exact=True)).to_be_disabled()
        code_task.get_by_role('button', name='Speichern', exact=True).click()
        expect(code_task.locator('.source-notice')).to_contain_text('Auf deinem PC gespeichert', timeout=30000)
        pa.screenshot(path=str(output / '06-editor-desktop.png'), full_page=True)
        mark('real-git-copy-editor-save-and-unsaved-test-guard')
        code_task.get_by_role('button', name='Tests starten', exact=True).click()
        def wait_code_job(action):
            for attempt in range(100):
                items = a.request.get(origin + '/api/development').json()['jobs']
                matching = [j for j in items if j['project'] == 'klimafinder-fixture' and j['owner'] == account_a['id'] and j['action'] == action]
                if matching:
                    j = sorted(matching, key=lambda j: j['created'], reverse=True)[0]
                    if j['status'] == 'completed':
                        return j
                    assert j['status'] not in ('failed', 'cancelled', 'interrupted'), 'Code fixture job failed: ' + action
                pa.wait_for_timeout(400)
            raise AssertionError('Code job did not finish: ' + action)
        wait_code_job('check')
        mark('real-configured-node-test-completed')
        preview_button = code_task.get_by_role('group', name='Speichern, Ergebnis ansehen und prüfen').get_by_role('button', name='Vorschau erstellen', exact=True)
        expect(preview_button).to_be_enabled(timeout=15000)
        preview_button.click()
        wait_code_job('preview')
        code_task.get_by_role('button', name='Vorschau', exact=True).click()
        preview_link = code_task.get_by_role('link', name='Vorschau öffnen', exact=False).first
        expect(preview_link).to_be_visible(timeout=15000)
        with pa.expect_popup() as preview_info:
            preview_link.click()
        preview_page = preview_info.value
        expect(preview_page.get_by_role('heading', name='R25 gemeinsame Vorschau', exact=True)).to_be_visible()
        preview_page.close()
        mark('built-preview-served-on-isolated-preview-origin')
        code_task.get_by_role('button', name='Bearbeiten', exact=True).click()
        review_button = code_task.get_by_role('group', name='Speichern, Ergebnis ansehen und prüfen').get_by_role('button', name='Prüfstand erstellen', exact=True)
        expect(review_button).to_be_enabled(timeout=15000)
        review_button.click()
        review_job = wait_code_job('review')
        review_modal = pa.get_by_role('dialog', name='Entwicklungsergebnis')
        expect(review_modal).to_be_visible(timeout=15000)
        expect(review_modal.get_by_role('region', name='Änderungen im Code')).to_contain_text('R25 gemeinsame Vorschau')
        review_modal.get_by_role('button', name='Schließen', exact=True).click()
        mark('real-git-review-commit-and-diff-created')
        pb.goto(code_url)
        other_code_task = pb.get_by_role('dialog', name='Aufgabe im Projektraum')
        other_code_task.get_by_role('button', name='Ergebnis & Prüfung', exact=True).click()
        other_code_task.get_by_role('button', name='Prüfstand ansehen', exact=True).first.click()
        peer_review = pb.get_by_role('dialog', name='Entwicklungsergebnis')
        expect(peer_review).to_be_visible(timeout=15000)
        peer_review.get_by_label('Art der Codeprüfung').select_option('approved')
        peer_review.get_by_label('Rückmeldung zum Code').fill('Isolierter Test: Änderung und echte Tests geprüft.')
        peer_review.get_by_role('button', name='Rückmeldung speichern', exact=True).click()
        expect(peer_review.get_by_text('Von zweiter Person freigegeben · nur dieser Prüfstand', exact=True)).to_be_visible(timeout=15000)
        peer_review.get_by_role('button', name='Schließen', exact=True).click()
        assert a.request.get(origin + '/api/development/reviews?job=' + review_job['id']).json()['state'] == 'approved'
        mark('independent-second-person-review-in-the-same-task')
        pa.goto(origin + '/?room=klimafinder-fixture&tab=results')
        expect(pa.locator('.rw-result-card')).to_be_visible(timeout=15000)
        expect(pa.locator('.rw-result-card').get_by_text('Review: Freigegeben', exact=True)).to_be_visible()
        expect(pa.locator('.rw-result-card').get_by_text('Git: Nicht veröffentlicht', exact=True)).to_be_visible()
        pa.screenshot(path=str(output / '05-code-result-desktop.png'), full_page=True)
        mark('result-gates-distinguish-tested-reviewed-and-not-published')
        mobile, pm = login(browser, account_a, origin, {'width': 390, 'height': 844})
        pm.goto(origin + '/?room=klimafinder-fixture')
        expect(pm.get_by_role('heading', name='Klimafinder.ch', exact=True)).to_be_visible()
        assert pm.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
        pm.screenshot(path=str(output / '03-project-room-mobile.png'), full_page=True)
        pm.get_by_role('button', name='Menü öffnen', exact=True).click()
        expect(pm.locator('.rw-sidebar')).to_be_visible()
        pm.get_by_role('button', name='Menü schließen', exact=True).click()
        pm.get_by_role('button', name='Neue Aufgabe', exact=True).click()
        dialog = pm.get_by_role('dialog')
        dialog.get_by_label('Titel', exact=True).fill('Vom Handy geplant')
        dialog.get_by_label('Gewünschtes Ergebnis', exact=True).fill('Ohne Rechnerpfad eine klare Aufgabe anlegen.')
        dialog.get_by_role('button', name='Aufgabe anlegen', exact=True).click()
        expect(pm.get_by_role('dialog', name='Aufgabe im Projektraum').get_by_role('heading', name='Vom Handy geplant', exact=True)).to_be_visible()
        assert pm.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
        comment_box = pm.get_by_label('Kommentar zur Aufgabe').bounding_box()
        assert comment_box and comment_box['width'] > 320, 'Mobile comment composer must fill the task view'
        pm.screenshot(path=str(output / '04-task-mobile.png'), full_page=True)
        mark('mobile-navigation-task-creation-and-no-horizontal-overflow')
        pm.get_by_role('dialog', name='Aufgabe im Projektraum').get_by_role('button', name='Bearbeiten', exact=True).click()
        pm.reload()
        expect(pm.get_by_role('dialog', name='Aufgabe im Projektraum').get_by_role('button', name='Bearbeiten', exact=True)).to_have_class('active')
        mark('task-pane-restored-after-mobile-reload')
        pa.goto(origin + '/?view=task&project=klimafinder-fixture&task=task-fixture-code')
        expect(pa.get_by_role('dialog', name='Aufgabe im Projektraum')).to_be_visible()
        assert pa.locator('.rw-shell').count() == 1
        mark('existing-deep-link-opens-same-new-room')
        assert not browser_errors, 'Uncaught browser error(s): ' + '; '.join(browser_errors)
        mark('no-uncaught-browser-errors')
        browser.close()
    (output / 'result.json').write_text(json.dumps({'status':'PASS','checks':checks,'checksPassed':len(checks),'browser':'Google Chrome / Playwright','desktop':[1440,1000],'mobile':[390,844],'realProviderInference':False,'syntheticRunnerResult':True,'productionChanged':False,'releaseSource':args.expected_sha}, indent=2))
    print('R25_ROOM_BROWSER=PASS checks=' + str(len(checks)), flush=True)
except Exception as exc:
    try:
        if 'pa' in globals() and not pa.is_closed() and pa.locator('.rw-shell').count():
            pa.screenshot(path=str(output / 'failure.png'), full_page=True)
            (output / 'failure-ui.txt').write_text(pa.locator('body').inner_text())
    except Exception:
        pass
    (output / 'result.json').write_text(json.dumps({'status':'FAIL','checks':checks,'checksPassed':len(checks),'error':str(exc),'productionChanged':False}, indent=2))
    raise
finally:
    if child is not None:
        child.terminate()
        try:
            child.wait(timeout=6)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait(timeout=3)
    if fixture_dir is not None and fixture_dir.name.startswith('schmaqq-r25-browser-'):
        shutil.rmtree(fixture_dir)
