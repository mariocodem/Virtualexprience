import { expect, test, type Page } from '@playwright/test';

/** Progreso guardado: la cartela muestra «Continuar expedición» y una línea más. */
async function withProgress(page: Page) {
  await page.evaluate(() => {
    const now = new Date().toISOString();
    localStorage.setItem(
      'virtux:progreso',
      JSON.stringify({
        state: {
          version: 1,
          xp: 30,
          stations: {
            'comunicarte-imprenta': { startedAt: now, completedAt: now, attempts: 1, bestScore: 1 },
          },
          visitedIslands: ['comunicarte'],
          fragments: [],
          badges: {},
          formatsTried: [],
          reflections: 0,
          activeDays: [],
          minigames: {},
          mastery: {},
          journal: [{ id: '1', at: now, kind: 'estacion-completada', ref: 'comunicarte-imprenta' }],
        },
        version: 1,
      }),
    );
  });
  await page.reload();
}

async function boxes(page: Page) {
  const card = await page.locator('#hero-titulo').locator('xpath=..').boundingBox();
  const cue = await page.getByRole('link', { name: 'Desliza para zarpar' }).boundingBox();
  const plate = await page.locator('#inicio .on-sea').boundingBox();
  if (!card || !cue || !plate) throw new Error('falta un elemento del hero');
  return { card, cue, plate };
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  for (const returning of [false, true]) {
    test(`hero ${String(viewport.width)}×${String(viewport.height)}${returning ? ' con progreso' : ''}: cartela y señal de scroll no se pisan`, async ({
      page,
    }, info) => {
      test.skip(
        info.project.name !== 'escritorio',
        'Se mide con viewports explícitos de escritorio.',
      );
      await page.setViewportSize(viewport);
      await page.goto('/');
      if (returning) await withProgress(page);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForTimeout(1200);

      const { card, cue, plate } = await boxes(page);
      // La señal queda debajo de la cartela, sin solaparse.
      expect(cue.y).toBeGreaterThanOrEqual(card.y + card.height);
      // Cartela y señal caben dentro de la plancha.
      expect(card.y + card.height).toBeLessThanOrEqual(plate.y + plate.height);
      expect(cue.y + cue.height).toBeLessThanOrEqual(plate.y + plate.height + 1);
    });
  }
}
