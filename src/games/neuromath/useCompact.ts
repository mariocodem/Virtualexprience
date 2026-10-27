import { useThree } from '@react-three/fiber';

/** ¿Pantalla angosta? Los rótulos largos se reducen al número. */
export function useCompact(): boolean {
  return useThree((s) => s.size.width < 640);
}
