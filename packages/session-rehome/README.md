# @starpivot/dsh-session-rehome

Cursor-parity conversation rehome. The model tool `move_agent_to_root({ rootPath })` moves the current conversation onto an existing project directory. Sidebar grouping and later bash/fs/AGENTS.md follow the new root. It does not mkdir and cannot rehome back to No Repo.

## Behavior

| Current home | Target | Action |
| --- | --- | --- |
| No Repo | Unique registered match | Rehome immediately |
| No Repo | Several registered matches | `userQuestions` choice |
| No Repo | Existing unregistered directory | Rehome immediately (Host creates the workspace) |
| Real project | Another directory | Confirm Move / Stay first |
| Any | `$DSH_HOME/no-repo` | Refuse |

Needs Host `session.rehome` (deepseek-harness `7e166f8` onward).

This is the current-session tool. Library-wide rehome of another conversation is a separate Host `session_control_rehome` tool, not this plugin.

## Install

```sh
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/session-rehome
```

Then restart `dsh web`.
