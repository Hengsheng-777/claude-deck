import path from 'node:path';
import {
  getSessionMessages,
  getSubagentMessages,
  listSessions,
  listSubagents,
  type SDKSessionInfo,
  type SessionMessage,
} from '@anthropic-ai/claude-agent-sdk';
import type { ProjectGroup, SessionSummary } from './protocol.js';

/** 读取会话数据的入口，默认实现直接使用 Agent SDK（见 ADR-0001），测试时可替换 */
export interface SessionSource {
  list(): Promise<SDKSessionInfo[]>;
  messages(sessionId: string): Promise<SessionMessage[]>;
  subagents(sessionId: string): Promise<{ agentId: string; messages: SessionMessage[] }[]>;
}

export const sdkSessionSource: SessionSource = {
  // 项目以启动目录为准，不合并 git worktree（见 GLOSSARY「项目」）
  list: () => listSessions({ includeWorktrees: false }),
  messages: (id) => getSessionMessages(id),
  async subagents(id) {
    const agentIds = await listSubagents(id);
    return Promise.all(
      agentIds.map(async (agentId) => ({
        agentId,
        messages: await getSubagentMessages(id, agentId),
      })),
    );
  },
};

const UNKNOWN_PROJECT = '未知目录';

export function groupByProject(
  infos: SDKSessionInfo[],
  pathApi: Pick<typeof path, 'basename'> = path,
  platform: NodeJS.Platform = process.platform,
): ProjectGroup[] {
  const groups = new Map<string, ProjectGroup>();

  for (const info of infos) {
    const session = toSummary(info);
    // Windows 路径不区分大小写，D:\Foo 和 d:\foo 是同一个项目
    const key = session.cwd === null ? '' : platform === 'win32' ? session.cwd.toLowerCase() : session.cwd;
    let group = groups.get(key);
    if (!group) {
      group = {
        cwd: session.cwd,
        name: session.cwd === null ? UNKNOWN_PROJECT : pathApi.basename(session.cwd) || session.cwd,
        lastModified: 0,
        sessions: [],
      };
      groups.set(key, group);
    }
    group.sessions.push(session);
    group.lastModified = Math.max(group.lastModified, session.lastModified);
  }

  const result = [...groups.values()];
  for (const g of result) g.sessions.sort((a, b) => b.lastModified - a.lastModified);
  return result.sort((a, b) => b.lastModified - a.lastModified);
}

function toSummary(info: SDKSessionInfo): SessionSummary {
  return {
    sessionId: info.sessionId,
    title: info.customTitle || info.summary || info.firstPrompt || '（无标题）',
    cwd: info.cwd || null,
    gitBranch: info.gitBranch || null,
    lastModified: info.lastModified,
  };
}
