import { useEffect, useState } from 'react';

export interface Health {
  ok: boolean;
  version: string;
  configDir: string;
  configDirExists: boolean;
  sessionCount: number | null;
}

export type ConnectionState = 'connecting' | 'open' | 'closed';

export function useHealth(): { health: Health | null; error: string | null } {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health')
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as Health;
      })
      .then((h) => !cancelled && setHealth(h))
      .catch((e: unknown) => !cancelled && setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, []);

  return { health, error };
}

export function useConnection(): ConnectionState {
  const [state, setState] = useState<ConnectionState>('connecting');

  useEffect(() => {
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${location.host}/ws`);
    ws.addEventListener('open', () => setState('open'));
    ws.addEventListener('close', () => setState('closed'));
    return () => ws.close();
  }, []);

  return state;
}
