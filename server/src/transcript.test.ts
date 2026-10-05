import type { SessionMessage } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, it } from 'vitest';
import { toSubagentTranscript, toTranscript } from './transcript.js';

let seq = 0;
function msg(
  type: 'user' | 'assistant',
  content: unknown,
  parentToolUseId: string | null = null,
): SessionMessage {
  return {
    type,
    uuid: `u${++seq}`,
    session_id: 's1',
    message: { role: type, content },
    parent_tool_use_id: parentToolUseId,
    parent_agent_id: null,
  };
}

describe('toTranscript', () => {
  it('普通的一问一答', () => {
    const items = toTranscript([
      msg('user', '帮我看看 README'),
      msg('assistant', [{ type: 'text', text: '好的。' }]),
    ]);
    expect(items).toEqual([
      { kind: 'user', id: expect.any(String), text: '帮我看看 README', imageCount: 0 },
      { kind: 'assistant', id: expect.any(String), text: '好的。' },
    ]);
  });

  it('工具调用和结果按 tool_use_id 配对，结果消息本身不单独成项', () => {
    const items = toTranscript([
      msg('assistant', [
        { type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'ls' } },
        { type: 'tool_use', id: 't2', name: 'Read', input: { file_path: '/a.txt' } },
      ]),
      msg('user', [
        { type: 'tool_result', tool_use_id: 't2', content: [{ type: 'text', text: 'hello' }] },
        { type: 'tool_result', tool_use_id: 't1', content: 'boom', is_error: true },
      ]),
    ]);
    expect(items).toMatchObject([
      { kind: 'tool', toolUseId: 't1', name: 'Bash', result: { text: 'boom', isError: true } },
      { kind: 'tool', toolUseId: 't2', name: 'Read', result: { text: 'hello', isError: false } },
    ]);
    expect(items).toHaveLength(2);
  });

  it('还没有结果的工具调用 result 为 null', () => {
    const [item] = toTranscript([
      msg('assistant', [{ type: 'tool_use', id: 't1', name: 'Bash', input: {} }]),
    ]);
    expect(item).toMatchObject({ kind: 'tool', result: null });
  });

  it('跳过只有签名没有原文的思考块，保留有内容的', () => {
    const items = toTranscript([
      msg('assistant', [
        { type: 'thinking', thinking: '', signature: 'xxx' },
        { type: 'thinking', thinking: '先看目录结构', signature: 'yyy' },
        { type: 'text', text: '看完了' },
      ]),
    ]);
    expect(items.map((i) => i.kind)).toEqual(['thinking', 'assistant']);
  });

  it('同一条消息拆出的多项 id 互不相同', () => {
    const items = toTranscript([
      msg('assistant', [
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
      ]),
    ]);
    expect(new Set(items.map((i) => i.id)).size).toBe(2);
  });

  it('识别 slash 命令及其输出', () => {
    const items = toTranscript([
      msg(
        'user',
        '<command-name>/model</command-name>\n  <command-message>model</command-message>\n  <command-args>haiku</command-args>',
      ),
      msg('user', '<local-command-stdout>Set model to \x1b[1mHaiku\x1b[22m</local-command-stdout>'),
      msg('user', '<command-name>/clear</command-name><command-args></command-args>'),
      msg('user', '<local-command-stdout></local-command-stdout>'),
    ]);
    expect(items).toMatchObject([
      { kind: 'command', name: '/model', args: 'haiku' },
      { kind: 'command-output', text: 'Set model to Haiku' },
      { kind: 'command', name: '/clear', args: '' },
    ]);
  });

  it('去掉 Claude Code 注入的 system-reminder 和 caveat', () => {
    const items = toTranscript([
      msg('user', '<local-command-caveat>Caveat: ...</local-command-caveat>'),
      msg('user', [
        { type: 'text', text: '<system-reminder>\n内部提示\n</system-reminder>' },
        { type: 'text', text: '真正的问题' },
      ]),
      msg('assistant', [{ type: 'tool_use', id: 't1', name: 'Read', input: {} }]),
      msg('user', [
        {
          type: 'tool_result',
          tool_use_id: 't1',
          content: '文件内容\n<system-reminder>别乱改</system-reminder>',
        },
      ]),
    ]);
    expect(items).toMatchObject([
      { kind: 'user', text: '真正的问题' },
      { kind: 'tool', result: { text: '文件内容' } },
    ]);
  });

  it('用户中断显示为提示，而不是用户发言', () => {
    const items = toTranscript([msg('user', [{ type: 'text', text: '[Request interrupted by user]' }])]);
    expect(items).toMatchObject([{ kind: 'command-output', text: '已中断' }]);
  });

  it('统计用户消息中的图片，纯图片消息也保留', () => {
    const image = { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AAAA' } };
    const items = toTranscript([
      msg('user', [image, { type: 'text', text: '看这张图' }]),
      msg('user', [image, image]),
    ]);
    expect(items).toMatchObject([
      { kind: 'user', text: '看这张图', imageCount: 1 },
      { kind: 'user', text: '', imageCount: 2 },
    ]);
  });

  it('工具结果中的图片和工具引用转成文字说明', () => {
    const items = toTranscript([
      msg('assistant', [{ type: 'tool_use', id: 't1', name: 'ToolSearch', input: {} }]),
      msg('user', [
        {
          type: 'tool_result',
          tool_use_id: 't1',
          content: [
            { type: 'tool_reference', tool_name: 'WebSearch' },
            { type: 'image', source: {} },
          ],
        },
      ]),
    ]);
    expect(items[0]).toMatchObject({ result: { text: '已加载工具 WebSearch\n[图片]' } });
  });
});

describe('toSubagentTranscript', () => {
  it('从消息中取出发起它的工具调用 ID', () => {
    const t = toSubagentTranscript('a1', [
      msg('user', '去查一下', 'toolu_parent'),
      msg('assistant', [{ type: 'text', text: '查到了' }], 'toolu_parent'),
    ]);
    expect(t).toMatchObject({ agentId: 'a1', parentToolUseId: 'toolu_parent' });
    expect(t.items).toHaveLength(2);
  });

  it('无法确定时为 null', () => {
    expect(toSubagentTranscript('a1', [msg('user', 'x')]).parentToolUseId).toBeNull();
  });
});
