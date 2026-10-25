import { describe, expect, it } from 'vitest';
import { world } from '@/data';
import { hasStationContent, loadStationContent } from '@/data/content';
import type { StationContent } from '@/data/contentSchemas';
import type { FormatKind } from '@/types/domain';

const open = world.stations.filter((s) => s.availability === 'disponible');

function offeredFormats(content: StationContent): FormatKind[] {
  if (content.kind !== 'explorar') return [];
  return (['texto', 'audio', 'video', 'infografia', 'interactivo'] as const).filter(
    (f) => content.formats[f] !== undefined,
  );
}

describe('contenido de las estaciones', () => {
  it('toda estación abierta tiene su archivo de contenido', () => {
    const missing = open.filter((s) => !hasStationContent(s.id)).map((s) => s.id);
    expect(missing).toEqual([]);
  });

  it.each(open.map((s) => [s.id, s] as const))(
    '%s es válido y coincide con su ficha',
    async (_, station) => {
      const content = await loadStationContent(station.id);
      expect(content.kind).toBe(station.type);
      if (content.kind === 'reto') expect(content.minigame).toBe(station.minigame);
      if (content.kind === 'explorar') {
        expect(offeredFormats(content).sort()).toEqual([...station.formats].sort());
      }
    },
  );

  it('cada pregunta de opción múltiple tiene ids de opción únicos', async () => {
    for (const station of open) {
      const content = await loadStationContent(station.id);
      const items =
        content.kind === 'practicar' || content.kind === 'desafio'
          ? content.items
          : content.kind === 'explorar'
            ? content.check
            : [];
      for (const item of items) {
        const ids = item.options.map((o) => o.id);
        expect(new Set(ids).size, `${station.id}/${item.id}`).toBe(ids.length);
      }
    }
  });

  it('cada Bruma tiene embates de los tres niveles de sutileza', async () => {
    for (const station of open.filter((s) => s.type === 'desafio')) {
      const content = await loadStationContent(station.id);
      if (content.kind !== 'desafio') throw new Error(station.id);
      const tiers = new Set(content.items.map((i) => i.tier));
      expect([...tiers].sort(), station.id).toEqual([1, 2, 3]);
      expect(new Set(content.items.map((i) => i.id)).size).toBe(content.items.length);
    }
  });
});
