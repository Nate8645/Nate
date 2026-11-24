# Native token guard (hook)

Script: `max-fable-infinity/hooks/token_guard.py`, wired in `.claude/settings.json`
as PreToolUse (Read|Bash) and PostToolUse (Bash). Fail-open, advisory-only.

## What it does (tested)
- Re-read detection: warns when a file already read this session is read again
  (whole-file reads only; ranged/offset reads are allowed silently).
- Repeat-command detection: warns on an identical Bash command run again.
- Error-loop detection: warns when the same Bash command fails >= 2x — change approach.
- Large-output advisory: when a tool output exceeds ~20k chars, suggests narrowing
  next time. The output itself is NEVER truncated.

## Honest limits (native hook capabilities)
- A hook CANNOT shrink or rewrite output the model already received; it can only
  advise for next time. True context-level output compression is not a user-space
  hook capability in Claude Code.
- It NEVER blocks a tool and NEVER suppresses file changes, errors or security data.
- Self-cost is ~zero: it prints nothing on the normal path, only on real waste.
- State lives in `.claude/.max-fable-state-<session>.json` (gitignored), per session.
- "Automatic compact checkpoints" = the /max-save convention; a hook can remind but
  not force a checkpoint. Run /max-save at milestones.
- Activation requires the repo's `.claude/settings.json` to be the active project
  settings (loads when the repo is opened as the project; may need a session (re)start).
