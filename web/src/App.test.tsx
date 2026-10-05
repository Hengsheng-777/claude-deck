// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProjectGroup, TranscriptItem } from '@/lib/api';
import { App } from './App';

const SESSION = '0974d5b0-ed86-4812-a7b4-38cdd38d91a2';

const projects: ProjectGroup[] = [
  {
    cwd: 'D:\\IdeaProjects\\demo',
    name: 'demo',
    lastModified: Date.now(),
    sessions: [
      {
        sessionId: SESSION,
        title: '修复登录 bug',
        cwd: 'D:\\IdeaProjects\\demo',
        gitBranch: 'main',
        lastModified: Date.now(),
      },
    ],
  },
];

let transcript: TranscriptItem[] = [
  { kind: 'user', id: 'u1', text: '登录按钮没反应', imageCount: 0 },
  { kind: 'assistant', id: 'a1', text: '我来看看 **login.ts**。' },
  {
    kind: 'tool',
    id: 't1',
    toolUseId: 'toolu_1',
    name: 'Edit',
    input: { file_path: 'src/login.ts', old_string: 'onClick={}', new_string: 'onClick={login}' },
    result: { text: 'ok', isError: false },
  },
  {
    kind: 'tool',
    id: 't2',
    toolUseId: 'toolu_2',
    name: 'Bash',
    input: { command: 'npm test' },
    result: { text: 'all passed', isError: false },
  },
];

class FakeWebSocket extends EventTarget {
  static last: FakeWebSocket | undefined;
  constructor(public url: string) {
    super();
    FakeWebSocket.last = this;
    queueMicrotask(() => this.dispatchEvent(new Event('open')));
  }
  emit(data: unknown) {
    this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) }));
  }
  close() {}
}

function stubApi() {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === '/api/projects') return Response.json(projects);
    if (url === '/api/health') {
      return Response.json({ ok: true, version: '0.1.0', configDir: 'C:\\Users\\xjy\\.claude', configDirExists: true, sessionCount: 1 });
    }
    if (url === `/api/sessions/${SESSION}/messages`) return Response.json({ items: transcript });
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderApp() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <App />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal('WebSocket', FakeWebSocket);
  location.hash = '';
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('侧边栏按项目列出会话，未选中时显示自检信息', async () => {
    stubApi();
    renderApp();
    expect(await screen.findByText('demo')).toBeTruthy();
    expect(screen.getByText('修复登录 bug')).toBeTruthy();
    expect(await screen.findByText('C:\\Users\\xjy\\.claude')).toBeTruthy();
    expect(await screen.findByText('已连接')).toBeTruthy();
  });

  it('点击会话后显示对话记录：Markdown、默认展开的 diff、默认折叠的命令', async () => {
    stubApi();
    renderApp();
    fireEvent.click(await screen.findByText('修复登录 bug'));

    expect(await screen.findByText('登录按钮没反应')).toBeTruthy();
    expect(screen.getByText('login.ts').tagName).toBe('STRONG');
    expect(location.hash).toBe(`#/session/${SESSION}`);
    expect(
      screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === 'D:\\IdeaProjects\\demo  ·  main'),
    ).toBeTruthy();

    const [edit, bash] = document.querySelectorAll('details.group');
    expect((edit as HTMLDetailsElement).open).toBe(true);
    expect(within(edit as HTMLElement).getByText('onClick={login}')).toBeTruthy();
    expect((bash as HTMLDetailsElement).open).toBe(false);
  });

  it('收到 session-updated 事件后自动刷新当前会话', async () => {
    const fetchMock = stubApi();
    location.hash = `#/session/${SESSION}`;
    renderApp();
    expect(await screen.findByText('登录按钮没反应')).toBeTruthy();

    transcript = [...transcript, { kind: 'assistant', id: 'a2', text: '修好了' }];
    await act(async () => FakeWebSocket.last!.emit({ type: 'session-updated', sessionId: SESSION }));

    expect(await screen.findByText('修好了')).toBeTruthy();
    const calls = fetchMock.mock.calls.filter(([url]) => url.endsWith('/messages'));
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it('后端不可用时显示错误', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 502 })));
    renderApp();
    expect(await screen.findByText(/后端不可用/)).toBeTruthy();
  });
});
