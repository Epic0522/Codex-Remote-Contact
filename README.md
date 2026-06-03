<div align="center">

# Codex Remote Contact

### 我不想整 API

**A local macOS contact hub for iMessage, QQ/OneBot, Codex CLI, and remote execution.**  
**一个面向 iMessage、QQ/OneBot、Codex CLI 与远程执行的 macOS 本地联系中枢。**

![Node.js](https://img.shields.io/badge/Node.js-20+-339933)
![macOS](https://img.shields.io/badge/macOS-14%2B-blue)
![Memory](https://img.shields.io/badge/free%20memory-3GB%2B-orange)
![Optional Packages](https://img.shields.io/badge/optional%20packages-supported-purple)

</div>

---

## Introduction / 介绍

Codex Remote Contact runs on your Mac and connects iMessage, QQ/OneBot, Codex CLI, local automation scripts, proxy node control, and a web console into one local service.

Codex Remote Contact 运行在 macOS 本机，把 iMessage、QQ/OneBot、Codex CLI、本机自动化脚本、代理节点控制和 Web 控制台接到同一个本地服务里。

The main program is intentionally usable by itself. Optional update packages such as `qq-enhancer` and `unified-memory` can be placed next to it when you need enhanced QQ group-chat behavior or cross-device memory.

主程序可以独立启动。需要更强的 QQ 群聊能力或跨端记忆时，再把 `qq-enhancer`、`unified-memory` 等可选升级包放到旁边即可。

## Highlights / 功能亮点

| Module / 模块 | Description / 说明 |
| :--- | :--- |
| iMessage console / iMessage 控制台 | Receive trusted commands such as `/状态`, `/维护`, `/开启QQ`, `/关闭QQ`, `/节点检查`, `/切换节点`, and `/远程执行`.<br>接收可信联系人发来的 `/状态`、`/维护`、`/开启QQ`、`/关闭QQ`、`/节点检查`、`/切换节点`、`/远程执行` 等指令。 |
| iMessage private replies / iMessage 私聊回复 | Generate replies through Codex CLI, keep an independent rolling context, recover the polling cursor after database permission failures, and support one-message model overrides.<br>调用 Codex CLI 生成回复，保存独立滚动上下文，在数据库权限故障后自动恢复轮询游标，并支持单条消息临时切换模型。 |
| QQ/OneBot channel / QQ 通道 | Receive QQ group and private messages, ignore untranscribed voice messages, inspect explicitly mentioned images, expand recent context when needed, and keep lightweight member personas.<br>接收 QQ 群聊和私聊，忽略尚未转写的语音消息，识别明确 @ 附图，在需要时继续向前翻上下文，并保存轻量群友画像。 |
| Remote execution / 远程执行模式 | Start a full Codex CLI local task channel from iMessage.<br>通过 iMessage 开启完整 Codex CLI 本机任务通道。 |
| Proxy and system control / 代理与系统控制 | Control Shadowrocket node status/check/switching, keep-awake, display sleep, and built-in-display backlight helper scripts.<br>支持 Shadowrocket 节点状态、测速、切换确认，以及防休眠、显示器休眠、内置屏背光控制脚本。 |
| Optional packages / 可选升级包 | Load `qq-enhancer` and `unified-memory` when present; fall back cleanly when absent.<br>存在时加载 `qq-enhancer` 与 `unified-memory`；不存在时自动降级。 |

## Quick Navigation / 快速导航

- [Project Structure / 项目结构](#project-structure--项目结构)
- [Optional Package Layout / 可选升级包结构](#optional-package-layout--可选升级包结构)
- [Requirements / 安装要求](#requirements--安装要求)
- [Deployment Guide / 部署教程](#deployment-guide--部署教程)
- [Common Commands / 常用指令](#common-commands--常用指令)
- [Environment Variables / 环境变量](#environment-variables--环境变量)
- [Troubleshooting / 故障排查](#troubleshooting--故障排查)
- [Notice / 注意事项](#notice--注意事项)

---

## Project Structure / 项目结构

```text
codexremotecontact/
  src/server.js                         # Hub main process / Hub 主进程
  modules/
    imessage/                           # iMessage notes / iMessage 模块说明
    qq-llbot/                           # QQ/LLBot notes / QQ/LLBot 模块说明
    shadowrocket/                       # Shadowrocket scripts / 节点控制脚本
    system-control/                     # Keep-awake and backlight scripts / 系统控制脚本
    web-console/public/                 # Web console / 网页控制台
    mac-client/                         # macOS WebKit client source / macOS 客户端源码
    macos-launcher/                     # Launcher source / 启动器源码
  config/
    settings.example.json               # Example settings / 配置示例
    local.codexremotecontact.chat-hub.plist.example
  data/                                 # Empty settings and memory files / 空配置与记忆文件
  runtime/                              # Runtime logs and generated files / 运行时文件
  workspaces/codex-cli/                 # Codex CLI temporary workspace / 临时工作区
```

## Optional Package Layout / 可选升级包结构

Recommended layout:

推荐目录结构：

```text
Projects/
  codexremotecontact/
  qq-enhancer/
  unified-memory/
```

The hub tries to load optional packages in this order:

主程序会按以下顺序尝试加载可选升级包：

| Order / 顺序 | Source / 来源 |
| :--- | :--- |
| 1 | Environment module paths, such as `CODEX_REMOTE_CONTACT_QQ_ENHANCER_MODULE` and `CODEX_REMOTE_CONTACT_UNIFIED_MEMORY_MODULE`.<br>环境变量指定的模块路径。 |
| 2 | Local development folders under `src/` or `modules/`.<br>主程序内部 `src/` 或 `modules/` 下的本地开发目录。 |
| 3 | Sibling packages such as `../qq-enhancer/` and `../unified-memory/`.<br>同级目录中的 `../qq-enhancer/` 和 `../unified-memory/`。 |
| 4 | Built-in no-op fallbacks.<br>内置空实现降级。 |

This means a clean download of `codexremotecontact` can start without QQ Enhancer or Unified Memory.

这意味着只下载 `codexremotecontact` 也可以启动，不需要强制安装 QQ 增强或统一记忆。

---

## Requirements / 安装要求

| Requirement / 要求 | Notes / 说明 |
| :--- | :--- |
| macOS 14 Sonoma or later | Tested on macOS 15.7. macOS 14 is expected to work.<br>建议 macOS 14 Sonoma 或更高版本；已在 macOS 15.7 上验证，低一个大版本预计可用。 |
| Node.js 20+ | Used to run the hub. / 用于运行 Hub。 |
| 3GB+ free memory | Recommended when Codex CLI, browser views, QQ bridge, and the hub run together.<br>建议至少 3GB 可用内存，尤其是同时运行 Codex CLI、网页控制台、QQ 桥接器和 Hub 时。 |
| OpenAI Codex CLI or Codex.app bundled CLI | Used for reply generation and remote execution. / 用于生成回复和远程执行。 |
| LLBot Desktop or OneBot-compatible bridge | Required only for QQ. / 仅 QQ 通道需要。 |
| Messages app signed in | Required only for iMessage. / 仅 iMessage 通道需要。 |
| Shadowrocket | Required for proxy connects. / 代理连接至OpenAI服务器需要。 |

Install the basic dependency:

安装基础依赖：

```bash
brew install node
```

Optional dependencies:

可选依赖：

```bash
brew install brightness
xcode-select --install
```

---

## Deployment Guide / 部署教程

### 1. Place the project / 放置项目

Put the source folder somewhere stable. Avoid Downloads for long-running deployments.

把源码放在长期稳定的位置。准备常驻运行时，不建议放在 Downloads。

```bash
PROJECT_DIR="$HOME/codexremotecontact"
cd "$PROJECT_DIR"
```

If macOS quarantines the downloaded zip package:

如果 macOS 隔离了下载的 zip 包：

```bash
xattr -dr com.apple.quarantine "$PROJECT_DIR"
```

### 2. Configure settings / 配置设置

Edit:

编辑：

```bash
open -e "$PROJECT_DIR/data/settings.json"
```

Minimal example:

最小配置示例：

```json
{
  "version": 1,
  "updatedAt": null,
  "qq": {
    "allowedGroups": ["QQ group id"],
    "ownerUserIds": ["administrator QQ id"],
    "bannedUserIds": [],
    "enhancer": {
      "enabled": false
    },
    "proactive": {
      "enabled": false,
      "minIntervalMs": 180000
    }
  },
  "imessage": {
    "trustedHandles": ["trusted phone number or email"],
    "replyHandle": "iMessage account used for replies"
  },
  "remoteExecution": {
    "model": "gpt-5.4",
    "reasoningEffort": "medium",
    "skill": ""
  },
  "branding": {
    "assistantName": "assistant",
    "ownerLabel": "owner",
    "assistantMentions": ["@assistant"]
  }
}
```

Put deployment-specific assistant voice in an external profile file:

可以把自己的助手语气写进外部 profile 文件：

```bash
export CODEX_REMOTE_CONTACT_ASSISTANT_PROFILE_PATH="/absolute/path/to/assistant-profile.md"
```

### 3. Grant macOS permissions / 授予 macOS 权限

Grant permissions to the process that actually runs the hub. For Terminal deployment this is usually `Terminal`, `iTerm`, or `node`; for app deployment it is the compiled client or launcher.

权限需要给到实际运行 Hub 的进程。终端运行时通常是 `Terminal`、`iTerm` 或 `node`；App 运行时则是编译后的客户端或启动器。

| Permission / 权限 | Required for / 用途 |
| :--- | :--- |
| Full Disk Access / 完全磁盘访问 | iMessage database and Shadowrocket configuration. / 读取 iMessage 数据库和 Shadowrocket 配置。 |
| Automation / 自动化 | AppleScript control of Messages, System Events, Shadowrocket, and other apps. / 通过 AppleScript 控制“信息”、System Events、Shadowrocket 等 App。 |
| Accessibility / 辅助功能 | GUI operations in remote execution mode. / 远程执行模式操作 GUI。 |
| Screen Recording / 屏幕录制 | Screenshots or screen inspection in remote execution mode. / 远程执行模式截图或看屏幕。 |

### 4. Prepare iMessage / 准备 iMessage

Sign in to Messages on the Mac and make sure `replyHandle` can send iMessages to the configured `trustedHandles`.

在 Mac 的“信息”App 登录账号，并确认 `replyHandle` 能向 `trustedHandles` 发送 iMessage。

For a one-message model or reasoning override, add a directive line before or after the message body:

普通 iMessage 私聊可以在正文前或正文后追加一次性模型或思考强度指令：

```text
/5.5 /high
Analyze this problem
```

Common aliases include `/5.5`, `/5.4`, `/mini`, `/low`, `/medium`, `/high`, and `/xhigh`. These overrides affect only the current reply.

常用别名包括 `/5.5`、`/5.4`、`/mini`、`/low`、`/medium`、`/high` 和 `/xhigh`，只影响当前这一条回复。

### 5. Prepare QQ / OneBot / 准备 QQ 与 OneBot

Install and launch LLBot Desktop or another OneBot-compatible bridge separately. The default API base is:

单独安装并启动 LLBot Desktop 或其他 OneBot 兼容桥接器。默认 API 地址：

```text
http://127.0.0.1:3000
```

Override if needed:

如需覆盖：

```bash
export ONEBOT_API_BASE="http://127.0.0.1:3000"
```

### 6. Start the hub / 启动 Hub

Development mode:

开发模式：

```bash
cd "$PROJECT_DIR"
npm start
```

Open the web console:

打开 Web 控制台：

```text
http://localhost:3789
```

Health check:

健康检查：

```bash
curl http://localhost:3789/api/state
```

### 7. Run with launchd / 使用 launchd 常驻运行

```bash
"$PROJECT_DIR/modules/install-launchd-plist.command"
"$PROJECT_DIR/modules/chat-hub-start.command"
```

Stop:

停止：

```bash
"$PROJECT_DIR/modules/stop-chat-hub.command"
```

Logs:

日志：

```text
$PROJECT_DIR/runtime/logs/chat-hub.log
$PROJECT_DIR/runtime/logs/chat-hub.err.log
```

### 8. Optional client and launcher / 可选客户端与启动器

Build them locally if you want to use the macOS client or launcher.

如果需要 macOS 客户端或启动器，请在本机自行构建。

```bash
"$PROJECT_DIR/modules/mac-client/script/build_and_run.sh" --build-only
"$PROJECT_DIR/modules/macos-launcher/build-launcher.command"
"$PROJECT_DIR/modules/start-all.command"
```

`start-all.command` starts the hub and opens the compiled client if available. It does not start LLBot.

`start-all.command` 会启动 Hub 并打开已构建的客户端，但不会自动启动 LLBot。

---

## Optional Packages / 可选升级包

### QQ Enhancer

```text
Projects/
  codexremotecontact/
  qq-enhancer/
```

Enable in `data/settings.json`:

在 `data/settings.json` 中启用：

```json
{
  "qq": {
    "enhancer": {
      "enabled": true
    },
    "proactive": {
      "enabled": true,
      "minIntervalMs": 180000
    }
  }
}
```

Manual module path:

手动指定模块：

```bash
export CODEX_REMOTE_CONTACT_QQ_ENHANCER_MODULE="/absolute/path/to/qq-enhancer/src/qq-enhancer/index.js"
```

### Unified Memory

```text
Projects/
  codexremotecontact/
  unified-memory/
```

Custom data paths:

自定义数据路径：

```bash
export UNIFIED_MEMORY_PATH="/absolute/path/to/unified-memory.json"
export UNIFIED_MEMORY_SETTINGS_PATH="/absolute/path/to/settings.json"
```

Manual module path:

手动指定模块：

```bash
export CODEX_REMOTE_CONTACT_UNIFIED_MEMORY_MODULE="/absolute/path/to/unified-memory/src/unified-memory/index.js"
```

---

## Common Commands / 常用指令

```text
/状态
/维护
/开启QQ
/关闭QQ
/开启iMessage
/关闭iMessage
/清空QQ记忆
/清除记忆
/白名单
/加群 群号
/删群 群号
/联网开
/联网关
/代理状态
/代理开
/代理关
/当前节点
/节点列表
/入口测速 关键词
/节点检查
/切换节点 目标
/关闭背光
/恢复背光
/远程执行
/确认
/取消
/帮助
```

`/切换节点` and `/远程执行` require confirmation with `/确认` or `/取消`.

`/切换节点` 和 `/远程执行` 需要使用 `/确认` 或 `/取消` 二次确认。

---

## Environment Variables / 环境变量

```bash
ONEBOT_API_BASE=http://127.0.0.1:3000
CODEX_CLI_PATH=/Applications/Codex.app/Contents/Resources/codex

CODEX_REMOTE_CONTACT_CODEX_MODEL=gpt-5.4-mini
CODEX_REMOTE_CONTACT_REASONING_EFFORT=low

CODEX_REMOTE_CONTACT_IMESSAGE_CODEX_MODEL=gpt-5.4
CODEX_REMOTE_CONTACT_IMESSAGE_REASONING_EFFORT=medium
CODEX_REMOTE_CONTACT_IMESSAGE_MEMORY_LIMIT=120

CODEX_REMOTE_CONTACT_QQ_MEMORY_LIMIT=10
CODEX_REMOTE_CONTACT_QQ_GROUP_MEMORY_LIMIT=30
CODEX_REMOTE_CONTACT_QQ_WEB_LOOKUP=1
CODEX_REMOTE_CONTACT_QQ_WEB_TIMEOUT_MS=12000
CODEX_REMOTE_CONTACT_QQ_WEB_PROVIDER=auto

CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_MODEL=gpt-5.4
CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_REASONING_EFFORT=medium
CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_MEMORY_LIMIT=160
CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_IDLE_TTL_MS=900000
CODEX_REMOTE_CONTACT_REMOTE_EXECUTION_SKILL=

CODEX_REMOTE_CONTACT_SKILL_PATHS=custom-name=/absolute/path/to/SKILL.md
CODEX_REMOTE_CONTACT_ASSISTANT_PROFILE_PATH=/absolute/path/to/assistant-profile.md
CODEX_REMOTE_CONTACT_QQ_ENHANCER_MODULE=/absolute/path/to/qq-enhancer/src/qq-enhancer/index.js
CODEX_REMOTE_CONTACT_UNIFIED_MEMORY_MODULE=/absolute/path/to/unified-memory/src/unified-memory/index.js
```

---

## Troubleshooting / 故障排查

| Problem / 问题 | Check / 排查 |
| :--- | :--- |
| Port already in use / 端口占用 | `lsof -nP -iTCP:3789 -sTCP:LISTEN` |
| iMessage cannot be read / 无法读取 iMessage | Grant Full Disk Access and restart the hub.<br>授予完全磁盘访问权限并重启 Hub。 |
| Messages cannot send replies / 无法发送信息回复 | Grant Automation permission for Messages.<br>授予“信息”自动化权限。 |
| QQ does not respond / QQ 不响应 | Check LLBot, `ONEBOT_API_BASE`, allowed groups, QQ switch, and ban list.<br>检查 LLBot、`ONEBOT_API_BASE`、白名单群、QQ 总开关和 ban 列表。 |
| Remote execution GUI operations fail / 远程执行 GUI 操作失败 | Grant Accessibility and Screen Recording to the running process and Codex.<br>给运行进程和 Codex 授予辅助功能、屏幕录制权限。 |
| Shadowrocket commands fail / Shadowrocket 指令失败 | Verify Shadowrocket is installed and grant Full Disk Access to the hub.<br>确认已安装 Shadowrocket，并给 Hub 完全磁盘访问权限。 |

---

## Notice / 注意事项

Add your own configuration through `data/settings.json`, environment variables, and external profile files.

部署前应在 `data/settings.json`、环境变量和外部 profile 文件中填写自己的配置。

This is a local automation tool. Before enabling iMessage, QQ, remote execution, proxy control, or GUI control, make sure you understand the related permissions and local security impact.

本项目是本机自动化工具。启用 iMessage、QQ、远程执行、代理控制或 GUI 控制前，请确认你理解对应权限和本机安全影响。
