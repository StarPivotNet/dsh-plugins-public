# dsh-plugins-public

Public out-of-tree DeepSeek Harness plugins. One installable plugin per directory under `packages/`.

| Directory | Package | What it does |
| --- | --- | --- |
| [`packages/plugin-marketplace`](packages/plugin-marketplace) | `@starpivot/dsh-plugin-marketplace` | Settings plugin marketplace |

## Install

Install the package you want, not this repository root. From a machine that already has `dsh`:

```sh
dsh plugin --profile web add @starpivot/dsh-plugin-marketplace
# or, from git:
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/plugin-marketplace
```

A later plugin uses the same shape: `packages/<name>` plus `github:StarPivotNet/dsh-plugins-public#path:packages/<name>`.

## Develop

```sh
pnpm install
pnpm test
pnpm run build
```

Each package owns its own `package.json`, tests, and `lib/` output. Runtime copies under `$DSH_HOME/profiles` are disposable; edit the matching folder here and rebuild.
