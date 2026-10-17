/** Periodo del reloj de marea compartido (segundos), igual que --tide en tokens.css. */
export const TIDE_PERIOD = 14;

/** Fase de la marea en [-1, 1] para un tiempo dado: todo lo que respira usa este reloj. */
export function tidePhase(seconds: number, offset = 0): number {
  return Math.sin(((seconds + offset) / TIDE_PERIOD) * Math.PI * 2);
}
