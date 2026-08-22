# AGENTS.md

Org share copy of restart-continue: `@starpivot/dsh-restart-continue` at `packages/restart-continue`. Dual half: host boot sweep plus a General Settings row.

Install with `dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/restart-continue`, then restart `dsh web`.

## Architecture

- `lib/index.js` host half: registers `restart-continue` settings; boot-sweeps persistence; `agents.resume` + plugin followup.
- `lib/client.js` browser half: General Settings → Continue after restart.
- `lib/logic.js` pure qualification, 24h window, and parallel cap.
- Host export `name` / `PLUGIN_ID` stays `restart-continue`. Package name, `cordis.patch.yml` mount `name`, `PACKAGE_NAME`, and `__ModuleLoader__` `id` must stay `@starpivot/dsh-restart-continue`.
- This directory is the share copy. Do not add `install.sh` or `SPEC.md` here.

## Gotchas & Decisions

- Package name appears in three places and must stay identical: `package.json` `name`, `lib/client.js` `__ModuleLoader__.load({ id })`, and `cordis.patch.yml` mount `name`.
- Continue source is `{ kind: 'plugin', plugin: '@starpivot/dsh-restart-continue' }`. Do not use `session.prompt` — that attests `kind: 'user'` and would let the model rearm Goal.
- Resume setup must `installModelSelection` and `agentPresets.mount` the stored preset. A bare `agents.resume` does not.
- Skip `origin: subagent` / `automation`, archived ids, missing `cwd`.
- Dedup Host `dsh-host-apiproxy` Continue notices and a live `running` agent.

## Commands

```sh
node scripts/qualify.test.mjs
node --check lib/client.js
```

ESM `lib/index.js` / `lib/logic.js` need a `.mjs` copy before `node --check`.
