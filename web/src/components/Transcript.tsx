import { createContext } from 'react';
import type { TranscriptItem } from '@/lib/api';
import { Markdown } from './Markdown';
import { ToolCard } from './ToolCard';

/** 当前会话 ID，供嵌套的子 agent 面板加载数据 */
export const SessionIdContext = createContext<string>('');

export function Transcript({ items }: { items: TranscriptItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Item key={item.id} item={item} />
      ))}
    </div>
  );
}

function Item({ item }: { item: TranscriptItem }) {
  switch (item.kind) {
    case 'user':
      return (
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl bg-neutral-100 px-4 py-2 text-sm leading-6 whitespace-pre-wrap break-words dark:bg-neutral-800">
            {item.text}
            {item.imageCount > 0 && (
              <span className="ml-1 text-xs text-neutral-500">［图片 ×{item.imageCount}］</span>
            )}
          </div>
        </div>
      );
    case 'assistant':
      return <Markdown text={item.text} />;
    case 'thinking':
      return (
        <details className="text-sm text-neutral-500">
          <summary className="cursor-pointer select-none">思考过程</summary>
          <div className="mt-1 border-l-2 border-neutral-200 pl-3 whitespace-pre-wrap dark:border-neutral-800">
            {item.text}
          </div>
        </details>
      );
    case 'tool':
      return <ToolCard item={item} />;
    case 'command':
      return (
        <div className="flex justify-end">
          <code className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">
            {item.name}
            {item.args && ` ${item.args}`}
          </code>
        </div>
      );
    case 'command-output':
      return <p className="text-center text-xs text-neutral-500">{item.text}</p>;
  }
}
