const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 侧边栏用的相对时间：刚刚 / N 分钟前 / N 小时前 / 昨天 / M月D日 / YYYY年M月D日 */
export function relativeTime(ms: number, now: number = Date.now()): string {
  const diff = now - ms;
  if (diff < MINUTE) return '刚刚';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} 分钟前`;

  const date = new Date(ms);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (ms >= today.getTime()) return `${Math.floor(diff / HOUR)} 小时前`;
  if (ms >= today.getTime() - DAY) return '昨天';

  const md = `${date.getMonth() + 1}月${date.getDate()}日`;
  return date.getFullYear() === today.getFullYear() ? md : `${date.getFullYear()}年${md}`;
}

/** 工具卡片标题栏上的一句话摘要 */
export function toolSummary(name: string, input: Record<string, unknown>): string {
  const str = (key: string) => (typeof input[key] === 'string' ? (input[key] as string) : '');
  switch (name) {
    case 'Bash':
      return str('description') || str('command');
    case 'Read':
    case 'Write':
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return str('file_path') || str('notebook_path');
    case 'Grep':
      return [str('pattern'), str('path')].filter(Boolean).join('  ·  ');
    case 'Glob':
      return str('pattern');
    case 'WebFetch':
      return str('url');
    case 'WebSearch':
      return str('query');
    case 'Agent':
    case 'Task':
      return str('description');
    case 'Skill':
      return str('skill');
    case 'TodoWrite':
      return Array.isArray(input.todos) ? `${input.todos.length} 项待办` : '';
    default:
      return '';
  }
}
