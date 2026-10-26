import type { Vec2 } from './arena/core';

/** Acciones de un toque: se consumen una vez por pulsación. */
export type Action = 'fire' | 'dash' | 'interact';

const MOVE_KEYS: Record<string, Vec2> = {
  KeyW: { x: 0, z: -1 },
  ArrowUp: { x: 0, z: -1 },
  KeyS: { x: 0, z: 1 },
  ArrowDown: { x: 0, z: 1 },
  KeyA: { x: -1, z: 0 },
  ArrowLeft: { x: -1, z: 0 },
  KeyD: { x: 1, z: 0 },
  ArrowRight: { x: 1, z: 0 },
};

const ACTION_KEYS: Record<string, Action> = {
  Space: 'fire',
  KeyJ: 'fire',
  ShiftLeft: 'dash',
  ShiftRight: 'dash',
  KeyK: 'dash',
  KeyE: 'interact',
  Enter: 'interact',
};

/** Teclas que el juego usa: no deben desplazar la página mientras se juega. */
const GAME_KEYS = new Set([...Object.keys(MOVE_KEYS), ...Object.keys(ACTION_KEYS)]);

const isField = (el: Element | null) =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLTextAreaElement ||
  el instanceof HTMLSelectElement;
const isPressable = (el: Element | null) =>
  el instanceof HTMLButtonElement || el instanceof HTMLAnchorElement;

/**
 * Estado de los mandos de un juego: teclado (WASD o flechas, Espacio, Mayús,
 * E), ratón (apuntar y clic para disparar) y botones táctiles. Solo escucha
 * mientras el foco está dentro del escenario del juego; si el foco está en un
 * botón del HUD, Espacio y Enter son de ese botón.
 */
export class Controls {
  private keys = new Set<string>();
  private pressed = new Set<Action>();
  /** Punto del suelo bajo el puntero (lo actualiza `PointerAim`). */
  aim: Vec2 | null = null;
  /** Dirección desde los botones táctiles. */
  touch: Vec2 = { x: 0, z: 0 };
  private host: HTMLElement | null = null;

  private onDown = (event: KeyboardEvent) => {
    if (
      !this.host?.contains(document.activeElement) ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const active = document.activeElement;
    if (isField(active)) return;
    const action = ACTION_KEYS[event.code];
    if (action && (action === 'interact' || action === 'fire') && isPressable(active)) return;
    if (!GAME_KEYS.has(event.code)) return;
    event.preventDefault();
    if (!event.repeat && action) this.pressed.add(action);
    this.keys.add(event.code);
  };

  private onUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private onBlur = () => {
    this.keys.clear();
    this.touch = { x: 0, z: 0 };
  };

  /** Empieza a escuchar dentro de `host`. Devuelve la función para dejar de escuchar. */
  attach(host: HTMLElement): () => void {
    this.host = host;
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.onBlur);
    return () => {
      window.removeEventListener('keydown', this.onDown);
      window.removeEventListener('keyup', this.onUp);
      window.removeEventListener('blur', this.onBlur);
      this.host = null;
      this.onBlur();
    };
  }

  /** Dirección de movimiento combinada (teclado + táctil), con cada eje entre −1 y 1. */
  move(): Vec2 {
    let x = this.touch.x;
    let z = this.touch.z;
    for (const code of this.keys) {
      const dir = MOVE_KEYS[code];
      if (dir) {
        x += dir.x;
        z += dir.z;
      }
    }
    return { x: Math.max(-1, Math.min(1, x)), z: Math.max(-1, Math.min(1, z)) };
  }

  /** Registra una acción de un toque (desde el ratón o un botón táctil). */
  press(action: Action): void {
    this.pressed.add(action);
  }

  /** ¿Se pidió la acción desde la última vez? La consume. */
  take(action: Action): boolean {
    const had = this.pressed.has(action);
    this.pressed.delete(action);
    return had;
  }

  /** Olvida lo pendiente (al pausar o al abrir una decisión). */
  clear(): void {
    this.pressed.clear();
    this.keys.clear();
  }
}
