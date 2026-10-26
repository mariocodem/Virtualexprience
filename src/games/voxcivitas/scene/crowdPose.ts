import { ATLAS } from '@/world/palette';

/** Cómo se ve cada persona de la multitud en este cuadro. */
export interface CrowdPose {
  x: number;
  z: number;
  /** Giro en Y (el frente es +Z local). */
  rotY: number;
  /** De 1 (con su color) a 0 (gris, apagada por la indiferencia). */
  warmth: number;
  ink: string;
  /** Lleva su farol encendido en alto. */
  lit: boolean;
  /** Alza la mano pidiendo la palabra. */
  calling: boolean;
}

export const blankPose = (): CrowdPose => ({
  x: 0,
  z: 0,
  rotY: 0,
  warmth: 1,
  ink: ATLAS.sea[2],
  lit: false,
  calling: false,
});
