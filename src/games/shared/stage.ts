/** Botón sobre el lienzo, legible sobre el mar oscuro. */
export const STAGE_BUTTON =
  'inline-flex min-h-11 items-center gap-2 border-[1.5px] border-sea-300 bg-sea-950/80 px-3 font-display text-sm font-bold text-plate hover:border-land-sun focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-land-sun';

export interface ControlHelp {
  keys: string;
  action: string;
}

/** Controles comunes de las arenas; cada juego añade o reemplaza los suyos. */
export const ARENA_HELP: ControlHelp[] = [
  { keys: 'WASD o flechas', action: 'Moverte' },
  { keys: 'Ratón', action: 'Apuntar la linterna' },
  { keys: 'Espacio o clic', action: 'Disparar el haz (necesita carga)' },
  { keys: 'Mayús', action: 'Esquivar' },
  { keys: 'E o Enter', action: 'Usar lo que tienes cerca' },
  { keys: 'Esc o P', action: 'Pausa' },
];
