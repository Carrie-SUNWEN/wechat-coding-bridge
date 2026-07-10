# WeChat ↔ Claude Code Bridge

把你的**个人微信**接到你电脑上的 **coding 工具**（默认 **Claude Code**，也支持 **Codex**，或通过 custom 接其它）：在微信里发消息 → 本地工具来回答 → 回复发回微信。还支持**发文件/图片**、**收文件/图片**。

底层走腾讯 2026 年官方开放的 **iLink 个人微信 Bot 通道**（`ilinkai.weixin.qq.com`），扫码登录、官方合法。

---

## ⚠️ 先看清楚能做什么、不能做什么

- ✅ **给你自己做一个"微信版的 AI 助手"**：扫码登录的那个微信号 = 机主，机器人**只回机主本人**，一对一私聊。
- ❌ **加不了好友、进不了群、群里收发不了消息**（这是腾讯上游通道的限制，改代码也没用）。
- 💻 目前在 **Windows** 上跑通；macOS/Linux 理论可行但需小改（代码里有 Windows 专用的进程处理）。

如果你要的是"AI 替你跟好友/客户群聊天"，这套**做不到**，请另找方案（RPA 或企业微信）。

---

## 前置条件

1. **你要用的那个 coding 工具已装好并登录**（默认 **Claude Code**；也支持 **Codex**，或用 custom 接其它）。例如 Claude Code：终端跑 `claude -p "你好"` 能出回复 = OK。
2. **Node.js ≥ 24**（底层包硬性要求）。验证：`node -v`。
3. **Python 3.x**。

## 安装（git clone + 几条命令 + 扫码）

```bash
# 1) 拉代码
git clone https://github.com/Carrie-SUNWEN/wechat-coding-bridge.git
cd wechat-coding-bridge

# 2) 装依赖
npm install                 # 装底层微信通道包 cli-wechat-bridge@1.1.1
pip install -r requirements.txt   # 装 qrcode、pillow(扫码登录用)

# 3) （可选）配置：复制一份再按需改
copy config.example.json config.json    # macOS/Linux 用 cp

# 4) 扫码登录微信：会生成 wechat-login-qr.png，用手机微信扫它、在手机上点"确认登录"
python wechat_login.py

# 5) 启动
python wechat_bridge.py
# Windows 也可直接双击 start.bat
```

启动后，用**扫码登录的那个微信**给机器人对话窗发一句话 → 应先收到"收到，正在想…"，几秒后收到 Claude 的回复。

## 换用别的 coding 工具（adapter）

在 `config.json` 里把 `adapter` 改成下面之一：

| adapter | 说明 | 多轮续接 | 备注 |
|---|---|---|---|
| `claude`（默认） | Claude Code，`claude -p` + stream-json | ✅ | 功能最全，已充分验证 |
| `codex` | Codex CLI，`codex exec` + `resume --last`，用 `-o` 取最终答案 | ✅ | 命令参数依官方 `--help` 实现；首次用建议自测一条 |
| `custom` | 任意"一句话出答案"的 CLI（取 stdout 当回复） | ❌ | 给 opencode 等留的口子，需自己在 config 里填命令 |

> ⚠️ **Codex 和 OpenCode 的"完整交互式"接入**（流式、审批等）非常重，本项目走的是它们的**一次性 headless 模式**（`codex exec` / `<tool> run`），够当微信助手用。要完整交互式体验请直接用底层包 `cli-wechat-bridge` 自带的 `wechat-codex-start` / `wechat-opencode-start`。

custom 示例（接 opencode，**未在本机验证**，按你的版本确认）：

```json
{ "adapter": "custom", "custom": { "cmd": "opencode", "args": ["run", "{prompt}"] } }
```

## 配置项（`config.json`，全部可缺省）

| 字段 | 说明 | 缺省 |
|---|---|---|
| `adapter` | 用哪个工具：`claude` / `codex` / `custom` | `claude` |
| `work_dir` | 工作目录（放你自己的 `CLAUDE.md` / 记忆） | 当前用户主目录 |
| `claude_exe` | [claude] 可执行文件路径 | 自动在 PATH 里找 |
| `effort` | [claude] 思考强度 `low\|medium\|high\|xhigh\|max` | `high` |
| `codex_exe` | [codex] 可执行文件路径 | 自动在 PATH 里找 |
| `codex_exec_args` | [codex] 传给 `codex exec` 的参数 | `--full-auto --skip-git-repo-check` |
| `custom.cmd` / `custom.args` | [custom] 命令 + 参数（`{prompt}` 占位） | — |
| `bg_timeout` | 后台重活的硬超时（秒） | `3600` |
| `max_bg_tasks` | 最多同时跑几个后台重活 | `2` |

## 用法小贴士

- **多轮对话**：自动接上下文（存 `session.json`）。发 `/reset`（或 `重置`）开新对话。
- **发文件给自己**：让 Claude 在回复里写一行 `[[SENDFILE:绝对路径]]` 或 `[[SENDIMAGE:绝对路径|配文]]`，桥会自动发出去。
- **后台重活（新）**：聊天线程每条消息有 10 分钟硬超时，重活（调研、批量下载、跑长脚本）以前会"想太久超时"且工作全部作废。现在大脑会自动把这类任务写成 `[[BGTASK:自包含描述]]` 转给独立后台会话跑（缺省限时 1 小时、最多同时 2 个），微信里秒回"已开始"，跑完自动把结果（可带文件）发回来；失败/超时也会发 ❌ 通知。三种适配器都支持。
- **只测大脑**（不走微信）：`python wechat_bridge.py selftest`。

## 文件说明

| 文件 | 作用 |
|---|---|
| `wechat_bridge.py` | 主程序：收微信 → 调本地 claude → 回微信（异步、防卡死、只回机主） |
| `wechat_login.py` | 扫码登录，生成清晰二维码 PNG，凭据存 `~/.cli-bridge/account.json` |
| `send_media.mjs` | 发文件/图片/文字助手 |
| `recv_media.mjs` | 收文件/图片助手 |
| `config.example.json` | 配置模板 |

## 隐私 / 安全

- 你的微信登录凭据存在 `~/.cli-bridge/account.json`（**不在本仓库**），`.gitignore` 也已挡住 `account.json` / `session.json` / 日志等，不会被误传。
- 机器人**只响应机主本人**（代码里按登录账号的 userId 校验）。

## 鸣谢 / 依赖

底层微信通道依赖开源项目 **[cli-wechat-bridge](https://github.com/UNLINEARITY/CLI-WeChat-Bridge)**（作者 UNLINEARITY，AGPL-3.0）。本项目是在它之上做的"接 Claude Code + 异步可靠性 + 发收文件"的封装。

> 提示：cli-wechat-bridge **本身就自带**把微信接 Claude Code 的现成命令（`npx wechat-claude-start`）。如果你只想最快试通、不需要本项目的异步/发收文件等增强，可以直接用它自带的。

## 许可证

本项目以 **AGPL-3.0** 开源（与底层依赖一致）。详见 [LICENSE](LICENSE)。
