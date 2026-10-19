#!/usr/bin/env python3
"""Isolated Chromium/Playwright regression for confirmed Studio R23 UI findings.

Prerequisites: Python Playwright + Chrome, Node 24, built Studio and local demo at
http://127.0.0.1:4320 (run: node selfhost/demo.mjs). Never target production.
Credentials are read from the ignored, locally generated demo fixture.
"""
from __future__ import annotations
import json
import pathlib
import sys
import traceback
from playwright.sync_api import sync_playwright, expect

ROOT = pathlib.Path(__file__).resolve().parents[1]
ORIGIN = "http://127.0.0.1:4320"
OUT = ROOT / ".studio" / "r23-browser-evidence"
OUT.mkdir(parents=True, exist_ok=True)
checks: dict[str, dict] = {}


def verify(label, fn, page):
    try:
        fn()
        checks[label] = {"status": "PASS"}
        print("PASS", label, flush=True)
    except Exception as error:
        checks[label] = {"status": "FAIL", "error": str(error)[:550]}
        try:
            page.screenshot(path=str(OUT / ("fail-" + label + ".png")))
        except Exception:
            pass
        print("FAIL", label, type(error).__name__, str(error)[:350], flush=True)


def main():
    account = next(
        a for a in json.loads((ROOT / ".studio/local-demo/demo.private.json").read_text())["accounts"]
        if a["name"] == "Marco"
    )
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True, executable_path="/usr/bin/google-chrome",
            args=["--no-sandbox", "--disable-dev-shm-usage"]
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            locale="de-DE", ignore_https_errors=False
        )
        page = context.new_page()
        page.set_default_timeout(7000)
        page.goto(ORIGIN + "/", wait_until="domcontentloaded")
        page.get_by_label("E-Mail").fill(account["email"])
        page.get_by_label("Passwort", exact=True).fill(account["password"])
        page.get_by_role("button", name="Studio öffnen").click()
        nav = page.locator("aside.sidebar nav")
        nav.get_by_role("button", name="Projekte").wait_for()
        assert page.url.startswith(ORIGIN)
        print("AUTHENTICATED_LOCAL_DEMO=PASS", flush=True)

        def search():
            nav.get_by_role("button", name="Projekte").click()
            field = page.get_by_role("textbox", name="Projekte suchen")
            field.fill("QA-NO-MATCH-R23")
            expect(page.get_by_role("heading", name="Keine Projekte gefunden.")).to_be_visible()
            expect(page.get_by_role("button", name="Suche zurücksetzen")).to_be_visible()
            assert page.locator(".project-grid .project-card").count() == 0
            page.get_by_role("button", name="Suche zurücksetzen").click()
            expect(field).to_have_value("")
            assert page.locator(".project-grid .project-card").count() >= 1
            page.screenshot(path=str(OUT / "b05-search.png"))

        verify("B05-search", search, page)

        def modal():
            nav.get_by_role("button", name="Projekte").click()
            opener = page.locator(".toolbar").get_by_role("button", name="Neues Projekt")
            opener.click()
            dialog = page.get_by_role("dialog")
            expect(dialog).to_be_visible()
            assert page.evaluate("Boolean(document.activeElement.closest('[role=dialog]'))")
            for step in ("Tab", "Shift+Tab", "Tab", "Tab"):
                page.keyboard.press(step)
                assert page.evaluate("Boolean(document.activeElement.closest('[role=dialog]'))"), step
            assert page.locator("main").get_attribute("inert") is not None
            page.screenshot(path=str(OUT / "b02-focus.png"))
            page.keyboard.press("Escape")
            expect(dialog).to_have_count(0)
            assert opener.evaluate("(el) => document.activeElement === el"), "opener focus was not restored"

        verify("B02-project-dialog", modal, page)

        def history():
            nav.get_by_role("button", name="Entwicklung").click()
            expect(page).to_have_url(ORIGIN + "/?view=development")
            nav.get_by_role("button", name="Projekte").click()
            expect(page).to_have_url(ORIGIN + "/?view=projects")
            nav.get_by_role("button", name="Team & Zugänge").click()
            expect(page).to_have_url(ORIGIN + "/?view=team")
            page.go_back(wait_until="domcontentloaded")
            expect(page).to_have_url(ORIGIN + "/?view=projects")
            expect(page.get_by_role("heading", name="Unsere Projekte")).to_be_visible()
            page.go_back(wait_until="domcontentloaded")
            expect(page).to_have_url(ORIGIN + "/?view=development")
            page.go_forward(wait_until="domcontentloaded")
            expect(page).to_have_url(ORIGIN + "/?view=projects")
            assert "about:blank" not in page.url
            page.screenshot(path=str(OUT / "b01-history.png"))

        verify("B01-back-forward", history, page)

        def mobile():
            page.set_viewport_size({"width": 390, "height": 844})
            toggle = page.locator("button.mobile-toggle")
            expect(toggle).to_be_visible()
            expect(toggle).to_have_attribute("aria-expanded", "false")
            assert toggle.get_attribute("aria-controls") == "studio-sidebar"
            toggle.click()
            expect(toggle).to_have_attribute("aria-expanded", "true")
            assert page.evaluate("document.activeElement.closest('aside.sidebar') !== null")
            page.keyboard.press("Escape")
            expect(toggle).to_have_attribute("aria-expanded", "false")
            assert toggle.evaluate("(el) => document.activeElement === el"), "Escape did not return focus"
            assert page.locator("aside.sidebar").evaluate("(el)=> getComputedStyle(el).visibility") == "hidden"
            page.screenshot(path=str(OUT / "b04-mobile.png"))
            page.set_viewport_size({"width": 1440, "height": 900})

        verify("B04-mobile-navigation", mobile, page)

        pending = []
        fake = {
            "id": "r23-review-fixture", "project": "website",
            "owner": "r23-fixture-owner", "device": "r23-fixture-device",
            "action": "review", "status": "completed", "created": 1792430000000,
            "payload": {"worktree": "r23-fixture-worktree"},
            "result": {"commit": "a"*40, "branch": "studio/r23-fixture"}
        }
        detailed = dict(fake)
        detailed["result"] = {
            "commit": "a"*40, "branch": "studio/r23-fixture",
            "workflow": "pull-request", "published": False,
            "checks": "2 / 2 Prüfungen bestanden",
            "diff": "diff --git a/qa.md b/qa.md\\n--- a/qa.md\\n+++ b/qa.md\\n@@ -0,0 +1 @@\\n+R23 test"
        }

        def list_handler(route):
            response = route.fetch()
            data = response.json()
            if isinstance(data.get("jobs"), list):
                data["jobs"].append(fake)
            route.fulfill(json=data)

        def detail_handler(route):
            if "r23-review-fixture" in route.request.url:
                pending.append(route)  # intentionally delay: assert transitional DOM
            else:
                route.continue_()

        page.route("**/api/development", list_handler)
        page.route("**/api/development/job?*", detail_handler)
        page.route("**/api/development/reviews?*", lambda route: route.fulfill(json={"state": "pending", "entries": []}))
        pr_mock = {"state": "local_only", "commit": "a"*40, "branch": "studio/r23-fixture", "mergeReady": False}
        pr_http = {"status": 200}
        pr_calls = []

        def github_pr_handler(route):
            pr_calls.append(route.request.url)
            if pr_http["status"] != 200:
                route.fulfill(status=pr_http["status"], json={"error": "Simulated provider problem"})
            else:
                route.fulfill(json=dict(pr_mock))

        page.route("**/api/development/github-pr?*", github_pr_handler)
        page.route("**/api/development/events?*", lambda route: route.fulfill(json={"events": []}))

        def review():
            nav.get_by_role("button", name="Entwicklung").click()
            submission = page.locator("#team-review .submission").filter(has_text="studio/r23-fixture")
            expect(submission).to_be_visible(timeout=12000)
            submission.get_by_role("button", name="Ansehen").click()
            dialog = page.get_by_role("dialog", name="Entwicklungsergebnis")
            expect(dialog).to_be_visible()
            expect(dialog.get_by_text("Prüfstand wird geladen")).to_be_visible()
            assert len(pending) >= 1
            assert dialog.get_by_text("Kein Testergebnis verfügbar.").count() == 0
            assert dialog.get_by_text("Die Änderung ist zu groß", exact=False).count() == 0
            assert dialog.get_by_text("Keine Codeänderungen gegenüber", exact=False).count() == 0
            page.screenshot(path=str(OUT / "b03-loading.png"))
            pending.pop(0).fulfill(json={"job": detailed})
            expect(dialog.get_by_text("2 / 2 Prüfungen bestanden")).to_be_visible(timeout=10000)
            assert dialog.locator(".review-diff").get_by_text("+R23 test").is_visible()
            assert dialog.get_by_text("Die Änderung ist zu groß", exact=False).count() == 0
            expect(dialog.get_by_role("heading", name="GitHub-Übergang · nur lesend")).to_be_visible()
            expect(dialog.get_by_text("Dieser Prüfstand ist lokal. Es wurde kein GitHub-PR verifiziert.")).to_be_visible()
            page.screenshot(path=str(OUT / "b03-loaded.png"))

        verify("B03-review-loading", review, page)

        def github_status():
            section = page.locator("section.github-pr-status")
            refresh = section.get_by_role("button", name="GitHub-Status erneut prüfen")
            expect(refresh).to_be_enabled()
            expect(section.get_by_text("Letzter Prüfversuch:", exact=False)).to_be_visible()
            valid = {"repository": "Spezzo-sudo/schmaqq-studio-pilot",
                     "branch": "studio/r23-fixture", "commit": "a"*40,
                     "headCommit": "a"*40, "expectedBase": "main",
                     "actualBase": "main", "number": 42,
                     "url": "https://github.com/Spezzo-sudo/schmaqq-studio-pilot/pull/42",
                     "mergeReady": False, "ci": "not_verified", "reviews": "not_verified"}
            pr_mock.update(valid)
            pr_mock["state"] = "matched"
            refresh.click()
            expect(section.get_by_text("GitHub-PR und lokaler Prüfcommit stimmen überein.")).to_be_visible()
            expect(section.get_by_role("link", name="PR #42 in GitHub öffnen")).to_be_visible()

            # Force push: previous matched result must disappear during refresh.
            pr_mock.update({"state": "stale_commit", "headCommit": "b"*40})
            refresh.click()
            expect(section.get_by_text("Der PR verweist auf einen anderen Commit.", exact=False)).to_be_visible()
            expect(section.get_by_text("Erwarteter Commit:", exact=False)).to_be_visible()
            assert section.get_by_text("GitHub-PR und lokaler Prüfcommit stimmen überein.").count() == 0

            pr_mock.update({"state": "target_mismatch", "headCommit": "a"*40,
                            "actualBase": "experimental"})
            refresh.click()
            expect(section.get_by_text("Der PR zielt auf einen anderen Branch", exact=False)).to_be_visible()
            expect(section.get_by_text("Erwarteter Zielbranch:", exact=False)).to_be_visible()

            pr_mock["state"] = "unsupported_fork"
            refresh.click()
            expect(section.get_by_text("Dieser PR verwendet einen Fork.", exact=False)).to_be_visible()

            pr_mock["state"] = "listing_incomplete"
            refresh.click()
            expect(section.get_by_text("Die GitHub-PR-Liste ist unvollständig.", exact=False)).to_be_visible()

            pr_http["status"] = 503
            refresh.click()
            expect(section.get_by_text("GitHub-PR-Zustand konnte nicht geprüft werden.")).to_be_visible()
            assert section.get_by_text("GitHub-PR und lokaler Prüfcommit stimmen überein.").count() == 0
            pr_http["status"] = 200

            # Visibility changes cause another check, not an indefinitely cached status.
            pr_mock["state"] = "matched"
            previous = len(pr_calls)
            page.evaluate("document.dispatchEvent(new Event('visibilitychange'))")
            expect(section.get_by_text("GitHub-PR und lokaler Prüfcommit stimmen überein.")).to_be_visible()
            assert len(pr_calls) > previous
            assert len(pr_calls) >= 8
            page.screenshot(path=str(OUT / "r23-github-status-refresh.png"))

        verify("R23-github-status-ui", github_status, page)
        context.close()
        browser.close()

    output = {"suite": "R23 Playwright isolated demo", "origin": ORIGIN,
              "results": checks, "pass": sum(c["status"] == "PASS" for c in checks.values()),
              "fail": sum(c["status"] == "FAIL" for c in checks.values())}
    (OUT / "results.json").write_text(json.dumps(output, indent=2) + "\n")
    print("RESULTS", output["pass"], "PASS", output["fail"], "FAIL", flush=True)
    return 0 if output["fail"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
