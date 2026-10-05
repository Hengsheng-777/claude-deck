import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import type { Config } from './config.js';
import type { ServerEvent } from './protocol.js';
import { registerLocalOnlyGuard } from './security.js';
import { groupByProject, sdkSessionSource, type SessionSource } from './sessions.js';
import { toSubagentTranscript, toTranscript } from './transcript.js';
import { watchProjects, type Watcher } from './watcher.js';

export interface Deps {
  sessions: SessionSource;
  watch: (projectsDir: string, emit: (event: ServerEvent) => void) => Watcher;
}

export const defaultDeps: Deps = {
  sessions: sdkSessionSource,
  watch: watchProjects,
};

// 开发时位于 server/src，构建后位于 dist/server，两者到仓库根目录的相对层级相同
const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, '../..');
const { version } = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8')) as {
  version: string;
};

const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function buildApp(config: Config, deps: Deps = defaultDeps): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: 'warn' } });

  registerLocalOnlyGuard(app, config);
  await app.register(fastifyWebsocket);

  const clients = new Set<WebSocket>();
  const send = (socket: WebSocket, event: ServerEvent) => socket.send(JSON.stringify(event));
  const broadcast = (event: ServerEvent) => clients.forEach((socket) => send(socket, event));

  const watcher = deps.watch(path.join(config.configDir, 'projects'), broadcast);
  app.addHook('onClose', async () => watcher.close());

  app.get('/api/health', async () => ({
    ok: true,
    version,
    configDir: config.configDir,
    configDirExists: existsSync(config.configDir),
    sessionCount: await deps.sessions
      .list()
      .then((s) => s.length)
      .catch(() => null),
  }));

  app.get('/api/projects', async () => groupByProject(await deps.sessions.list()));

  app.get<{ Params: { id: string } }>('/api/sessions/:id/messages', async (req, reply) => {
    if (!SESSION_ID.test(req.params.id)) return reply.code(400).send({ error: 'invalid session id' });
    return { items: toTranscript(await deps.sessions.messages(req.params.id)) };
  });

  app.get<{ Params: { id: string } }>('/api/sessions/:id/subagents', async (req, reply) => {
    if (!SESSION_ID.test(req.params.id)) return reply.code(400).send({ error: 'invalid session id' });
    const subagents = await deps.sessions.subagents(req.params.id);
    return subagents.map((s) => toSubagentTranscript(s.agentId, s.messages));
  });

  app.get('/ws', { websocket: true }, (socket) => {
    clients.add(socket);
    socket.on('close', () => clients.delete(socket));
    send(socket, { type: 'hello', version });
  });

  // 生产模式下由后端托管前端构建产物；开发模式下由 Vite 提供
  const webDir = path.join(rootDir, 'dist/web');
  if (!config.dev && existsSync(webDir)) {
    await app.register(fastifyStatic, { root: webDir });
  }

  return app;
}
