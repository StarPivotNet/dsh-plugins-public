# @starpivot/dsh-session-import

Import Cursor, Codex, and Claude Code conversations and skills into DeepSeek Harness. This package lives at `packages/session-import` in [dsh-plugins-public](https://github.com/StarPivotNet/dsh-plugins-public).

## Install

From a machine that already has `dsh`:

```sh
dsh plugin --profile web add @starpivot/dsh-session-import
# or, from git:
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/session-import
# restart dsh web
```

## What it does

After restart, Settings gains **导入 / Import**:

- **会话** — scan the local Claude Code, Codex, and Cursor homes, then write selected conversations as cold DSH sessions
- **技能** — copy Claude / Codex / Cursor `SKILL.md` bundles and Markdown commands into `~/.dsh/skills`
- **记忆** — copy `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, and Codex `MEMORY.md` into `~/.dsh/imported-memory`, and merge the instruction files into `~/.dsh/AGENTS.md`
- **自动化** — map Codex `~/.codex/automations/*/automation.toml` RRULEs onto DSH timers. Daily/weekly local clocks and intervals of at least 5 minutes are created; faster heartbeats are listed as unsupported

Imported conversations keep user text, assistant text, reasoning, and tool-call / tool-result pairs. They stay under the foreign working directory; if that directory is not a DSH workspace yet, one is created and the session is attached there. Pass `--here` to rewrite them into the current workspace instead. Titles come from the native thread name or the first human prompt, not from model nicknames. Re-importing the same native id is counted as already present, then re-attached to the correct workspace.

Slash commands:

- `/import` — usage
- `/import list [claude|codex|cursor]` — discover local conversations
- `/import all` — import every discovered conversation
- `/import claude|codex|cursor [id-or-path]` — import one store, or one match
- `/import skills [claude|codex|cursor]` — copy skills into `~/.dsh/skills`
- `/import memory` — copy Claude/Codex instruction and memory files
- `/import automations` — create DSH timers from Codex automations

## Where it reads

| Source | Conversations | Skills |
| --- | --- | --- |
| Claude Code | `~/.claude/projects/**/*.jsonl`, `~/.claude/sessions/**/*.jsonl` | `~/.claude/skills`, `~/.claude/commands` |
| Codex | `~/.codex/sessions/**/rollout-*.jsonl`, `~/.codex/archived_sessions` | `~/.codex/skills` |
| Cursor | `~/.cursor/projects`, `~/.cursor/chats`, Cursor `workspaceStorage` composer / transcript JSON | `~/.cursor/skills`, `~/.cursor/commands` |
| Grok Build | `~/.grok/sessions/<cwd>/<id>/updates.jsonl` | bundled skills stay in Grok |

The Settings page lists the newest 300 conversations and only reads the first 64 KiB of each file for title and cwd. It scans Claude, Codex, and Cursor one store at a time so the first matches appear before the slower stores finish. `/import list` does the same walk and prints the newest 40. Codex `archived_sessions` is skipped unless you pass `--archived`. Filter by title or path to reach older conversations; `/import all` still imports every discovered active-store file that fits `maxFileBytes`.

A file path that is not under those homes can still be imported with `/import /absolute/path.jsonl` from the Host command, or from the Settings page when you pass that path through the RPC `importSessions` call.

## Conversion

Each foreign conversation becomes one DSH session id `import-<source>-<native-id>`. The seed is a balanced turn/step log:

- human prompts become `user/message`
- Codex `# AGENTS.md` dumps become plugin instruction context
- assistant text and thinking become `assistant/message`
- Claude `tool_use`, Codex `function_call` / `custom_tool_call`, and Cursor tool bubbles become `tool/call` plus `tool/result`
- a missing tool result is closed with a synthetic error so the seed stays balanced
- an existing native title, or the first human prompt, is written as `session/title`

Images, attachments, and Cursor's proprietary blobs are dropped. Tool output longer than 32 KiB characters is truncated. Files larger than 32 MiB are skipped during discovery.

Re-importing the same native id is a no-op.

## Config

On the `session-import` Host row:

| Field | Default | Meaning |
| --- | --- | --- |
| `maxFileBytes` | `33554432` | Discovery skips larger conversation files |
| `maxToolResultChars` | `32000` | Truncate imported tool output |
| `maxTextChars` | `200000` | Truncate imported message text |
| `skillTarget` | `~/.dsh/skills` | Destination for copied skills |

## Develop

From the repository root:

```sh
pnpm install
pnpm --filter @starpivot/dsh-session-import test
pnpm --filter @starpivot/dsh-session-import run build
```
