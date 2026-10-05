# 用 TypeScript 版 Agent SDK 驱动 Claude Code

聊天界面通过 `@anthropic-ai/claude-agent-sdk` 获取结构化消息流，而不是在内嵌终端里跑 `claude` 的 TUI，也不是自己解析 `claude -p --output-format stream-json`。SDK 已经封装了权限回调、resume、中断和流式输出，能让我们做出接近官方 Desktop 的体验；内嵌终端只作为第二阶段的兜底入口（`claude --resume <id>`）。

## Considered Options

- **内嵌终端跑 TUI**：兼容性 100%、工作量最小，但只解决了"切换会话"，不解决"不习惯 CLI"。
- **直接解析 `claude -p` 的 stream-json**：少一层依赖，但权限确认、中断等要自己实现协议细节。
