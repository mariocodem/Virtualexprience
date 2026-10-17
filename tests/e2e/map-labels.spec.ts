import { expect, test, type Page } from '@playwright/test';

/**
 * Contrato de la plancha: el mapa es la interfaz, así que ningún nombre de lugar
 * puede quedar recortado por el borde ni tapado por un recuadro.
 */
interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

async function heroLabels(page: Page) {
  return page.evaluate(() => {
    const section = document.getElementById('inicio');
    if (!section) throw new Error('sin hero');
    const toRect = (r: DOMRect) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    const plate = section.querySelector('.on-sea');
    const frame = plate?.getBoundingClientRect();
    const obstacles = [...section.querySelectorAll('[data-map-obstacle]')].map((e) =>
      toRect(e.getBoundingClientRect()),
    );
    const labels = [...section.querySelectorAll<HTMLElement>('[data-map-label]')].map((e) => {
      const holder = e.closest<HTMLElement>('span.absolute');
      return {
        text: e.textContent,
        visible: holder?.style.opacity === '1',
        rect: toRect(e.getBoundingClientRect()),
      };
    });
    return { frame: frame ? toRect(frame) : null, obstacles, labels };
  });
}

const inside = (r: Rect, f: Rect) =>
  r.left >= f.left - 1 && r.right <= f.right + 1 && r.top >= f.top - 1 && r.bottom <= f.bottom + 1;
const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`hero ${String(viewport.width)}×${String(viewport.height)}: los siete nombres de lugar se leen completos`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'escritorio', 'Se mide con viewports explícitos.');
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.waitForFunction(() =>
      [...document.querySelectorAll<HTMLElement>('#inicio [data-map-label]')].some(
        (e) => e.closest<HTMLElement>('span.absolute')?.style.opacity === '1',
      ),
    );
    const isPlace = (text: string) => !text.startsWith('Mar ') && !text.startsWith('Canal ');
    // La cámara se inclina al llegar (2,2 s): se mide el encuadre final.
    await page.waitForTimeout(2600);
    await expect
      .poll(
        async () =>
          (await heroLabels(page)).labels
            .filter((l) => isPlace(l.text) && !l.visible)
            .map((l) => l.text),
        { message: 'nombres ocultos por un recuadro', timeout: 10_000 },
      )
      .toEqual([]);

    const { frame, obstacles, labels } = await heroLabels(page);
    if (!frame) throw new Error('sin plancha');
    const visible = labels.filter((l) => l.visible);
    for (const label of visible) {
      expect(inside(label.rect, frame), `${label.text} se sale de la plancha`).toBe(true);
      for (const other of visible) {
        if (other === label) continue;
        expect(overlaps(label.rect, other.rect), `${label.text} choca con ${other.text}`).toBe(
          false,
        );
      }
      for (const obstacle of obstacles) {
        expect(overlaps(label.rect, obstacle), `${label.text} queda bajo un recuadro`).toBe(false);
      }
    }
  });
}
