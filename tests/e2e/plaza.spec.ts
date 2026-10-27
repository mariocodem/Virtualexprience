import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const FIRST = {
  comunicarte: 'comunicarte-imprenta',
  neuromath: 'neuromath-patrones',
  voxcivitas: 'voxcivitas-argumentos',
  gerencia: 'gerencia-recursos',
  activatuidea: 'activatuidea-problemas',
  latidosocial: 'latidosocial-territorio',
};

/** Camina con una tecla sostenida hasta que la pista de la plaza diga `hint`. */
async function walkUntil(page: Page, key: string, hint: string) {
  await page.keyboard.down(key);
  try {
    await expect(page.locator('[role="application"] p:has(> kbd)')).toContainText(hint, {
      timeout: 45_000,
    });
  } finally {
    await page.keyboard.up(key);
  }
}

test.describe('estaciones en la plaza 3D', () => {
  test('la primera estación de cada isla se juega en 3D', async ({ page }) => {
    test.slow();
    for (const [isla, estacion] of Object.entries(FIRST)) {
      await page.goto(`/mundo/${isla}/${estacion}`);
      await expect(page.getByRole('application', { name: /Explorar en 3D/ })).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByText('Estás jugando en 3D.')).toBeVisible();
    }
  });

  test('Explorar en 3D se completa solo con teclado', async ({ page }) => {
    test.slow();
    await page.goto('/mundo/comunicarte/comunicarte-imprenta');
    const stage = page.getByRole('application', { name: /Explorar en 3D/ });
    await expect(stage).toBeFocused({ timeout: 60_000 });

    // El farol empieza apagado; al fondo de la plaza espera el video.
    await walkUntil(page, 'ArrowUp', 'Farol apagado');
    await walkUntil(page, 'ArrowUp', 'Ver el video');
    await page.keyboard.press('e');
    await expect(page.getByRole('heading', { level: 2, name: 'Video' })).toBeFocused();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical'),
    ).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(stage).toBeFocused();

    await walkUntil(page, 'ArrowDown', 'Comprobar lo aprendido');
    await page.keyboard.press('e');
    for (;;) {
      await expect(page.locator('#decision-titulo')).toBeFocused();
      await page.keyboard.press('1');
      const next = page.getByRole('button', { name: /Siguiente pregunta|Completar estación/ });
      await expect(next).toBeFocused();
      const last = (await next.textContent())?.includes('Completar') ?? false;
      await page.keyboard.press('Enter');
      if (last) break;
    }
    await expect(page.getByText('Estación completada')).toBeVisible();
  });
});
