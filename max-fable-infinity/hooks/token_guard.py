#!/usr/bin/env python3
"""MAX FABLE INFINITY 2027 - native token guard (PreToolUse + PostToolUse).

Fail-open, advisory-only. Emits a SHORT warning ONLY when it detects real waste:
  * re-reading a file already read this session,
  * repeating an identical Bash command,
  * the same Bash command failing repeatedly (error loop),
  * an unusually large tool output.
On the normal path it prints NOTHING, so its own token cost is ~zero.
It NEVER blocks a tool and NEVER suppresses file changes, errors or security data.
"""
import json, os, sys, hashlib

LARGE_OUTPUT = 20000  # chars

def _state_path(session):
    base = os.environ.get("CLAUDE_PROJECT_DIR") or os.getcwd()
    d = os.path.join(base, ".claude")
    try:
        os.makedirs(d, exist_ok=True)
    except Exception:
        d = "/tmp"
    sid = (session or "default").replace("/", "_")[:64]
    return os.path.join(d, f".max-fable-state-{sid}.json")

def _load(p):
    try:
        with open(p) as f:
            return json.load(f)
    except Exception:
        return {"reads": {}, "cmds": {}, "fails": {}}

def _save(p, s):
    try:
        with open(p, "w") as f:
            json.dump(s, f)
    except Exception:
        pass

def _emit(event, msg):
    if not msg:
        sys.exit(0)
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": event, "additionalContext": "[MAX-FABLE token-guard] " + msg}}))
    sys.exit(0)

def main():
    try:
        data = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    event = data.get("hook_event_name", "")
    tool = data.get("tool_name", "")
    ti = data.get("tool_input", {}) or {}
    p = _state_path(data.get("session_id"))
    s = _load(p)
    msg = None

    if event == "PreToolUse":
        if tool == "Read":
            fp = ti.get("file_path")
            if fp:
                n = s["reads"].get(fp, 0)
                if n >= 1 and not (ti.get("offset") or ti.get("limit")):
                    msg = f"'{os.path.basename(fp)}' was already read this session - reuse it from context instead of re-reading (token saving)."
                s["reads"][fp] = n + 1
        elif tool == "Bash":
            cmd = (ti.get("command") or "").strip()
            if cmd:
                h = hashlib.sha1(cmd.encode()).hexdigest()[:12]
                n = s["cmds"].get(h, 0)
                if n >= 1:
                    msg = "identical Bash command already run this session - reuse the earlier result if still valid."
                s["cmds"][h] = n + 1
        _save(p, s)
        _emit("PreToolUse", msg)

    elif event == "PostToolUse":
        resp = data.get("tool_response", {})
        txt = resp if isinstance(resp, str) else json.dumps(resp)
        if tool == "Bash":
            cmd = (ti.get("command") or "").strip()
            is_err = False
            if isinstance(resp, dict):
                is_err = bool(resp.get("is_error") or resp.get("error") or resp.get("interrupted"))
            low = txt.lower()
            if any(k in low for k in ("traceback (most recent call last)", "command not found",
                                      "fatal:", "error:", "exception")):
                is_err = True
            if cmd and is_err:
                h = hashlib.sha1(cmd.encode()).hexdigest()[:12]
                n = s["fails"].get(h, 0) + 1
                s["fails"][h] = n
                if n >= 2:
                    msg = f"this command has failed {n}x - stop retrying it verbatim; change the approach or inspect the root cause."
        if not msg and len(txt) > LARGE_OUTPUT:
            msg = f"large tool output (~{len(txt)//1000}k chars) - next time narrow with grep/glob/head or a line range to save tokens. (Output NOT truncated; full data preserved.)"
        _save(p, s)
        _emit("PostToolUse", msg)
    sys.exit(0)

if __name__ == "__main__":
    main()
