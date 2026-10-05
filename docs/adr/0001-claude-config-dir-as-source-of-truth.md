# 以 Claude Code 配置目录为会话的唯一数据源

claude-deck 不自己保存会话内容，项目和会话列表、消息历史都直接读取 Claude Code 配置目录（优先 `CLAUDE_CONFIG_DIR`，否则 `~/.claude`）下的 `projects/` 。这样 CLI 和 claude-deck 看到的是同一批会话，可以随时互相接着用，claude-deck 出问题也不会丢数据。claude-deck 自己最多只存置顶、自定义标题这类 UI 偏好。代价是要跟随 Claude Code 的 jsonl 格式变化。
