import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import type { StationSpot } from '../layout';
import { ATLAS } from '../palette';

/**
 * Sendero entre paradas, sobre el relieve: el tramo recorrido en tinta de ruta,
 * el que falta en punteado claro.
 */
export function Trail({ spots, completed }: { spots: StationSpot[]; completed: number }) {
  const points = useMemo(
    () =>
      spots.map(
        (s) => [s.position[0], s.position[1] + 0.06, s.position[2]] as [number, number, number],
      ),
    [spots],
  );
  const doneEnd = Math.min(points.length, Math.max(0, completed) + 1);
  const done = points.slice(0, doneEnd);
  const rest = points.slice(Math.max(0, doneEnd - 1));

  return (
    <>
      {done.length > 1 && <Line points={done} color={ATLAS.route} lineWidth={3.2} />}
      {rest.length > 1 && (
        <Line
          points={rest}
          color={ATLAS.plate}
          lineWidth={2}
          dashed
          dashSize={0.32}
          gapSize={0.22}
        />
      )}
    </>
  );
}
