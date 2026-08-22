# AGENTS.md

Org share copy of AgentTeams: `@starpivot/dsh-agent-teams` at `packages/agent-teams`.

Install with `dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/agent-teams`, then restart `dsh web`.

## Architecture

Host tools + browser activity panel. Package name, `cordis.patch.yml` mount `name`, and the client `__ModuleLoader__` id (read from `package.json` by `tsdown.config.ts`) must stay `@starpivot/dsh-agent-teams`. Rebuild `lib/` here so the bundle registers the org name; do not copy a personal `lib/` built as `@wuxie233/dsh-agent-teams`.

This is not a live upstream fork. Lineage is pinned in `UPSTREAM.md`. Keep the original LICENSE.

## Differences from upstream

See [FORK.md](./FORK.md): read-only roles, barge-in (default) with `mode=queue`, spawn-brief fallbacks, optional `cwd` / worktrees, stall notices, first claimed task at spawn, activity panel stays collapsed, conversation-card roster fold from the shared snapshot, and plugin-defect reports to `Wuxie233/dsh-plugin-agent-teams`.

## Gotchas

- `scripts/verify.mjs` calls `spawnMember` with the upstream signature (positional args, no runtime config for roles) — that is why `MemberRuntimeConfig.readOnlyRoles` is optional with `?? []` fallbacks. Don't make it required.
- The conversation card folds create/add_member/remove_member `tool/result.meta` onto one team id. Do not hardcode `members: []`. The activity panel is the only `/plugins/dsh-agent-teams/state` poller; cards read the shared snapshot. A missing snapshot keeps the folded roster.
- Live team messages barge in by default. Pass `mode=queue` only when the current turn must finish. Captains do not send blank continue reminders; they wait for a member report or a stall notice, then barge a new instruction.
- Optional `cwd` on add_member pins the child workspace. A cwd that is not the captain workspace writes `captain-pointer.json`. When both `cwd` and `worktree` are set they must be the same path.
- An interrupted member that goes idle with open claimed/in_progress tasks and an empty inbox queues a captain stall notice. Do not fail or unclaim the task. Do not auto-wake members on captain session resume.
- Offline verify fixtures use `/tmp/example-project`. Do not put host-absolute paths in tests or docs.

## Commands

```sh
pnpm build
node scripts/verify.mjs
```

Do not use a personal `install.sh` from this directory; org users install through `dsh plugin add`.
