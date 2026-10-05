import type { FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';
import type WebSocket from 'ws';
import { buildApp } from './app.js';
import { loadConfig, type Config } from './config.js';

const HOST = '127.0.0.1:3457';

let app: FastifyInstance | undefined;

async function setup(overrides: Partial<Config> = {}, countSessions = async () => 3) {
  const config = { ...loadConfig({}, []), configDir: '/nonexistent/claude', ...overrides };
  app = await buildApp(config, { countSessions });
  return app;
}

function nextMessage(ws: WebSocket): Promise<unknown> {
  return new Promise((resolve) => ws.once('message', (data) => resolve(JSON.parse(String(data)))));
}

afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe('GET /api/health', () => {
  it('返回版本、配置目录和会话数', async () => {
    const res = await (await setup()).inject({ url: '/api/health', headers: { host: HOST } });
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
    const failing = async () => {
      throw new Error('boom');
    };
    const res = await (await setup({}, failing)).inject({
      url: '/api/health',
      headers: { host: HOST },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().sessionCount).toBeNull();
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
    const res = await (await setup()).inject({
      url: '/api/health',
      headers: { host: HOST, origin: 'https://evil.example.com' },
    });
    expect(res.statusCode).toBe(403);
  });

  it('Vite 开发服务器的 Origin 只在开发模式下放行', async () => {
    const headers = { host: HOST, origin: 'http://127.0.0.1:5173' };
    const prod = await (await setup()).inject({ url: '/api/health', headers });
    expect(prod.statusCode).toBe(403);
    await app?.close();

    const dev = await (await setup({ dev: true })).inject({ url: '/api/health', headers });
    expect(dev.statusCode).toBe(200);
  });
});

describe('WebSocket /ws', () => {
  it('连接后收到 hello', async () => {
    const server = await setup();
    await server.ready();
    // 服务端一连上就发 hello，必须在连接建立前挂好监听，否则会错过
    let hello: Promise<unknown> | undefined;
    const ws = await server.injectWS(
      '/ws',
      { headers: { host: HOST, origin: `http://${HOST}` } },
      { onInit: (socket) => (hello = nextMessage(socket)) },
    );
    expect(await hello).toMatchObject({ type: 'hello', version: expect.any(String) });
    ws.terminate();
  });

  it('拒绝其他网站发起的 WebSocket 连接', async () => {
    const server = await setup();
    await server.ready();
    await expect(
      server.injectWS('/ws', { headers: { host: HOST, origin: 'https://evil.example.com' } }),
    ).rejects.toThrow();
  });
});
