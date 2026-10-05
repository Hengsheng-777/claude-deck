import { describe, expect, it } from 'vitest';
import { relativeTime, toolSummary } from './format';

describe('relativeTime', () => {
  const now = new Date(2026, 9, 5, 15, 0, 0).getTime(); // 2026-10-05 15:00 本地时间

  it.each([
    [now - 10_000, '刚刚'],
    [now - 5 * 60_000, '5 分钟前'],
    [now - 3 * 3_600_000, '3 小时前'],
    [new Date(2026, 9, 4, 23, 0).getTime(), '昨天'],
    [new Date(2026, 8, 1).getTime(), '9月1日'],
    [new Date(2025, 11, 31).getTime(), '2025年12月31日'],
  ])('%s → %s', (ms, expected) => {
    expect(relativeTime(ms, now)).toBe(expected);
  });
});

describe('toolSummary', () => {
  it.each([
    ['Bash', { command: 'npm test', description: '运行测试' }, '运行测试'],
    ['Bash', { command: 'npm test' }, 'npm test'],
    ['Edit', { file_path: 'D:\\code\\a.ts' }, 'D:\\code\\a.ts'],
    ['Grep', { pattern: 'TODO', path: 'src' }, 'TODO  ·  src'],
    ['Agent', { description: '查资料', prompt: '...' }, '查资料'],
    ['TodoWrite', { todos: [{}, {}] }, '2 项待办'],
    ['mcp__x__y', { a: 1 }, ''],
  ])('%s', (name, input, expected) => {
    expect(toolSummary(name, input)).toBe(expected);
  });
});
