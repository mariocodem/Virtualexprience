import { defineConfig } from '@playwright/test';

const port = 4173;

/** `pnpm evidencias`: capturas de las pantallas clave en docs/evidencias/. */
export default defineConfig({
  testDir: 'tests/evidencias',
  timeout: 240_000,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: `http://127.0.0.1:${String(port)}`,
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'no-preference',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: 'pnpm exec vite build && pnpm exec vite preview --host 127.0.0.1',
    url: `http://127.0.0.1:${String(port)}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
