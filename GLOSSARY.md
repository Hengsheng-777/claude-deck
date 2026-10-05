# claude-deck

一个本机自用的 Claude Code 图形界面，用来浏览、并行运行和切换多个 Claude Code 会话。

## Language

### 会话与项目

**项目（Project）**:
启动 Claude Code 会话时所在的工作目录。同一个 git 仓库下的不同子目录是不同的项目。
_Avoid_: 仓库、工作区、workspace

**会话（Session）**:
Claude Code 的一段连续对话，由会话 ID 唯一标识，归属于一个项目。不论从 CLI 还是 claude-deck 发起，都是同一个会话。
_Avoid_: 对话、聊天、thread、标签页

### 会话状态

**会话状态（Session Status）**:
会话当前所处的阶段，取值为运行中、等待确认、空闲、出错之一。

**运行中（Running）**:
Claude 正在生成回复或执行工具。

**等待确认（Awaiting Approval）**:
Claude 发起了权限请求，正在等用户批准或拒绝。

**空闲（Idle）**:
会话没有在运行，可以接收新消息。所有历史会话默认处于空闲。
_Avoid_: 已完成、已停止

**出错（Errored）**:
会话的上一次运行异常结束。

### 权限

**权限请求（Permission Request）**:
Claude 执行某个工具前向用户发起的批准请求，用户可以允许、拒绝或在本会话内总是允许。
_Avoid_: 授权弹窗、确认框

**权限模式（Permission Mode）**:
决定 Claude 哪些操作需要发起权限请求的会话级设置，取值沿用 Claude Code 的 default、acceptEdits、plan。
