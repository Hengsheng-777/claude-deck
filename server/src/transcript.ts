import type { SessionMessage } from '@anthropic-ai/claude-agent-sdk';
import type { SubagentTranscript, ToolResult, TranscriptItem } from './protocol.js';

type Block = { type: string; [key: string]: unknown };
type ToolItem = Extract<TranscriptItem, { kind: 'tool' }>;

const INTERRUPTED = '[Request interrupted by user]';

/** 把 SDK 返回的原始消息整理成可展示的记录：工具调用和结果配对、剥离注入的系统内容 */
export function toTranscript(messages: SessionMessage[]): TranscriptItem[] {
  const items: TranscriptItem[] = [];
  const tools = new Map<string, ToolItem>();

  for (const m of messages) {
    const content = (m.message as { content?: unknown } | undefined)?.content;
    if (m.type === 'assistant') {
      pushAssistant(items, tools, m.uuid, content);
    } else if (m.type === 'user') {
      pushUser(items, tools, m.uuid, content);
    }
  }
  return items;
}

export function toSubagentTranscript(
  agentId: string,
  messages: SessionMessage[],
): SubagentTranscript {
  return {
    agentId,
    parentToolUseId: messages.find((m) => m.parent_tool_use_id)?.parent_tool_use_id ?? null,
    items: toTranscript(messages),
  };
}

function pushAssistant(
  items: TranscriptItem[],
  tools: Map<string, ToolItem>,
  uuid: string,
  content: unknown,
): void {
  if (typeof content === 'string') {
    if (content.trim()) items.push({ kind: 'assistant', id: uuid, text: content });
    return;
  }
  if (!Array.isArray(content)) return;

  (content as Block[]).forEach((b, i) => {
    const id = `${uuid}:${i}`;
    if (b.type === 'text' && typeof b.text === 'string' && b.text.trim()) {
      items.push({ kind: 'assistant', id, text: b.text });
    } else if (b.type === 'thinking' && typeof b.thinking === 'string' && b.thinking.trim()) {
      // 部分模型只保存签名、不保存思考原文，这种空块直接跳过
      items.push({ kind: 'thinking', id, text: b.thinking });
    } else if (b.type === 'tool_use' && typeof b.id === 'string') {
      const tool: ToolItem = {
        kind: 'tool',
        id,
        toolUseId: b.id,
        name: String(b.name ?? ''),
        input: (b.input as Record<string, unknown> | undefined) ?? {},
        result: null,
      };
      tools.set(b.id, tool);
      items.push(tool);
    }
  });
}

function pushUser(
  items: TranscriptItem[],
  tools: Map<string, ToolItem>,
  uuid: string,
  content: unknown,
): void {
  if (typeof content === 'string') {
    items.push(...parseUserText(uuid, content, 0));
    return;
  }
  if (!Array.isArray(content)) return;

  const texts: string[] = [];
  let imageCount = 0;
  for (const b of content as Block[]) {
    if (b.type === 'tool_result') {
      const tool = tools.get(String(b.tool_use_id));
      if (tool) tool.result = toolResult(b);
    } else if (b.type === 'text' && typeof b.text === 'string') {
      texts.push(b.text);
    } else if (b.type === 'image') {
      imageCount++;
    }
  }
  if (texts.length > 0 || imageCount > 0) {
    items.push(...parseUserText(uuid, texts.join('\n\n'), imageCount));
  }
}

/** 解析用户消息文本：识别 slash 命令及其输出，去掉 Claude Code 注入的提示内容 */
export function parseUserText(id: string, raw: string, imageCount: number): TranscriptItem[] {
  const text = stripInjected(raw).trim();

  const command = /<command-name>([\s\S]*?)<\/command-name>/.exec(text);
  if (command) {
    const args = /<command-args>([\s\S]*?)<\/command-args>/.exec(text)?.[1] ?? '';
    return [{ kind: 'command', id, name: command[1]!.trim(), args: args.trim() }];
  }

  const stdout = /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/.exec(text);
  if (stdout) {
    const output = stripAnsi(stdout[1]!).trim();
    return output ? [{ kind: 'command-output', id, text: output }] : [];
  }

  if (text === INTERRUPTED) {
    return [{ kind: 'command-output', id, text: '已中断' }];
  }

  if (!text && imageCount === 0) return [];
  return [{ kind: 'user', id, text, imageCount }];
}

function toolResult(b: Block): ToolResult {
  const content = b.content;
  let text: string;
  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    text = (content as Block[])
      .map((c) => {
        if (c.type === 'text') return String(c.text ?? '');
        if (c.type === 'image') return '[图片]';
        if (c.type === 'tool_reference') return `已加载工具 ${String(c.tool_name ?? '')}`;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  } else {
    text = '';
  }
  return { text: stripInjected(text).trim(), isError: b.is_error === true };
}

function stripInjected(text: string): string {
  return text
    .replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '')
    .replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, '');
}

function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*m/g, '');
}
