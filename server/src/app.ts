import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import { listSessions } from '@anthropic-ai/claude-agent-sdk';
import type { Config } from './config.js';
import { registerLocalOnlyGuard } from './security.js';

export interface Deps {
  countSessions: () => Promise<number>;
}

export const defaultDeps: Deps = {
  countSessions: async () => (await listSessions({ includeWorktrees: false })).length,
};

// 开发时位于 server/src，构建后位于 dist/server，两者到仓库根目录的相对层级相同
const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, '../..');
const { version } = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8')) as {
  version: string;
};

export async function buildApp(config: Config, deps: Deps = defaultDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: 'warn' } });

  registerLocalOnlyGuard(app, config);
  await app.register(fastifyWebsocket);

  app.get('/api/health', async () => ({
    ok: true,
    version,
    configDir: config.configDir,
    configDirExists: existsSync(config.configDir),
    sessionCount: await deps.countSessions().catch(() => null),
  }));

  app.get('/ws', { websocket: true }, (socket) => {
    socket.send(JSON.stringify({ type: 'hello', version }));
  });

  // 生产模式下由后端托管前端构建产物；开发模式下由 Vite 提供
  const webDir = path.join(rootDir, 'dist/web');
  if (!config.dev && existsSync(webDir)) {
    await app.register(fastifyStatic, { root: webDir });
  }

  return app;
}
