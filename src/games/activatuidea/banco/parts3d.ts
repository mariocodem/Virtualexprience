import { ATLAS, BUILD } from '@/world/palette';
import type { PartKind } from './model';

/**
 * Cómo se ve cada pieza sobre el bolso del banco de pruebas: formas simples
 * (caja, cilindro, esfera, cono) en coordenadas del bolso. El cuerpo mide
 * 1,5 de ancho, 1 de alto y 0,7 de fondo, con su base en y = 0 y su frente en z = 0,35.
 */

export interface PartShape {
  geo: 'box' | 'cyl' | 'sphere' | 'cone';
  /** Caja: ancho, alto, fondo. Cilindro y cono: radio, alto. Esfera: radio. */
  size: readonly number[];
  pos: readonly [number, number, number];
  rot?: readonly [number, number, number];
  color: string;
  /** Brilla por sí misma (tela fosforescente, cintas reflectivas). */
  glow?: boolean;
}

const HALF_PI = Math.PI / 2;

const SHAPES: Record<PartKind, PartShape[]> = {
  'cierre-enrollable': [
    {
      geo: 'cyl',
      size: [0.11, 1.5],
      pos: [0, 1.16, 0],
      rot: [0, 0, HALF_PI],
      color: BUILD.woodDark,
    },
    { geo: 'box', size: [0.22, 0.2, 0.08], pos: [0, 0.98, 0.4], color: BUILD.metal },
  ],
  'tela-fosforescente': [
    { geo: 'box', size: [1.54, 0.46, 0.74], pos: [0, 0.28, 0], color: '#b6ff3c', glow: true },
  ],
  'correa-acolchada': [
    { geo: 'box', size: [0.16, 0.12, 0.9], pos: [-0.45, 1.12, 0], color: BUILD.woodDark },
    { geo: 'box', size: [0.2, 0.1, 0.4], pos: [-0.45, 1.2, 0], color: BUILD.thatch },
  ],
  candado: [
    { geo: 'box', size: [0.22, 0.2, 0.1], pos: [0.5, 0.75, 0.4], color: ATLAS.sun },
    { geo: 'cyl', size: [0.07, 0.12], pos: [0.5, 0.9, 0.4], color: BUILD.metal },
  ],
  fuelle: [
    { geo: 'box', size: [0.2, 0.9, 0.62], pos: [-0.85, 0.5, 0], color: '#bfa878' },
    { geo: 'box', size: [0.2, 0.9, 0.62], pos: [0.85, 0.5, 0], color: '#bfa878' },
  ],
  'cinta-reflectiva': [
    { geo: 'box', size: [1.56, 0.08, 0.76], pos: [0, 0.62, 0], color: '#eef2c0', glow: true },
  ],
  portavasos: [
    { geo: 'cyl', size: [0.17, 0.42], pos: [-1.0, 0.3, 0.12], color: ATLAS.sea[2] },
    { geo: 'cyl', size: [0.2, 0.04], pos: [-1.0, 0.1, 0.12], color: BUILD.metal },
  ],
  'panel-solar': [
    {
      geo: 'box',
      size: [0.9, 0.05, 0.55],
      pos: [0, 1.28, 0],
      rot: [-0.18, 0, 0],
      color: BUILD.panel,
    },
  ],
  'cinta-pecho': [
    {
      geo: 'box',
      size: [1.0, 0.1, 0.06],
      pos: [0, 0.55, 0.39],
      rot: [0, 0, 0.5],
      color: BUILD.metal,
    },
  ],
  logo: [
    {
      geo: 'cyl',
      size: [0.16, 0.04],
      pos: [0.38, 0.62, 0.38],
      rot: [HALF_PI, 0, 0],
      color: ATLAS.sun,
    },
  ],
  'version-playa': [
    { geo: 'cyl', size: [0.025, 0.8], pos: [0.45, 1.5, 0], color: BUILD.woodDark },
    { geo: 'cone', size: [0.55, 0.22], pos: [0.45, 1.95, 0], color: ATLAS.route },
  ],
  rediseno: [
    {
      geo: 'box',
      size: [1.1, 0.05, 0.05],
      pos: [0, 0.45, 0.4],
      rot: [0, 0, 0.6],
      color: ATLAS.sea[3],
    },
    {
      geo: 'box',
      size: [1.1, 0.05, 0.05],
      pos: [0, 0.45, 0.4],
      rot: [0, 0, -0.6],
      color: ATLAS.sea[3],
    },
  ],
  'forro-transpirable': [
    { geo: 'box', size: [1.3, 0.06, 0.5], pos: [0, 1.0, 0], color: '#9fe0c4' },
  ],
  'lote-regalo': [
    { geo: 'box', size: [0.36, 0.3, 0.36], pos: [0.4, 1.28, 0.05], color: ATLAS.route },
    { geo: 'box', size: [0.08, 0.32, 0.38], pos: [0.4, 1.28, 0.05], color: ATLAS.sun },
  ],
  'bolsa-carnada': [{ geo: 'sphere', size: [0.26], pos: [1.0, 0.28, 0.1], color: BUILD.soil }],
  aromatizante: [
    {
      geo: 'cone',
      size: [0.14, 0.32],
      pos: [-0.4, 0.45, 0.42],
      rot: [Math.PI, 0, 0],
      color: '#5ec27a',
    },
  ],
  'detalles-reflectivos': [
    { geo: 'box', size: [0.2, 0.08, 0.06], pos: [-0.5, 0.2, 0.4], color: '#eef2c0', glow: true },
    { geo: 'box', size: [0.2, 0.08, 0.06], pos: [0.5, 0.2, 0.4], color: '#eef2c0', glow: true },
  ],
  'lona-delgada': [{ geo: 'box', size: [1.52, 0.03, 0.72], pos: [0, 1.08, 0], color: BUILD.wall }],
  ruedas: [
    {
      geo: 'cyl',
      size: [0.2, 0.12],
      pos: [-0.55, 0.1, 0.3],
      rot: [0, 0, HALF_PI],
      color: BUILD.metal,
    },
    {
      geo: 'cyl',
      size: [0.2, 0.12],
      pos: [0.55, 0.1, 0.3],
      rot: [0, 0, HALF_PI],
      color: BUILD.metal,
    },
  ],
  'forro-colores': [
    { geo: 'box', size: [0.3, 0.46, 0.04], pos: [-0.35, 0.4, 0.43], color: '#e0703c' },
    { geo: 'box', size: [0.3, 0.46, 0.04], pos: [0, 0.4, 0.43], color: '#7d5aa6' },
    { geo: 'box', size: [0.3, 0.46, 0.04], pos: [0.35, 0.4, 0.43], color: '#4fa6a2' },
  ],
  etiqueta: [{ geo: 'box', size: [0.3, 0.16, 0.04], pos: [0, 0.55, 0.4], color: ATLAS.plate }],
};

/** Formas de una pieza (siempre al menos una). */
export function shapesFor(kind: PartKind): PartShape[] {
  return SHAPES[kind];
}
