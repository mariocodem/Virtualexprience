import type { Bridge } from '@/data/contentSchemas';
import type { Vec2 } from '../shared/arena/core';

/**
 * Geografía de la arena del abismo: el anillo de roca, el hueco central, el
 * estribo donde se tiende el puente, la palanca de prueba y las losetas. El
 * puente corre sobre el eje Z, del estribo sur (el explorador) hacia el norte.
 */

export const ABYSS = {
  /** Radio de la plataforma (el núcleo limita al explorador a este círculo). */
  radius: 9,
  /** Radio del hueco central. */
  hole: 4.3,
  /** Medio ancho del tablero del puente. */
  deckHalf: 0.78,
  /** Radio del anillo donde esperan las losetas. */
  tileRing: 6.9,
  /** Alcance para usar una loseta, el estribo o la palanca con E. */
  reach: 1.4,
  abutment: { x: -0.2, z: 5.2 },
  lever: { x: 2.6, z: 5.7 },
} as const;

/** Largo del puente en unidades del mundo: de orilla a orilla del hueco. */
export const DECK = { start: ABYSS.hole, end: -ABYSS.hole, length: ABYSS.hole * 2 } as const;

/** Unidades del mundo por metro: el hueco proyectado siempre mide lo mismo en pantalla. */
export function metersToWorld(gap: number): number {
  return DECK.length / gap;
}

/** Posición de la loseta `index` de `count` en el anillo, por el lado norte y los costados. */
export function tileSpot(index: number, count: number): Vec2 {
  const from = 150;
  const to = 390;
  const t = count <= 1 ? 0.5 : index / (count - 1);
  const angle = ((from + (to - from) * t) * Math.PI) / 180;
  return { x: Math.cos(angle) * ABYSS.tileRing, z: Math.sin(angle) * ABYSS.tileRing };
}

export interface DeckSegment {
  pieceId: string;
  label: string;
  /** Extremos sobre el eje Z, de la orilla sur hacia el norte (z0 > z1). */
  z0: number;
  z1: number;
}

/** Tramos tendidos a escala, uno a continuación del otro desde el estribo. */
export function deckSegments(bridge: Bridge, placed: readonly string[]): DeckSegment[] {
  const scale = metersToWorld(bridge.gap);
  let z: number = DECK.start;
  return placed.flatMap((id) => {
    const piece = bridge.pieces.find((p) => p.id === id);
    if (!piece) return [];
    const segment = { pieceId: id, label: piece.label, z0: z, z1: z - piece.value * scale };
    z = segment.z1;
    return [segment];
  });
}

/** ¿Está la posición sobre el tablero del puente? */
export function onDeck(pos: Vec2): boolean {
  return (
    Math.abs(pos.x) <= ABYSS.deckHalf + 0.15 && pos.z <= DECK.start + 0.5 && pos.z >= DECK.end - 0.5
  );
}

/**
 * El hueco no se pisa: si el explorador entra en él lo devuelve al borde, salvo
 * por el puente iluminado, donde solo lo deja pasar por el tablero. Muta `pos`.
 */
export function keepOutOfAbyss(pos: Vec2, bridgeLit: boolean): void {
  const dist = Math.hypot(pos.x, pos.z);
  const edge = ABYSS.hole + 0.1;
  if (dist >= edge) return;
  if (bridgeLit) {
    pos.x = Math.max(-ABYSS.deckHalf, Math.min(ABYSS.deckHalf, pos.x));
    return;
  }
  const k = edge / Math.max(dist, 0.001);
  pos.x *= k;
  pos.z *= k;
}

/** El haz de una puente iluminado sale de su extremo norte, no del explorador. */
export function beamFromDeckEnd(beam: { from: Vec2 } | null): void {
  if (beam) beam.from = { x: 0, z: DECK.end };
}

/** Lleva una posición a otro punto (al estribo, cuando el puente se disuelve). */
export function relocate(pos: Vec2, to: Vec2): void {
  pos.x = to.x;
  pos.z = to.z;
}

export type Target = { kind: 'tile'; id: string } | { kind: 'abutment' } | { kind: 'lever' };

export interface Spot {
  target: Target;
  x: number;
  z: number;
}

/** El objetivo más cercano al alcance de `from`, o nulo. */
export function nearestTarget(
  from: Vec2,
  spots: readonly Spot[],
  reach: number = ABYSS.reach,
): Target | null {
  let best: Spot | null = null;
  let bestDist = reach;
  for (const spot of spots) {
    const d = Math.hypot(spot.x - from.x, spot.z - from.z);
    if (d <= bestDist) {
      best = spot;
      bestDist = d;
    }
  }
  return best?.target ?? null;
}
