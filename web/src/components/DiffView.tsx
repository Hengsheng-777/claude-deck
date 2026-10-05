import { diffLines } from 'diff';
import { cn } from '@/lib/utils';

interface Line {
  kind: 'add' | 'del' | 'same';
  text: string;
}

export function toDiffLines(oldText: string, newText: string): Line[] {
  const lines: Line[] = [];
  for (const part of diffLines(oldText, newText)) {
    const kind = part.added ? 'add' : part.removed ? 'del' : 'same';
    const texts = part.value.replace(/\n$/, '').split('\n');
    for (const text of texts) lines.push({ kind, text });
  }
  return lines;
}

const sign = { add: '+', del: '-', same: ' ' } as const;

export function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const lines = toDiffLines(oldText, newText);
  return (
    <pre className="max-h-[28rem] overflow-auto rounded-md border border-neutral-200 text-xs leading-5 dark:border-neutral-800">
      {lines.map((line, i) => (
        <div
          key={i}
          data-kind={line.kind}
          className={cn(
            'px-2 whitespace-pre-wrap break-all',
            line.kind === 'add' && 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
            line.kind === 'del' && 'bg-red-50 text-red-900 dark:bg-red-950/60 dark:text-red-200',
          )}
        >
          <span className="mr-2 select-none opacity-50">{sign[line.kind]}</span>
          {line.text}
        </div>
      ))}
    </pre>
  );
}
