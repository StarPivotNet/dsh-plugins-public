# AGENTS.md

Out-of-tree DeepSeek Harness marketplace bundle. Install with `dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/plugin-marketplace`.

## Architecture

Host half (`src/host`) registers loopback RPC at `/plugin-marketplace` and slash commands `/reload`, `/update`, `/reboot`. Browser half (`src/client`) replaces the shipped Plugins settings page.

Discover fetches version-1 JSON catalogs. The shipped default is `DEFAULT_CATALOG_URL` in `src/host/defaults.ts`, also set on the `plugin-marketplace` row in `cordis.patch.yml`. The catalog itself lives in `StarPivotNet/dsh-plugin-catalog`.

## Conventions

- Install accepts one npm registry package name. Path, `file:`, and git specs stay refused.
- Confirm install names package, version, and catalog source.
- Runtime copies under `$DSH_HOME/profiles` are disposable. Edit this repo and rebuild.

## Commands

From the repository root:

```sh
pnpm install
pnpm --filter @starpivot/dsh-plugin-marketplace test
pnpm --filter @starpivot/dsh-plugin-marketplace run build
```

## Module Map

- `src/host/catalog.ts` — catalog JSON protocol
- `src/host/defaults.ts` — shipped Discover URL
- `src/client/confirm-install.ts` — install confirm copy
- `docs/marketplace-shelf.spec.md` — accepted first-shelf contract
