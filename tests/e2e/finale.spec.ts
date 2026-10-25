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
async function withAllFragments(page: Page) {
  await page.addInitScript((islands) => {
    if (sessionStorage.getItem('sembrado')) return;
    sessionStorage.setItem('sembrado', '1');
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
  }, ISLANDS);
}

test.describe('Gran Reto Integrador', () => {
  test('sin los seis fragmentos, el faro explica qué falta', async ({ page }) => {
    await page.goto('/mundo/faro/gran-reto');
    await expect(
      page.getByRole('heading', { level: 1, name: 'El faro aún no tiene su luz' }),
    ).toBeVisible();
    await expect(page.getByText('Llevas 0 de 6.')).toBeVisible();
    const serious = await seriousViolations(page);
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });

  test('con teclado: del faro a la Gran Bruma y su primer embate', async ({ page }) => {
    await withAllFragments(page);
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
});
