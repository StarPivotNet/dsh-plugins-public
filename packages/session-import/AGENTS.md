# AGENTS.md

Out-of-tree DeepSeek Harness session-import bundle. Install with `dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/session-import`.

## Architecture

Pure converters live under `src/convert` and do not touch the filesystem. Host half (`src/host`) scans local Claude Code / Codex / Cursor homes, writes converted seeds through `ctx.sessionPersistence`, copies skills into `~/.dsh/skills`, and registers `/import` plus loopback RPC at `/session-import`. Browser half (`src/client`) adds a Settings section that calls that RPC.

Imported sessions are cold persistence writes, not live `ctx.sessions.create()` agents. The user opens them from the session list after import.

## Publish immediately

After a user-visible change, do not stop at a local rebuild.

1. From the repository root: `pnpm --filter @starpivot/dsh-session-import test` and `pnpm --filter @starpivot/dsh-session-import run build`.
2. Bump `version` in this package's `package.json` when npm users should receive the change.
3. Commit and push `StarPivotNet/dsh-plugins-public` `main`.
4. `pnpm --filter @starpivot/dsh-session-import publish --access public`.
5. If the Discover listing changed, push the matching `catalog.json` edit to `StarPivotNet/dsh-plugin-catalog` `main` in the same turn.

## Commands

From the repository root:

```sh
pnpm install
pnpm --filter @starpivot/dsh-session-import test
pnpm --filter @starpivot/dsh-session-import run build
```
