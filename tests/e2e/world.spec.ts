import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

const worldList = (page: Page) =>
  page.getByRole('region', { name: 'Mundo de Archipiélago VirtuX' });

test.describe('el mundo', () => {
  test('solo con teclado: carta → isla → estación → volver', async ({ page }) => {
    await page.goto('/mundo');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Carta del archipiélago' }),
    ).toBeVisible();

    const comunicarte = worldList(page).getByRole('link', { name: /ComunicArte/ });
    await comunicarte.focus();
    await page.keyboard.press('ArrowDown');
    await expect(worldList(page).getByRole('link', { name: /NeuroMath/ })).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(comunicarte).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/mundo\/comunicarte$/);
    await expect(page.getByRole('heading', { level: 1, name: 'ComunicArte' })).toBeVisible();

    const first = worldList(page).getByRole('link', { name: /La imprenta del puerto/ });
    await first.focus();
    await page.keyboard.press('ArrowDown');
    await expect(worldList(page).getByRole('link', { name: /Taller de titulares/ })).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('Enter');

    const panelTitle = page.getByRole('heading', { level: 2, name: 'La imprenta del puerto' });
    await expect(panelTitle).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Comenzar estación' })).toBeFocused();
    await page.keyboard.press('Enter');

    // El escenario de la estación, a pantalla completa; Esc vuelve al sendero.
    // Con el 3D por software (swiftshader) y pruebas en paralelo, la CPU puede tardar en liberarse.
    await expect(page).toHaveURL(/\/mundo\/comunicarte\/comunicarte-imprenta$/, {
      timeout: 30_000,
    });
    await expect(
      page.getByRole('heading', { level: 1, name: 'La imprenta del puerto' }),
    ).toBeVisible({ timeout: 30_000 });
    // La estación se juega en 3D: Esc pausa y desde la pausa se vuelve al sendero.
    await expect(page.getByRole('application', { name: /Explorar en 3D/ })).toBeFocused({
      timeout: 30_000,
    });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'En pausa' })).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Salir' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/mundo\/comunicarte\?estacion=comunicarte-imprenta$/);
    await expect(
      page.getByText('Estación en curso: tu bitácora registró el inicio.'),
    ).toBeVisible();
    await expect(first).toContainText('En curso');

    await page.keyboard.press('Escape');
    await expect(panelTitle).toBeHidden();
    await expect(first).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/mundo$/);
  });

  test('una estación bloqueada explica qué falta para abrirla', async ({ page }) => {
    await page.goto('/mundo/comunicarte?estacion=comunicarte-titulares');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Taller de titulares' }),
    ).toBeVisible();
    await expect(page.getByText(/Para abrirla, completa antes/)).toContainText(
      'La imprenta del puerto',
    );
    await expect(page.getByRole('link', { name: 'Comenzar estación' })).toHaveCount(0);
  });

  test('el faro muestra su luz y el Gran Reto Integrador', async ({ page }) => {
    await page.goto('/mundo?faro=1');
    await expect(page.getByRole('heading', { level: 2, name: 'Faro Minuto' })).toBeFocused();
    await expect(page.getByText('Brilla con 0 de 6 fragmentos de luz.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gran Reto Integrador' })).toBeVisible();
  });

  test('una isla inexistente lo dice y ofrece volver', async ({ page }) => {
    await page.goto('/mundo/atlantida');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Esa isla no está en la carta' }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Volver a la carta' }).click();
    await expect(page).toHaveURL(/\/mundo$/);
  });

  test('la carta 2D es equivalente y se recuerda', async ({ page }) => {
    await page.goto('/mundo');
    await page.getByRole('radio', { name: 'Carta 2D' }).check({ force: true });
    await expect(page.locator('canvas')).toHaveCount(0);
    await worldList(page)
      .getByRole('link', { name: /ComunicArte/ })
      .click();
    await worldList(page)
      .getByRole('link', { name: /La imprenta del puerto/ })
      .click();
    await expect(page.getByRole('link', { name: 'Comenzar estación' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('radio', { name: 'Carta 2D' })).toBeChecked();
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  for (const [name, path] of [
    ['carta', '/mundo'],
    ['isla', '/mundo/comunicarte'],
    ['estación', '/mundo/comunicarte?estacion=comunicarte-imprenta'],
    ['faro', '/mundo?faro=1'],
  ] as const) {
    test(`axe: ${name} sin violaciones serias`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForTimeout(800);
      const serious = await seriousViolations(page);
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
    });
  }
});
