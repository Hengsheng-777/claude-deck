import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface Config {
  /** 只监听本机回环地址，不对外暴露 */
  host: '127.0.0.1';
  port: number;
  /** Claude Code 配置目录，会话数据的唯一来源（见 ADR-0001） */
  configDir: string;
  /** 新建会话时路径补全的起始目录 */
  projectsRoot: string;
  /** 指定 claude 可执行文件；不设置则用 Agent SDK 自带的 */
  claudePath?: string;
  /** 开发模式：额外允许 Vite 开发服务器的 Origin */
  dev: boolean;
}

const DEFAULT_PORT = 3457;
const WINDOWS_PROJECTS_ROOT = 'D:\\IdeaProjects';

export function loadConfig(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv,
  platform: NodeJS.Platform = process.platform,
  exists: (p: string) => boolean = existsSync,
): Config {
  const home = os.homedir();
  return {
    host: '127.0.0.1',
    port: parsePort(env.CLAUDE_DECK_PORT),
    configDir: env.CLAUDE_CONFIG_DIR || path.join(home, '.claude'),
    projectsRoot:
      env.CLAUDE_DECK_ROOT ||
      (platform === 'win32' && exists(WINDOWS_PROJECTS_ROOT) ? WINDOWS_PROJECTS_ROOT : home),
    claudePath: env.CLAUDE_DECK_CLAUDE_PATH || undefined,
    dev: argv.includes('--dev'),
  };
}

function parsePort(raw: string | undefined): number {
  if (!raw) return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`CLAUDE_DECK_PORT 不是合法端口: ${raw}`);
  }
  return port;
}
