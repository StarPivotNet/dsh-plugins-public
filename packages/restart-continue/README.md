# @starpivot/dsh-restart-continue

After `dsh web` restarts, automatically cold-resume user root conversations interrupted in the last 24 hours and let the model continue.

General Settings → **Continue after restart** can turn this off (on by default).

## Behavior

- Trigger: one host-process boot sweep; does not wait for a browser connection.
- Targets: ordinary user root conversations (not subagent / automation) that have a project `cwd`.
- Qualify: latest turn is `interrupted` (including an open tail) and the interruption is within 24 hours.
- Action: `agents.resume` with the stored preset, then one plugin-source Continue notice.
- Conversations stuck on approval / question / Plan confirm also continue.
- Subagents are not started.
- Archived, blank, completed, older than 24 hours, or already Continued sessions are skipped.
- Dedup with Host `dsh-host-apiproxy` interrupt resume: at most one Continue per session per boot.

The Continue text keeps the Host sentence “Continue the work that was interrupted by a restart.” and reminds the model: inspect the workspace first; retry only read-only or idempotent calls; verify side effects instead of replaying blindly.

## Install

```sh
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/restart-continue
# or
dsh plugin --profile web add @starpivot/dsh-restart-continue
```

Then restart `dsh web`. Refresh the page to see the settings row.

## Verify

```sh
node scripts/qualify.test.mjs
```
