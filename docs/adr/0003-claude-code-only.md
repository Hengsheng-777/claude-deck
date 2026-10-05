# 只支持 Claude Code，不做多 provider 抽象

claude-deck 只对接 Claude Code，代码里不为 Codex、Cursor、Gemini 等其他 agent 预留抽象层或扩展点。这个项目的起因之一，就是 CloudCLI 的多 provider 设计自动关联了 Codex，而且无法断开。在需要第二个 provider 之前就做抽象，只会增加复杂度。
