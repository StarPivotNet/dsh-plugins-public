# @starpivot/dsh-skill-router

二级 skill 路由插件：把模型可见的会话 skill 目录（catalog）过滤为 router + 独立 skill，路由子 skill 隐藏但仍可按名加载。

## 行为

扫描 `~/.dsh/skills/`（可配 `skillRoot` / `extraRoots`）下每个 skill 的 SKILL.md frontmatter：

| 声明 | 目录可见性 |
| --- | --- |
| `exposure: root` | 显示（router / 直接可用的专家） |
| `exposure: explicit` | 隐藏（`/name` 手势或 router 正文点名加载） |
| `routers: [name, ...]`（无 exposure） | 隐藏（router 路由，`skill` 工具按名可加载） |
| 两者都没有 | 显示（独立 skill） |

隐藏发生时目录末尾追加一行提示。durable `source.entries` 保持全量不动，避免触发目录重发。

## 安装

```sh
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/skill-router
```

然后重启 `dsh web`。

## 配置（可选）

```yaml
- insert:
    - id: skill-router
      name: '@starpivot/dsh-skill-router'
      config:
        skillRoot: /root/.dsh/skills
        extraRoots: []
```
