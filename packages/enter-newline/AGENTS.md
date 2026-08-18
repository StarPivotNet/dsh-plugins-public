# AGENTS.md

Org share copy of the enter-newline plugin: `@starpivot/dsh-enter-newline` at `packages/enter-newline`.

Install with `dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/enter-newline`, then restart `dsh web`.

## Architecture

- Two halves: `lib/index.js` (host; registers the `ui-enter-newline` settings namespace schema) + `lib/client.js` (browser; Settings row + document-capture Enter interceptor).
- Hand-written bundle, no build step. `lib/client.js` is plain JS (no JSX/TS) and uses `React.createElement`. It registers through `window.__ModuleLoader__.load({ id, factory(require) })`; `require` may only resolve seeds (react, …) and `@deepseek-ai/dsh-client-*` packages already in the boot graph.
- This directory is the share copy users install. Package name, `cordis.patch.yml` mount `name`, and `lib/client.js` `__ModuleLoader__` `id` must stay `@starpivot/dsh-enter-newline`.

## Conventions

- User-facing install and behavior live in `README.md`. This file keeps org-package notes only.
- Runtime copies under `$DSH_HOME/profiles` are disposable. Edit this package and push `main`; git installs see the new commit after restart.

## Gotchas & Decisions

- **Package name appears in three places** and must stay identical: `package.json` `name`, `lib/client.js` `__ModuleLoader__.load({ id })`, and `cordis.patch.yml` mount `name`.
- **A client plugin must export `inject`** (this one: `['slots','locale','connection','remote','settingsScope']`), or the runner refuses `ctx.slots` and related services ("service not declared by your plugin").
- **A new host settings namespace needs a registered schema**, or the browser `settingsScope.bind` never sees the namespace (describe missing → always unavailable, not persisted).
- Interceptor guards (do not drop): skip while IME composing (`isComposing || keyCode === 229`); skip when the textarea has `aria-activedescendant` (slash menu open); Shift+Enter send is a synthesized plain Enter keydown behind a reentrancy flag so the product submit path runs unchanged.

## Commands

```sh
node --check lib/client.js
```

ESM `lib/index.js` needs a `.mjs` copy before `node --check`.

## Module Map

Single package, no child modules. See `README.md` for the file list.
