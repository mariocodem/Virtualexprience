import type { Bridge } from '@/data/contentSchemas';
import { clearPieces, togglePiece, type BridgeState } from '@/minigames/puentes-de-fractal/engine';

/**
 * El banco de obra del reto 3D: qué pieza va en qué ranura del puente. Los
 * tramos se tienden en orden desde el estribo izquierdo, así que se puede
 * marcar una ranura ocupada (para cambiar su pieza) o la primera libre. La
 * selección resultante pasa al motor de siempre con sus propias funciones.
 */

/** Última ranura que se puede marcar: las ocupadas y la primera libre. */
export function lastTarget(selected: readonly string[], slots: number): number {
  return Math.max(0, Math.min(selected.length, slots - 1));
}

/** Mueve la marca de ranura sin salirse de las que se pueden marcar. */
export function moveTarget(
  target: number,
  delta: number,
  selected: readonly string[],
  slots: number,
): number {
  return Math.min(lastTarget(selected, slots), Math.max(0, target + delta));
}

export interface Placement {
  selected: string[];
  target: number;
}

/**
 * Pulsar una pieza: si ya está en el puente, vuelve al estante; si no, encaja
 * en la ranura marcada (y la que ocupaba esa ranura vuelve al estante).
 */
export function pressPiece(
  selected: readonly string[],
  slots: number,
  target: number,
  pieceId: string,
): Placement {
  if (selected.includes(pieceId)) {
    const next = selected.filter((id) => id !== pieceId);
    return { selected: next, target: Math.min(target, lastTarget(next, slots)) };
  }
  const at = Math.min(target, lastTarget(selected, slots));
  if (at < selected.length) {
    const next = [...selected];
    next[at] = pieceId;
    return { selected: next, target: at };
  }
  if (selected.length >= slots) return { selected: [...selected], target: at };
  const next = [...selected, pieceId];
  return { selected: next, target: lastTarget(next, slots) };
}

/** Quita la pieza de la ranura marcada; las de después se corren hacia el estribo. */
export function removeAt(selected: readonly string[], slots: number, target: number): Placement {
  if (target >= selected.length) return { selected: [...selected], target };
  const next = selected.filter((_, i) => i !== target);
  return { selected: next, target: Math.min(target, lastTarget(next, slots)) };
}

/** Lleva la selección del banco al estado del motor, con sus propias reglas. */
export function withSelection(
  state: BridgeState,
  bridge: Bridge,
  ids: readonly string[],
): BridgeState {
  return ids.reduce((s, id) => togglePiece(s, bridge, id), clearPieces(state));
}

export interface PlankSpot {
  pieceId: string;
  label: string;
  slot: number;
  /** Inicio y fin del tramo, en metros desde el estribo izquierdo. */
  start: number;
  end: number;
}

/** Tramos tendidos a escala: cada pieza empieza donde acaba la anterior. */
export function plankSpots(bridge: Bridge, selected: readonly string[]): PlankSpot[] {
  let start = 0;
  return selected.flatMap((id, slot) => {
    const piece = bridge.pieces.find((p) => p.id === id);
    if (!piece) return [];
    const spot = { pieceId: id, label: piece.label, slot, start, end: start + piece.value };
    start = spot.end;
    return [spot];
  });
}

/** Teclas de las piezas del estante: 1 a 9. */
export function pieceForKey(bridge: Bridge, key: string): string | null {
  const index = '123456789'.indexOf(key);
  if (index < 0) return null;
  return bridge.pieces[index]?.id ?? null;
}
