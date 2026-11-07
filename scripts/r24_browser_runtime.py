"""Platform-specific process handling for the isolated RC1 browser check."""
import os
import pathlib
import signal
import subprocess


def resolve_node(explicit=None):
    if os.name == "nt" and not explicit:
        raise ValueError("Windows requires an explicit absolute --node executable")
    node = pathlib.Path(explicit or "/opt/schmaqq-studio/runtime/node/bin/node")
    if not node.is_absolute() or not node.is_file():
        raise ValueError("pinned_node_runtime_missing")
    version = subprocess.check_output([str(node), "--version"], text=True).strip()
    numbers = tuple(int(part) for part in version.removeprefix("v").split("."))
    if numbers < (24, 15, 0):
        raise ValueError("Node >=24.15.0 required")
    return str(node.resolve())


def start_server(node, release, env):
    options = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == "nt" else {"start_new_session": True}
    return subprocess.Popen([node, "selfhost/server.mjs"], cwd=release,
                            env=env, stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL, **options)


def stop_server(child):
    if child.poll() is not None:
        return
    if os.name == "nt":
        # Only the process we started and its children; never match by image name.
        taskkill = pathlib.Path(os.environ.get("SystemRoot", "C:/Windows")) / "System32/taskkill.exe"
        try:
            subprocess.run([str(taskkill), "/PID", str(child.pid), "/T", "/F"],
                           check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError:
            # The process may have exited between poll() and taskkill. A failed
            # taskkill with a still-running process is a real cleanup failure.
            if child.poll() is None:
                raise
    else:
        try:
            os.killpg(child.pid, signal.SIGTERM)
        except ProcessLookupError:
            if child.poll() is None:
                raise
    try:
        child.wait(timeout=6)
    except subprocess.TimeoutExpired:
        if os.name == "nt":
            raise RuntimeError("isolated_process_cleanup_failed")
        os.killpg(child.pid, signal.SIGKILL)
        child.wait(timeout=5)


def protect_temp(node, location):
    if os.name != "nt":
        location.chmod(0o700)
        return
    module = pathlib.Path(__file__).resolve().parents[1] / "selfhost/private-path.mjs"
    subprocess.run([node, "--input-type=module", "-e",
                    "const m=await import(process.argv[1]);m.protectNewPrivatePath(process.argv[2]);",
                    module.as_uri(), str(location)], check=True,
                   stdout=subprocess.DEVNULL)
