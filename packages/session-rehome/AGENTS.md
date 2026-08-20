# AGENTS.md

Org share copy of session-rehome: `@starpivot/dsh-session-rehome` at `packages/session-rehome`.

Install with `dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/session-rehome`, then restart `dsh web`.

## Architecture

Host-only plugin. `lib/index.js` registers `move_agent_to_root` over Host `session.rehome` and a systemPrompt usage section. Package name and `cordis.patch.yml` mount `name` must stay `@starpivot/dsh-session-rehome`.

This directory is the share copy users install. The authoring source remains the personal checkout; do not copy `install.sh` here.

## Conventions

- User-facing install and behavior live in `README.md`. This file keeps org-package notes only.
- Runtime copies under `$DSH_HOME/profiles` are disposable. Edit this package and push `main`; git installs see the new commit after restart.

## Gotchas & Decisions

- Do not mkdir. Host `session.rehome` registers an existing directory.
- Canonical No Repo path is refused as a target.
- If `apiProxy` is missing, fall back to `workspaceRegistry.create` + `setSessionHome` + detach/attach.
- Confirmation uses `ctx.userQuestions.ask`, not a nested `ask_user_question` tool call.
- Library-wide rehome of another conversation is not this plugin.

## Commands

```sh
cp lib/index.js /tmp/session-rehome-index.mjs && node --check /tmp/session-rehome-index.mjs
```

ESM `lib/index.js` needs a `.mjs` copy before `node --check`.
