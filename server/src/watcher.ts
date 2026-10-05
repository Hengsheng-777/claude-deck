import { existsSync, watch, type FSWatcher } from 'node:fs';
import type { ServerEvent } from './protocol.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface WatchOptions {
  debounceMs?: number;
  /** projects 目录还不存在时，隔多久检查一次 */
  pollMs?: number;
}

export interface Watcher {
  close(): void;
}

/**
 * 监听 Claude Code 的 projects 目录，把文件变化合并成会话事件。
 * 目录结构为 projects/<编码后的项目路径>/<会话ID>.jsonl，子 agent 记录在 <会话ID>/ 子目录下。
 */
export function watchProjects(
  projectsDir: string,
  emit: (event: ServerEvent) => void,
  { debounceMs = 200, pollMs = 2000 }: WatchOptions = {},
): Watcher {
  let fsWatcher: FSWatcher | undefined;
  let pollTimer: NodeJS.Timeout | undefined;
  let flushTimer: NodeJS.Timeout | undefined;
  let closed = false;
  const pending = new Set<string>();

  const flush = () => {
    flushTimer = undefined;
    emit({ type: 'sessions-changed' });
    for (const sessionId of pending) emit({ type: 'session-updated', sessionId });
    pending.clear();
  };

  const onChange = (filename: string | null) => {
    if (!filename) return;
    const parts = filename.split(/[\\/]/);
    const sessionId = parts[1]?.replace(/\.jsonl$/, '');
    if (!sessionId || !UUID.test(sessionId) || !filename.endsWith('.jsonl')) return;
    pending.add(sessionId);
    clearTimeout(flushTimer);
    flushTimer = setTimeout(flush, debounceMs);
  };

  const start = () => {
    if (closed) return;
    if (!existsSync(projectsDir)) {
      pollTimer = setTimeout(start, pollMs);
      return;
    }
    try {
      fsWatcher = watch(projectsDir, { recursive: true }, (_event, filename) => onChange(filename));
    } catch {
      pollTimer = setTimeout(start, pollMs);
      return;
    }
    // 目录被删除等情况会触发 error，回到轮询等待目录重新出现
    fsWatcher.on('error', () => {
      fsWatcher?.close();
      fsWatcher = undefined;
      pollTimer = setTimeout(start, pollMs);
    });
    emit({ type: 'sessions-changed' });
  };

  start();

  return {
    close() {
      closed = true;
      fsWatcher?.close();
      clearTimeout(pollTimer);
      clearTimeout(flushTimer);
    },
  };
}
