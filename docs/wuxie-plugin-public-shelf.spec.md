# 自制插件公开并上两套货架

Accepted delivery contract.

## Goal

十个个人插件仓清洗后公开。可安装分享拷贝进 `StarPivotNet/dsh-plugins-public`，发 `@starpivot/dsh-*` npm，并写入组织 catalog 与 deepseek-harness 内置货架。别人在发现页不用加源也能装。

## Scenario

作者继续在 `~/CODE/dsh-plugins/<name>` 改本机版（copy-deploy 包名不变）。分享面是组织仓 + npm。本机设置 → 插件 → 发现拉取内置 `/plugin-catalog/catalog.json` 即可看到这些包。其他机器加组织 catalog URL 也能看到同一份清单。

## In scope

个人仓（清洗、MIT LICENSE、公开、`dsh-plugin` topic）：

| 目录 | GitHub |
| --- | --- |
| `enter-newline` | Wuxie233/dsh-plugin-enter-newline |
| `skill-router` | Wuxie233/dsh-plugin-skill-router |
| `model-capabilities` | Wuxie233/dsh-plugin-model-capabilities |
| `blank-session-gc` | Wuxie233/dsh-plugin-blank-session-gc |
| `busy-enter-steer` | Wuxie233/dsh-plugin-busy-enter-steer |
| `agent-teams` | Wuxie233/dsh-plugin-agent-teams |
| `session-rehome` | Wuxie233/dsh-plugin-session-rehome |
| `restart-continue` | Wuxie233/dsh-plugin-restart-continue |
| `session-title` | Wuxie233/dsh-plugin-session-title |
| `kanban` | Wuxie233/dsh-plugin-kanban |

清洗：

- 原创仓补 MIT LICENSE（Copyright 2026 Wuxie233）。fork 保留原 LICENSE。
- `model-capabilities` 默认 `cacheDir` 改为可移植路径（`~/.cache/dsh-model-caps`），去掉 `/flyshop/...`。
- `agent-teams` 测试夹具去掉 `wenjie-chat`；文档示例去掉本机 `/root/CODE`。
- `skill-router` README 示例改为 `~/.dsh/skills`。
- 不改写 git 历史（提交邮箱保留）。
- 本机 copy-deploy 包名、`install.sh`、`~/.dsh/profiles/web/cordis.patch.yml` 不改。

组织分享拷贝（`packages/<name>`，包名 `@starpivot/dsh-<name>`，声明 `dsh.bundle.patch`）：

| 目录 | npm | 现状 |
| --- | --- | --- |
| enter-newline | `@starpivot/dsh-enter-newline@0.2.0` | 已发，保持 |
| skill-router | `@starpivot/dsh-skill-router@0.1.0` | 已发，保持 |
| model-capabilities | `@starpivot/dsh-model-capabilities` | 已发；补 cacheDir 后补丁版本再发 |
| blank-session-gc | `@starpivot/dsh-blank-session-gc@0.1.0` | 已发，保持 |
| busy-enter-steer | `@starpivot/dsh-busy-enter-steer@0.1.0` | 已发，保持 |
| agent-teams | `@starpivot/dsh-agent-teams` | 已发 0.2.0；从个人仓最新源刷新后视 diff 决定是否升版 |
| session-rehome | `@starpivot/dsh-session-rehome` | 公开拷贝过期；按个人仓 0.2.0（询问/自动）刷新后发 npm |
| restart-continue | `@starpivot/dsh-restart-continue` | 新建分享拷贝并发 npm |
| session-title | `@starpivot/dsh-session-title` | 新建分享拷贝并发 npm |
| kanban | `@starpivot/dsh-kanban` | 新建 bundle 分享拷贝：包名 / ModuleLoader id / COLUMNS_ROUTE 用组织名；发 npm |

两套货架都写入上述 npm 包（已在架的行保持，新包追加）：

- 组织：`StarPivotNet/dsh-plugin-catalog` `catalog.json`
- 内置：`deepseek-harness` `packages/host/plugin-catalog/catalog.json`

## Non-goals

- 不改本机 `install.sh` 部署方式和个人仓包名
- 不重启这台机的 `dsh-web`（除非验证必须）
- 不 force-push、不改写提交历史
- 不把个人仓改成 `@starpivot/*`（本机真身与分享拷贝分离）
- 不把 kanban 的本机挂载改成组织包名

## Constraints

- 组织仓公开，源码会公开
- Discover 安装器只收已发布且带 `dsh.bundle.patch` 的 npm 包
- 包名在 `package.json` `name`、浏览器 `__ModuleLoader__` id、`cordis.patch.yml` `name` 三处一致
- 提交身份 `Wuxie233 <445714414@qq.com>`，命令级 env，不写持久 git config
- npm 以当前 `npm whoami`（wuxie233，已是 `@starpivot/dsh-enter-newline` owner）发布 `--access public`

## Acceptance

- 十个个人仓 `gh repo view` 为 public，带 `dsh-plugin` topic，无未推送提交
- 工作树与近期提交不含 `/flyshop/...` 默认缓存路径、`wenjie-chat`、README 里的 `/root/.dsh/skills`
- `packages/` 含 session-rehome（含设置半）、restart-continue、session-title、kanban
- 新包 `npm view @starpivot/dsh-{session-rehome,restart-continue,session-title,kanban} version` 有 latest
- 组织 catalog 与内置 catalog 都列出这些 `@starpivot/dsh-*` 行
- 本机十个个人仓 remote 仍是 `Wuxie233/dsh-plugin-*`，copy-deploy 包名未改

## Settled decisions

- 先清洗再公开十个仓（含 session-title、kanban）
- 两套货架都补齐
- kanban 改回 bundle 并上两套货架（组织包名 `@starpivot/dsh-kanban`）
- session-rehome / restart-continue / session-title 都做成组织 bundle 并发 npm
- 个人仓继续只服务这台机器
