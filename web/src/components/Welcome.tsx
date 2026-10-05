import { useHealth } from '@/lib/api';

/** 没有选中会话时的空白页，顺便展示环境自检信息 */
export function Welcome() {
  const { data: health, error } = useHealth();

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <section className="w-full max-w-md space-y-3 text-sm">
        <h2 className="text-base font-semibold">从左侧选择一个会话</h2>
        {error && <p className="text-red-600 dark:text-red-400">后端不可用：{String(error)}</p>}
        {health && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-neutral-500">
            <dt>版本</dt>
            <dd>{health.version}</dd>
            <dt>配置目录</dt>
            <dd className="font-mono text-xs break-all">
              {health.configDir}
              {!health.configDirExists && <span className="ml-2 text-red-600">（不存在）</span>}
            </dd>
            <dt>会话数</dt>
            <dd>{health.sessionCount ?? <span className="text-red-600">读取失败</span>}</dd>
          </dl>
        )}
      </section>
    </main>
  );
}
