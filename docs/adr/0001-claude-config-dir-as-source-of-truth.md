# 以 Claude Code 配置目录为会话的唯一数据源

claude-deck 不自己保存会话内容。项目和会话列表、消息历史、会话标题都来自 Claude Code 配置目录（优先 `CLAUDE_CONFIG_DIR`，否则 `~/.claude`），并且通过 Agent SDK 的会话 API（`listSessions`、`getSessionMessages`、`renameSession` 等）读写，不自己解析 jsonl。这样 CLI 和 claude-deck 看到的是同一批会话，可以随时互相接着用，claude-deck 出问题也不会丢数据，jsonl 格式变化由 SDK 负责兼容。claude-deck 自己最多只存置顶这类纯 UI 偏好。

## Consequences

- 项目以会话的 `cwd` 为准，不用目录名反推（目录名编码有损，`D:\IdeaProjects\foo` 会变成 `D--IdeaProjects-foo`），列会话时关闭 `includeWorktrees`，不合并 worktree。
- 磁盘上的变化靠监听 `projects/` 目录感知，然后通过 SDK 重新查询。
