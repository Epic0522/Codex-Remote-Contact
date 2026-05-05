# Shadowrocket Module / Shadowrocket 模块

`shadowrocket-node-control.command` reads Shadowrocket's local App Group files and can:

`shadowrocket-node-control.command` 会读取 Shadowrocket 的本地 App Group 文件，可以：

- Show the current selected node.
- 显示当前选中的节点。
- List nodes.
- 列出节点。
- Run TCP entry probes.
- 执行入口 TCP 探测。
- Check whether the active route can reach common services.
- 检查当前线路是否能访问常见服务。
- Resolve and switch to a target node after confirmation.
- 解析目标节点，并在确认后切换。

This module does not cache node lists. It reads Shadowrocket's current `ServerManager` and preference plist each time.

本模块不缓存节点列表，每次都会重新读取 Shadowrocket 当前的 `ServerManager` 和偏好设置 plist。

Required permission / 需要权限：

- Full Disk Access for the process that runs Hub.
- 给运行 Hub 的进程授予“完全磁盘访问权限”。

Shadowrocket may need to be restarted before its UI reflects a changed selected node, although macOS network configuration can update earlier.

节点切换后，macOS 小组件会自动更新，但 Shadowrocket UI 需要重启 App 才会显示最新使用中的节点。
