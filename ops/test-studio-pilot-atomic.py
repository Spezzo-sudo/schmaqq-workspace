#!/usr/bin/env python3
"""Unprivileged atomic pilot exchange regression, no live Studio mutation."""
import ctypes
import os
from pathlib import Path
import signal
import subprocess
import sys
import tempfile
import threading
import time
import unittest

HELPER = Path(__file__).with_name("studio-pilot-exchange.py")


def run(mode, active, standby, candidate, success=True):
    result = subprocess.run(
        [sys.executable, str(HELPER), mode,
         str(active), str(standby), str(candidate)],
        capture_output=True, text=True,
    )
    if success and result.returncode:
        raise AssertionError(result.stderr)
    if not success and result.returncode == 0:
        raise AssertionError("Expected failure")
    return result


class AtomicPilotTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="studio-atomic-test-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.active = self.root / "runtime"
        self.active.mkdir()
        (self.active / "identity").write_text("legacy")
        self.candidate = self.root / "releases" / "candidate1"
        self.candidate.mkdir(parents=True)
        (self.candidate / "identity").write_text("new")
        self.standby = self.root / ".previous-1"
        self.standby.symlink_to(self.candidate)

    def assert_runtime_valid(self):
        self.assertTrue(self.active.exists(), "runtime must never go missing")
        self.assertTrue((self.active / "identity").is_file())

    def test_directory_to_symlink_exchange_and_recovery(self):
        run("inspect", self.active, self.standby, self.candidate)
        run("promote", self.active, self.standby, self.candidate)
        self.assertEqual((self.active / "identity").read_text(), "new")
        self.assertEqual((self.standby / "identity").read_text(), "legacy")
        run("recover", self.active, self.standby, self.candidate)
        self.assertEqual((self.active / "identity").read_text(), "legacy")
        self.assertEqual((self.standby / "identity").read_text(), "new")
        run("recover", self.active, self.standby, self.candidate)
        self.assert_runtime_valid()
        print("ATOMIC_LEGACY_PROMOTION_RECOVERY=PASS")

    def test_symlink_to_symlink_future_upgrade(self):
        run("promote", self.active, self.standby, self.candidate)
        next_release = self.root / "releases" / "candidate2"
        next_release.mkdir()
        (next_release / "identity").write_text("second")
        old = self.root / ".previous-2"
        old.symlink_to(next_release)
        run("promote", self.active, old, next_release)
        self.assertEqual((self.active / "identity").read_text(), "second")
        run("recover", self.active, old, next_release)
        self.assertEqual((self.active / "identity").read_text(), "new")
        self.assertTrue(self.standby.exists())
        print("ATOMIC_NEXT_GENERATION_RECOVERY=PASS")

    def test_kill_just_after_exchange(self):
        # Deliberate SIGKILL immediately after the real renameat2 syscall,
        # before Python can run its postcondition/directory sync.
        code = (
            "import ctypes,os,signal,sys;"
            "c=ctypes.CDLL(None,use_errno=True);"
            "f=c.renameat2;"
            "f.argtypes=[ctypes.c_int,ctypes.c_char_p,ctypes.c_int,ctypes.c_char_p,ctypes.c_uint];"
            "f.restype=ctypes.c_int;"
            "assert f(-100,os.fsencode(sys.argv[1]),-100,os.fsencode(sys.argv[2]),2)==0;"
            "os.kill(os.getpid(),signal.SIGKILL)"
        )
        r = subprocess.run([sys.executable, "-c", code,
                            str(self.active), str(self.standby)])
        self.assertEqual(r.returncode, -signal.SIGKILL)
        self.assert_runtime_valid()
        self.assertEqual((self.active / "identity").read_text(), "new")
        run("recover", self.active, self.standby, self.candidate)
        self.assertEqual((self.active / "identity").read_text(), "legacy")
        print("SIGKILL_AFTER_ATOMIC_EXCHANGE_RECOVERY=PASS")

    def test_kill_during_repeated_promotions_no_gap(self):
        missing = []
        stop = threading.Event()

        def watch():
            while not stop.is_set():
                if not self.active.exists() or not (self.active / "identity").exists():
                    missing.append("runtime disappeared")
                time.sleep(0.0004)

        monitor = threading.Thread(target=watch, daemon=True)
        monitor.start()
        try:
            for n in range(24):
                proc = subprocess.Popen([
                    sys.executable, str(HELPER), "promote",
                    str(self.active), str(self.standby), str(self.candidate),
                ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                time.sleep((n % 6) * 0.004)
                if proc.poll() is None:
                    proc.kill()
                proc.wait(timeout=3)
                self.assert_runtime_valid()
                run("recover", self.active, self.standby, self.candidate)
                self.assertEqual((self.active / "identity").read_text(), "legacy")
            self.assertFalse(missing, missing)
            print("SIGKILL_24_ATTEMPTS_NO_RUNTIME_GAP=PASS")
        finally:
            stop.set()
            monitor.join(timeout=1)

    def test_wrong_candidate_rejected_unchanged(self):
        other = self.root / "wrong"
        other.mkdir()
        run("promote", self.active, self.standby, other, success=False)
        self.assertEqual((self.active / "identity").read_text(), "legacy")
        print("INVALID_CANDIDATE_FAIL_CLOSED=PASS")


if __name__ == "__main__":
    unittest.main(verbosity=2)
