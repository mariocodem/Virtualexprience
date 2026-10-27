import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function seriousViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
}

test.describe('pasaporte y modo demo', () => {
  test('el recorrido de demostración llena el pasaporte', async ({ page }) => {
    await page.goto('/pasaporte');
    await expect(page.getByRole('heading', { name: 'Tu pasaporte está en blanco' })).toBeVisible();

    await page.goto('/mundo?demo=1');
    await expect(page.getByText('Recorrido de demostración listo')).toBeVisible();
    await expect(page).toHaveURL(/\/mundo$/);

    await page.goto('/pasaporte');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cartógrafo');
    await expect(page.getByText('8 de 23 insignias selladas.')).toBeVisible();
    await expect(page.getByRole('img', { name: /^Insignia Cartógrafo/ })).toBeVisible();
    await expect(page.getByText('Recuperaste el Fragmento del Patrón')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('con progreso propio, la demo pregunta antes de reemplazarlo', async ({ page }) => {
    await page.goto('/mundo?demo=1');
    await expect(page.getByText('Recorrido de demostración listo')).toBeVisible();

    await page.goto('/pasaporte?demo=1');
    const dialog = page.getByRole('dialog', { name: '¿Cargar el recorrido de demostración?' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Conservar mi progreso' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/pasaporte$/);
  });

  test('exporta la imagen y reinicia el progreso', async ({ page }) => {
    await page.goto('/pasaporte?demo=1');
    await expect(page.getByRole('heading', { name: 'Sellos' })).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exportar como imagen' }).click();
    expect((await download).suggestedFilename()).toBe('pasaporte-archipielago-virtux.png');

    await page.getByRole('button', { name: 'Reiniciar progreso' }).click();
    const dialog = page.getByRole('dialog', { name: '¿Reiniciar tu expedición?' });
    await dialog.getByRole('button', { name: 'Reiniciar progreso' }).click();
    await expect(page.getByRole('heading', { name: 'Tu pasaporte está en blanco' })).toBeVisible();
  });
});
