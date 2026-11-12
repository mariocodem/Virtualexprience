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
    await expect(
      page.getByRole('button', { name: 'Cartógrafo: ver detalles de la insignia' }),
    ).toBeVisible();
    await expect(page.getByText('Recuperaste el Fragmento del Patrón')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('cada insignia abre su ficha: cómo se sella, qué reconoce y tu avance', async ({ page }) => {
    await page.goto('/pasaporte?demo=1');
    await expect(page.getByRole('heading', { name: 'Sellos' })).toBeVisible();

    // Una sellada: fecha y lo que dice la bitácora.
    const stamp = page.getByRole('button', { name: 'Cartógrafo: ver detalles de la insignia' });
    await stamp.click();
    const sealed = page.getByRole('dialog', { name: 'Cartógrafo' });
    await expect(sealed).toBeVisible();
    await expect(sealed.getByText(/^Sellada el/)).toBeVisible();
    await expect(sealed.getByText('Cómo se sella')).toBeVisible();
    await expect(sealed.getByText('Qué reconoce')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(sealed).toBeHidden();
    await expect(stamp).toBeFocused();

    // Una por sellar: cuánto falta y adónde ir a ganarla.
    await page.getByRole('button', { name: /^Timonel/ }).click();
    const pending = page.getByRole('dialog', { name: 'Timonel' });
    await expect(pending.getByText(/Por sellar · llevas \d de 4/)).toBeVisible();
    await pending.getByRole('link', { name: 'Zarpar a Gerencia+' }).click();
    await expect(page).toHaveURL(/\/mundo\/gerencia$/);
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
