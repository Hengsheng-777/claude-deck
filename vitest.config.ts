import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'web/src') },
  },
  test: {
    include: ['server/src/**/*.test.ts', 'web/src/**/*.test.tsx'],
    // 前端测试文件用 `// @vitest-environment jsdom` 单独切换环境
    environment: 'node',
  },
});
