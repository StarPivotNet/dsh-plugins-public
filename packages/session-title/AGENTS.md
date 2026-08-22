# AGENTS.md

Org share copy of session-title: `@starpivot/dsh-session-title` at `packages/session-title`. Dual half: host LLM intercept plus a Settings section.

Install with `dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/session-title`, then restart `dsh web`.

## Architecture

- `lib/index.js` host half: registers `session-title` settings; waterfall-clones frozen `purpose=session-title` requests.
- `lib/client.js` browser half: `settings.section` id `session-title`.
- `lib/logic.js` pure default prompt and `resolveTitlePolicy`.
- Host export `name` / `PLUGIN_ID` stays `session-title`. Package name, `cordis.patch.yml` mount `name`, `PACKAGE_NAME`, and `__ModuleLoader__` `id` must stay `@starpivot/dsh-session-title`.
- This directory is the share copy. Do not add `install.sh`, `SPEC.md`, or `.agent-teams` here.

## Gotchas & Decisions

- Package name appears in three places and must stay identical: `package.json` `name`, `lib/client.js` `__ModuleLoader__.load({ id })`, and `cordis.patch.yml` mount `name`.
- Never mutate frozen `GenerateOptions`. WeakSet-guard the clone and re-enter `ctx.llm.stream`; unpatched paths must `next()`.
- Empty / whitespace prompt leaves `system` undefined so DSH's English helper instruction stays.
- Restore default writes only `prompt`. Model mode stays.
- A custom route whose provider is not in `ctx.llm.listProviders()` keeps the conversation route and warns.
- Default prompt is duplicated in host `logic.js` and the browser bundle so the client half does not import host ESM.

## Commands

```sh
node scripts/policy.test.mjs
node --check lib/client.js
```

ESM `lib/index.js` / `lib/logic.js` need a `.mjs` copy before `node --check`.
