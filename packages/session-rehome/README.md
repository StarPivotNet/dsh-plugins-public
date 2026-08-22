# @starpivot/dsh-session-rehome

Cursor-parity conversation rehome. The model tool `move_agent_to_root({ rootPath })` moves the current conversation onto an existing project directory. Sidebar grouping and later bash/fs/AGENTS.md follow the new root. It does not mkdir and cannot rehome back to No Repo.

General Settings → **Move workspace** chooses ask or automatic (ask is the default).

## Behavior

| Mode | Current home | Target | Action |
| --- | --- | --- | --- |
| Ask | No Repo | Unique registered match | Rehome immediately |
| Ask | No Repo | Several registered matches | `userQuestions` choice |
| Ask | No Repo | Existing unregistered directory | Rehome immediately (Host creates the workspace) |
| Ask | Real project | Another directory | Confirm Move / Stay first |
| Auto | Any (not a No Repo target) | The model's absolute path | Rehome immediately; several matches do not prompt |
| Any | Any | `$DSH_HOME/no-repo` | Refuse |

Needs Host `session.rehome` (deepseek-harness `7e166f8` onward).

This is the current-session tool. Library-wide rehome of another conversation is a separate Host `session_control_rehome` tool, not this plugin.

## Install

```sh
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/session-rehome
# or
dsh plugin --profile web add @starpivot/dsh-session-rehome
```

Then restart `dsh web`. Refresh the page to see the settings row.

## Verify

```sh
node scripts/rehome-policy.test.mjs
```
