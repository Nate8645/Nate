# Memory & recovery convention

Persistent project memory = a committed `CHECKPOINT.md` at the project root (or
`.claude/CHECKPOINT.md`). One file per project; projects stay isolated. It is the
only thing that survives a usage limit, an interrupt or a new cloud container.

## /max-save
Overwrite CHECKPOINT.md from the template. Keep it compact (aim < ~120 lines):
architecture note, current task, done, open, key decisions, known bugs, working
fixes, changed files, branches, PRs, test results, pending approvals, and the
single NEXT concrete step. Commit it.

## /max-resume and /max-recover
Read CHECKPOINT.md, run `git status`/`git diff`, continue at NEXT step. No full
re-scan. If CHECKPOINT.md is missing, say so and reconstruct minimally from git log.

## Never store
API keys, tokens, passwords, or any secret. No cross-project data mixing.
