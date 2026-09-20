## 当前接入方式：dsh-std adapter

本插件通过 dsh-plugin.json 声明标准 host facet；lib/index.js 发布
plugins.starpivot.dev/v1 HostPlugin，lib/host.js 保留业务策略并接收 adapter API。
有浏览器界面的插件另声明 LocalModule，使用私有 WebPlugin surface。

执行 ./install.sh 会先验证全部九个自制插件的组合、Web 界面与 CodeCarry
原生 Remote，再备份并复制部署；失败不替换生产插件。需先安装同级 dsh-std
维护仓库及其依赖。部署后在没有活跃任务时重启 dsh，并刷新 Web。

不要把 lib/index.js 直接作为 Cordis 插件挂载；原插件的 cordis insert 行由
共享部署器移除，配置迁入 adapter.componentConfigs。不要链接运行时插件目录。
标准协议不承诺未来版本永久兼容；native ctx/hooks 的变化由候选门禁和集中
adapter 维护控制。Web 界面不会自动出现在原生 Android 中。

下方保留业务说明和历史修复记录；涉及旧式直接挂载、导入和安装步骤的内容，
以本节为准。

# dsh-plugin-busy-enter-steer

DSH host 守护插件：用户还没选过繁忙态 Enter 行为时，把 `ui-conversation.busyEnter` 写成 **插话发送（steer）**。

本体默认仍是排队发送。本插件不改 DSH 源码，只在本机用户设置里补一条显式覆盖。已经选过排队或插话的用户不受影响。

## 行为

- 触发：`ui-conversation` 命名空间注册后立刻写一次；之后该分节的 `settings/document-updated` 再检查。
- **写入**：用户分节没有 `busyEnter` 键时，写入 `steer`。
- **不写**：用户已经存了 `queue` 或 `steer`。
- 发送按钮、空闲态 Enter、已寻址 subagent 继续走本体 Queue。

## 安装 / 更新

```sh
./install.sh
# ~/.dsh/profiles/web/cordis.patch.yml:
#   - insert:
#       - id: busy-enter-steer
#         name: dsh-plugin-busy-enter-steer
# 重启 dsh web（host 半）
```

## 验证

- 部署后：`cd ~/.dsh/profiles/web && node -e "await import('dsh-plugin-busy-enter-steer')"`
- 纯函数：`node scripts/should-seed.test.mjs`
- 生效：`~/.dsh/settings.yaml` 出现 `ui-conversation.busyEnter: steer`；设置页「繁忙时 Enter 键行为」显示「插话发送」
