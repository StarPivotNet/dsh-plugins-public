# AGENTS.md

Org share copy of the file-drop plugin: `@starpivot/dsh-file-drop` at `packages/file-drop`.

Install with `dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/file-drop`, then restart `dsh web`.

## Architecture

- Two halves: `lib/host.js` (loopback RPC `/file-drop` `stage`) + `lib/client.js` (capture-phase document drop interceptor).
- Package name, `cordis.patch.yml` mount `name`, and `lib/client.js` `__ModuleLoader__` `id` must stay `@starpivot/dsh-file-drop`.
- Image-only batches must pass through. Mixed or non-image batches, and directory drops, are stolen before the stock attachment plugin's bubble listeners.

## Commands

```sh
pnpm --filter @starpivot/dsh-file-drop test
pnpm --filter @starpivot/dsh-file-drop run build
```
