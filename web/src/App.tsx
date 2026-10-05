import { useProjects } from '@/lib/api';
import { useServerEvents } from '@/lib/events';
import { useSelectedSession } from '@/lib/route';
import { SessionView } from './components/SessionView';
import { Sidebar } from './components/Sidebar';
import { Welcome } from './components/Welcome';

export function App() {
  const connection = useServerEvents();
  const [selected, select] = useSelectedSession();
  const { data: projects } = useProjects();
  const summary = projects
    ?.flatMap((p) => p.sessions)
    .find((s) => s.sessionId === selected);

  return (
    <div className="flex h-full">
      <Sidebar connection={connection} selected={selected} onSelect={select} />
      {selected ? <SessionView key={selected} sessionId={selected} summary={summary} /> : <Welcome />}
    </div>
  );
}
