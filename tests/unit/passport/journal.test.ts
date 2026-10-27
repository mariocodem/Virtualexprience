import { describe, expect, it } from 'vitest';
import { world } from '@/data';
import { badgeTally, dayLabel, journalByDay, journalText } from '@/passport/journal';
import { demoProgress } from '@/progress/demo';
import type { JournalEntry } from '@/progress/types';
import { DAY_3 } from '../progress/helpers';

const entry = (kind: JournalEntry['kind'], ref: string): JournalEntry => ({
  id: `${kind}-${ref}`,
  at: DAY_3.toISOString(),
  kind,
  ref,
});
const badge = (id: string) => {
  const found = world.badges.find((b) => b.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe('bitácora del pasaporte', () => {
  it('compone una frase para cada tipo de entrada', () => {
    expect(journalText(entry('isla-visitada', 'gerencia'), world)).toBe('Llegaste a Gerencia+');
    expect(journalText(entry('estacion-completada', 'comunicarte-imprenta'), world)).toBe(
      'Completaste «La imprenta del puerto»',
    );
    expect(journalText(entry('fragmento', 'neuromath'), world)).toBe(
      'Recuperaste el Fragmento del Patrón',
    );
    expect(journalText(entry('insignia', 'cartografo'), world)).toBe(
      'Sellaste la insignia «Cartógrafo»',
    );
    expect(journalText(entry('nivel', 'navegante'), world)).toBe('Ascendiste a Navegante');
    expect(journalText(entry('formato', 'infografia'), world)).toBe(
      'Probaste el formato infografía',
    );
  });

  it('agrupa por día, de lo más reciente a lo más antiguo', () => {
    const days = journalByDay(demoProgress(world, DAY_3).journal);
    expect(days).toHaveLength(3);
    // Llegar a la sexta isla sella «Cartógrafo» justo después.
    expect(days[0]?.entries.slice(0, 2).map((e) => e.ref)).toEqual(['cartografo', 'activatuidea']);
    expect(days.at(-1)?.entries.at(-1)?.ref).toBe('comunicarte');
  });

  it('nombra hoy y ayer, y escribe la fecha de los demás días', () => {
    expect(dayLabel('2026-10-20', DAY_3)).toBe('Hoy');
    expect(dayLabel('2026-10-19', DAY_3)).toBe('Ayer');
    expect(dayLabel('2026-10-17', DAY_3)).toMatch(/^Sábado,? 17 de octubre$/);
  });

  it('cuenta el avance hacia las insignias de conteo', () => {
    const demo = demoProgress(world, DAY_3);
    expect(badgeTally(badge('cinco-sentidos'), demo, world)).toEqual({ current: 3, target: 5 });
    expect(badgeTally(badge('voz-con-proposito'), demo, world)).toEqual({ current: 3, target: 6 });
    expect(badgeTally(badge('cartografo'), demo, world)).toEqual({ current: 6, target: 6 });
    expect(badgeTally(badge('editor-riguroso'), demo, world)).toBeUndefined();
  });
});
