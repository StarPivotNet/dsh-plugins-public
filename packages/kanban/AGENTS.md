# AGENTS.md

Org share copy of kanban: `@starpivot/dsh-kanban` at `packages/kanban`.

Install with `dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/kanban`, then restart `dsh web`.

## Architecture

- Two halves: `src/index.ts` (host; column file + `/plugins/@starpivot/dsh-kanban/columns`) + `src/client/` (sidebar footer + `/kanban` overlay).
- Build: `tsc` writes `lib/types`, `tsdown` writes `lib/index.js` and `lib/client.js`. Rebuild here so ModuleLoader id is `@starpivot/dsh-kanban`.
- Package name, `tsdown.config.ts` `id`, `cordis.patch.yml` mount `name`, and both `COLUMNS_ROUTE` constants must stay `@starpivot/dsh-kanban`. Host file name stays `kanban-columns.json`.

This directory is the share copy users install. Do not add `install.sh`; org users install through `dsh plugin add`.

## Conventions

- User-facing install and behavior live in `README.md`. Lineage lives in `FORK.md`.
- Runtime copies under `$DSH_HOME/profiles` are disposable. Edit this package and commit; git installs see the new commit after restart.

## Gotchas & Decisions

- **Package name appears in three places** plus both `COLUMNS_ROUTE` strings.
- **A client plugin must export `inject`** (`['slots','sessions','workspaces']`).
- Archived ids live on `useWorkspaces(s => s.archivedSessionIds)`. Filter subagent (`origin === 'subagent'`) and unused blank (`session.blank`) the same way.
- Column overrides use the host file + same-origin GET/PUT, not `settingsScope`.
- Mid-pane swap hides `[data-conversation-scroll]`'s parent, then portals one level up.

## Commands

```sh
pnpm build
node --check lib/client.js
```

## Module Map

- `src/index.ts` — host route
- `src/columns-store.ts` — disk document
- `src/client/Kanban.tsx` — board UI
- `src/client/columns.ts` — browser column I/O
