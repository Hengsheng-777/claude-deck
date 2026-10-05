import type { FastifyInstance } from 'fastify';
import type { Config } from './config.js';

const VITE_DEV_PORT = 5173;

/**
 * 只放行发往本机地址的请求（防 DNS rebinding），以及来自本应用页面的跨源请求。
 * WebSocket 不受同源策略限制，任何网页都能连 ws://127.0.0.1，所以 Origin 校验必不可少。
 */
export function registerLocalOnlyGuard(app: FastifyInstance, config: Config): void {
  const hosts = localHosts(config.port);
  const origins = new Set(hosts.map((h) => `http://${h}`));
  if (config.dev) {
    for (const h of localHosts(VITE_DEV_PORT)) origins.add(`http://${h}`);
  }

  app.addHook('onRequest', async (req, reply) => {
    const host = req.headers.host;
    if (!host || !hosts.includes(host)) {
      return reply.code(403).send({ error: 'forbidden host' });
    }
    const origin = req.headers.origin;
    if (origin !== undefined && !origins.has(origin)) {
      return reply.code(403).send({ error: 'forbidden origin' });
    }
  });
}

function localHosts(port: number): string[] {
  return [`127.0.0.1:${port}`, `localhost:${port}`];
}
