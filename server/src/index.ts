import { buildApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = await buildApp(config);

await app.listen({ host: config.host, port: config.port });
console.log(`claude-deck 已启动: http://${config.host}:${config.port}`);
if (config.dev) console.log('开发模式：请打开 http://127.0.0.1:5173');

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
