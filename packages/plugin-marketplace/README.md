# @starpivot/dsh-plugin-marketplace

Settings **Plugin marketplace** for DeepSeek Harness. This package lives at `packages/plugin-marketplace` in [dsh-plugins-public](https://github.com/StarPivotNet/dsh-plugins-public).

## Install

From a machine that already has `dsh`:

```sh
dsh plugin --profile web add @starpivot/dsh-plugin-marketplace
# or, from git: dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/plugin-marketplace
# restart dsh web
```

Removing the bundle and restarting restores the shipped Plugins page.

Git-hosted packages run their `prepare` script on install. If pnpm ≥10 blocks that, add the printed key under `allowBuilds` in the profile `pnpm-workspace.yaml` and re-run.

## What it does

After restart, Settings → 插件 becomes:

- **发现** — fetch one or more operator JSON catalogs from http(s) marketplace URLs; Discover shows the last cached listing immediately, then refreshes in the background. Fetch all sources, or one source from its row. The saved source row hides the raw URL and offers edit/remove icons; cards keep install on the right, hover for the full description, and click for the full listing
- **已安装** — list, filter by kind or tag (including untagged), add a local note and chip tags in the details dialog, uninstall, and toggle single Loader entries; hover for the full package name and spec, click the card for the full listing
- **配置** — the shipped Shell / Agent loop / Web search cards

Install accepts one npm registry package name (optional version). Path, `file:`, and git specs are refused. A successful install writes the profile and asks you to restart.

The Host half registers a loopback Connection RPC channel at `/plugin-marketplace`. The browser half provides `pluginMarketplaceUi` so the shipped Plugins section unregisters itself.

While this bundle is installed it forces `client-hmr.autoReload=false` and keeps the Host `hmr` row disabled. Reloading the marketplace itself must not turn automatic client swaps back on. Use the slash commands instead:

- `/reload [plugin]` — wait for Host plugins, then settle the command card as `重载完成, 成功重载 N 个插件`. A bare `/reload` does not unload theme/layout/sidebar. Choosing a name from the popup, or typing `/reload ui-conversation`, swaps that page plugin the same way native HMR does. Use `/reboot` only for the skeleton.
- `/update [plugin]` — `pnpm update` a profile dependency, or every dependency when omitted. The same popup lists profile dependencies. This does not reload; run `/reload` or `/reboot` afterwards
- `/reboot` — restart the Host process on the same desktop port. The card says `正在重启，页面即将刷新`, then `已重启` after the page reloads.

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

A fresh install already points Discover at the StarPivot catalog:

`https://raw.githubusercontent.com/StarPivotNet/dsh-plugin-catalog/main/catalog.json`

Add more `catalogUrls` on the `plugin-marketplace` row or in Discover (settings namespace `plugin-marketplace`). A catalog may also include a top-level `title`. Duplicate package names across markets keep the first listing. The install confirm dialog shows the package name, version, and catalog source.

## Develop

From the repository root:

```sh
pnpm install
pnpm --filter @starpivot/dsh-plugin-marketplace test
pnpm --filter @starpivot/dsh-plugin-marketplace run build
```

Requires a DeepSeek Harness install that already provides `ctx.profile` (name, dir, installAnchor) from profile boot.
