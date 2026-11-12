import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { StationSpot } from '../layout';
import { ATLAS } from '../palette';

interface DashMaterial {
  dashOffset: number;
}

/**
 * Sendero entre paradas, sobre el relieve: el tramo recorrido en tinta de ruta,
 * el que falta en punteado claro y, si Brújula guía a una escala, el tramo que
 * lleva hasta ella en amarillo, con el punteado avanzando hacia allá.
 */
export function Trail({
  spots,
  completed,
  next,
  still = false,
}: {
  spots: StationSpot[];
  completed: number;
  /** Índice de la escala a la que guía Brújula. */
  next?: number | undefined;
  still?: boolean;
}) {
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
  const leg = useMemo(() => {
    if (next === undefined || next < 1) return null;
    const from = points[next - 1];
    const to = points[next];
    if (!from || !to) return null;
    const lift = (p: [number, number, number]) =>
      [p[0], p[1] + 0.05, p[2]] as [number, number, number];
    return [lift(from), lift(to)];
  }, [points, next]);

  const legLine = useRef<{ material: DashMaterial } | null>(null);
  useFrame((_, delta) => {
    if (legLine.current && !still) legLine.current.material.dashOffset -= delta * 0.9;
  });

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
      {leg && (
        <Line
          ref={(line) => {
            legLine.current = line;
          }}
          points={leg}
          color={ATLAS.sun}
          lineWidth={4}
          dashed
          dashSize={0.28}
          gapSize={0.16}
        />
      )}
    </>
  );
}
