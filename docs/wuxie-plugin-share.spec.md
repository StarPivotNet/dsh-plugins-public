# 自制插件同步进公开仓

## Goal

把本机自写插件做成组织公开仓里的可安装 bundle，别人能用 git path 自选安装。本机个人仓和 copy-deploy 继续只服务这台机器。

## Scenario

作者继续在 `~/CODE/dsh-plugins/<name>` 改自己的本机版。想分享时，把当前版本同步进 `packages/<name>` 并推 `main`。组织成员安装：

```sh
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/<name>
```

然后重启各自的 `dsh web`。

## In scope

| 目录 | 组织包名 | 来源 |
| --- | --- | --- |
| `packages/enter-newline` | `@starpivot/dsh-enter-newline` | 原创 |
| `packages/skill-router` | `@starpivot/dsh-skill-router` | 原创 |
| `packages/model-capabilities` | `@starpivot/dsh-model-capabilities` | 原创 |
| `packages/blank-session-gc` | `@starpivot/dsh-blank-session-gc` | 原创 |
| `packages/busy-enter-steer` | `@starpivot/dsh-busy-enter-steer` | 原创 |
| `packages/session-rehome` | `@starpivot/dsh-session-rehome` | 原创 |
| `packages/agent-teams` | `@starpivot/dsh-agent-teams` | fork，按 better-sidebar 解耦 |

每个包必须：

- `package.json` `name` 为上表 `@starpivot/dsh-*`
- 声明 `dsh.bundle.patch` 指向同目录 `cordis.patch.yml`
- 挂载行 `name` 与包名一致（client 半还要和 `__ModuleLoader__` id 一致）
- `repository` 指向本仓对应 `packages/<name>`
- 带 README，写清行为和 git 安装命令
- fork 包另有 `UPSTREAM.md`（来源仓 + 钉死提交 + 许可证），保留原 LICENSE，去掉活 rebase 工作流

本轮：新增 `session-rehome`；刷新 `agent-teams` 到本机 fork 当前源码，组织身份字段不变。

## Non-goals

- 不改、不 archive、不改 remote `~/CODE/dsh-plugins/*` 和个人 GitHub 仓
- 不改本机 `install.sh`、`~/.dsh/profiles/web/cordis.patch.yml`、`agent-habits/machine`
- 不发 npm、不改 `dsh-plugin-catalog`
- 不动空的 `dsh-plugins-private`
- 不上 kanban
- 不重启这台机的 `dsh-web`
- 不切换核心仓 `StarPivotNet/deepseek-harness`

## Constraints

- 组织仓公开，源码会公开
- Discover 这一轮不上，因为发不了 `@starpivot` npm
- 本地过期的单包历史已备份为 `backup/pre-monorepo-20260819`，工作树以 `origin/main` 为准
- 包之间写边界互不重叠；根 README / AGENTS 由集成步统一改

## Acceptance

- `packages/` 下列出上表目录，含 `session-rehome`
- 每个 `package.json` 能被 `dsh plugin add github:StarPivotNet/dsh-plugins-public#path:packages/<name>` 识别为 bundle
- 根 README / AGENTS 列出这些包和 git 安装命令
- `agent-teams` 组织拷贝不再把 NanmiCoder 当活上游；`lib/client.js` 以 `@starpivot/dsh-agent-teams` 注册
- 推到 `StarPivotNet/dsh-plugins-public` 的 `main`
- 本机个人仓 `git status` 仍干净、remote 未改

## Settled decisions

- 真身仍留个人仓；组织仓是分享拷贝
- 组织包名全部 `@starpivot/dsh-*`
- 先 git 安装，后发 npm
- kanban 不上
- 本轮只加 session-rehome、刷新 agent-teams
