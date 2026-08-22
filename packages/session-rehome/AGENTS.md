# AGENTS.md

Org share copy of session-rehome: `@starpivot/dsh-session-rehome` at `packages/session-rehome`. Dual half: host tool plus a browser settings row.

Install with `dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/session-rehome`, then restart `dsh web`. Refresh for the settings row.

## Architecture

- `lib/index.js` host half: `move_agent_to_root` over Host `session.rehome`, systemPrompt usage, `session-rehome` settings schema.
- `lib/client.js` browser half: General Settings → Move workspace (ask / auto).
- `lib/logic.js` pure ask/auto policy (confirm leave, choose among matches, unique-match remap).
- Host export `name` stays `session-rehome`. Package name, `cordis.patch.yml` mount `name`, and `lib/client.js` `__ModuleLoader__` `id` must stay `@starpivot/dsh-session-rehome`.
- This directory is the share copy users install. Do not add `install.sh` here.

## Conventions

- User-facing install and behavior live in `README.md`. This file keeps org-package notes only.
- Runtime copies under `$DSH_HOME/profiles` are disposable. Edit this package and push `main`; git installs see the new commit after restart.

## Gotchas & Decisions

- Package name appears in three places and must stay identical: `package.json` `name`, `lib/client.js` `__ModuleLoader__.load({ id })`, and `cordis.patch.yml` mount `name`.
- A client plugin must export `inject` (`['slots','locale','connection','remote','settingsScope']`).
- The host settings namespace must be registered or the browser `settingsScope.bind` never persists.
- Do not mkdir. Host `session.rehome` registers an existing directory.
- Canonical No Repo path is refused as a target.
- If `apiProxy` is missing, fall back to `workspaceRegistry.create` + `setSessionHome` + detach/attach.
- Confirmation uses `ctx.userQuestions.ask`, not a nested `ask_user_question` tool call.
- Default mode is `ask`. `auto` skips prompts and keeps the model's canonical path when several registered workspaces match; unique No Repo matches still remap onto the registered workspace path.
- Library-wide rehome of another conversation is not this plugin.

## Commands

```sh
node scripts/rehome-policy.test.mjs
node --check lib/client.js
```

ESM `lib/index.js` / `lib/logic.js` need a `.mjs` copy before `node --check`.
