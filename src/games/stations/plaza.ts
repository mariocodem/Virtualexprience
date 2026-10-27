import type { Landmark, LandmarkKind } from '@/world/landmarks';
import type { IslandId } from '@/types/domain';
import type { Vec2 } from '../shared/arena/core';
import type { ControlHelp } from '../shared/stage';

/**
 * La plaza de una estación en 3D: el explorador camina por un claro de la isla
 * y se acerca a puntos (los formatos de un tema, las opciones de un ejercicio,
 * la bitácora). Todo es puro y determinista; los componentes solo lo dibujan.
 */

export const PLAZA_HELP: ControlHelp[] = [
  { keys: 'WASD o flechas', action: 'Caminar por la plaza' },
  { keys: 'E o Enter', action: 'Usar lo que tienes cerca' },
  { keys: 'Esc', action: 'Cerrar el panel abierto o pausar' },
  { keys: 'P', action: 'Pausa' },
];

/** Radio del claro por el que se camina, en unidades del mundo. */
export const PLAZA_RADIUS = 7.2;
/** Distancia a la que un punto queda «a mano» para usarlo con E. */
export const REACH = 1.7;
const SPEED = 5.4;
const MARGIN = 0.6;

export interface Walker {
  x: number;
  z: number;
  /** Hacia dónde mira, en radianes sobre XZ (0 = +X). */
  facing: number;
  moving: boolean;
}

export interface Spot {
  id: string;
  x: number;
  z: number;
}

/** El explorador entra por el frente de la plaza, mirando hacia el fondo. */
export function createWalker(): Walker {
  return { x: 0, z: 4.6, facing: -Math.PI / 2, moving: false };
}

/** Un paso de caminata: la diagonal no es más rápida y el borde del claro detiene. */
export function stepWalker(walker: Walker, move: Vec2, dt: number, radius = PLAZA_RADIUS): void {
  const length = Math.hypot(move.x, move.z);
  walker.moving = length > 0.01;
  if (!walker.moving) return;
  const k = Math.min(1, length) / length;
  walker.x += move.x * k * SPEED * dt;
  walker.z += move.z * k * SPEED * dt;
  walker.facing = Math.atan2(move.z, move.x);
  const limit = radius - MARGIN;
  const distance = Math.hypot(walker.x, walker.z);
  if (distance > limit) {
    walker.x *= limit / distance;
    walker.z *= limit / distance;
  }
}

/** El punto más cercano a mano, o `undefined` si ninguno está al alcance. */
export function nearestSpot(
  spots: readonly Spot[],
  walker: Pick<Walker, 'x' | 'z'>,
  reach = REACH,
): Spot | undefined {
  let best: Spot | undefined;
  let bestDistance = reach;
  for (const spot of spots) {
    const d = Math.hypot(spot.x - walker.x, spot.z - walker.z);
    if (d <= bestDistance) {
      best = spot;
      bestDistance = d;
    }
  }
  return best;
}

/** Reparte puntos en un arco al fondo de la plaza (ángulos en grados; −90 = fondo). */
export function arcSpots(ids: readonly string[], radius: number, from = -155, to = -25): Spot[] {
  if (ids.length === 1) {
    const a = ((from + to) / 2) * (Math.PI / 180);
    return [{ id: ids[0] ?? '', x: Math.cos(a) * radius, z: Math.sin(a) * radius }];
  }
  return ids.map((id, i) => {
    const a = (from + ((to - from) * i) / (ids.length - 1)) * (Math.PI / 180);
    return { id, x: Math.cos(a) * radius, z: Math.sin(a) * radius };
  });
}

type Piece = readonly [kind: LandmarkKind, angle: number, radius: number, scale: number];

/**
 * El lugar de cada isla alrededor de la plaza, con las mismas construcciones
 * de la carta: el puerto con su radio, el observatorio, el cabildo, el
 * astillero, el taller y la ceiba. El frente queda libre para la cámara.
 */
const SETS: Record<IslandId, readonly Piece[]> = {
  comunicarte: [
    ['radio', -90, 13, 12],
    ['imprenta', -132, 10.6, 11],
    ['casa', -160, 10.4, 9],
    ['casa', -172, 12.2, 8],
    ['casa', -58, 10.6, 9],
    ['casa', -32, 11.2, 9],
    ['arbol', -112, 12.4, 9],
    ['arbol', -14, 11.6, 8],
  ],
  neuromath: [
    ['observatorio', -90, 12.4, 12],
    ['solido', -140, 10.2, 9],
    ['solido', -46, 10.4, 9],
    ['solido', -166, 11.4, 8],
    ['arbol', -116, 12.4, 9],
    ['arbol', -64, 12.6, 9],
  ],
  voxcivitas: [
    ['cabildo', -90, 12.6, 11],
    ['campanario', -128, 11.4, 11],
    ['casona', -160, 10.6, 9],
    ['casona', -56, 10.8, 9],
    ['casona', -26, 11.4, 9],
    ['casona', -176, 12, 8],
    ['arbol', -70, 13, 9],
  ],
  gerencia: [
    ['grua', -62, 12.4, 11],
    ['astillero', -24, 15.5, 8],
    ['bodega', -112, 11.6, 10],
    ['bodega', -152, 11, 10],
    ['puesto', -88, 10, 9],
    ['puesto', -172, 10.6, 9],
    ['cajas', -132, 9.8, 9],
    ['cajas', -10, 10.4, 9],
  ],
  activatuidea: [
    ['taller', -92, 11.4, 11],
    ['domo', -140, 10.8, 10],
    ['aerogenerador', -52, 12.8, 11],
    ['panel', -20, 10.4, 9],
    ['panel', -166, 10.4, 9],
    ['bombilla', -116, 9.8, 9],
    ['arbol', -72, 12.4, 9],
  ],
  latidosocial: [
    ['ceiba', -90, 12.6, 12],
    ['maloca', -140, 10.8, 10],
    ['huerta', -42, 9.8, 10],
    ['huerta', -170, 9.8, 10],
    ['arbol', -116, 11.8, 9],
    ['arbol', -62, 12.2, 9],
    ['arbol', -20, 11.8, 9],
    ['arbol', -156, 12.4, 9],
  ],
};

/** Construcciones del lugar de la isla, mirando hacia la plaza. */
export function islandSet(id: IslandId): Landmark[] {
  return SETS[id].map(([kind, angle, radius, scale], i) => {
    const a = angle * (Math.PI / 180);
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    return {
      kind,
      position: [x, 0, z] as const,
      rotation: Math.atan2(-x, -z),
      scale,
      level: 0,
      variant: i,
    };
  });
}
