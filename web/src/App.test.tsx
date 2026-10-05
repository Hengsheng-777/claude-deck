// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

class FakeWebSocket extends EventTarget {
  constructor(public url: string) {
    super();
    queueMicrotask(() => this.dispatchEvent(new Event('open')));
  }
  close() {}
}

beforeEach(() => {
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubHealth(response: Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(() => response));
}

describe('App', () => {
  it('显示后端返回的环境信息和连接状态', async () => {
    stubHealth(
      Promise.resolve(
        Response.json({
          ok: true,
          version: '0.1.0',
          configDir: 'C:\\Users\\xjy\\.claude',
          configDirExists: true,
          sessionCount: 12,
        }),
      ),
    );
    render(<App />);
    expect(await screen.findByText('C:\\Users\\xjy\\.claude')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(await screen.findByText('已连接')).toBeTruthy();
  });

  it('后端不可用时显示错误', async () => {
    stubHealth(Promise.resolve(new Response(null, { status: 502 })));
    render(<App />);
    expect(await screen.findByText(/后端不可用/)).toBeTruthy();
  });
});
