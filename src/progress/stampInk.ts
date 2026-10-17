import type { Badge } from '@/types/domain';

/** Tinta del sello: la de su isla si la tiene; si no, una por categoría. */
export function stampInk(badge: Badge): string {
  const { criterion } = badge;
  if (criterion.kind === 'island-completed') return `var(--isle-${criterion.islandId})`;
  if (criterion.kind === 'minigame') return 'var(--isle-ecos)';
  switch (badge.category) {
    case 'accesibilidad':
      return 'var(--sea-700)';
    case 'constancia':
      return 'var(--isle-raiz)';
    default:
      return 'var(--ink)';
  }
}
