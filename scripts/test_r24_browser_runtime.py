import importlib.util
from contextlib import closing
import io
import json
import os
import pathlib
import sqlite3
import subprocess
import sys
import tempfile
import time
import types
import unittest
from unittest import mock

import r24_browser_runtime as runtime

from r24_browser_runtime import resolve_node, start_server, stop_server, protect_temp


class RuntimeTests(unittest.TestCase):
    def test_missing_and_relative_runtime_rejected(self):
        with self.assertRaises(ValueError):
            resolve_node("node.exe")
        with self.assertRaises(ValueError):
            resolve_node(str(pathlib.Path(tempfile.gettempdir()) / "absent-node-fixture"))
        if os.name == "nt":
            with self.assertRaises(ValueError):
                resolve_node()

    def test_explicit_runtime_is_version_checked(self):
        node = os.environ["SCHMAQQ_TEST_NODE"]
        self.assertEqual(resolve_node(node), str(pathlib.Path(node).resolve()))

    def test_old_node_version_is_rejected(self):
        with mock.patch.object(runtime.subprocess, "check_output", return_value="v24.14.9\n"):
            with self.assertRaisesRegex(ValueError, "Node >=24.15.0 required"):
                resolve_node(os.environ["SCHMAQQ_TEST_NODE"])

    def test_windows_exit_between_poll_and_taskkill_is_accepted(self):
        child = mock.Mock(pid=1234)
        child.poll.side_effect = [None, 0]
        with mock.patch.object(runtime.os, "name", "nt"), mock.patch.object(
                runtime.subprocess, "run", side_effect=subprocess.CalledProcessError(128, "taskkill")):
            stop_server(child)
        child.wait.assert_called_once_with(timeout=6)

    def test_windows_taskkill_failure_with_live_process_is_reported(self):
        child = mock.Mock(pid=1234)
        child.poll.return_value = None
        with mock.patch.object(runtime.os, "name", "nt"), mock.patch.object(
                runtime.subprocess, "run", side_effect=subprocess.CalledProcessError(5, "taskkill")):
            with self.assertRaises(subprocess.CalledProcessError):
                stop_server(child)
        child.wait.assert_not_called()

    def test_windows_stop_timeout_is_reported(self):
        child = mock.Mock(pid=1234)
        child.poll.return_value = None
        child.wait.side_effect = subprocess.TimeoutExpired("fixture", 6)
        with mock.patch.object(runtime.os, "name", "nt"), mock.patch.object(runtime.subprocess, "run"):
            with self.assertRaisesRegex(RuntimeError, "isolated_process_cleanup_failed"):
                stop_server(child)

    def test_own_process_is_started_and_stopped(self):
        node = resolve_node(os.environ["SCHMAQQ_TEST_NODE"])
        with tempfile.TemporaryDirectory(prefix="schmaqq-browser-process-") as directory:
            root = pathlib.Path(directory)
            protect_temp(node, root)
            (root / "selfhost").mkdir()
            (root / "selfhost/server.mjs").write_text(
                "import{writeFileSync}from'node:fs';writeFileSync('ready','1');setInterval(()=>{},1000);",
                encoding="utf-8")
            child = start_server(node, root, os.environ.copy())
            try:
                deadline = time.monotonic() + 10
                while not (root / "ready").exists() and time.monotonic() < deadline:
                    time.sleep(0.05)
                self.assertTrue((root / "ready").exists())
            finally:
                stop_server(child)
            self.assertIsNotNone(child.poll())
            stop_server(child)  # Cleanup is safe to repeat after exit.

    def test_sqlite_readonly_uri_handles_spaces_and_hash(self):
        script = pathlib.Path(__file__).with_name("r24-rc1-browser-acceptance.py")
        spec = importlib.util.spec_from_file_location("acceptance", script)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory(prefix="schmaqq sqlite # ") as directory:
            filename = pathlib.Path(directory) / "test.sqlite"
            with closing(sqlite3.connect(filename)) as db:
                db.execute("CREATE TABLE fixture(value TEXT)")
                db.execute("INSERT INTO fixture VALUES ('synthetic')")
                db.commit()
            self.assertEqual(module.table_value(filename, "SELECT value FROM fixture"), ("synthetic",))
            with self.assertRaises(sqlite3.OperationalError):
                module.table_value(filename, "INSERT INTO fixture VALUES ('write') RETURNING value")

    def test_real_child_process_is_stopped_with_parent(self):
        node = resolve_node(os.environ["SCHMAQQ_TEST_NODE"])
        with tempfile.TemporaryDirectory(prefix="schmaqq-browser-tree-") as directory:
            root = pathlib.Path(directory)
            protect_temp(node, root)
            (root / "selfhost").mkdir()
            (root / "selfhost/server.mjs").write_text(
                "import{spawn}from'node:child_process';"
                "const c=spawn(process.execPath,['-e',"
                "\"require('node:fs').writeFileSync('child-ready',String(process.pid));setInterval(()=>{},1000)\"],"
                "{stdio:'ignore'});setInterval(()=>{},1000);", encoding="utf-8")
            child = start_server(node, root, os.environ.copy())
            grandchild_pid = None
            try:
                deadline = time.monotonic() + 10
                while not (root / "child-ready").exists() and time.monotonic() < deadline:
                    time.sleep(0.05)
                self.assertTrue((root / "child-ready").exists())
                grandchild_pid = int((root / "child-ready").read_text())
                stop_server(child)
                self.assertIsNotNone(child.poll())
                # Windows process.kill(pid, 0) queries the native process handle.
                # On POSIX, a killed orphan can briefly remain a zombie, so use
                # a bounded /proc state check where available instead.
                probe = subprocess.run([node, "-e",
                    "try{process.kill(Number(process.argv[1]),0);process.exit(1)}"
                    "catch(e){process.exit(e.code==='ESRCH'?0:2)}", str(grandchild_pid)],
                    capture_output=True, timeout=5)
                if os.name == "nt":
                    self.assertEqual(probe.returncode, 0, "child process survived cleanup")
                else:
                    stat = pathlib.Path(f"/proc/{grandchild_pid}/stat")
                    self.assertTrue(probe.returncode == 0 or (stat.exists() and ") Z " in stat.read_text()))
            finally:
                stop_server(child)
                # Emergency cleanup only for this fixture's recorded PID.
                if grandchild_pid is not None:
                    subprocess.run([node, "-e",
                        "try{process.kill(Number(process.argv[1]),'SIGKILL')}catch{}",
                        str(grandchild_pid)], capture_output=True, timeout=5)


