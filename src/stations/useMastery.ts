import { useCallback, useRef } from 'react';
import { INITIAL_MASTERY, tierDifficulty, updateMastery } from '@/ai/adaptiveEngine';
import { useProgress } from '@/progress/store';
import type { IslandId } from '@/types/domain';

/** Actualiza el dominio de la competencia de la isla con cada respuesta (motor adaptativo). */
export function useMastery(islandId: IslandId) {
  const attempts = useRef(0);
  const setMastery = useProgress((s) => s.setMastery);
  const record = useCallback(
    (tier: 1 | 2 | 3, outcome: number) => {
      const current = useProgress.getState().mastery[islandId] ?? INITIAL_MASTERY;
      setMastery(islandId, updateMastery(current, tierDifficulty(tier), outcome, attempts.current));
      attempts.current += 1;
    },
    [islandId, setMastery],
  );
  const current = useProgress((s) => s.mastery[islandId] ?? INITIAL_MASTERY);
  return { mastery: current, record };
}
