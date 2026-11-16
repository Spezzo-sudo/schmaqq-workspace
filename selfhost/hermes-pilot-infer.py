"""Hermes one-shot adapter: prompt only on stdin, no prompt/secret on argv."""
import json
import os
import sys

from hermes_cli.oneshot import run_oneshot
from toolsets import TOOLSETS, resolve_toolset, validate_toolset

def main():
    # Fail closed: do not trust context_engine (it can inject runtime tool schemas).
    # Register our own empty toolset only in this short-lived interpreter.
    if os.environ.get("HERMES_SAFE_MODE") != "1" or os.environ.get("HERMES_IGNORE_USER_CONFIG") != "1":
        print("Hermes safe-mode isolation missing.",file=sys.stderr)
        return 3
    toolset="schmaqq_pilot_no_tools_r1"
    if toolset in TOOLSETS:
        print("Hermes pilot toolset collision.",file=sys.stderr)
        return 3
    TOOLSETS[toolset]={"description":"SCHMAQQ read-only answer with no executable tools","tools":[],"includes":[]}
    if not validate_toolset(toolset) or resolve_toolset(toolset):
        print("Hermes tool policy mismatch: zero-tool configuration required.", file=sys.stderr)
        return 3
    if sys.argv[1:] == ["--check"]:
        print("HERMES_ZERO_TOOLSET=PASS")
        return 0
    if len(sys.argv) != 1:
        return 3
    raw=sys.stdin.buffer.read(24001)
    if len(raw)>24000:
        print("Hermes job exceeds the allowed size.", file=sys.stderr)
        return 3
    try:
        job=json.loads(raw)
        model=job["model"]
        prompt=job["prompt"]
    except (ValueError,KeyError,TypeError):
        print("Hermes input is invalid.",file=sys.stderr)
        return 3
    if not isinstance(model,str) or len(model)>100 or not model or not all(c.isascii() and (c.isalnum() or c in "-_.") for c in model):
        print("Hermes model identifier is invalid.",file=sys.stderr)
        return 3
    if not isinstance(prompt,str) or not prompt.strip() or len(prompt)>20000:
        print("Hermes prompt is invalid.",file=sys.stderr)
        return 3
    return run_oneshot(prompt=prompt, model=model, provider="openai-codex",toolsets=[toolset],skills=[])

if __name__=="__main__":
    raise SystemExit(main())
