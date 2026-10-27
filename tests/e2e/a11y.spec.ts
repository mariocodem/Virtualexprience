import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.describe('panel de accesibilidad', () => {
  test('Alt+A lo abre en cualquier página y los ajustes se aplican y se guardan', async ({
    page,
  }) => {
    await page.goto('/pasaporte');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const panel = page.getByRole('dialog', { name: 'Accesibilidad' });
    // El atajo se registra tras el primer pintado: con la CPU cargada, se reintenta.
    await expect(async () => {
      if (!(await panel.isVisible())) await page.keyboard.press('Alt+KeyA');
      await expect(panel).toBeVisible({ timeout: 1000 });
    }).toPass();
    await panel.getByRole('switch', { name: /Espaciado amplio/ }).click();
    await panel.getByText('Dislexia').click();
    const root = page.locator('html');
    await expect(root).toHaveAttribute('data-spacing', 'wide');
    await expect(root).toHaveAttribute('data-font', 'dislexia');

    const results = await new AxeBuilder({ page })
      .include('dialog[open]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await page.reload();
    await expect(root).toHaveAttribute('data-font', 'dislexia');
  });

  test('en una estación se abre desde su cabecera', async ({ page }) => {
    await page.goto('/mundo/comunicarte/comunicarte-imprenta');
    await page.getByRole('button', { name: 'Ajustes de accesibilidad' }).click();
    await expect(page.getByRole('dialog', { name: 'Accesibilidad' })).toBeVisible();
  });

  test('la declaración permite cambiar los ajustes en la propia página', async ({ page }) => {
    await page.goto('/accesibilidad');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Diseñado para todos' }),
    ).toBeVisible();
    await page.getByRole('switch', { name: /Alto contraste/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-contrast', 'high');
    await expect(page.getByRole('rowheader', { name: 'Alt + A' })).toBeVisible();
  });
});
