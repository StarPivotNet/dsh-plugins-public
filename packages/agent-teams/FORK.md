# Differences from upstream

This directory is the StarPivot share copy, not a live rebase target.

Pinned source: see [UPSTREAM.md](./UPSTREAM.md).

Kept from the Wuxie233 checkout at the time of the copy (personal HEAD `0613d82`):

- Package name `@starpivot/dsh-agent-teams`
- Read-only role isolation (`src/roles.ts`): members whose `role` matches a configured `readOnlyRoles` token (substring, case-insensitive; default `scout / reviewer / planner / diagnostician`) are denied `write` / `edit` / `bash` at spawn
- Barge-in mailbox delivery by default: `agent_teams_send_message` interrupts a running recipient, then delivers immediately. Pass `mode=queue` when the current turn must finish. Captains do not send blank continue reminders
- Spawn brief fallbacks: `prompt` is documented; `brief` / `instructions` / `task_description` / `task_subject` are accepted so a dropped XML `prompt` field does not fail the call
- Optional member `cwd`: pin a child to one repo when the captain sits on an umbrella workspace. Differs from `worktree` (no `.git` requirement). A cwd that is not the captain workspace writes a captain-pointer. When both `cwd` and `worktree` are set they must be the same path
- Stall notice: an interrupted member that goes idle with open claimed/in_progress tasks and an empty inbox queues a captain notice. Tasks stay claimed. Captain session resume does not auto-wake members
- No greeting turn; `agent_teams_add_member` requires the first task subject and prompt, and that prompt is the spawn user message
- Optional per-member git worktrees (`worktree` on add_member); read-only roles refuse worktrees; merge/removal stay captain-owned
- Plugin-defect reports stay on `Wuxie233/dsh-plugin-agent-teams` via `agent_teams_report_issue` (captain or standalone only)
- Turn activity, not store activity: panel and `agent_teams_status` treat a member as working only while `ctx.agents.get(id).status === 'running'`
- Activity panel stays collapsed; no auto-expand after settle or new activity
- Conversation card folds create/add_member/remove_member `tool/result.meta` onto one team id and reads the panel's shared snapshot instead of polling
- `claimed → completed` is a legal hop; teardown drops queued member work
- Offline verify fixtures use `/tmp/example-project`; docs do not cite host-absolute paths
