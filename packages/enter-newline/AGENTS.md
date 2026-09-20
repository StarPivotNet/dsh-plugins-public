## dsh-std 集成约定（优先于下文旧部署说明）

- 当前入口是标准 facet，不再是 Cordis 插件；业务在 lib/host.js 的 createHost(api)。
- 原生 @deepseek-ai 导入只允许集中在同级 dsh-std/packages/adapter-dsh；插件通过 api 获取。
- session snapshots/read 和 Web composer 适配优先复用 adapter helper，未知日志 API 必须报错，不能当空会话。
- install.sh 运行全套候选门禁后复制部署；禁止手工追加旧 Cordis mount 行或只复制 index.js。
- 修改后必须运行本仓库 scripts/*.test.mjs（如存在）及共享 check-candidate.py；Web 插件须通过真实浏览器检查。
- 更新 DSH 前用独立、已安装依赖的候选源码运行门禁；通过后再切换生产版本。原生 ctx/events 仍需候选版本验证。

# AGENTS.md

dsh Web 客户端插件：输入框回车行为开关（设置 → 通用 → 回车行为）。

## Architecture

- 双半插件：`lib/index.js`（host 半，注册 `ui-enter-newline` 设置命名空间 schema）+ `lib/client.js`（浏览器半，设置行 + document 捕获阶段回车拦截器）。
- 手写 bundle，无构建步骤：`lib/client.js` 必须是纯 JS（无 JSX/TS），用 `React.createElement`；通过 `window.__ModuleLoader__.load({ id, factory(require) })` 注册。`require` 只能解析平台模块表：`react` / `react-dom` / `@deepseek-ai/cordis` / `dsh-client-store` / `dsh-client-ui-slots` / `dsh-client-ui-primitives`。`createSnapshotStore` 走 `@deepseek-ai/dsh-client-store`，不要再 require 已移除的 `@deepseek-ai/dsh-client-runtime/client`。
- 源码真身在本仓库；`install.sh` 把 `package.json + lib/` 复制部署到 `$DSH_HOME/profiles/node_modules/<包名>/`。挂载行在 `~/.dsh/profiles/web/cordis.patch.yml`。

## Conventions

- 改动流程：编辑 → `./install.sh` → 刷新页面（浏览器半生效）；host 半改动需重启 dsh web。
- 提交身份用命令级 env 覆盖（`GIT_AUTHOR_NAME=Wuxie233` 等），不要写持久 git config。
- 面向用户的说明写在 `README.md`；本文件只沉淀跨会话的运维知识。

## Gotchas & Decisions

- **不要用符号链接部署**：Node ESM 解析 symlink 时取真实路径，然后从仓库真实位置向上找依赖（`@deepseek-ai/dsh-settings` 等），会 `ERR_MODULE_NOT_FOUND`。必须复制部署（已实测复现）。
- **包名出现在三处**，改名必须一起改：`package.json` 的 `name`、`lib/client.js` 的 `__ModuleLoader__.load({ id })`、`cordis.patch.yml` 挂载行的 `name`。
- **client 插件必须导出 `inject`**（本插件为 `['slots','locale','connection','remote','settingsScope']`），否则 runner 拒绝 `ctx.slots` 等服务访问（"service not declared by your plugin"）。
- **新增 host 端设置命名空间必须注册 schema**，否则浏览器端 `settingsScope.bind` 读不到命名空间（describe 缺失 → 永远 unavailable，不持久化）。
- 拦截器守卫（勿删）：IME 组合中（`isComposing || keyCode === 229`）不拦截；输入面有 `aria-activedescendant`（斜杠菜单开着）时不拦截；Shift+回车发送通过"合成纯回车 keydown + 重入标志"实现，走产品自身提交路径。
- 0.1.2-alpha.1 之后 composer 是 Lexical contenteditable（`[data-composer-input]`），不再是 textarea。拦截器必须认这个表面；换行用 `document.execCommand('insertLineBreak')`。旧 textarea 路径只作回退。

## Commands

- `./install.sh` — 部署到运行时（幂等）
- `node --check lib/client.js` — 语法检查（ESM 的 index.js 复制为 .mjs 再查）
- 生效验证：host 半 `cd ~/.dsh/profiles/web && node -e "await import('@deepseek-ai/dsh-client-enter-newline')"`

## Module Map

单包单插件，无子模块。参见 `README.md` 的文件清单。
