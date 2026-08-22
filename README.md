# dsh-plugins-public

Public out-of-tree DeepSeek Harness plugins. One installable plugin per directory under `packages/`.

| Directory | Package | What it does |
| --- | --- | --- |
| [`packages/plugin-marketplace`](packages/plugin-marketplace) | `@starpivot/dsh-plugin-marketplace` | Settings plugin marketplace |
| [`packages/session-import`](packages/session-import) | `@starpivot/dsh-session-import` | Import Cursor, Codex, and Claude Code sessions and skills |
| [`packages/better-sidebar`](packages/better-sidebar) | `@starpivot/dsh-better-sidebar` | VS Code-like right sidebar; collapse stays in the file tree |
| [`packages/enter-newline`](packages/enter-newline) | `@starpivot/dsh-enter-newline` | Composer Enter sends or inserts a newline |
| [`packages/skill-router`](packages/skill-router) | `@starpivot/dsh-skill-router` | Two-level skill catalog routing |
| [`packages/model-capabilities`](packages/model-capabilities) | `@starpivot/dsh-model-capabilities` | Fill missing llm-pi-ai model capability fields |
| [`packages/blank-session-gc`](packages/blank-session-gc) | `@starpivot/dsh-blank-session-gc` | Keep one unused blank conversation |
| [`packages/busy-enter-steer`](packages/busy-enter-steer) | `@starpivot/dsh-busy-enter-steer` | Default busy Enter to steer |
| [`packages/session-rehome`](packages/session-rehome) | `@starpivot/dsh-session-rehome` | Rehome the current conversation to an existing project |
| [`packages/file-drop`](packages/file-drop) | `@starpivot/dsh-file-drop` | Drop any non-image file as a path; large files stay a brief summary |
| [`packages/agent-teams`](packages/agent-teams) | `@starpivot/dsh-agent-teams` | Multi-agent team orchestration |

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
