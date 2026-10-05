import { useLayoutEffect, useRef } from 'react';
import { useTranscript, type SessionSummary } from '@/lib/api';
import { SessionIdContext, Transcript } from './Transcript';

const STICK_TO_BOTTOM_PX = 80;

export function SessionView({ sessionId, summary }: { sessionId: string; summary?: SessionSummary }) {
  const { data: items, error, isLoading } = useTranscript(sessionId);
  const scroller = useRef<HTMLDivElement>(null);
  const lastSession = useRef<string | null>(null);
  const atBottom = useRef(true);

  // 打开会话时滚到底部；之后有新内容时，只在用户本来就停在底部时才跟随
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el || !items) return;
    if (lastSession.current !== sessionId || atBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
    lastSession.current = sessionId;
  }, [sessionId, items]);

  return (
    <SessionIdContext.Provider value={sessionId}>
      <div className="flex h-full min-w-0 flex-1 flex-col">
        <header className="border-b border-neutral-200 px-6 py-3 dark:border-neutral-800">
          <h2 className="truncate text-sm font-semibold">{summary?.title ?? sessionId}</h2>
          {summary?.cwd && (
            <p className="truncate font-mono text-xs text-neutral-500">
              {summary.cwd}
              {summary.gitBranch && `  ·  ${summary.gitBranch}`}
            </p>
          )}
        </header>
        <div
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_TO_BOTTOM_PX;
          }}
          className="flex-1 overflow-y-auto"
        >
          <div className="mx-auto max-w-3xl px-6 py-6">
            {isLoading && <p className="text-sm text-neutral-500">加载中…</p>}
            {error && <p className="text-sm text-red-600">读取会话失败：{String(error)}</p>}
            {items?.length === 0 && <p className="text-sm text-neutral-500">这个会话还没有内容。</p>}
            {items && <Transcript items={items} />}
          </div>
        </div>
      </div>
    </SessionIdContext.Provider>
  );
}
