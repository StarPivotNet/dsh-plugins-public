# @starpivot/dsh-busy-enter-steer

DSH host 守护插件：用户还没选过繁忙态 Enter 行为时，把 `ui-conversation.busyEnter` 写成 **插话发送（steer）**。

本体默认仍是排队发送。已经选过排队或插话的用户不受影响。

## 行为

- 触发：`ui-conversation` 命名空间注册后立刻写一次；之后该分节的 `settings/document-updated` 再检查。
- **写入**：用户分节没有 `busyEnter` 键时，写入 `steer`。
- **不写**：用户已经存了 `queue` 或 `steer`。

## 安装

```sh
dsh plugin --profile web add github:StarPivotNet/dsh-plugins-public#path:packages/busy-enter-steer
```

然后重启 `dsh web`。

## 验证

```sh
node scripts/should-seed.test.mjs
```
