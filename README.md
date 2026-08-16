# dsh-plugins-public

Public out-of-tree DeepSeek Harness plugins. This repository currently ships one installable bundle: a Settings **Plugin marketplace** that replaces the shipped Plugins page.

## Install

From a machine that already has `dsh`:

```sh
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public
# restart dsh web
```

Removing the bundle and restarting restores the shipped Plugins page.

Git-hosted packages run their `prepare` script on install. If pnpm ≥10 blocks that, add the printed key under `allowBuilds` in the profile `pnpm-workspace.yaml` and re-run.

## What it does

After restart, Settings → 插件 becomes:

- **发现** — fetch one or more operator JSON catalogs from http(s) marketplace URLs; five plugin cards per row
- **已安装** — list, uninstall, and toggle single Loader entries
- the shipped Shell / Agent loop / Web search cards stay under Installed

Install accepts one npm registry package name (optional version). Path, `file:`, and git specs are refused. A successful install writes the profile and asks you to restart.

The Host half registers a loopback Connection RPC channel at `/plugin-marketplace`. The browser half provides `pluginMarketplaceUi` so the shipped Plugins section unregisters itself.

## Catalog JSON

```json
{
  "version": 1,
  "plugins": [
    {
      "name": "@scope/pkg",
      "version": "1.2.3",
      "title": "Display name",
      "description": "Short summary",
      "homepage": "https://example.com",
      "kind": "bundle"
    }
  ]
}
```

Set `catalogUrls` on the `plugin-marketplace` row or in Discover (settings namespace `plugin-marketplace`). A catalog may also include a top-level `title`. Duplicate package names across markets keep the first listing.

## Develop

```sh
pnpm install
pnpm run build
```

Requires a DeepSeek Harness install that already provides `ctx.profile` (name, dir, installAnchor) from profile boot.
