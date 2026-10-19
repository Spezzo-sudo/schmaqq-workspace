#!/usr/bin/env python3
"""Atomic SCHMAQQ pilot runtime exchange. No systemd or SQLite mutations."""
import ctypes
import errno
import os
import pathlib
import sys

RENAME_EXCHANGE = 2
AT_FDCWD = -100


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def fsync_directory(directory):
    fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def exchange(left, right):
    libc = ctypes.CDLL(None, use_errno=True)
    function = libc.renameat2
    function.argtypes = [
        ctypes.c_int, ctypes.c_char_p, ctypes.c_int,
        ctypes.c_char_p, ctypes.c_uint,
    ]
    function.restype = ctypes.c_int
    result = function(
        AT_FDCWD, os.fsencode(left), AT_FDCWD, os.fsencode(right),
        RENAME_EXCHANGE,
    )
    if result:
        error = ctypes.get_errno()
        raise OSError(error, os.strerror(error))
    fsync_directory(left.parent)
    if right.parent != left.parent:
        fsync_directory(right.parent)


def state(active, standby, candidate):
    require(active.exists() and standby.exists(),
            "Active runtime or recovery counterpart missing")
    require(candidate.is_dir(), "Verified candidate directory missing")
    active_new = active.is_symlink() and active.resolve() == candidate
    standby_new = standby.is_symlink() and standby.resolve() == candidate
    require(active_new != standby_new,
            "Expected exactly one pointer to the candidate release")
    if active_new:
        require(standby.is_dir(), "Previous runtime is not a directory")
        return "NEW_ACTIVE"
    require(active.is_dir(), "Previous active runtime not a directory")
    return "OLD_ACTIVE"


def main():
    require(len(sys.argv) == 5,
            "Usage: exchange.py <inspect|promote|recover> <active> <standby> <candidate>")
    operation = sys.argv[1]
    require(operation in ("inspect", "promote", "recover"), "Invalid operation")
    active, standby, candidate = (pathlib.Path(a) for a in sys.argv[2:])
    for path in (active, standby, candidate):
        require(path.is_absolute(), "Absolute paths required")
    require(active != standby, "Active and recovery paths coincide")
    require(active.parent == standby.parent,
            "Active and recovery paths must share a parent directory")
    candidate = candidate.resolve(strict=True)
    require(active != candidate and standby != candidate,
            "Candidate cannot coincide with runtime switch paths")
    before = state(active, standby, candidate)
    if operation == "promote":
        require(before == "OLD_ACTIVE", "Refusing duplicate promote")
        exchange(active, standby)
        require(state(active, standby, candidate) == "NEW_ACTIVE",
                "Exchange postcondition failed")
    elif operation == "recover" and before == "NEW_ACTIVE":
        exchange(active, standby)
        require(state(active, standby, candidate) == "OLD_ACTIVE",
                "Rollback postcondition failed")
    print("PILOT_ATOMIC_%s=%s" % (operation.upper(), state(active, standby, candidate)))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print("PILOT_ATOMIC_ERROR: %s" % exc, file=sys.stderr)
        sys.exit(2)
