#!/usr/bin/env python3
"""R24-RC1: isolated real Chromium UI acceptance against an immutable release.

No connected providers, external runner, real user, Production URL, DB, or Git remote.
No persistent external state: all synthetic data stays under a private temp path.
Requires: pip playwright and a locally installed Chromium.
"""
import argparse
from contextlib import closing
import json
import os
import pathlib
import shutil
import socket
import sqlite3
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

from r24_browser_runtime import resolve_node, start_server, stop_server, protect_temp

def require(predicate, title):
    if not predicate:
        raise AssertionError(title)

def free_port():
    with socket.socket() as handle:
        handle.bind(("127.0.0.1", 0))
        return handle.getsockname()[1]

def request(base, route, payload=None):
    headers = {}
    data = None
    if payload is not None:
        headers.update({"Content-Type": "application/json", "Origin": base})
        data = json.dumps(payload).encode("utf-8")
    call = urllib.request.Request(base + route, data=data, headers=headers)
    try:
        with urllib.request.urlopen(call, timeout=3) as response:
            body = response.read(100000)
            return response.status, json.loads(body.decode("utf-8")) if body else {}
    except urllib.error.HTTPError as error:
        error.read(2048)
        return error.code, {}

def table_value(db_path, query, params=()):
    with closing(sqlite3.connect(db_path.resolve().as_uri() + "?mode=ro", uri=True)) as db:
        return db.execute(query, params).fetchone()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--release-dir", required=True)
    parser.add_argument("--expected-sha", required=True)
    parser.add_argument("--node", help="Explicit absolute Node executable (required on Windows)")
    parser.add_argument("--browser-channel", choices=["chrome", "msedge"])
    args = parser.parse_args()
    release = pathlib.Path(args.release_dir).resolve(strict=True)
    require(release.is_dir(), "release_dir_invalid")
    require((release / "release-manifest.json").is_file(), "release_manifest_missing")
    attestation = json.loads((release / "release-source.json").read_text(encoding="utf-8"))
    require(attestation["sourceCommit"] == args.expected_sha, "release_source_sha_mismatch")
    require(len(args.expected_sha) == 40, "source_sha_invalid")

    node = resolve_node(args.node)
    from playwright.sync_api import sync_playwright
    data_dir = pathlib.Path(tempfile.mkdtemp(prefix="schmaqq-rc1-ui-"))
    child = None
    results = []
    errors = []
    try:
        protect_temp(node, data_dir)
        app_port, preview_port = free_port(), free_port()
        require(app_port != preview_port, "test_ports_collision")
        origin = f"http://127.0.0.1:{app_port}"

        env = {name: value for name, value in os.environ.items()
               if not (name.upper().startswith(("STUDIO_", "GITHUB_", "OPENAI_", "GH_"))
                       or name.upper() in ("NODE_OPTIONS", "NODE_PATH", "HTTP_PROXY",
                                   "HTTPS_PROXY", "ALL_PROXY", "NODE_EXTRA_CA_CERTS"))}
        env.update({
            "STUDIO_DATA_DIR": str(data_dir),
            "STUDIO_ORIGIN": origin,
            "STUDIO_PREVIEW_ORIGIN": f"http://127.0.0.1:{preview_port}",
            "STUDIO_BIND": "127.0.0.1",
            "PORT": str(app_port),
            "STUDIO_PREVIEW_PORT": str(preview_port),
            "NODE_ENV": "production",
            "STUDIO_TRUSTED_PROXY_IPS": "",
        })
        child = start_server(node, release, env)
        started = time.monotonic()
        ready = False
        while time.monotonic() - started < 15:
            if child.poll() is not None:
                raise AssertionError("isolated_studio_process_exited_before_ready")
            try:
                ready = request(origin, "/healthz")[0] == 200
            except (OSError, TimeoutError):
                pass
            if ready:
                break
            time.sleep(0.12)
        require(ready, "isolated_studio_not_ready")
        def mark(code, condition):
            require(condition, code)
            results.append(code)

        mark("01-health-and-unauthenticated-401",
             request(origin, "/api/auth/session")[0] == 401
             and request(origin, "/healthz")[0] == 200)

        setup_path = data_dir / "setup-link.txt"
        require(setup_path.is_file(), "isolated_bootstrap_not_created")
        setup = urllib.parse.parse_qs(urllib.parse.urlparse(
            setup_path.read_text()).query).get("setup", [""])[0]
        require(bool(setup), "isolated_setup_token_missing")
        email, password = "rc1-owner@fixture.invalid", "RC1-local-only-password-2026"
        status, _ = request(origin, "/api/auth/bootstrap", {
            "setup": setup, "name": "RC1 Fixture Owner",
            "email": email, "password": password
        })
        require(status == 200, "isolated_bootstrap_failed")
        # Login is tested visibly, not via an injected cookie.
        with sync_playwright() as playwright:
            launch = {"headless": True}
            if args.browser_channel:
                launch["channel"] = args.browser_channel
            else:
                chromium = (shutil.which('google-chrome') or
                            shutil.which('chromium-browser') or
                            playwright.chromium.executable_path)
                require(pathlib.Path(chromium).is_file(), 'chromium_binary_missing')
                launch["executable_path"] = chromium
            browser = playwright.chromium.launch(**launch)
            try:
                context = browser.new_context(viewport={"width": 1440, "height": 900})
                page = context.new_page()
                page.on("pageerror", lambda exc: errors.append(str(exc)))
                page.goto(origin, wait_until="domcontentloaded")
                page.get_by_label("E-Mail").fill(email)
                page.get_by_label("Passwort", exact=True).fill(password)
                page.get_by_role("button", name="Studio öffnen").click()
                page.locator(".workspace").wait_for(timeout=10000)
                mark("02-visible-password-login", True)
                page.reload(wait_until="domcontentloaded")
                page.locator(".workspace").wait_for(timeout=10000)
                mark("03-session-reload", True)

                def navigate(name):
                    page.locator("#studio-sidebar nav button").filter(
                        has_text=name).click()
                navigate("Team & Zugänge")
                page.get_by_role("heading", name="Unser Team").wait_for()
                mark("04-one-real-fixture-member",
                     page.locator(".team-grid .member-card:not(.invite-card)").count() == 1)
                navigate("Projekte")
                search = page.get_by_label("Projekte suchen")
                search.fill("never-exists-rc1-711")
                page.get_by_role("heading", name="Keine Projekte gefunden.").wait_for()
                mark("05-project-search-empty", True)
                page.get_by_role("button", name="Suche zurücksetzen").click()
                mark("06-project-search-reset",
                     page.locator(".project-grid .project-card").count() > 0)

                navigate("Aufgaben")
                page.get_by_role("button", name="Aufgabe", exact=True).click()
                dialog = page.get_by_role("dialog")
                dialog.locator('input[name="title"]').fill("RC1 browser acceptance task")
                dialog.locator('textarea[name="description"]').fill("Synthetic QA only")
                dialog.get_by_role("button", name="Gemeinsam weiter").click()
                dialog.wait_for(state="hidden")
                mark("07-ui-task-persistent",
                     table_value(data_dir / "studio.sqlite",
                         "SELECT COUNT(*) FROM tasks WHERE title=?",
                         ("RC1 browser acceptance task",))[0] == 1)
                mark("08-task-visible-in-board",
                     page.get_by_text("RC1 browser acceptance task").count() >= 1)

                navigate("Team-Chat")
                page.get_by_role("textbox", name="Nachricht", exact=True).fill("RC1 synthetic collaboration message")
                page.get_by_role("button", name="Nachricht senden").click()
                page.get_by_text("RC1 synthetic collaboration message").wait_for()
                mark("09-team-chat-persistent",
                     table_value(data_dir / "studio.sqlite",
                         "SELECT COUNT(*) FROM messages WHERE body=?",
                         ("RC1 synthetic collaboration message",))[0] == 1)

                navigate("Wissen")
                page.get_by_role("button", name="Dokument", exact=True).click()
                dialog = page.get_by_role("dialog")
                dialog.locator('input[name="title"]').fill("RC1 test note")
                dialog.locator('textarea[name="body"]').fill("Synthetic original note")
                dialog.get_by_role("button", name="Gemeinsam weiter").click()
                dialog.wait_for(state="hidden")
                mark("10-ui-document-persistent",
                     table_value(data_dir / "studio.sqlite",
                         "SELECT COUNT(*) FROM documents WHERE title=?",
                         ("RC1 test note",))[0] == 1)
                page.locator(".document-card").filter(has_text="RC1 test note").click()
                dialog = page.get_by_role("dialog")
                dialog.locator('textarea[name="body"]').fill("Synthetic revised note")
                dialog.get_by_role("button", name="Gemeinsam weiter").click()
                dialog.wait_for(state="hidden")
                mark("11-document-edit-revision",
                     table_value(data_dir / "studio.sqlite",
                         "SELECT body,revision FROM documents WHERE title=?",
                         ("RC1 test note",)) == ("Synthetic revised note", 2))
                page.reload(wait_until="domcontentloaded")
                page.get_by_text("Synthetic revised note").wait_for()
                mark("12-document-survives-page-reload", True)

                navigate("Projekte")
                project_before = table_value(data_dir / "studio.sqlite",
                    "SELECT COUNT(*) FROM projects")[0]
                page.get_by_role("button", name="Neues Projekt", exact=True).click()
                page.get_by_role("dialog").wait_for()
                page.get_by_role("button", name="Schließen").click()
                mark("13-project-wizard-no-unintended-side-effect",
                     table_value(data_dir / "studio.sqlite",
                         "SELECT COUNT(*) FROM projects")[0] == project_before)

                page.set_viewport_size({"width": 390, "height": 844})
                page.get_by_role("button", name="Menü öffnen").click()
                mark("14-mobile-sidebar-accessible",
                     "mobile-open" in (page.locator("#studio-sidebar")
                                        .get_attribute("class") or ""))
                page.locator("#studio-sidebar").get_by_role("button", name="Navigation schliessen").click()
                overflow = page.evaluate(
                    "() => document.documentElement.scrollWidth - window.innerWidth")
                mark("15-mobile-no-horizontal-overflow", overflow <= 1)

                page.get_by_role("button", name="Menü öffnen").click()
                page.locator('#studio-sidebar a[aria-label="Abmelden"]').click()
                page.get_by_role("button", name="Studio öffnen").wait_for(timeout=10000)
                mark("16-logout-revokes-session",
                     page.request.get(origin + "/api/auth/session").status == 401)
                mark("17-no-browser-uncaught-errors", len(errors) == 0)
                with closing(sqlite3.connect(data_dir / "studio.sqlite")) as db:
                    integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
                    fk_failures = len(db.execute("PRAGMA foreign_key_check").fetchall())
                mark("18-sqlite-integrity-and-fk", integrity == "ok" and fk_failures == 0)
            finally:
                browser.close()
    finally:
        # Never remove data while the server may still be using it.
        if child is not None:
            stop_server(child)
        shutil.rmtree(data_dir)
    print(json.dumps({
        "result": "PASS", "sourceSha": args.expected_sha,
        "isolation": "private-temp-only-no-real-users-or-providers",
        "browser": "Chromium headless (desktop and mobile)",
        "checksPassed": len(results), "checks": results,
        "uncaughtExceptions": len(errors),
        "productionChanged": False
    }, indent=2))

if __name__ == "__main__":
    main()
