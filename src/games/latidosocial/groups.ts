import { ATLAS } from '@/world/palette';

/** Color de cada grupo comunitario: se reconoce de lejos y siempre va con su nombre en el HUD. */
export const GROUP_COLOR: Record<string, string> = {
  abuelas: '#a77bc0',
  jovenes: '#e0474d',
  pescadores: '#4a93cf',
  estudiantes: ATLAS.sun,
};

export const groupColor = (id: string): string => GROUP_COLOR[id] ?? ATLAS.plate;

/** Hash determinista 0–1 para repartir plantas, árboles y estrellas siempre igual. */
export function hash01(i: number, salt = 0): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
