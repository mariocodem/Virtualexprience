import { useEffect, type RefObject } from 'react';

/**
 * Flechas, Inicio y Fin mueven el foco entre los enlaces de una lista; Tab
 * sigue funcionando como siempre (CLAUDE.md §6: flechas/Tab entre paradas).
 */
export function useArrowKeys(list: RefObject<HTMLElement | null>, key: string) {
  useEffect(() => {
    const node = list.current;
    if (!node) return;
    const onKey = (event: KeyboardEvent) => {
      const items = [...node.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
      const index = items.indexOf(document.activeElement as HTMLElement);
      if (index < 0) return;
      const next =
        event.key === 'ArrowDown' || event.key === 'ArrowRight'
          ? items[(index + 1) % items.length]
          : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
            ? items[(index - 1 + items.length) % items.length]
            : event.key === 'Home'
              ? items[0]
              : event.key === 'End'
                ? items.at(-1)
                : undefined;
      if (next) {
        event.preventDefault();
        next.focus();
      }
    };
    node.addEventListener('keydown', onKey);
    return () => {
      node.removeEventListener('keydown', onKey);
    };
  }, [list, key]);
}
