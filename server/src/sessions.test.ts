import path from 'node:path';
import type { SDKSessionInfo } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, it } from 'vitest';
import { groupByProject } from './sessions.js';

function info(sessionId: string, lastModified: number, extra: Partial<SDKSessionInfo> = {}) {
  return { sessionId, lastModified, summary: `摘要 ${sessionId}`, ...extra } as SDKSessionInfo;
}

describe('groupByProject', () => {
  it('按启动目录分组，组内和组间都按最近活动倒序', () => {
    const groups = groupByProject(
      [
        info('a', 100, { cwd: '/code/app' }),
        info('b', 300, { cwd: '/code/web' }),
        info('c', 200, { cwd: '/code/app' }),
      ],
      path.posix,
      'linux',
    );
    expect(groups.map((g) => [g.name, g.sessions.map((s) => s.sessionId)])).toEqual([
      ['web', ['b']],
      ['app', ['c', 'a']],
    ]);
    expect(groups[1]).toMatchObject({ cwd: '/code/app', lastModified: 200 });
  });

  it('子目录是独立的项目，不合并到上级', () => {
    const groups = groupByProject(
      [info('a', 1, { cwd: '/code/app' }), info('b', 2, { cwd: '/code/app/web' })],
      path.posix,
      'linux',
    );
    expect(groups).toHaveLength(2);
  });

  it('Windows 上路径大小写不同视为同一项目', () => {
    const groups = groupByProject(
      [
        info('a', 1, { cwd: 'D:\\IdeaProjects\\Foo' }),
        info('b', 2, { cwd: 'd:\\ideaprojects\\foo' }),
      ],
      path.win32,
      'win32',
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]!.name).toBe('Foo');
  });

  it('标题优先级：自定义标题 > 摘要 > 首条提问', () => {
    const [g] = groupByProject(
      [
        info('a', 3, { cwd: '/p', customTitle: '自定义', summary: '摘要' }),
        info('b', 2, { cwd: '/p', summary: '', firstPrompt: '首条提问' }),
        info('c', 1, { cwd: '/p', summary: '' }),
      ],
      path.posix,
      'linux',
    );
    expect(g!.sessions.map((s) => s.title)).toEqual(['自定义', '首条提问', '（无标题）']);
  });

  it('没有 cwd 的会话归入「未知目录」', () => {
    const [g] = groupByProject([info('a', 1)], path.posix, 'linux');
    expect(g).toMatchObject({ cwd: null, name: '未知目录' });
  });
});
