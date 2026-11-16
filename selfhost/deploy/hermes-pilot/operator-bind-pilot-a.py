#!/usr/bin/env python3
"""Stage exactly one private Hermes-A -> R4 Pilot Owner binding. No inference."""
from __future__ import annotations

import argparse
import base64
import json
import os
import pathlib
import pwd
import grp
import secrets
import socket
import sqlite3
import stat
import sys

PILOT = pathlib.Path("/home/dc-remote/studio-r4-pilot")
DB = PILOT / "data/studio.sqlite"
BACKEND_FILE = PILOT / "hermes-workers.json"
WORKER_DIR = pathlib.Path("/etc/schmaqq-hermes-pilot")
WORKER_FILE = WORKER_DIR / "worker-a.json"
ORIGIN = "https://trace-containing-engineer-periodically.trycloudflare.com"
BACKEND = "http://127.0.0.1:14439"
EXPECTED_AGENT_MODEL = "gpt-5.6-sol"

def check_directory(path: pathlib.Path, uid: int | None = None, private: bool = False) -> None:
    s = path.lstat()
    if not stat.S_ISDIR(s.st_mode) or (uid is not None and s.st_uid != uid):
        raise RuntimeError(f"Directory ownership/type mismatch: {path}")
    if private and stat.S_IMODE(s.st_mode) & 0o077:
        raise RuntimeError(f"Directory must be private: {path}")

def assert_absent(path: pathlib.Path) -> None:
    if path.is_symlink() or path.exists():
        raise RuntimeError(f"STOP: refusing to overwrite existing configuration: {path}")

def preflight() -> tuple[str, int, int, int]:
    pilot_owner = pwd.getpwnam("dc-remote")
    worker_user = pwd.getpwnam("schmaqq-hermes-a")
    worker_group = grp.getgrnam("schmaqq-hermes-a")
    if worker_user.pw_gid != worker_group.gr_gid:
        raise RuntimeError("Worker A primary group mismatch")
    check_directory(PILOT, pilot_owner.pw_uid, private=True)
    check_directory(WORKER_DIR, 0)
    check_directory(PILOT / "data", pilot_owner.pw_uid, private=True)
    assert_absent(BACKEND_FILE)
    assert_absent(WORKER_FILE)

    uri = "file:" + str(DB) + "?mode=ro"
    with sqlite3.connect(uri, uri=True) as db:
        owners = db.execute(
            "SELECT id FROM members WHERE name=? AND role=?",
            ("Pilot Owner", "owner"),
        ).fetchall()
        if len(owners) != 1:
            raise RuntimeError("Pilot Owner must resolve to exactly one Studio UUID")
        member_id = owners[0][0]
        records = db.execute(
            "SELECT value FROM workspace_meta WHERE key LIKE ?",
            ("room:v1:agent:%",),
        ).fetchall()
        maras = [json.loads(raw) for (raw,) in records if json.loads(raw).get("name") == "Mara"]
        if len(maras) != 1:
            raise RuntimeError("Mara must resolve to exactly one pilot agent")
        mara = maras[0]
        if (
            mara.get("createdBy") != member_id
            or mara.get("model") != EXPECTED_AGENT_MODEL
            or mara.get("active") is not True
            or mara.get("permissions", {}).get("readProject") is not True
            or mara.get("permissions", {}).get("writeMessages") is not True
        ):
            raise RuntimeError("Mara owner/model/permissions mismatch")
        membership = db.execute(
            "SELECT 1 FROM project_members WHERE project=? AND member=?",
            (mara["project"], member_id),
        ).fetchone() if any(r[0]=="project_members" for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")) else True
        if membership is None:
            raise RuntimeError("Owner is not a member of Mara's project")
    with socket.create_connection(("127.0.0.1", 14439), timeout=2):
        pass
    return member_id, pilot_owner.pw_uid, pilot_owner.pw_gid, worker_group.gr_gid

def create(path: pathlib.Path, data: object, uid: int, gid: int, mode: int) -> None:
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    if hasattr(os, "O_NOFOLLOW"):
        flags |= os.O_NOFOLLOW
    fd = os.open(path, flags, 0o600)
    try:
        os.fchown(fd, uid, gid)
        os.fchmod(fd, mode)
        raw = (json.dumps(data, separators=(",", ":")) + "\n").encode("utf-8")
        os.write(fd, raw)
        os.fsync(fd)
    finally:
        os.close(fd)

def main() -> int:
    parser = argparse.ArgumentParser(description="Private, pilot-only Hermes A mapping. Never writes tokens to stdout.")
    parser.add_argument("--check", action="store_true", help="Read-only preflight")
    parser.add_argument("--apply", action="store_true", help="Create A binding files only; root required")
    args = parser.parse_args()
    if args.check == args.apply:
        parser.error("Choose exactly one of --check or --apply")
    member_id, pilot_uid, pilot_gid, worker_gid = preflight()
    if args.check:
        print("PILOT_A_PREFLIGHT=PASS")
        print("MARA_MODEL=" + EXPECTED_AGENT_MODEL)
        print("FILES_EXIST=NO")
        print("WORKER_STARTED=NO")
        return 0
    if os.geteuid() != 0:
        raise RuntimeError("Root only. Never sudo from dc-remote.")
    token = base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")
    if len(token) != 43:
        raise RuntimeError("Unexpected token length")
    written = []
    try:
        create(BACKEND_FILE, [{"owner": member_id, "token": token}], pilot_uid, pilot_gid, 0o600)
        written.append(BACKEND_FILE)
        create(WORKER_FILE, {"backend": BACKEND, "origin": ORIGIN, "token": token}, 0, worker_gid, 0o640)
        written.append(WORKER_FILE)
    except Exception:
        for path in written:
            path.unlink(missing_ok=True)
        raise
    finally:
        token = None
    print("PILOT_A_BINDING=INSTALLED")
    print("BACKEND_CONFIG_MODE=0600")
    print("WORKER_A_CONFIG_MODE=0640")
    print("TOKEN_OUTPUT=NEVER")
    print("BACKEND_RESTARTED=NO")
    print("WORKERS_STARTED=NO")
    print("MODEL_CALLS=NO")
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:
        print(f"STOP: {type(exc).__name__}: {exc}", file=sys.stderr)
        sys.exit(1)