class AcceptanceCleanupTests(unittest.TestCase):
    def setUp(self):
        spec = importlib.util.spec_from_file_location(
            "acceptance_cleanup", pathlib.Path(__file__).with_name("r24-rc1-browser-acceptance.py"))
        self.module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.module)

    def run_failure(self, failure_stage):
        with tempfile.TemporaryDirectory(prefix="schmaqq-acceptance-cleanup-") as directory:
            release = pathlib.Path(directory)
            (release / "release-manifest.json").write_text("{}")
            (release / "release-source.json").write_text(json.dumps({"sourceCommit": "a" * 40}))
            data = release / "synthetic-data"
            data.mkdir()
            child = mock.Mock()
            child.poll.return_value = 1  # Reach early-exit failure without a real server.
            fake_playwright = types.ModuleType("playwright.sync_api")
            fake_playwright.sync_playwright = mock.Mock()
            start_error = RuntimeError("start_failed") if failure_stage == "start" else None
            stop_error = RuntimeError("stop_failed") if failure_stage == "stop" else None
            protect_error = RuntimeError("protect_failed") if failure_stage == "protect" else None
            output = io.StringIO()
            with mock.patch.object(sys, "argv", ["acceptance", "--release-dir", str(release),
                    "--expected-sha", "a" * 40]), mock.patch.dict(sys.modules, {
                    "playwright": types.ModuleType("playwright"), "playwright.sync_api": fake_playwright}), \
                    mock.patch.object(self.module, "resolve_node", return_value="fixture-node"), \
                    mock.patch.object(self.module.tempfile, "mkdtemp", return_value=str(data)), \
                    mock.patch.object(self.module, "protect_temp", side_effect=protect_error), \
                    mock.patch.object(self.module, "free_port", side_effect=[4312, 4312 if failure_stage == "ports" else 4313]), \
                    mock.patch.object(self.module, "start_server", return_value=child, side_effect=start_error), \
                    mock.patch.object(self.module, "stop_server", side_effect=stop_error) as stop, \
                    mock.patch.object(sys, "stdout", output):
                with self.assertRaises((RuntimeError, AssertionError)):
                    self.module.main()
            self.assertNotIn('"result": "PASS"', output.getvalue())
            self.assertEqual(data.exists(), failure_stage == "stop")
            self.assertEqual(stop.call_count, 0 if failure_stage in ("start", "ports", "protect") else 1)

    def test_start_failure_removes_temp_data(self):
        self.run_failure("start")

    def test_protection_failure_removes_temp_data(self):
        self.run_failure("protect")

    def test_port_collision_removes_temp_data(self):
        self.run_failure("ports")

    def test_readiness_failure_stops_server_and_removes_temp_data(self):
        self.run_failure("ready")

    def test_stop_failure_preserves_data_and_never_reports_pass(self):
        self.run_failure("stop")


if __name__ == "__main__":
    unittest.main()
