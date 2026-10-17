import { useSyncExternalStore } from 'react';
import { usePreferences } from './preferences';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener('change', callback);
  return () => {
    media.removeEventListener('change', callback);
  };
}

const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;

/** Movimiento reducido por el sistema operativo o por elección en el panel. */
export function useReducedMotion(): boolean {
  const system = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const preference = usePreferences((s) => s.motion);
  return system || preference === 'reducido';
}
