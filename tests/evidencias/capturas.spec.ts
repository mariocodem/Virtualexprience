import path from 'node:path';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const OUT = path.join('docs', 'evidencias');
const shot = (page: Page, name: string) =>
  page.screenshot({
    path: path.join(OUT, `${name}.jpg`),
    type: 'jpeg',
    quality: 82,
    timeout: 120_000,
  });

/** Siembra el progreso con estaciones completadas, como lo dejaría un estudiante. */
async function seed(context: BrowserContext, done: string[], visited: string[]) {
  const stations = Object.fromEntries(
    done.map((id) => [
      id,
      {
        startedAt: '2026-10-20T10:00:00.000Z',
        completedAt: '2026-10-20T10:05:00.000Z',
        attempts: 1,
        bestScore: 1,
      },
    ]),
  );
  await context.addInitScript(
    ({ stations, visited }) => {
      if (sessionStorage.getItem('sembrado')) return;
      sessionStorage.setItem('sembrado', '1');
      localStorage.setItem(
        'virtux:progreso',
        JSON.stringify({
          state: {
            version: 1,
            xp: 300,
            stations,
            visitedIslands: visited,
            fragments: [],
            badges: {},
            formatsTried: [],
            reflections: 0,
            activeDays: [],
            minigames: {},
            mastery: {},
            journal: [],
            finale: null,
          },
          version: 1,
        }),
      );
    },
    { stations, visited },
  );
}

const ISLANDS = [
  {
    id: 'comunicarte',
    pre: ['comunicarte-imprenta', 'comunicarte-titulares', 'comunicarte-radio'],
    reto: 'comunicarte-sala-redaccion',
    extra: ['comunicarte-bitacora-editor'],
    begin: 'Entrar a la cabina',
  },
  {
    id: 'neuromath',
    pre: ['neuromath-patrones', 'neuromath-proporciones'],
    reto: 'neuromath-puentes',
    extra: [],
    begin: 'Entrar al cañón',
  },
  {
    id: 'voxcivitas',
    pre: ['voxcivitas-argumentos', 'voxcivitas-dilemas'],
    reto: 'voxcivitas-cabildo',
    extra: [],
    begin: 'Abrir la sesión',
  },
  {
    id: 'gerencia',
    pre: ['gerencia-recursos', 'gerencia-decisiones'],
    reto: 'gerencia-mercado',
    extra: [],
    begin: 'Abrir el puesto',
  },
  {
    id: 'activatuidea',
    pre: ['activatuidea-problemas', 'activatuidea-prototipo'],
    reto: 'activatuidea-taller',
    extra: [],
    begin: 'Abrir el taller',
  },
  {
    id: 'latidosocial',
    pre: ['latidosocial-territorio', 'latidosocial-bienestar'],
    reto: 'latidosocial-huerta',
    extra: [],
    begin: 'Abrir la huerta',
  },
];

test.describe('recorrido', () => {
  test('landing, carta, isla, pasaporte y accesibilidad', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(4000);
    await shot(page, '01-landing');

    await page.goto('/mundo?demo=1');
    await expect(page.getByRole('heading', { name: 'Carta del archipiélago' })).toBeVisible();
    await page.waitForTimeout(9000);
    await shot(page, '02-carta-3d');

    await page.goto('/mundo/comunicarte?estacion=comunicarte-sala-redaccion');
    await expect(page.getByRole('heading', { level: 2, name: 'Sala de Redacción' })).toBeVisible();
    await page.waitForTimeout(6000);
    await shot(page, '03-isla-comunicarte');

    await page.goto('/pasaporte');
    await expect(page.getByRole('heading', { name: 'Sellos' })).toBeVisible();
    await page.waitForTimeout(1500);
    await shot(page, '04-pasaporte');
    await page.getByRole('heading', { name: 'Sellos' }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await shot(page, '05-pasaporte-sellos');

    await page.getByRole('button', { name: 'Ajustes de accesibilidad' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Accesibilidad' })).toBeVisible();
    await shot(page, '06-panel-accesibilidad');
    await page.getByRole('dialog').getByText('Carta 2D').click();
    await page
      .getByRole('dialog')
      .getByRole('switch', { name: /Alto contraste/ })
      .click();
    await page.keyboard.press('Escape');

    await page.goto('/mundo/comunicarte');
    await expect(page.getByRole('heading', { level: 1, name: 'ComunicArte' })).toBeVisible();
    await page.waitForTimeout(1500);
    await shot(page, '07-carta-2d-alto-contraste');
  });

  test('en el móvil', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 412, height: 915 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.goto('/mundo?demo=1');
    await expect(page.getByRole('heading', { name: 'Carta del archipiélago' })).toBeVisible();
    await page.waitForTimeout(9000);
    await shot(page, '08-movil-carta');
    await page.goto('/pasaporte');
    await expect(page.getByRole('heading', { name: 'Sellos' })).toBeVisible();
    await shot(page, '09-movil-pasaporte');
    await context.close();
  });
});

test('estaciones en la plaza 3D', async ({ browser }) => {
  const shots: [string, string, string[]][] = [
    ['22-plaza-explorar-comunicarte', '/mundo/comunicarte/comunicarte-imprenta', []],
    ['23-plaza-explorar-latidosocial', '/mundo/latidosocial/latidosocial-territorio', []],
    [
      '24-plaza-practicar-neuromath',
      '/mundo/neuromath/neuromath-proporciones',
      ['neuromath-patrones'],
    ],
  ];
  for (const [name, url, done] of shots) {
    const context = await browser.newContext();
    await seed(context, done, []);
    const page = await context.newPage();
    await page.goto(url);
    await expect(page.locator('[role="application"]')).toBeVisible({ timeout: 90_000 });
    await page.waitForTimeout(6000);
    await shot(page, name);
    await context.close();
  }
});

for (const [index, island] of ISLANDS.entries()) {
  const n = String(10 + index * 2);
  test(`${island.id}: reto y arena en 3D`, async ({ browser }) => {
    for (const kind of ['reto', 'arena'] as const) {
      const context = await browser.newContext();
      const done = kind === 'reto' ? island.pre : [...island.pre, island.reto, ...island.extra];
      await seed(context, done, [island.id]);
      const page = await context.newPage();
      const station = kind === 'reto' ? island.reto : `${island.id}-cierre`;
      await page.goto(`/mundo/${island.id}/${station}`);
      await page
        .getByRole('button', { name: kind === 'reto' ? island.begin : /Enfrentar a la Bruma/ })
        .click({ timeout: 60_000 });
      await expect(page.locator('[role="application"]')).toBeVisible({ timeout: 90_000 });
      await page.waitForTimeout(8000);
      await shot(page, `${kind === 'reto' ? n : String(Number(n) + 1)}-${island.id}-${kind}`);
      await context.close();
    }
  });
}
