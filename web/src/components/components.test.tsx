import { describe, expect, it } from 'vitest';
import type { SubagentTranscript } from '@/lib/api';
import { toDiffLines } from './DiffView';
import { findSubagent } from './ToolCard';

describe('toDiffLines', () => {
  it('逐行标出增删', () => {
    expect(toDiffLines('a\nb\nc\n', 'a\nB\nc\n')).toEqual([
      { kind: 'same', text: 'a' },
      { kind: 'del', text: 'b' },
      { kind: 'add', text: 'B' },
      { kind: 'same', text: 'c' },
    ]);
  });

  it('新建文件时全部是新增行', () => {
    expect(toDiffLines('', 'x\ny').map((l) => l.kind)).toEqual(['add', 'add']);
  });
});

describe('findSubagent', () => {
  const sub = (agentId: string, parentToolUseId: string | null, firstText: string): SubagentTranscript => ({
    agentId,
    parentToolUseId,
    items: [{ kind: 'user', id: 'u', text: firstText, imageCount: 0 }],
  });

  it('优先按工具调用 ID 匹配', () => {
    const subs = [sub('a', null, '任务'), sub('b', 't1', '别的')];
    expect(findSubagent(subs, 't1', '任务')?.agentId).toBe('b');
  });

  it('没有 ID 关联时按任务说明匹配', () => {
    const subs = [sub('a', null, '别的'), sub('b', null, ' 任务 ')];
    expect(findSubagent(subs, 't1', '任务')?.agentId).toBe('b');
  });

  it('都匹配不上时返回 undefined', () => {
    expect(findSubagent([sub('a', null, 'x')], 't1', 'y')).toBeUndefined();
  });
});
