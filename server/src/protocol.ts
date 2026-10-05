// 前后端共用的数据结构。只能放类型，前端通过 `import type` 引用。

export interface SessionSummary {
  sessionId: string;
  title: string;
  cwd: string | null;
  gitBranch: string | null;
  lastModified: number;
}

export interface ProjectGroup {
  /** 项目即会话的启动目录（见 GLOSSARY），无法确定时为 null */
  cwd: string | null;
  name: string;
  lastModified: number;
  sessions: SessionSummary[];
}

export interface ToolResult {
  text: string;
  isError: boolean;
}

/** 会话记录中可展示的一项，由 SDK 原始消息整理而来 */
export type TranscriptItem =
  | { kind: 'user'; id: string; text: string; imageCount: number }
  | { kind: 'command'; id: string; name: string; args: string }
  | { kind: 'command-output'; id: string; text: string }
  | { kind: 'assistant'; id: string; text: string }
  | { kind: 'thinking'; id: string; text: string }
  | {
      kind: 'tool';
      id: string;
      toolUseId: string;
      name: string;
      input: Record<string, unknown>;
      /** 还没有结果时为 null（例如被中断） */
      result: ToolResult | null;
    };

export interface SubagentTranscript {
  agentId: string;
  /** 发起这个子 agent 的 Agent/Task 工具调用 ID，无法确定时为 null */
  parentToolUseId: string | null;
  items: TranscriptItem[];
}

/** 服务端通过 WebSocket 推送的事件 */
export type ServerEvent =
  | { type: 'hello'; version: string }
  | { type: 'sessions-changed' }
  | { type: 'session-updated'; sessionId: string };
