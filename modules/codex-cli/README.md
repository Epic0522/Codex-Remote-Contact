# Codex CLI Module / Codex CLI 模块

Codex CLI integration is implemented in `src/server.js`.

Codex CLI 集成逻辑位于 `src/server.js`。

Default CLI path / 默认 CLI 路径：

```text
/Applications/Codex.app/Contents/Resources/codex
```

Override with / 可通过环境变量覆盖：

```bash
CODEX_CLI_PATH=/path/to/codex
```

Temporary work happens in / 临时工作目录：

```text
workspaces/codex-cli/
runtime/replies/
```

Remote execution mode is intentionally gated behind confirmation.

远程执行模式默认需要二次确认。
