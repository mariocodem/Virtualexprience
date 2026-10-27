/**
 * Movimiento y encuadre del escritorio 3D: funciones puras para que las notas
 * vuelen entre el tubo, la mesa y las bandejas, y para encuadrar la mesa según
 * el espacio libre que dejan los paneles del HUD.
 */

export type Vec3 = readonly [number, number, number];

export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
export const easeInOutCubic = (t: number): number => {
  const k = clamp01(t);
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
};

/** Punto de un vuelo en arco entre dos puntos: sube `lift` a mitad de camino. */
export function arc(from: Vec3, to: Vec3, t: number, lift: number): [number, number, number] {
  const k = easeInOutCubic(t);
  return [
    from[0] + (to[0] - from[0]) * k,
    from[1] + (to[1] - from[1]) * k + Math.sin(Math.PI * clamp01(t)) * lift,
    from[2] + (to[2] - from[2]) * k,
  ];
}

export interface Framing {
  /** Píxeles que ocupa el panel de la nota a la izquierda (pantallas anchas). */
  panelX: number;
  /** Píxeles que ocupa el panel de la nota abajo (pantallas angostas). */
  panelY: number;
  /** Distancia de la cámara al centro de la mesa. */
  dist: number;
  fov: number;
}

const HALF_WIDTH = 7.4;
const SCENE_HEIGHT = 6.5;
export const WIDE_FROM = 768;

/** Encuadre de la mesa en el espacio que dejan libre los paneles del HUD. */
export function deskFraming(width: number, height: number): Framing {
  const wide = width >= WIDE_FROM;
  const panelX = wide ? Math.min(440, Math.round(width * 0.36)) : 0;
  const panelY = wide ? 0 : Math.round(height * 0.5);
  const visibleW = Math.max(1, width - panelX);
  const visibleH = Math.max(1, height - panelY);
  const fov = 40;
  // El encuadre llena todo el lienzo, pero la mesa solo ocupa el espacio libre
  // de los paneles: debe caber en ancho y en alto dentro de esa región.
  const t = Math.tan((fov / 2) * (Math.PI / 180));
  const forWidth = (2 * HALF_WIDTH * height) / (2 * t * visibleW);
  const forHeight = (SCENE_HEIGHT * height) / (2 * t * visibleH);
  const dist = Math.max(forWidth, forHeight);
  return { panelX, panelY, dist: Math.min(60, Math.max(9, dist)), fov };
}
