# @starpivot/dsh-kanban

DeepSeek Harness Web 任务看板。分享拷贝源自 [Ericwong5021/dsh-kanban](https://github.com/Ericwong5021/dsh-kanban) 的独立维护 fork：侧栏底部「任务看板」把中间会话区切成五列板（收件箱 / 待开始 / 进行中 / 需处理 / 已完成）。卡仍是现有会话。

上游 MIT，版权仍归原作者。差异见 [FORK.md](FORK.md)。

## 行为

- 侧栏脚「任务看板」打开 `/kanban`，隐藏中间会话区，离开后回到原会话。
- Running / 等人点 / 已完成跟会话状态走；空闲卡可拖 Inbox / Ready。
- 已归档会话、子代理会话、从未交互过的空白会话都不进看板，侧栏数字也不计它们。
- 「新建任务」选工作区、标题、提示词，创建会话并立刻 prompt。
- 手工列位置存在 host 的 `$DSH_HOME/kanban-columns.json`，换设备看同一台 dsh 也一样。旧浏览器 `localStorage` 会在 host 文件为空时迁一次。

## 安装

```sh
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/kanban
```

或 npm：

```sh
dsh plugin --profile web add @starpivot/dsh-kanban
```

然后重启 `dsh web`，刷新页面。

## 维护

- 本目录是组织分享拷贝；运行时目录可丢弃。
- 改完：`pnpm build`，再提交。git 安装看到新提交后重启即可。
- 包名出现在三处，必须一起改：`package.json` 的 `name`、`tsdown.config.ts` 的 `id`（进 `lib/client.js`）、`cordis.patch.yml` 挂载行的 `name`。列路由 `COLUMNS_ROUTE` 也必须用组织包名。

## 文件

```
src/index.ts              host 半：列覆盖文件 + HTTP
src/columns-store.ts      读写 `$DSH_HOME/kanban-columns.json`
src/client/index.ts       侧栏 footer 注册
src/client/Kanban.tsx     板 + /kanban 切换
src/client/columns.ts     浏览器读/写 host 列覆盖
src/client/Kanban.module.css
cordis.patch.yml          bundle 挂载层
FORK.md                   与上游 / 个人 fork 的差异
```

## License

MIT（上游版权仍属 Ericwong5021）
