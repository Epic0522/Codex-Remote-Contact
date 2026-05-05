# QQ / LLBot Module / QQ 与 LLBot 模块

This project expects LLBot Desktop or another OneBot-compatible bridge to expose an HTTP API.

本项目需要 LLBot Desktop 或其他 OneBot 兼容桥接器暴露 HTTP API。

Default API base / 默认 API 地址：

```text
http://127.0.0.1:3000
```

Override with / 可通过环境变量覆盖：

```bash
ONEBOT_API_BASE=http://127.0.0.1:3000
```

The package does not include QQ or LLBot binaries. Put the LLBot app here if you want the launcher source to open it:

不包含 QQ 或 LLBot 二进制文件。如果希望启动器源码自动打开 LLBot，可以把 LLBot App 放在这里：

```text
modules/qq-llbot/LLBot.app
```

QQ group behavior / QQ 群聊行为：

- QQ channel defaults to off.
- QQ 通道默认关闭。
- Only allowed groups are handled.
- 只处理白名单群。
- Group messages trigger only on mention or reply.
- 群消息只在被 @ 或被回复时触发。
- Ban and unban are handled inside QQ groups.
- ban 和 unban 可在 QQ 群内处理。
