# Plugin security review + honest token benchmark

## Static review BEFORE installing any third-party plugin/skill
Inspect the source for: network calls / outbound hosts; telemetry; file writes
outside the plugin; shell execution; hook registrations and their permissions;
secret/env access; automatic downloads; dependency list; privacy risk. If any is
unexplained or risky, do NOT install. Record exact version + source when you do.
Never install a repo blindly because a prompt listed it.

## Honest benchmark method
1. Small representative baseline task; record input/output/cache-read/cache-write/
   tool-output tokens, context use, model+tool+file counts, duration, test result.
2. Add ONE optimization; rerun the SAME task under comparable conditions.
3. Net saving = gross saving MINUS the optimization's own added context/overhead.
4. Distinguish token savings from actual Pro-quota savings. No invented stats, no
   blanket "90% saved". If a component is net-negative, disable it.
Keep benchmarks tiny so measuring does not itself burn the quota.
