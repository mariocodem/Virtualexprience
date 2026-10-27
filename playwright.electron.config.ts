import { defineConfig } from '@playwright/test';

/** Prueba del ejecutable ya empaquetado (`pnpm dist:linux` o `pnpm dist:win` antes). */
export default defineConfig({
  testDir: 'tests/electron',
  timeout: 90_000,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
});
