# Differences from upstream

This directory is the StarPivot share copy, not a live rebase target.

Pinned source: see [UPSTREAM.md](./UPSTREAM.md).

Kept from the Wuxie233 checkout at the time of the copy:

- Package name `@starpivot/dsh-agent-teams`
- Read-only role isolation (`src/roles.ts`): members whose `role` matches a configured `readOnlyRoles` token (substring, case-insensitive; default `scout / reviewer / planner / diagnostician`) are denied `write` / `edit` / `bash` at spawn
- Barge-in mailbox delivery: `agent_teams_send_message` interrupts a running recipient, then delivers immediately
- No greeting turn; `agent_teams_add_member` requires the first task subject and prompt, and that prompt is the spawn user message
- Optional per-member git worktrees (`worktree` on add_member); read-only roles refuse worktrees; merge/removal stay captain-owned
- Plugin-defect reports stay on `Wuxie233/dsh-plugin-agent-teams` via `agent_teams_report_issue` (captain or standalone only)
- Turn activity, not store activity: panel and `agent_teams_status` treat a member as working only while `ctx.agents.get(id).status === 'running'`
- Activity panel stays collapsed; no auto-expand after settle or new activity
- Conversation card folds create/add_member/remove_member `tool/result.meta` onto one team id
- `claimed → completed` is a legal hop; teardown drops queued member work
