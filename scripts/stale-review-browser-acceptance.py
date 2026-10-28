"""Visible local regression using the separately installed SCHMAQQ QA harness.

Run with Python/Playwright and --qa-root PATH_TO_SCHMAQQ-QA-LOCAL-01.
Uses a copied fixture against this checkout's freshly built studio-dist. The
pinned QA candidate, personal profiles and original reports are not modified.
All runner Git transport is local file-only; no model or provider calls.
"""
import argparse,contextlib,datetime,hashlib,html,json,os,socket,sys,time,traceback
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--qa-root',type=Path,required=True)
    args=parser.parse_args()
    sys.path.insert(0,str(args.qa_root.resolve()))
    import qa,codeflow
    from playwright.sync_api import expect
    started=time.monotonic()
    out=ROOT/'.studio/stale-review'/datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    out.mkdir(parents=True)
    checks=[]
    def check(name,**proof):
        checks.append({'name':name,'status':'PASS',**proof})
        qa.write_json(out/'regressions.json',checks)
    class RegressionFlow(codeflow.CodeFlow):
        def assert_stale(self,reason):
            self.bp.reload()
            panel=self.d(self.bp)
            expect(panel.get_by_role('button',name='Freigegebenen Stand zusammenführen',exact=True)).to_be_disabled(timeout=20000)
            expect(panel.get_by_role('button',name='Diese Fassung freigeben',exact=True)).to_be_disabled()
            expect(panel.get_by_role('button',name='Neue Fassung zur Prüfung teilen',exact=True)).to_have_count(0)
            expect(panel.get_by_text('Marco Testkonto muss die neue Fassung zur Prüfung teilen.',exact=False)).to_be_visible()
            panel.get_by_role('button',name='Freigegebenen Stand zusammenführen',exact=True).scroll_into_view_if_needed()
            self.q.capture(self.bp,'Regression-Pruefer-'+reason)
            self.pane('Ergebnis & Prüfung')
            expect(self.d().get_by_role('button',name='Neue Fassung zur Prüfung teilen',exact=True)).to_be_enabled(timeout=20000)
            expect(self.d().get_by_role('button',name='Freigegebenen Stand zusammenführen',exact=True)).to_be_disabled()
            self.d().get_by_role('button',name='Neue Fassung zur Prüfung teilen',exact=True).scroll_into_view_if_needed()
            self.q.capture(self.page,'Regression-Autor-'+reason)
            check(reason+'-author-and-peer-blocked')
        def review(self):
            super().review()
            # Actual contract change without a later file change. The completion
            # API reports its separate revision binding; no fabricated stale flag.
            detail=self.detail();task=detail['task'];contract=task['contract']
            response=self.q.context.request.post(self.origin+'/api/team',headers={'Origin':self.origin},data={
                'action':'contract','task':task['id'],'revision':contract['revision'],
                'kind':'code','criteria':contract['criteria']+'\nAuch die neue Abschlussbedingung prüfen.',
                'requiresReview':True,'title':task['title'],'description':task['description'],
                'briefRevision':detail['brief']['revision']})
            assert response.status==200,response.text()
            changed=self.detail()['task'];result=changed['completion']['result']
            assert result['changedAfter'] is False
            assert result['contractRevision']!=changed['contract']['revision']
            self.assert_stale('Abschlussbedingungen')
            check('changed-contract-without-file-write',review=self.first['id'])
        def stale(self):
            super().stale()
            assert self.detail()['task']['completion']['result']['changedAfter'] is True
            self.assert_stale('Dateiaenderung')
            # An unsaved draft prevents the newly offered submit action, including
            # when the user switches from the editor to the review pane.
            content=self.open_file('site/index.html');saved=content.input_value()
            before={j['id'] for j in self.jobs(self.q.context) if j['action'] in ('submit','integrate')}
            content.fill(saved+'\n<!-- ungespeicherter Entwurf -->')
            self.pane('Ergebnis & Prüfung')
            expect(self.d().get_by_role('button',name='Neue Fassung zur Prüfung teilen',exact=True)).to_be_disabled()
            self.d().get_by_role('button',name='Neue Fassung zur Prüfung teilen',exact=True).scroll_into_view_if_needed()
            self.q.capture(self.page,'Regression-Ungespeicherter-Entwurf')
            self.pane('Bearbeitung');self.d().get_by_label('Dateiinhalt',exact=True).fill(saved)
            self.pane('Ergebnis & Prüfung')
            expect(self.d().get_by_role('button',name='Neue Fassung zur Prüfung teilen',exact=True)).to_be_enabled()
            assert {j['id'] for j in self.jobs(self.q.context) if j['action'] in ('submit','integrate')}==before
            check('dirty-draft-blocks-new-submit-without-queueing')
            for width,height in [(390,844),(1440,900)]:
                self.page.set_viewport_size({'width':width,'height':height})
                self.d().get_by_role('button',name='Neue Fassung zur Prüfung teilen',exact=True).scroll_into_view_if_needed()
                self.q.capture(self.page,'Regression-Neue-Fassung-'+str(width))
                assert not self.page.evaluate('document.documentElement.scrollWidth>innerWidth+2')
            check('new-action-visible-desktop-and-mobile')
            # Explicitly select the old review. Resubmitting must select the NEW
            # review even when a previous selection is stored in React state.
            self.d().locator('label').filter(has_text='Prüfstand').locator('select').select_option(self.first['id'])
        def run_job(self,operation,button,expected='completed',context=None,page=None):
            resubmitting=operation=='submit' and self.first is not None
            if resubmitting:
                self.pane('Ergebnis & Prüfung')
                button=self.d().get_by_role('button',name='Neue Fassung zur Prüfung teilen',exact=True)
                expect(button).to_be_enabled()
            final=super().run_job(operation,button,expected,context,page)
            if resubmitting:
                expect(self.d().locator('label').filter(has_text='Prüfstand').locator('select')).to_have_value(final['id'],timeout=20000)
                expect(self.d().get_by_role('button',name='Neue Fassung zur Prüfung teilen',exact=True)).to_have_count(0)
                check('new-action-submits-and-selects-new-review',review=final['id'])
            return final
        def integrate(self):
            super().integrate()
            check('new-independent-approval-and-confirmed-local-merge',review=self.second['id'])
    # Use the existing 21-group suite including its real negative cases. Only
    # extend the browser assertions; preserve the normal QA installation.
    codeflow.CodeFlow=RegressionFlow
    fixture_source=(args.qa_root/'fixture.mjs').read_text(encoding='utf-8')
    root_line="const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'candidate');"
    assert fixture_source.count(root_line)==1,'Unexpected QA fixture version'
    fixture_source=fixture_source.replace(root_line,'const root='+json.dumps(ROOT.as_posix())+';')
    fixture_path=out/'fixture.mjs';fixture_path.write_text(fixture_source,encoding='utf-8')
    qa.write_json(out/'source.json',{
        'checkout':str(ROOT),'fixture_adapter':'Only root redirected to this checkout; original fixture retained',
        'qa_harness':str(args.qa_root),'ai':False,'externalGitWrites':False,
        'files':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in ['studio/team-task.tsx','studio/room-model.ts','scripts/stale-review-browser-acceptance.py']},
        'fixture_sha256':hashlib.sha256(fixture_path.read_bytes()).hexdigest()})
    fixture=None;runner=None;summary={}
    try:
        assert (ROOT/'studio-dist/index.html').exists(),'Build this checkout first'
        for port in [47840,47841]:
            with socket.socket() as probe:probe.bind(('127.0.0.1',port))
        env=qa.clean_env();env.update(QA_DATA_DIR=str(out/'data'),R25_FIXTURE_PORT='47840')
        for key in ['R25_FIXTURE_RELEASE','R25_FIXTURE_SOURCE']:env.pop(key,None)
        with (out/'fixture.log').open('w',encoding='utf-8') as log,(out/'fixture.stderr.log').open('w',encoding='utf-8') as error:
            fixture=qa.popen_owned([str(qa.NODE),str(fixture_path)],cwd=ROOT,env=env,stdout=log,stderr=error,creationflags=qa.FLAGS)
            cfgfile=out/'data/fixture.private.json'
            for _ in range(100):
                if fixture.poll() is not None:raise RuntimeError('Fixture exited; see fixture.stderr.log')
                if cfgfile.exists() and (out/'fixture.log').stat().st_size:break
                time.sleep(.2)
            else:raise TimeoutError('Fixture startup timeout')
            cfg=json.loads(cfgfile.read_text(encoding='utf-8'));runner=qa.BrowserQA(out)
            browser=runner.run(cfg)
            summary={'browser':browser,'status':qa.evaluate_gate(browser,{}),'regressions':checks}
            assert summary['status']=='PASS',str([(c['id'],c['status']) for c in browser['checks'] if c['status']!='PASS'])
            assert len(checks)==7,checks
    except Exception:
        summary.update(status='FAIL',error=traceback.format_exc(),regressions=checks)
        if runner:summary['browser']=runner.result()
    finally:
        qa.kill_owned(fixture)
        summary.update(elapsedSeconds=round(time.monotonic()-started,2),ownFixtureStopped=fixture is None or fixture.poll() is not None)
        qa.write_json(out/'summary.json',summary)
        qa.write_json(ROOT/'.studio/stale-review/latest.json',{'directory':str(out),'status':summary.get('status')})
        shots=summary.get('browser',{}).get('screenshots',[])
        body='<meta charset="utf-8"><title>Veraltete Freigabe – Browserabnahme</title><h1>Browserabnahme: '+html.escape(summary.get('status','FAIL'))+'</h1><p>21 Prüfgruppen plus gezielte UI-Regressionsprüfungen; synthetische Konten und lokale Datei-Repositories.</p><p><a href="summary.json">Originalergebnis</a> · <a href="codeflow.json">Jobs und Commit-Belege</a> · <a href="regressions.json">Gezielte UI-Prüfungen</a></p>'
        for shot in shots:body+='<figure><figcaption>'+html.escape(shot)+'</figcaption><a href="'+html.escape(shot)+'"><img style="max-width:95vw" src="'+html.escape(shot)+'"></a></figure>'
        (out/'report.html').write_text(body,encoding='utf-8')
    print(json.dumps({'status':summary.get('status'),'directory':str(out),'regressions':len(checks)}))
    return 0 if summary.get('status')=='PASS' else 1

if __name__=='__main__':raise SystemExit(main())
