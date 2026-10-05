import { useQuery } from '@tanstack/react-query';
import type {
  ProjectGroup,
  SubagentTranscript,
  TranscriptItem,
} from '../../../server/src/protocol';

export type { ProjectGroup, SessionSummary, SubagentTranscript, TranscriptItem } from '../../../server/src/protocol';

export interface Health {
  ok: boolean;
  version: string;
  configDir: string;
  configDirExists: boolean;
  sessionCount: number | null;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export const queryKeys = {
  health: ['health'] as const,
  projects: ['projects'] as const,
  transcript: (sessionId: string) => ['transcript', sessionId] as const,
  subagents: (sessionId: string) => ['subagents', sessionId] as const,
};

export function useHealth() {
  return useQuery({ queryKey: queryKeys.health, queryFn: () => getJson<Health>('/api/health') });
}

export function useProjects() {
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => getJson<ProjectGroup[]>('/api/projects'),
  });
}

export function useTranscript(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.transcript(sessionId),
    queryFn: () =>
      getJson<{ items: TranscriptItem[] }>(`/api/sessions/${sessionId}/messages`).then(
        (r) => r.items,
      ),
  });
}

export function useSubagents(sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.subagents(sessionId),
    queryFn: () => getJson<SubagentTranscript[]>(`/api/sessions/${sessionId}/subagents`),
    enabled,
  });
}
