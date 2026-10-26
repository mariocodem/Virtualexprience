import { useEffect, useState } from 'react';

/**
 * Verdadero un momento después de montar: los rótulos HTML de drei no deben
 * nacer en el doble montaje del modo estricto de desarrollo.
 */
export function useLater(ms = 120): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      setReady(true);
    }, ms);
    return () => {
      window.clearTimeout(id);
    };
  }, [ms]);
  return ready;
}
