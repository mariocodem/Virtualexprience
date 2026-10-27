import { localDay } from '@/progress/transitions';
import type { JournalEntry, Progress } from '@/progress/types';
import type { Badge, World } from '@/types/domain';
import { FORMAT_LABEL } from '@/world/stationText';

/** Texto de una entrada de la bitácora; la bitácora guarda datos, aquí se vuelven frases. */
export function journalText(entry: JournalEntry, world: World): string {
  const island = () => world.islands.find((i) => i.id === entry.ref);
  const station = () => world.stations.find((s) => s.id === entry.ref);
  switch (entry.kind) {
    case 'isla-visitada':
      return `Llegaste a ${island()?.name ?? entry.ref}`;
    case 'estacion-iniciada':
      return `Empezaste «${station()?.title ?? entry.ref}»`;
    case 'estacion-completada':
      return `Completaste «${station()?.title ?? entry.ref}»`;
    case 'fragmento':
      return `Recuperaste el ${island()?.fragmentName ?? 'fragmento de luz'}`;
    case 'insignia':
      return `Sellaste la insignia «${world.badges.find((b) => b.id === entry.ref)?.name ?? entry.ref}»`;
    case 'nivel':
      return `Ascendiste a ${world.levels.explorer.find((l) => l.id === entry.ref)?.name ?? entry.ref}`;
    case 'formato': {
      const label = (FORMAT_LABEL as Partial<Record<string, string>>)[entry.ref];
      return `Probaste el formato ${(label ?? entry.ref).toLowerCase()}`;
    }
    case 'reflexion':
      return `Escribiste una reflexión en «${station()?.title ?? entry.ref}»`;
    case 'gran-reto':
      return 'Disipaste a la Gran Bruma y el Faro Minuto volvió a brillar';
  }
}

export interface JournalDay {
  day: string;
  entries: JournalEntry[];
}

/** La bitácora agrupada por día, de lo más reciente a lo más antiguo. */
export function journalByDay(journal: JournalEntry[]): JournalDay[] {
  const days: JournalDay[] = [];
  for (const entry of [...journal].reverse()) {
    const day = localDay(new Date(entry.at));
    const last = days.at(-1);
    if (last?.day === day) last.entries.push(entry);
    else days.push({ day, entries: [entry] });
  }
  return days;
}

/** «Hoy», «Ayer» o la fecha completa del día (`AAAA-MM-DD`, hora local). */
export function dayLabel(day: string, now: Date = new Date()): string {
  if (day === localDay(now)) return 'Hoy';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (day === localDay(yesterday)) return 'Ayer';
  const [y, m, d] = day.split('-').map(Number);
  const date = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const text = date.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Avance hacia una insignia de conteo (estaciones, islas, días…); `undefined` si no se cuenta. */
export function badgeTally(
  badge: Badge,
  progress: Progress,
  world: World,
): { current: number; target: number } | undefined {
  const { criterion } = badge;
  const tally = (current: number, target: number) => ({
    current: Math.min(current, target),
    target,
  });
  switch (criterion.kind) {
    case 'stations-completed':
      return tally(
        Object.values(progress.stations).filter((r) => r.completedAt).length,
        criterion.count,
      );
    case 'islands-visited':
      return tally(progress.visitedIslands.length, criterion.count);
    case 'fragments':
      return tally(progress.fragments.length, criterion.count);
    case 'formats-tried':
      return tally(progress.formatsTried.length, criterion.count);
    case 'reflections':
      return tally(progress.reflections, criterion.count);
    case 'active-days':
      return tally(progress.activeDays.length, criterion.count);
    case 'island-completed': {
      const playable = world.stations.filter(
        (s) => s.islandId === criterion.islandId && s.availability === 'disponible',
      );
      return tally(
        playable.filter((s) => progress.stations[s.id]?.completedAt).length,
        playable.length,
      );
    }
    case 'minigame':
    case 'finale':
      return undefined;
  }
}
