# iMessage Module / iMessage 模块

This module is implemented in `src/server.js`.

本模块逻辑位于 `src/server.js`。

Responsibilities / 职责：

- Poll the local Messages database.
- 轮询本机 Messages 数据库。
- Accept commands from trusted handles only.
- 只接受可信联系人发送的指令。
- Send iMessage replies through macOS automation.
- 通过 macOS 自动化发送 iMessage 回复。
- Keep a rolling private-message context in `data/imessage-memory.json`.
- 在 `data/imessage-memory.json` 保存私聊滚动上下文。
- Route `/远程执行` messages to the Codex CLI remote execution channel.
- 将 `/远程执行` 模式下的消息转发到 Codex CLI 远程执行通道。

Required macOS permissions / 需要的 macOS 权限：

- Full Disk Access for the process that runs Hub.
- 给运行 Hub 的进程授予“完全磁盘访问权限”。
- Automation permission for Messages.
- 给“信息”相关自动化授予权限。
- Accessibility and Screen Recording when remote execution mode needs GUI control.
- 远程执行模式需要 GUI 控制时，还需要“辅助功能”和“屏幕录制”权限。
