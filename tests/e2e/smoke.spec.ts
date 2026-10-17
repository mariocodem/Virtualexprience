import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('la landing presenta el mundo y su acción principal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Aprende explorando');
  await expect(page.getByRole('link', { name: 'Entrar al mundo' })).toBeVisible();
  await expect(page).toHaveTitle(/Archipiélago VirtuX/);
});

test('con teclado: saltar al contenido y entrar al mundo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Saltar al contenido' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();

  await page.getByRole('link', { name: 'Entrar al mundo' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/mundo$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Carta del archipiélago');
});

test('una dirección inexistente muestra la plancha 404', async ({ page }) => {
  await page.goto('/isla-perdida');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Esta carta no existe');
});

for (const path of ['/', '/mundo', '/pasaporte', '/accesibilidad']) {
  test(`axe: ${path} sin violaciones serias ni críticas`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
