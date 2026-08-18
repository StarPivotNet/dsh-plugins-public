# @starpivot/dsh-enter-newline

dsh Web 输入框「回车行为」开关插件：在 **设置 → 通用 → 回车行为** 里选择回车是
发送消息还是换行。

## 行为

| 模式 | 回车 | Shift+回车 | Ctrl/Cmd+回车 |
| --- | --- | --- | --- |
| 回车发送（默认） | 发送 | 换行 | 保持产品行为（插话/加速发送） |
| 回车换行 | 换行 | 发送 | 保持产品行为（插话/加速发送） |

其他守卫：输入法组合中不拦截；斜杠菜单打开时回车仍用于选中菜单项；
设置持久化在 dsh 用户设置的 `ui-enter-newline` 命名空间（`~/.dsh/settings.yaml`）。

## 安装

```sh
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/enter-newline
```

然后重启 `dsh web`。

## 文件

```
package.json        包声明 + dsh.bundle.patch + dsh.client 清单
cordis.patch.yml    bundle 挂载层（id: ui-enter-newline）
lib/index.js        host 半：注册 ui-enter-newline 设置命名空间 schema
lib/client.js       浏览器半：设置行 + 回车拦截器
README.md           本文件
```
