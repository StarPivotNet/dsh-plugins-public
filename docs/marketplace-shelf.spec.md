# Plugin marketplace first shelf

Accepted contract for the first marketplace delivery.

## Goal

A user who installs `github:StarPivotNet/dsh-plugins-public` into the web profile opens Settings → 插件 → 发现 and sees a non-empty official catalog. Confirming install shows package name, version, and source, then runs the existing npm-only installer.

## Scenario

1. Install the marketplace bundle and restart dsh web.
2. Open Discover. The StarPivot catalog URL is already configured.
3. See three published npm bundles.
4. Click Install. The confirm dialog names the package, version, and source.
5. After confirm, the Host installs that registry package and asks for a restart.

## In scope

- New public catalog repository `StarPivotNet/dsh-plugin-catalog`.
- Root `catalog.json` using the existing version-1 protocol.
- Marketplace default `catalogUrls` pointing at that file's raw GitHub URL.
- Confirm dialog that shows package name, version, and source (title or homepage host).

## Non-goals

- `dsh-plugins-private`
- `github:` / `file:` / path installs
- Live GitHub topic search
- Skills, old repository plugins, external managers
- Auto `/reload` or `/reboot` after install
- Listing non-bundle dependencies
- Publishing the marketplace itself to npm

## Constraints

- Install still accepts one npm registry name plus optional version.
- Successful install still only writes the profile and prompts for restart.
- Catalog lists only verified npm packages that declare `dsh.bundle.patch`.
- Users can still add or remove catalog URLs in Discover.

## Settled decisions

- Scope is the public marketplace installer, not the empty private repo.
- Catalog lives in its own public repo, not inside the marketplace repo.
- Default `catalogUrls` ships with the bundle.
- First shelf is community npm bundles, not this marketplace package.
- First shelf is bundles only.

## First catalog entries

| name | version | homepage |
| --- | --- | --- |
| `@dsh-plugin/dsh-auxiliary` | `0.4.2` | https://github.com/dsh-plugins/dsh-auxiliary |
| `@dsh-plugin/dsh-thought-buddy` | `0.1.1` | https://github.com/dsh-plugins/dsh-thought-buddy |
| `dsh-find-plugin` | `0.3.6` | https://github.com/awesome-dsh-plugin/dsh-find-plugin |

Default catalog URL:

`https://raw.githubusercontent.com/StarPivotNet/dsh-plugin-catalog/main/catalog.json`

## Acceptance

- `GET` of the default catalog URL returns `version: 1` JSON with the three bundles above.
- A fresh marketplace install has that URL in Host `catalogUrls` without user input.
- Discover can list those three entries from that URL.
- Install confirm text includes package name, version, and source before `install()` runs.

## Assumptions

- Org members can create `StarPivotNet/dsh-plugin-catalog`.
- GitHub raw URLs stay publicly readable.
- Pinned versions stay installable until the catalog is bumped.
