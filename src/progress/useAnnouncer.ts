import { useCallback } from 'react';
import { world } from '@/data';
import { useToast } from '@/ui/toastContext';
import type { ProgressEvent } from './types';

/** Convierte los eventos del progreso en avisos legibles (insignias, nivel, fragmentos). */
export function useAnnouncer() {
  const { notify } = useToast();
  return useCallback(
    (events: ProgressEvent[]) => {
      for (const event of events) {
        if (event.type === 'badge') {
          const badge = world.badges.find((b) => b.id === event.badgeId);
          if (badge)
            notify({
              title: `Insignia: ${badge.name}`,
              description: badge.description,
              tone: 'success',
            });
        } else if (event.type === 'level-up') {
          const level = world.levels.explorer.find((l) => l.id === event.levelId);
          if (level) notify({ title: `Nuevo nivel: ${level.name}`, tone: 'success' });
        } else if (event.type === 'fragment') {
          const island = world.islands.find((i) => i.id === event.islandId);
          if (island) {
            notify({
              title: `${island.fragmentName} recuperado`,
              description: 'El Faro Minuto gana luz.',
              tone: 'success',
            });
          }
        }
      }
    },
    [notify],
  );
}
