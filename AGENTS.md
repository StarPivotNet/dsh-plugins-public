# AGENTS.md

Public out-of-tree DeepSeek Harness plugins. One installable plugin per directory under `packages/`. Do not put a plugin's `package.json` at the repository root.

## Layout

```
packages/
  plugin-marketplace/   @starpivot/dsh-plugin-marketplace
  session-import/       @starpivot/dsh-session-import
  better-sidebar/       @starpivot/dsh-better-sidebar
  enter-newline/        @starpivot/dsh-enter-newline
  skill-router/         @starpivot/dsh-skill-router
  model-capabilities/   @starpivot/dsh-model-capabilities
  blank-session-gc/     @starpivot/dsh-blank-session-gc
  busy-enter-steer/     @starpivot/dsh-busy-enter-steer
  session-rehome/       @starpivot/dsh-session-rehome
  agent-teams/          @starpivot/dsh-agent-teams
```

A new plugin is a new `packages/<name>` folder with its own manifest, patch layer, sources, tests, and build. Install it with `github:StarPivotNet/dsh-plugins-public#path:packages/<name>`.

## Publish immediately

A finished change is not done until it is on the remotes users install from. Do not leave publishable work only on disk.

1. `pnpm test` and `pnpm run build` from this repository root.
2. Commit and push `main` on this repository.
3. For a package users install from npm: bump that package's `version`, then `pnpm --filter <name> publish --access public`.
4. If Discover should show a new name, version, title, or description, update `StarPivotNet/dsh-plugin-catalog` `catalog.json` in the same turn and push its `main`. The marketplace does not scan `packages/`.

Git installs (`#path:packages/<name>`) see this repository's `main` after the push. npm installs see the published version only.

## Commands

```sh
pnpm install
pnpm test
pnpm run build
```

Package-local conventions live in that package's `AGENTS.md`.
