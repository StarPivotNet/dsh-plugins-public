# AGENTS.md

Out-of-tree DeepSeek Harness marketplace bundle. Install with `dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/plugin-marketplace`.

## Architecture

Host half (`src/host`) registers loopback RPC at `/plugin-marketplace` and slash commands `/reload`, `/update`, `/reboot`. Browser half (`src/client`) replaces the shipped Plugins settings page and hangs a searchable plugin-name popup on bare `/reload` and `/update`.

Discover reads the last cached catalog from settings immediately, then refreshes in the background. Manual fetch can target every configured source or one source URL. The shipped default is `DEFAULT_CATALOG_URL` in `src/host/defaults.ts`, also set on the `plugin-marketplace` row in `cordis.patch.yml`. The catalog itself lives in `StarPivotNet/dsh-plugin-catalog`.

## Conventions

- Install accepts one npm registry package name. Path, `file:`, and git specs stay refused.
- Confirm install names package, version, and catalog source.
- Runtime copies under `$DSH_HOME/profiles` are disposable. Edit this package, rebuild, and publish immediately.

## Publish immediately

After a user-visible change, do not stop at a local rebuild.

1. From the repository root: `pnpm --filter @starpivot/dsh-plugin-marketplace test` and `pnpm --filter @starpivot/dsh-plugin-marketplace run build`.
2. Bump `version` in this package's `package.json` when npm users should receive the change.
3. Commit and push `StarPivotNet/dsh-plugins-public` `main`.
4. `pnpm --filter @starpivot/dsh-plugin-marketplace publish --access public`.
5. If the Discover listing changed, push the matching `catalog.json` edit to `StarPivotNet/dsh-plugin-catalog` `main` in the same turn.

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
