import { useContext, useState, type ReactNode } from 'react';
import { useSubagents, type SubagentTranscript, type TranscriptItem } from '@/lib/api';
import { toolSummary } from '@/lib/format';
import { cn } from '@/lib/utils';
import { DiffView } from './DiffView';
import { Markdown } from './Markdown';
import { SessionIdContext, Transcript } from './Transcript';

type ToolItem = Extract<TranscriptItem, { kind: 'tool' }>;

const EDIT_TOOLS = new Set(['Edit', 'MultiEdit', 'Write']);

export function ToolCard({ item }: { item: ToolItem }) {
  const failed = item.result?.isError === true;
  // 文件改动和出错的调用默认展开，其余默认折叠
  const defaultOpen = failed || EDIT_TOOLS.has(item.name);

  return (
    <details
      open={defaultOpen}
      className="group rounded-lg border border-neutral-200 text-sm dark:border-neutral-800"
    >
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-1.5 select-none">
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            item.result === null ? 'bg-neutral-400' : failed ? 'bg-red-500' : 'bg-emerald-500',
          )}
        />
        <span className="font-medium">{item.name}</span>
        <span className="truncate font-mono text-xs text-neutral-500">
          {toolSummary(item.name, item.input)}
        </span>
        {failed && (
          <span className="ml-auto shrink-0 rounded bg-red-100 px-1.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            出错
          </span>
        )}
      </summary>
      <div className="space-y-2 border-t border-neutral-200 p-3 dark:border-neutral-800">
        <ToolBody item={item} />
      </div>
    </details>
  );
}

function ToolBody({ item }: { item: ToolItem }) {
  const { input, result } = item;
  const str = (key: string) => (typeof input[key] === 'string' ? (input[key] as string) : '');

  switch (item.name) {
    case 'Edit':
      return (
        <>
          <DiffView oldText={str('old_string')} newText={str('new_string')} />
          {input.replace_all === true && <Note>替换全部匹配</Note>}
          <ErrorOnly result={result} />
        </>
      );
    case 'MultiEdit': {
      const edits = Array.isArray(input.edits) ? (input.edits as Record<string, unknown>[]) : [];
      return (
        <>
          {edits.map((e, i) => (
            <DiffView key={i} oldText={String(e.old_string ?? '')} newText={String(e.new_string ?? '')} />
          ))}
          <ErrorOnly result={result} />
        </>
      );
    }
    case 'Write':
      return (
        <>
          <DiffView oldText="" newText={str('content')} />
          <ErrorOnly result={result} />
        </>
      );
    case 'Bash':
      return (
        <>
          <Pre>$ {str('command')}</Pre>
          <Result result={result} />
        </>
      );
    case 'TodoWrite':
      return <Todos todos={Array.isArray(input.todos) ? (input.todos as Todo[]) : []} />;
    case 'Agent':
    case 'Task':
      return (
        <>
          <details>
            <summary className="cursor-pointer text-xs text-neutral-500">任务说明</summary>
            <Markdown text={str('prompt')} className="mt-2" />
          </details>
          {result && <Markdown text={result.text} className={cn(result.isError && 'text-red-600')} />}
          <SubagentPanel toolUseId={item.toolUseId} prompt={str('prompt')} />
        </>
      );
    default:
      return (
        <>
          {Object.keys(input).length > 0 && <Pre>{JSON.stringify(input, null, 2)}</Pre>}
          <Result result={result} />
        </>
      );
  }
}

function Result({ result }: { result: ToolItem['result'] }) {
  if (result === null) return <Note>没有结果（可能被中断）</Note>;
  if (!result.text) return <Note>（无输出）</Note>;
  return <Pre className={cn(result.isError && 'text-red-600 dark:text-red-400')}>{result.text}</Pre>;
}

function ErrorOnly({ result }: { result: ToolItem['result'] }) {
  return result?.isError ? <Result result={result} /> : null;
}

function Pre({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <pre
      className={cn(
        'max-h-80 overflow-auto rounded-md bg-neutral-50 p-2 text-xs leading-5 whitespace-pre-wrap break-all dark:bg-neutral-900',
        className,
      )}
    >
      {children}
    </pre>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-xs text-neutral-500">{children}</p>;
}

interface Todo {
  content?: string;
  status?: 'pending' | 'in_progress' | 'completed';
}

const todoMark = { completed: '✓', in_progress: '◐', pending: '○' } as const;

function Todos({ todos }: { todos: Todo[] }) {
  return (
    <ul className="space-y-1">
      {todos.map((t, i) => (
        <li
          key={i}
          className={cn('flex gap-2', t.status === 'completed' && 'text-neutral-400 line-through')}
        >
          <span className="w-4 shrink-0 text-center">{todoMark[t.status ?? 'pending']}</span>
          {t.content}
        </li>
      ))}
    </ul>
  );
}

/** 子 agent 的完整对话，展开时才加载 */
function SubagentPanel({ toolUseId, prompt }: { toolUseId: string; prompt: string }) {
  const sessionId = useContext(SessionIdContext);
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useSubagents(sessionId, open);
  const subagent = data && findSubagent(data, toolUseId, prompt);

  return (
    <details onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="cursor-pointer text-xs text-neutral-500">子 agent 对话</summary>
      <div className="mt-2 border-l-2 border-neutral-200 pl-3 dark:border-neutral-800">
        {isLoading && <Note>加载中…</Note>}
        {data && !subagent && <Note>没有找到这个子 agent 的记录</Note>}
        {subagent && <Transcript items={subagent.items} />}
      </div>
    </details>
  );
}

/** 优先按工具调用 ID 匹配；旧记录里没有这个关联时，退而按任务说明匹配首条消息 */
export function findSubagent(
  subagents: SubagentTranscript[],
  toolUseId: string,
  prompt: string,
): SubagentTranscript | undefined {
  return (
    subagents.find((s) => s.parentToolUseId === toolUseId) ??
    subagents.find((s) => {
      const first = s.items[0];
      return first?.kind === 'user' && first.text.trim() === prompt.trim();
    })
  );
}
