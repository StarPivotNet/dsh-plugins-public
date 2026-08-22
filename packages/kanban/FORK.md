# Fork notes (org share copy)

Upstream: [Ericwong5021/dsh-kanban](https://github.com/Ericwong5021/dsh-kanban)
(last imported via the personal fork [Wuxie233/dsh-plugin-kanban](https://github.com/Wuxie233/dsh-plugin-kanban)
at `f7fa24c` / v0.1.1, then local 0.3.0 board work). MIT. The original
README still describes the board behavior unless this file or the package
README overrides it.

## Why this copy exists

The personal checkout (`@wuxie233/dsh-kanban`) stays a copy-deploy package
for one machine. This directory is the public org bundle
`@starpivot/dsh-kanban`. Install it with `dsh plugin add` (git path or npm).
Do not copy-deploy this tree.

## Identity

- Package name, host export `name`, `tsdown.config.ts` `id` (ModuleLoader),
  and `cordis.patch.yml` mount `name` are all `@starpivot/dsh-kanban`.
- Column HTTP route is `/plugins/@starpivot/dsh-kanban/columns`.
- Column file on disk stays `$DSH_HOME/kanban-columns.json`.

## Board behavior (v0.3.0)

- Archived sessions, subagent sessions, and unused blank sessions are
  hidden from the board and the sidebar count.
- Manual column placement is stored on the host at
  `$DSH_HOME/kanban-columns.json` and served at
  `/plugins/@starpivot/dsh-kanban/columns`. First load with an empty host
  file adopts the old `localStorage` key `dsh-kanban.columns.v1` once.

## Workflow

Edit → `pnpm build` in this package → commit. Users install with
`dsh plugin add`, then restart dsh web (host) / refresh the page (client).
