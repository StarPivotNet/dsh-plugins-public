# AGENTS.md

Public out-of-tree DeepSeek Harness plugins. One installable plugin per directory under `packages/`. Do not put a plugin's `package.json` at the repository root.

## Layout

```
packages/
  plugin-marketplace/   @starpivot/dsh-plugin-marketplace
```

A new plugin is a new `packages/<name>` folder with its own manifest, patch layer, sources, tests, and build. Install it with `github:StarPivotNet/dsh-plugins-public#path:packages/<name>`.

## Commands

```sh
pnpm install
pnpm test
pnpm run build
```

Package-local conventions live in that package's `AGENTS.md`.
