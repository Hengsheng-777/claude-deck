import type { SDKSessionInfo, SessionMessage } from '@anthropic-ai/claude-agent-sdk';
import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import type WebSocket from 'ws';
import { buildApp } from './app.js';
import { loadConfig, type Config } from './config.js';
import type { ServerEvent } from './protocol.js';
import type { SessionSource } from './sessions.js';

const HOST = '127.0.0.1:3457';
const SESSION = '0974d5b0-ed86-4812-a7b4-38cdd38d91a2';

const infos = [
  { sessionId: SESSION, summary: '会话一', lastModified: 2, cwd: '/code/app' },
  { sessionId: 'b', summary: '会话二', lastModified: 1, cwd: '/code/app' },
  { sessionId: 'c', summary: '会话三', lastModified: 3, cwd: '/code/web' },
] as SDKSessionInfo[];

const messages: SessionMessage[] = [
  {
    type: 'user',
    uuid: 'u1',
    session_id: SESSION,
    message: { role: 'user', content: '你好' },
    parent_tool_use_id: null,
    parent_agent_id: null,
  },
];

const fakeSessions: SessionSource = {
  list: async () => infos,
  messages: async () => messages,
  subagents: async () => [{ agentId: 'a1', messages }],
};

let app: FastifyInstance | undefined;
let emit: (event: ServerEvent) => void = () => {};
let watcherClosed = false;

async function setup(overrides: Partial<Config> = {}, sessions: SessionSource = fakeSessions) {
  const config = { ...loadConfig({}, []), configDir: '/nonexistent/claude', ...overrides };
  watcherClosed = false;
  app = await buildApp(config, {
    sessions,
    watch: (_dir, e) => {
      emit = e;
      return { close: () => (watcherClosed = true) };
    },
  });
  return app;
}

function get(server: FastifyInstance, url: string, headers: Record<string, string> = {}) {
  return server.inject({ url, headers: { host: HOST, ...headers } });
}

function nextMessage(ws: WebSocket): Promise<unknown> {
  return new Promise((resolve) => ws.once('message', (data) => resolve(JSON.parse(String(data)))));
}

async function connect(server: FastifyInstance) {
  await server.ready();
  // 服务端一连上就发 hello，必须在连接建立前挂好监听，否则会错过
  let hello: Promise<unknown> | undefined;
  const ws = await server.injectWS(
    '/ws',
    { headers: { host: HOST, origin: `http://${HOST}` } },
    { onInit: (socket) => (hello = nextMessage(socket)) },
  );
  return { ws, hello: hello! };
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('GET /api/health', () => {
  it('返回版本、配置目录和会话数', async () => {
    const res = await get(await setup(), '/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      ok: true,
      version: expect.any(String),
      configDir: '/nonexistent/claude',
      configDirExists: false,
      sessionCount: 3,
    });
  });

  it('读取会话失败时 sessionCount 为 null，而不是整个接口报错', async () => {
    const failing = { ...fakeSessions, list: () => Promise.reject(new Error('boom')) };
    const res = await get(await setup({}, failing), '/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.json().sessionCount).toBeNull();
  });
});

describe('会话数据接口', () => {
  it('GET /api/projects 按项目分组', async () => {
    const res = await get(await setup(), '/api/projects');
    expect(res.json().map((g: { name: string }) => g.name)).toEqual(['web', 'app']);
  });

  it('GET /api/sessions/:id/messages 返回整理后的记录', async () => {
    const res = await get(await setup(), `/api/sessions/${SESSION}/messages`);
    expect(res.json()).toEqual({
      items: [{ kind: 'user', id: 'u1', text: '你好', imageCount: 0 }],
    });
  });

  it('GET /api/sessions/:id/subagents 返回子 agent 记录', async () => {
    const res = await get(await setup(), `/api/sessions/${SESSION}/subagents`);
    expect(res.json()).toMatchObject([{ agentId: 'a1', parentToolUseId: null }]);
  });

  it.each(['messages', 'subagents'])('%s 拒绝非法的会话 ID', async (kind) => {
    const res = await get(await setup(), `/api/sessions/..%2F..%2Fetc/${kind}`);
    expect(res.statusCode).toBe(400);
  });
});

describe('仅限本机访问', () => {
  it.each(['127.0.0.1:3457', 'localhost:3457'])('放行 Host %s', async (host) => {
    const res = await (await setup()).inject({ url: '/api/health', headers: { host } });
    expect(res.statusCode).toBe(200);
  });

  it.each(['evil.example.com', '127.0.0.1:9999', '192.168.1.10:3457'])(
    '拒绝 Host %s（防 DNS rebinding）',
    async (host) => {
      const res = await (await setup()).inject({ url: '/api/health', headers: { host } });
      expect(res.statusCode).toBe(403);
    },
  );

  it('拒绝其他网站发起的跨源请求', async () => {
    const res = await get(await setup(), '/api/health', { origin: 'https://evil.example.com' });
    expect(res.statusCode).toBe(403);
  });

  it('Vite 开发服务器的 Origin 只在开发模式下放行', async () => {
    const origin = { origin: 'http://127.0.0.1:5173' };
    expect((await get(await setup(), '/api/health', origin)).statusCode).toBe(403);
    await app?.close();
    expect((await get(await setup({ dev: true }), '/api/health', origin)).statusCode).toBe(200);
  });
});

describe('WebSocket /ws', () => {
  it('连接后收到 hello', async () => {
    const { ws, hello } = await connect(await setup());
    expect(await hello).toMatchObject({ type: 'hello', version: expect.any(String) });
    ws.terminate();
  });

  it('把监听到的会话变化广播给客户端', async () => {
    const { ws, hello } = await connect(await setup());
    await hello;
    const next = nextMessage(ws);
    emit({ type: 'session-updated', sessionId: SESSION });
    expect(await next).toEqual({ type: 'session-updated', sessionId: SESSION });
    ws.terminate();
  });

  it('拒绝其他网站发起的 WebSocket 连接', async () => {
    const server = await setup();
    await server.ready();
    await expect(
      server.injectWS('/ws', { headers: { host: HOST, origin: 'https://evil.example.com' } }),
    ).rejects.toThrow();
  });

  it('关闭应用时一并关闭目录监听', async () => {
    const server = await setup();
    await server.close();
    expect(watcherClosed).toBe(true);
  });
});
