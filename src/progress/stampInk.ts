import { minigameIsland } from '@/data';
import type { Badge } from '@/types/domain';

/** Tinta del sello: la de su isla si la tiene; si no, una por categoría. */
export function stampInk(badge: Badge): string {
  const { criterion } = badge;
  if (criterion.kind === 'island-completed') return `var(--isle-${criterion.islandId})`;
  if (criterion.kind === 'minigame') {
    const island = minigameIsland(criterion.minigame);
    if (island) return `var(--isle-${island})`;
  }
  switch (badge.category) {
    case 'accesibilidad':
      return 'var(--sea-700)';
    case 'constancia':
      return 'var(--isle-latidosocial)';
    default:
      return 'var(--ink)';
  }
}
