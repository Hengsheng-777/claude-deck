import { cn } from '@/lib/utils';
import { useConnection, useHealth, type ConnectionState } from '@/lib/backend';

const connectionLabel: Record<ConnectionState, string> = {
  connecting: '连接中',
  open: '已连接',
  closed: '已断开',
};

export function App() {
  const { health, error } = useHealth();
  const connection = useConnection();

  return (
    <div className="flex h-full">
      <aside className="flex w-72 shrink-0 flex-col border-r border-neutral-200 dark:border-neutral-800">
        <header className="flex items-center justify-between px-4 py-3">
          <h1 className="text-sm font-semibold">claude-deck</h1>
          <span className="flex items-center gap-1.5 text-xs text-neutral-500">
            <span
              className={cn(
                'size-2 rounded-full',
                connection === 'open' && 'bg-emerald-500',
                connection === 'connecting' && 'bg-amber-400',
                connection === 'closed' && 'bg-red-500',
              )}
            />
            {connectionLabel[connection]}
          </span>
        </header>
        <p className="px-4 text-xs text-neutral-500">项目和会话列表将在 M1 实现</p>
      </aside>

      <main className="flex flex-1 items-center justify-center p-8">
        <section className="w-full max-w-md space-y-3 text-sm">
          <h2 className="text-base font-semibold">环境自检</h2>
          {error && <p className="text-red-600 dark:text-red-400">后端不可用：{error}</p>}
          {!error && !health && <p className="text-neutral-500">检查中…</p>}
          {health && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
              <dt className="text-neutral-500">版本</dt>
              <dd>{health.version}</dd>
              <dt className="text-neutral-500">配置目录</dt>
              <dd className="break-all font-mono text-xs">
                {health.configDir}
                {!health.configDirExists && <span className="ml-2 text-red-600">（不存在）</span>}
              </dd>
              <dt className="text-neutral-500">会话数</dt>
              <dd>{health.sessionCount ?? <span className="text-red-600">读取失败</span>}</dd>
            </dl>
          )}
        </section>
      </main>
    </div>
  );
}
