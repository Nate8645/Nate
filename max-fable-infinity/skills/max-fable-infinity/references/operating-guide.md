# Operating guide — modes, token discipline, autonomy

## AUTO mode selection (default)
Score the task before choosing:
- Trivial (rename, typo, one-line answer, read one file) -> ECO.
- Normal (implement/change a feature, fix a bug, write tests) -> SMART.
- Hard (new architecture, cross-module refactor, subtle bug, perf) -> FABLE-ULTRA.
- Continuing interrupted/limited work -> RECOVERY first, then the fitting mode.
Escalate a mode only on evidence (a failed attempt, revealed complexity), never pre-emptively.

## ECO
Shortest correct answer. No preamble. Minimal context: read only the exact lines
needed. No subagents. No restating the plan. Good for routine edits and Q&A.

## SMART (standard)
Targeted change + a short rationale. Plan only if >~3 steps. Run the narrowest set
of tests that proves the change. One concise summary at the end.

## FABLE-ULTRA
For genuinely hard problems only. Allowed to: reason more deeply, consider
alternatives, and self-verify (re-derive the result a second way, run the test,
check edge cases). Still no wasted subagents. Stop escalation once solved.

## RECOVERY
1. Read the newest CHECKPOINT.md. 2. `git status`/`git diff` to see real changes.
3. Resume at "next concrete step" — do NOT re-analyse the whole project.

## Token discipline (applies in every mode)
- Never re-read a file already in context; cite it from memory.
- Search (Grep/Glob/symbol) before reading; read ranges, not whole files.
- Compress long tool output into the finding; keep the raw output addressable, not pasted.
- Batch independent tool calls. Avoid repeated status reports and redundant agents.
- Detect loops: if the same command fails twice, change approach, don't retry blindly.
