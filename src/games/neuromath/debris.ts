/**
 * Cinemática simple de lo que se cae: tramos de puente, losetas y la
 * vagoneta. Gravedad, giro constante y, al tocar el agua o la niebla del
 * fondo, se hunden despacio. Sin motor de física: con la misma semilla, la
 * misma caída.
 */

export const GRAVITY = 16;
/** Velocidad con la que se hunde lo que ya tocó fondo. */
const SINK_SPEED = 0.7;

export interface Body {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Giro acumulado sobre X y Z, en radianes. */
  rx: number;
  rz: number;
  /** Velocidad de giro sobre X y Z. */
  wx: number;
  wz: number;
  /** Ya tocó el agua o el fondo: deja de girar y se hunde. */
  sunk: boolean;
}

export interface Push {
  vx?: number;
  vy?: number;
  vz?: number;
  /** Cuánto giro al azar recibe (0 = ninguno). */
  spin?: number;
}

/** Un cuerpo que empieza a caer desde (x, y, z) con un empujón y un giro al azar. */
export function launch(
  x: number,
  y: number,
  z: number,
  random: () => number,
  push: Push = {},
): Body {
  const spin = push.spin ?? 1;
  return {
    x,
    y,
    z,
    vx: (push.vx ?? 0) + (random() - 0.5) * 0.8,
    vy: push.vy ?? 0,
    vz: (push.vz ?? 0) + (random() - 0.5) * 0.6,
    rx: 0,
    rz: 0,
    wx: (random() - 0.5) * 3 * spin,
    wz: (random() < 0.5 ? -1 : 1) * (1.2 + random() * 1.8) * spin,
    sunk: false,
  };
}

/**
 * Avanza un cuerpo `dt` segundos. Devuelve `true` en el cuadro en que toca
 * `floor` (para el chapuzón).
 */
export function fall(body: Body, dt: number, floor: number): boolean {
  if (body.sunk) {
    body.y -= SINK_SPEED * dt;
    return false;
  }
  body.vy -= GRAVITY * dt;
  body.x += body.vx * dt;
  body.y += body.vy * dt;
  body.z += body.vz * dt;
  body.rx += body.wx * dt;
  body.rz += body.wz * dt;
  if (body.y <= floor) {
    body.y = floor;
    body.sunk = true;
    return true;
  }
  return false;
}

/** Segundos que tarda en caer `height` metros desde el reposo. */
export function fallTime(height: number): number {
  return Math.sqrt((2 * Math.max(0, height)) / GRAVITY);
}
