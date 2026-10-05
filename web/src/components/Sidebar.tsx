import { useProjects } from '@/lib/api';
import type { ConnectionState } from '@/lib/events';
import { relativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const connectionLabel: Record<ConnectionState, string> = {
  connecting: '连接中',
  open: '已连接',
  closed: '已断开',
};

interface Props {
  connection: ConnectionState;
  selected: string | null;
  onSelect: (sessionId: string) => void;
}

export function Sidebar({ connection, selected, onSelect }: Props) {
  const { data: projects, error } = useProjects();

  return (
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

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {error && <p className="px-2 text-xs text-red-600">读取会话失败：{String(error)}</p>}
        {projects?.length === 0 && (
          <p className="px-2 text-xs text-neutral-500">还没有会话。在 CLI 里开始一个会话，这里会自动出现。</p>
        )}
        {projects?.map((project) => (
          <details key={project.cwd ?? ''} open className="mb-1">
            <summary
              title={project.cwd ?? undefined}
              className="cursor-pointer truncate rounded px-2 py-1 text-xs font-medium text-neutral-500 select-none hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              {project.name}
            </summary>
            <ul>
              {project.sessions.map((s) => (
                <li key={s.sessionId}>
                  <button
                    type="button"
                    onClick={() => onSelect(s.sessionId)}
                    aria-current={s.sessionId === selected ? 'page' : undefined}
                    className={cn(
                      'flex w-full items-baseline gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900',
                      s.sessionId === selected && 'bg-neutral-100 dark:bg-neutral-800',
                    )}
                  >
                    <span className="flex-1 truncate">{s.title}</span>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {relativeTime(s.lastModified)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </nav>
    </aside>
  );
}
