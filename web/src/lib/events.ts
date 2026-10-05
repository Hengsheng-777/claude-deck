import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { ServerEvent } from '../../../server/src/protocol';
import { queryKeys } from './api';

export type ConnectionState = 'connecting' | 'open' | 'closed';

const RECONNECT_MS = 2000;

/** 订阅服务端事件，据此刷新对应的查询；断线后自动重连 */
export function useServerEvents(): ConnectionState {
  const queryClient = useQueryClient();
  const [state, setState] = useState<ConnectionState>('connecting');

  useEffect(() => {
    let ws: WebSocket | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;

    const connect = () => {
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${protocol}://${location.host}/ws`);
      ws.addEventListener('open', () => {
        setState('open');
        // 断线期间可能错过了变化，重连后全部刷新一次
        void queryClient.invalidateQueries();
      });
      ws.addEventListener('message', (e: MessageEvent<string>) => {
        const event = JSON.parse(e.data) as ServerEvent;
        if (event.type === 'sessions-changed') {
          void queryClient.invalidateQueries({ queryKey: queryKeys.projects });
          void queryClient.invalidateQueries({ queryKey: queryKeys.health });
        } else if (event.type === 'session-updated') {
          void queryClient.invalidateQueries({ queryKey: queryKeys.transcript(event.sessionId) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.subagents(event.sessionId) });
        }
      });
      ws.addEventListener('close', () => {
        if (disposed) return;
        setState('closed');
        retry = setTimeout(connect, RECONNECT_MS);
      });
    };

    connect();
    return () => {
      disposed = true;
      clearTimeout(retry);
      ws?.close();
    };
  }, [queryClient]);

  return state;
}
