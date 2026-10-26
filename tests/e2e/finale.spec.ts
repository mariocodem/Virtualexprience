import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

const ISLANDS = [
  'comunicarte',
  'neuromath',
  'voxcivitas',
  'gerencia',
  'activatuidea',
  'latidosocial',
];

/** Progreso con los seis fragmentos: el faro encendido y el Gran Reto abierto. */
async function withAllFragments(page: Page, gameMode: '3d' | 'accesible') {
  await page.addInitScript(
    ([islands, mode]) => {
      if (sessionStorage.getItem('sembrado')) return;
      sessionStorage.setItem('sembrado', '1');
      localStorage.setItem(
        'virtux:preferencias',
        JSON.stringify({
          state: {
            textStep: 0,
            contrast: 'normal',
            motion: 'sistema',
            mapMode: '3d',
            gameMode: mode,
            calmPace: false,
          },
          version: 1,
        }),
      );
      localStorage.setItem(
        'virtux:progreso',
        JSON.stringify({
          state: {
            version: 1,
            xp: 1200,
            stations: {},
            visitedIslands: islands,
            fragments: islands,
            badges: {},
            formatsTried: [],
            reflections: 0,
            activeDays: [],
            minigames: {},
            mastery: {},
            journal: [],
          },
          version: 1,
        }),
      );
    },
    [ISLANDS, gameMode] as const,
  );
}

test.describe('Gran Reto Integrador', () => {
  // Escenas 3D y axe en WebGL por software: más margen que el predeterminado.
  test.describe.configure({ timeout: 60_000 });

  test('sin los seis fragmentos, el faro explica qué falta', async ({ page }) => {
    await page.goto('/mundo/faro/gran-reto');
    await expect(
      page.getByRole('heading', { level: 1, name: 'El faro aún no tiene su luz' }),
    ).toBeVisible();
    await expect(page.getByText('Llevas 0 de 6.')).toBeVisible();
    const serious = await seriousViolations(page);
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test('con teclado: del faro a la Gran Bruma y su primer embate (versión accesible)', async ({
    page,
  }) => {
    await withAllFragments(page, 'accesible');
    await page.goto('/mundo?faro=1');
    const enter = page.getByRole('link', { name: 'Enfrentar a la Gran Bruma' });
    await enter.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/mundo\/faro\/gran-reto$/);
    await expect(page.getByRole('heading', { level: 1, name: 'La Gran Bruma' })).toBeVisible();

    const begin = page.getByRole('button', { name: 'Enfrentar a la Gran Bruma' });
    await begin.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText('Embate 1')).toBeVisible();
    await page.keyboard.press('1');
    await expect(
      page.getByRole('button', { name: /Siguiente embate|Encender el Faro/ }),
    ).toBeFocused();
    await page.waitForTimeout(600);
    const serious = await seriousViolations(page);
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/mundo\?faro=1$/);
  });

  test('en 3D: la Gran Bruma toma su primera forma en una arena jugable', async ({ page }) => {
    await withAllFragments(page, '3d');
    await page.goto('/mundo/faro/gran-reto');
    await page.getByRole('button', { name: 'Enfrentar a la Gran Bruma' }).click();
    const arena = page.getByRole('application');
    await expect(arena).toBeVisible({ timeout: 20_000 });
    await expect(arena).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'En pausa' })).toBeVisible();
    const serious = await seriousViolations(page);
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
});
