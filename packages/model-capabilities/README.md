# @starpivot/dsh-model-capabilities

DSH 后台守护插件：自动补全 `llm-pi-ai` 各路由模型条目缺失的能力字段（上下文窗口、输出上限、输入模态、推理档位、compat）。补完的配置经 settings 服务写入 `~/.dsh/settings.yaml`，热加载即时生效。

## 行为

- 触发：启动（llm-pi-ai 命名空间注册后）／`llm-pi-ai` 设置变更（防抖 5s）／每 12h 定期重扫。
- 来源链：本地 `~/.dsh/model-capabilities.overrides.json` → 最新 pi-ai catalog → 已安装 catalog → models.dev。
- 只补缺失字段，不覆盖已写字段。

## 安装

```sh
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/model-capabilities
```

然后重启 `dsh web`。
