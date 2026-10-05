import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config.js';

const never = () => false;

describe('loadConfig', () => {
  it('没有任何环境变量时使用默认值', () => {
    const config = loadConfig({}, [], 'linux', never);
    expect(config).toEqual({
      host: '127.0.0.1',
      port: 3457,
      configDir: path.join(os.homedir(), '.claude'),
      projectsRoot: os.homedir(),
      claudePath: undefined,
      dev: false,
    });
  });

  it('优先使用 CLAUDE_CONFIG_DIR，与 Claude Code 的查找顺序一致', () => {
    const config = loadConfig({ CLAUDE_CONFIG_DIR: '/custom/claude' }, [], 'linux', never);
    expect(config.configDir).toBe('/custom/claude');
  });

  it('读取 claude-deck 自己的环境变量', () => {
    const config = loadConfig(
      {
        CLAUDE_DECK_PORT: '4000',
        CLAUDE_DECK_ROOT: '/code',
        CLAUDE_DECK_CLAUDE_PATH: '/usr/bin/claude',
      },
      ['node', 'index.js', '--dev'],
      'linux',
      never,
    );
    expect(config).toMatchObject({
      port: 4000,
      projectsRoot: '/code',
      claudePath: '/usr/bin/claude',
      dev: true,
    });
  });

  it('Windows 上 D:\\IdeaProjects 存在时作为默认起始目录', () => {
    const exists = (p: string) => p === 'D:\\IdeaProjects';
    expect(loadConfig({}, [], 'win32', exists).projectsRoot).toBe('D:\\IdeaProjects');
    expect(loadConfig({}, [], 'win32', never).projectsRoot).toBe(os.homedir());
  });

  it.each(['abc', '0', '70000', '3.5'])('拒绝非法端口 %s', (port) => {
    expect(() => loadConfig({ CLAUDE_DECK_PORT: port }, [], 'linux', never)).toThrow(
      /不是合法端口/,
    );
  });
});
