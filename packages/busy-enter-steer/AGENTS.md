## dsh-std 集成约定（优先于下文旧部署说明）

- 当前入口是标准 facet，不再是 Cordis 插件；业务在 lib/host.js 的 createHost(api)。
- 原生 @deepseek-ai 导入只允许集中在同级 dsh-std/packages/adapter-dsh；插件通过 api 获取。
- session snapshots/read 和 Web composer 适配优先复用 adapter helper，未知日志 API 必须报错，不能当空会话。
- install.sh 运行全套候选门禁后复制部署；禁止手工追加旧 Cordis mount 行或只复制 index.js。
- 修改后必须运行本仓库 scripts/*.test.mjs（如存在）及共享 check-candidate.py；Web 插件须通过真实浏览器检查。
- 更新 DSH 前用独立、已安装依赖的候选源码运行门禁；通过后再切换生产版本。原生 ctx/events 仍需候选版本验证。

# busy-enter-steer

DSH host-only 守护插件：用户未覆盖 `ui-conversation.busyEnter` 时写入 `steer`。

## Architecture

- 单半插件（仅 host，无浏览器半、无 `dsh.client`）：`lib/index.js` 等 `ui-conversation` 注册后 `settings.mutate`。
- 判定在 `lib/logic.js` 的 `shouldSeedSteer`：只看用户分节有没有 `busyEnter` 键，不比较解析后的默认值。
- 本体产品默认仍是 Queue；本插件把本机未设置用户变成显式 Steer。

## Conventions

- 源码真身在本仓库；`install.sh` 复制部署到 `$DSH_HOME/profiles/node_modules/<包名>/`（绝不 symlink）。
- host 半改动必须重启 dsh web。
- 提交身份用命令级 env 覆盖，不写持久 git config。

## Gotchas & Decisions

- **不要改 DSH 源码默认值**：升级会冲掉；本插件只写用户文档。
- **对照 DSH 0.1.2-alpha.1 (`5858da2d27`)**：host 半 `ui-conversation` 仍 `settings.register(settingsNamespace('ui-conversation'), ConversationSettingsSchema)`；字段 `busyEnter`，产品默认 `queue`（`z.union(['queue','steer']).default('queue')`）。`describe()` 仍给 `ns` / `user` / `revision`；写入仍是 `mutate(ns, [{ op: 'set', path: ['busyEnter'], value: 'steer' }], revision)`，冲突抛 `SettingsConflictError`；`settings/document-updated (ns, revision)` 在原始用户分节变化时触发。用户覆盖以 `user` 分节是否有该键为准，不要比较解析后的默认值。
- **不要在用户已选 Queue 后再写回 Steer**：监听 `settings/document-updated` 时必须先看用户分节是否已有该键。
- **`@deepseek-ai/dsh-settings` peer 钉 `^0.1.2-alpha.1`**：默认 semver 下 `^0.1.0-rc.6` 不包含 `0.1.2-alpha.1`。
- **不要用 symlink 部署**：Node ESM 会解析到仓库路径，然后找不到 `@deepseek-ai/dsh-settings`。
- **包名两处一致**：`package.json` `name` 与 `cordis.patch.yml` 挂载行 `name`。
- **Config 必须是 schemastery schema**，不能是普通函数。

## Commands

- `./install.sh` — 部署（幂等）
- `node scripts/should-seed.test.mjs` — 纯函数
- `node --check`：ESM 复制为 `.mjs` 再查
- 生效验证：`cd ~/.dsh/profiles/web && node -e "await import('dsh-plugin-busy-enter-steer')"`

## Module Map

单包。`lib/logic.js` + `lib/index.js`。参见 `README.md`。
