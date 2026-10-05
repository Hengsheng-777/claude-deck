import { mkdirSync, mkdtempSync, rmSync, writeFileSync, appendFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ServerEvent } from './protocol.js';
import { watchProjects, type Watcher } from './watcher.js';

const SESSION = '0974d5b0-ed86-4812-a7b4-38cdd38d91a2';

let tmp: string;
let watcher: Watcher | undefined;

afterEach(() => {
  watcher?.close();
  rmSync(tmp, { recursive: true, force: true });
});

function collect(dir: string) {
  const events: ServerEvent[] = [];
  watcher = watchProjects(dir, (e) => events.push(e), { debounceMs: 50, pollMs: 50 });
  return events;
}

function until(check: () => boolean, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (check()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('timeout'));
      setTimeout(tick, 20);
    };
    tick();
  });
}

describe('watchProjects', () => {
  it('会话文件变化时发出 sessions-changed 和对应的 session-updated', async () => {
    tmp = mkdtempSync(path.join(os.tmpdir(), 'deck-'));
    const project = path.join(tmp, '-code-app');
    mkdirSync(project);
    writeFileSync(path.join(project, `${SESSION}.jsonl`), '');
    const events = collect(tmp);
    await until(() => events.length > 0); // 启动时的一次 sessions-changed
    events.length = 0;

    appendFileSync(path.join(project, `${SESSION}.jsonl`), '{}\n');
    await until(() => events.some((e) => e.type === 'session-updated'));
    expect(events).toContainEqual({ type: 'sessions-changed' });
    expect(events).toContainEqual({ type: 'session-updated', sessionId: SESSION });
  });

  it('子 agent 记录的变化归到所属会话', async () => {
    tmp = mkdtempSync(path.join(os.tmpdir(), 'deck-'));
    const subDir = path.join(tmp, '-code-app', SESSION, 'subagents');
    mkdirSync(subDir, { recursive: true });
    const events = collect(tmp);
    await until(() => events.length > 0);
    events.length = 0;

    writeFileSync(path.join(subDir, 'agent-1.jsonl'), '{}\n');
    await until(() => events.some((e) => e.type === 'session-updated'));
    expect(events).toContainEqual({ type: 'session-updated', sessionId: SESSION });
  });

  it('忽略非会话文件', async () => {
    tmp = mkdtempSync(path.join(os.tmpdir(), 'deck-'));
    mkdirSync(path.join(tmp, '-code-app', 'memory'), { recursive: true });
    const events = collect(tmp);
    await until(() => events.length > 0);
    events.length = 0;

    writeFileSync(path.join(tmp, '-code-app', 'memory', 'MEMORY.md'), 'x');
    await new Promise((r) => setTimeout(r, 200));
    expect(events).toEqual([]);
  });

  it('目录一开始不存在时，等它出现后再开始监听', async () => {
    tmp = mkdtempSync(path.join(os.tmpdir(), 'deck-'));
    const projects = path.join(tmp, 'projects');
    const events = collect(projects);
    await new Promise((r) => setTimeout(r, 100));
    expect(events).toEqual([]);

    mkdirSync(projects);
    await until(() => events.length > 0);
    expect(events).toEqual([{ type: 'sessions-changed' }]);
  });
});
