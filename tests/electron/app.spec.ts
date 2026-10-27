import { existsSync } from 'node:fs';
import path from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

const EXECUTABLE =
  process.platform === 'win32'
    ? path.join('release', 'win-unpacked', 'Virtual Experience Engineering SAS.exe')
    : path.join('release', 'linux-unpacked', 'archipielago-virtux');

// Algunos entornos (como la extensión de VS Code) fijan esta variable y el ejecutable arrancaría como Node.
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] =>
      entry[0] !== 'ELECTRON_RUN_AS_NODE' && entry[1] !== undefined,
  ),
);

test.skip(!existsSync(EXECUTABLE), `Falta el ejecutable empaquetado: ${EXECUTABLE}`);

test('el ejecutable abre sin red, aislado y con el modo demo', async () => {
  const app = await electron.launch({ executablePath: EXECUTABLE, env });
  const page = await app.firstWindow();

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Aprende explorando');
  expect(page.url()).toBe('app://archipielago/');
  expect(await app.evaluate(({ app: main }) => main.getName())).toBe(
    'Virtual Experience Engineering SAS',
  );

  // Sin Node en la página; el preload solo dice que es el ejecutable.
  expect(await page.evaluate(() => typeof (globalThis as { require?: unknown }).require)).toBe(
    'undefined',
  );
  expect(await page.evaluate(() => window.virtux?.desktop)).toBe(true);

  // Las rutas del enrutador cargan desde el paquete; la IA queda en su motor local.
  await page.goto('app://archipielago/pasaporte?demo=1');
  await expect(page.getByRole('heading', { name: 'Sellos' })).toBeVisible();
  expect(await page.evaluate(async () => (await fetch('/api/brujula')).status)).toBe(503);

  await app.close();
});
