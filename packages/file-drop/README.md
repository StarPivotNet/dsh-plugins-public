# @starpivot/dsh-file-drop

dsh Web 对话区拖入非图片文件时，不再弹出「仅支持 PNG、JPG、WebP、GIF」。
插件在 capture 阶段接手这次拖放，把本机路径写进输入框。

## 行为

- **图片**（PNG / JPG / WebP / GIF）仍走官方附件栏。
- **其它文件或文件夹**写入输入框，一行一个路径。含空格的路径会加引号。
- Finder / 桌面端能给出 `file://` 或 `File.path` 时，插入真实本机路径。
- 浏览器拿不到路径时，Host 把文件写到 `~/.dsh/dropped/<uuid>-<name>`，再插入这条路径。单文件上限 8 MiB。
- 锁定、只读或没有可用输入框时，不会插入。

## 安装

```sh
dsh plugin --profile web add @starpivot/dsh-file-drop
# or, from git:
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/file-drop
```

然后重启 `dsh web` 或桌面端。

## 文件

```
package.json        包声明 + dsh.bundle.patch + dsh.client 清单
cordis.patch.yml    bundle 挂载层（id: file-drop / ui-file-drop）
src/logic.ts        分类、路径解析、插入拼接
src/host.ts         Host RPC：stage 无路径文件
src/client.ts       capture 阶段拖放拦截
src/plugin.ts       浏览器入口
lib/                构建产物
README.md           本文件
```
