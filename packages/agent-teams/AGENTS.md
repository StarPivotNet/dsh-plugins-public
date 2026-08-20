# AGENTS.md

Org share copy of AgentTeams: `@starpivot/dsh-agent-teams` at `packages/agent-teams`.

Install with `dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/agent-teams`, then restart `dsh web`.

## Architecture

Host tools + browser activity panel. Package name, `cordis.patch.yml` mount `name`, and the client `__ModuleLoader__` id (read from `package.json` by `tsdown.config.ts`) must stay `@starpivot/dsh-agent-teams`. Rebuild `lib/` here so the bundle registers the org name; do not copy a personal `lib/` built as `@wuxie233/dsh-agent-teams`.

This is not a live upstream fork. Lineage is pinned in `UPSTREAM.md`. Keep the original LICENSE.

## Differences from upstream

See [FORK.md](./FORK.md): read-only roles, barge-in, first claimed task at spawn, optional worktrees, activity panel stays collapsed, conversation-card roster fold, and plugin-defect reports to `Wuxie233/dsh-plugin-agent-teams`.

## Commands

```sh
pnpm build
node scripts/verify.mjs
```

Do not use a personal `install.sh` from this directory; org users install through `dsh plugin add`.
