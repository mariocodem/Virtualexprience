import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const SERIOUS = (impact: string | null | undefined) =>
  impact === 'serious' || impact === 'critical';

test.describe('landing', () => {
  test('«Ver cómo funciona» lleva a la sección y deja el foco en su título', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Ver cómo funciona' }).click();
    await expect(
      page.getByRole('heading', { name: 'Cómo se recorre el archipiélago' }),
    ).toBeFocused();
  });

  test('el recorrido rápido entra al mundo con el modo demo', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: 'Recorrido rápido con progreso precargado' }).first(),
    ).toHaveAttribute('href', '/mundo?demo=1');
  });

  test('los controles DUA cambian la página y se recuerdan', async ({ page }) => {
    await page.goto('/');
    const contrast = page.getByRole('switch', { name: 'Alto contraste' });
    await contrast.click();
    await expect(contrast).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');

    await page.getByRole('radio', { name: '150 %' }).check({ force: true });
    await expect
      .poll(() =>
        page.evaluate(() =>
          getComputedStyle(document.documentElement).getPropertyValue('--text-scale'),
        ),
      )
      .toBe('1.5');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
    await expect(page.getByRole('radio', { name: '150 %' })).toBeChecked();
  });

  test('axe: sin violaciones serias en alto contraste y texto al 150 %', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem(
        'virtux:preferencias',
        JSON.stringify({ state: { textStep: 3, contrast: 'alto', motion: 'sistema' }, version: 1 }),
      );
    });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
    await page.waitForTimeout(1600);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const serious = results.violations.filter((v) => SERIOUS(v.impact));
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test('el índice de islas muestra la ficha elegida', async ({ page }) => {
    await page.goto('/');
    const index = page.getByRole('navigation', { name: 'Índice de islas' });
    await index.getByRole('button', { name: 'Fractal' }).click();
    await expect(index.getByRole('button', { name: 'Fractal' })).toHaveAttribute(
      'aria-current',
      'step',
    );
    await expect(page.getByRole('heading', { name: 'Isla Fractal' })).toBeVisible();
  });

  test('quien vuelve con progreso ve «Continuar expedición»', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const now = new Date().toISOString();
      localStorage.setItem(
        'virtux:progreso',
        JSON.stringify({
          state: {
            version: 1,
            xp: 30,
            stations: {
              'ecos-imprenta': { startedAt: now, completedAt: now, attempts: 1, bestScore: 1 },
            },
            visitedIslands: ['ecos'],
            fragments: [],
            badges: { 'primer-zarpe': now },
            formatsTried: [],
            reflections: 0,
            activeDays: [],
            minigames: {},
            mastery: {},
            journal: [{ id: '1', at: now, kind: 'estacion-completada', ref: 'ecos-imprenta' }],
          },
          version: 1,
        }),
      );
    });
    await page.reload();
    await expect(page.getByRole('link', { name: 'Continuar expedición' }).first()).toHaveAttribute(
      'href',
      '/mundo/ecos',
    );
    await expect(page.getByText('Tu última escala fue Isla de los Ecos.')).toBeVisible();
  });

  test('con movimiento reducido el título se muestra completo desde el inicio', async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    const title = page.getByRole('heading', { level: 1 });
    await expect(title).toHaveAccessibleName('Aprende explorando. Enciende el Faro.');
    await expect(title.locator('span span').first()).toHaveCSS('opacity', '1');
    await context.close();
  });
});
