import { useCallback, useSyncExternalStore } from 'react';

// 当前打开的会话记在 URL hash 里（#/session/<id>），刷新页面后保持不变
const PREFIX = '#/session/';

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function read(): string | null {
  return location.hash.startsWith(PREFIX) ? decodeURIComponent(location.hash.slice(PREFIX.length)) : null;
}

export function useSelectedSession(): [string | null, (sessionId: string | null) => void] {
  const sessionId = useSyncExternalStore(subscribe, read);
  const select = useCallback((id: string | null) => {
    location.hash = id ? `${PREFIX}${encodeURIComponent(id)}` : '';
  }, []);
  return [sessionId, select];
}
