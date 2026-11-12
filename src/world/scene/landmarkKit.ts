import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Euler,
  ExtrudeGeometry,
  Float32BufferAttribute,
  IcosahedronGeometry,
  Matrix4,
  OctahedronGeometry,
  Quaternion,
  SphereGeometry,
  TetrahedronGeometry,
  Shape as ThreeShape,
  TorusGeometry,
  Vector2,
  Vector3,
  type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { seededRandom } from '../geography';
import type { Landmark, LandmarkKind } from '../landmarks';
import { ATLAS, BUILD, ISLE } from '../palette';

/**
 * Kit de construcciones low-poly hecho con primitivas. Cada tipo es una lista
 * de piezas en coordenadas locales: base en y = 0 sobre la terraza y frente
 * hacia +Z (el mar). Las piezas estáticas de una isla se funden en una sola
 * geometría con color por vértice: una llamada de dibujo por isla.
 */

type Vec3 = readonly [number, number, number];

export type Shape =
  | { box: Vec3 }
  /** Radio arriba, radio abajo, alto, lados. */
  | { cyl: readonly [number, number, number, number?] }
  | { cone: readonly [number, number, number?] }
  | { ball: readonly [number, number?] }
  /** Media esfera facetada: radio y lados. */
  | { dome: readonly [number, number] }
  /** Bóveda de medio cilindro a lo largo de X: radio, largo. */
  | { vault: readonly [number, number] }
  /** Tejado a dos aguas con la cumbrera a lo largo de X: ancho, alto, fondo. */
  | { roof: Vec3 }
  | { solid: 'ico' | 'octa' | 'tetra' | 'dodeca'; r: number }
  /** Arco de toro: radio, grosor, ángulo. */
  | { arc: readonly [number, number, number] }
  /** Corazón extruido y abombado, de frente hacia +Z: ancho y grosor. */
  | { heart: readonly [number, number] };

export interface Part {
  shape: Shape;
  color: string;
  at?: Vec3;
  rot?: Vec3;
  scale?: Vec3;
}

export interface KitContext {
  variant: number;
  /** Altura de la terraza sobre el agua: las piezas que bajan al mar la usan. */
  drop: number;
}

const FACADES = [BUILD.wall, BUILD.wallWarm, BUILD.wallRose, BUILD.wallSky];
const AWNINGS = [ISLE.gerencia, ATLAS.route, ATLAS.sun, ISLE.comunicarte];
const pickOf = <T>(list: readonly T[], i: number): T => list[i % list.length] as T;

function house(ctx: KitContext, w: number, roof: string, wall: string): Part[] {
  return [
    { shape: { box: [w, 0.2, 0.22] }, color: wall, at: [0, 0.1, 0] },
    { shape: { roof: [w + 0.04, 0.13, 0.26] }, color: roof, at: [0, 0.2, 0] },
    { shape: { box: [0.05, 0.09, 0.01] }, color: BUILD.woodDark, at: [0, 0.045, 0.111] },
    { shape: { box: [0.05, 0.05, 0.01] }, color: BUILD.glassDark, at: [w * 0.3, 0.12, 0.111] },
    { shape: { box: [0.05, 0.05, 0.01] }, color: BUILD.glassDark, at: [-w * 0.3, 0.12, 0.111] },
    ...(ctx.variant === 3
      ? [
          {
            shape: { cyl: [0.02, 0.025, 0.12, 5] },
            color: BUILD.stoneDark,
            at: [w * 0.3, 0.3, -0.05],
          } satisfies Part,
        ]
      : []),
  ];
}

/** Coloca piezas dentro de un marco (posición y giro): para armar figuras inclinadas o abiertas. */
export function nest(frame: { at?: Vec3; rot?: Vec3 }, parts: readonly Part[]): Part[] {
  const parent = new Matrix4().compose(
    new Vector3(...(frame.at ?? [0, 0, 0])),
    new Quaternion().setFromEuler(new Euler(...(frame.rot ?? [0, 0, 0]))),
    new Vector3(1, 1, 1),
  );
  const p = new Vector3();
  const q = new Quaternion();
  const s = new Vector3();
  const e = new Euler();
  return parts.map((part) => {
    new Matrix4()
      .compose(
        p.set(...(part.at ?? [0, 0, 0])),
        q.setFromEuler(e.set(...(part.rot ?? [0, 0, 0]))),
        s.set(...(part.scale ?? [1, 1, 1])),
      )
      .premultiply(parent)
      .decompose(p, q, s);
    e.setFromQuaternion(q);
    return { ...part, at: [p.x, p.y, p.z], rot: [e.x, e.y, e.z], scale: [s.x, s.y, s.z] };
  });
}

/** Altura de la losa del pedestal: ahí se apoya cada estatua. */
export const PLINTH_TOP = 0.18;

/**
 * Pedestal común de los monumentos: zócalo, cuerpo de piedra con la franja del
 * acento de la isla, placa al frente y losa clara arriba. Bajo y angosto: la
 * estatua es la que manda, y su base cabe en la cumbre junto al desafío.
 */
function plinth(accent: string, w = 0.26): Part[] {
  return [
    { shape: { box: [w + 0.08, 0.04, w + 0.08] }, color: BUILD.stoneDark, at: [0, 0.02, 0] },
    { shape: { box: [w, 0.11, w] }, color: BUILD.stone, at: [0, 0.095, 0] },
    { shape: { box: [w + 0.02, 0.03, w + 0.02] }, color: accent, at: [0, 0.125, 0] },
    { shape: { box: [w * 0.5, 0.045, 0.01] }, color: ATLAS.plate, at: [0, 0.075, w / 2 + 0.005] },
    { shape: { box: [w + 0.05, 0.03, w + 0.05] }, color: BUILD.paving, at: [0, 0.165, 0] },
  ];
}

/** Tono del cerebro de ComunicArte: rosado de la isla, más claro en los lóbulos. */
const BRAIN = { lobe: '#eba5b9', fold: '#c46f8c', deep: '#b35a79' } as const;
/** Arcilla cálida de las manos que sostienen el corazón. */
const CLAY = { light: '#d9a271', dark: '#b97c4e' } as const;

const LOBE = { r: 0.22, scale: [0.8, 0.86, 1.18] as const };
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * Un hemisferio del cerebro: elipsoide rosado con sus circunvoluciones, arcos
 * cortos tendidos sobre la superficie (repartidos de forma pareja con una
 * espiral de Fibonacci y girados al azar, con semilla: siempre el mismo cerebro).
 */
function lobe(side: -1 | 1, y: number): Part[] {
  const [sx, sy, sz] = LOBE.scale;
  const center = new Vector3(side * 0.12, y, 0);
  const random = seededRandom(side < 0 ? 211 : 307);
  const spin = new Quaternion();
  const facing = new Quaternion();
  const e = new Euler();
  const folds: Part[] = [];
  const N = 46;
  for (let i = 0; i < N; i++) {
    const uy = 1 - (2 * (i + 0.5)) / N;
    const ring = Math.sqrt(1 - uy * uy);
    const u = new Vector3(Math.cos(i * GOLDEN_ANGLE) * ring, uy, Math.sin(i * GOLDEN_ANGLE) * ring);
    // Ni la base (va sobre el tronco) ni la cara interna (la cisura entre hemisferios).
    if (u.y < -0.45 || u.x * side < -0.35) continue;
    const normal = new Vector3(u.x / sx, u.y / sy, u.z / sz).normalize();
    const at = new Vector3(u.x * sx, u.y * sy, u.z * sz)
      .multiplyScalar(LOBE.r)
      .add(center)
      .addScaledVector(normal, -0.006);
    facing.setFromUnitVectors(new Vector3(0, 0, 1), normal);
    spin.setFromAxisAngle(new Vector3(0, 0, 1), random() * Math.PI * 2);
    e.setFromQuaternion(facing.multiply(spin));
    folds.push({
      shape: { arc: [0.05 + random() * 0.025, 0.015, Math.PI * (0.8 + random() * 0.7)] },
      color: BRAIN.fold,
      at: [at.x, at.y, at.z],
      rot: [e.x, e.y, e.z],
    });
  }
  return [
    {
      shape: { ball: [LOBE.r, 1] },
      color: BRAIN.lobe,
      at: [center.x, center.y, center.z],
      scale: [sx, sy, sz],
    },
    ...folds,
  ];
}

const BOOK = { w: 0.36, h: 0.6 } as const;

/**
 * Media página del libro de NeuroMath: tapa, hojas, renglones y lo que lleva
 * escrito (en coordenadas de la página: u desde el lomo, v desde abajo).
 */
function bookHalf(side: -1 | 1, glyphs: readonly Part[]): Part[] {
  const { w, h } = BOOK;
  const lines: Part[] = [0.2, 0.15, 0.1].map((v, k) => ({
    shape: { box: [w * (k === 2 ? 0.42 : 0.66), 0.014, 0.006] },
    color: BUILD.stoneDark,
    at: [side * (w / 2 - (k === 2 ? 0.06 : 0)), v, 0.043],
  }));
  return nest({ rot: [0, -side * 0.36, 0] }, [
    {
      shape: { box: [w + 0.03, h + 0.05, 0.03] },
      color: ISLE.neuromath,
      at: [side * (w / 2), h / 2, -0.022],
    },
    {
      shape: { box: [w - 0.02, h, 0.05] },
      color: ATLAS.plate,
      at: [side * (w / 2 - 0.005), h / 2, 0.015],
    },
    ...lines,
    ...glyphs.map((g) => ({ ...g, at: [g.at?.[0] ?? 0, g.at?.[1] ?? 0, 0.043] as const })),
  ]);
}

/** Barra de un trazo escrito en la página, de (u0, v0) a (u1, v1). */
function stroke(u0: number, v0: number, u1: number, v1: number, color: string, w = 0.03): Part {
  return {
    shape: { box: [Math.hypot(u1 - u0, v1 - v0) + w * 0.6, w, 0.008] },
    color,
    at: [(u0 + u1) / 2, (v0 + v1) / 2, 0],
    rot: [0, 0, Math.atan2(v1 - v0, u1 - u0)],
  };
}

/** Mano abierta hacia arriba, con los dedos que se curvan hacia el centro. */
function hand(side: -1 | 1): Part[] {
  const fingers: Part[] = [-0.055, -0.018, 0.018, 0.055].map((z, k) => ({
    shape: { cyl: [0.018, 0.022, k === 0 || k === 3 ? 0.11 : 0.13, 5] },
    color: CLAY.light,
    at: [side * 0.085, 0.06, z],
    rot: [0, 0, side * 0.32],
  }));
  return [
    { shape: { box: [0.17, 0.045, 0.15] }, color: CLAY.light, at: [0, 0, 0] },
    ...fingers,
    // Pulgar, hacia el frente.
    {
      shape: { cyl: [0.018, 0.022, 0.1, 5] },
      color: CLAY.light,
      at: [side * 0.02, 0.03, 0.1],
      rot: [0.9, 0, side * 0.2],
    },
  ];
}

function tree(variant: number, leaf: string): Part[] {
  const trunk: Part = {
    shape: { cyl: [0.022, 0.034, 0.16, 5] },
    color: BUILD.trunk,
    at: [0, 0.08, 0],
  };
  switch (variant % 4) {
    case 1:
      return [trunk, { shape: { cone: [0.12, 0.3, 6] }, color: BUILD.leaf[2], at: [0, 0.3, 0] }];
    case 2:
      return [
        trunk,
        { shape: { ball: [0.11, 0] }, color: leaf, at: [0, 0.2, 0] },
        { shape: { ball: [0.08, 0] }, color: BUILD.leaf[1], at: [0.02, 0.32, 0] },
      ];
    case 3:
      return [
        trunk,
        { shape: { ball: [0.12, 0] }, color: BUILD.leaf[3], at: [0, 0.24, 0], scale: [1, 0.8, 1] },
      ];
    default:
      return [trunk, { shape: { ball: [0.13, 0] }, color: leaf, at: [0, 0.24, 0] }];
  }
}

/** Piezas estáticas de cada tipo. Lo que se mueve está en IslandLandmarks. */
export const KIT: Record<LandmarkKind, (ctx: KitContext) => Part[]> = {
  casa: (ctx) =>
    house(
      ctx,
      0.24,
      pickOf([BUILD.roof, ISLE.comunicarte, BUILD.roofDark, BUILD.roof], ctx.variant),
      pickOf(FACADES, ctx.variant),
    ),

  imprenta: () => [
    { shape: { box: [0.62, 0.3, 0.36] }, color: BUILD.wallWarm, at: [0, 0.15, 0] },
    { shape: { roof: [0.66, 0.16, 0.4] }, color: ISLE.comunicarte, at: [0, 0.3, 0] },
    { shape: { cyl: [0.035, 0.045, 0.32, 6] }, color: BUILD.stoneDark, at: [0.2, 0.46, -0.08] },
    { shape: { box: [0.38, 0.08, 0.02] }, color: ATLAS.ink, at: [0, 0.24, 0.19] },
    { shape: { box: [0.1, 0.14, 0.01] }, color: BUILD.woodDark, at: [0, 0.07, 0.181] },
    { shape: { box: [0.08, 0.07, 0.01] }, color: BUILD.glassDark, at: [-0.2, 0.12, 0.181] },
    { shape: { box: [0.08, 0.07, 0.01] }, color: BUILD.glassDark, at: [0.2, 0.12, 0.181] },
    // Rollos de papel junto a la puerta.
    {
      shape: { cyl: [0.05, 0.05, 0.12, 8] },
      color: ATLAS.plate,
      at: [-0.38, 0.05, 0.12],
      rot: [0, 0, Math.PI / 2],
    },
    {
      shape: { cyl: [0.05, 0.05, 0.12, 8] },
      color: ATLAS.plate,
      at: [-0.38, 0.14, 0.12],
      rot: [0, 0, Math.PI / 2],
    },
  ],

  radio: () => {
    const segments = 6;
    const mast: Part[] = Array.from({ length: segments }, (_, i) => {
      const r0 = 0.13 - (i / segments) * 0.09;
      const r1 = 0.13 - ((i + 1) / segments) * 0.09;
      return {
        shape: { cyl: [r1, r0, 0.32, 4] },
        color: i % 2 ? ATLAS.plate : ATLAS.route,
        at: [0, 0.16 + i * 0.32, -0.16],
        rot: [0, Math.PI / 4, 0],
      } satisfies Part;
    });
    return [
      { shape: { box: [0.24, 0.16, 0.18] }, color: ATLAS.plate, at: [0, 0.08, 0.06] },
      { shape: { box: [0.26, 0.03, 0.2] }, color: ATLAS.ink, at: [0, 0.175, 0.06] },
      { shape: { box: [0.05, 0.1, 0.01] }, color: BUILD.woodDark, at: [0, 0.05, 0.151] },
      ...mast,
      {
        shape: { dome: [0.13, 6] },
        color: ATLAS.plate,
        at: [0.08, 1.2, -0.12],
        rot: [Math.PI / 2.4, 0, 0],
      },
    ];
  },

  muelle: ({ drop }) => {
    const deck = 0.12 - drop;
    const posts: Part[] = [0.35, 0.75, 1.15].flatMap((z) =>
      [-0.1, 0.1].map(
        (x) =>
          ({
            shape: { cyl: [0.022, 0.022, 0.5, 5] },
            color: BUILD.woodDark,
            at: [x, deck - 0.22, z],
          }) satisfies Part,
      ),
    );
    return [
      {
        shape: { box: [0.22, 0.04, 0.42] },
        color: BUILD.wood,
        at: [0, deck / 2, 0.1],
        rot: [Math.atan2(-deck, 0.42), 0, 0],
      },
      { shape: { box: [0.22, 0.04, 1.0] }, color: BUILD.wood, at: [0, deck, 0.8] },
      ...posts,
      // Lancha amarrada.
      { shape: { box: [0.2, 0.08, 0.46] }, color: ATLAS.plate, at: [0.3, deck - 0.06, 0.95] },
      { shape: { box: [0.21, 0.03, 0.47] }, color: ISLE.comunicarte, at: [0.3, deck - 0.03, 0.95] },
      { shape: { box: [0.12, 0.08, 0.14] }, color: BUILD.glass, at: [0.3, deck + 0.02, 0.9] },
    ];
  },

  observatorio: () => [
    { shape: { cyl: [0.26, 0.28, 0.3, 10] }, color: ATLAS.plate, at: [0, 0.15, 0] },
    { shape: { cyl: [0.27, 0.27, 0.04, 10] }, color: ISLE.neuromath, at: [0, 0.3, 0] },
    { shape: { box: [0.08, 0.14, 0.01] }, color: BUILD.woodDark, at: [0, 0.07, 0.27] },
    { shape: { box: [0.18, 0.14, 0.16] }, color: ATLAS.plate, at: [0.32, 0.07, -0.02] },
    { shape: { box: [0.2, 0.025, 0.18] }, color: ISLE.neuromath, at: [0.32, 0.15, -0.02] },
  ],

  puente: ({ drop }) => {
    const arch: Part[] = Array.from({ length: 8 }, (_, i) => {
      const s0 = -1 + (i / 8) * 2;
      const s1 = -1 + ((i + 1) / 8) * 2;
      const y = (s: number) => -drop + (drop + 0.02) * (1 - s * s);
      const z = (s: number) => 0.8 + s * 0.66;
      const dz = z(s1) - z(s0);
      const dy = y(s1) - y(s0);
      return {
        shape: { box: [0.05, 0.05, Math.hypot(dz, dy) + 0.01] },
        color: ISLE.neuromath,
        at: [0, (y(s0) + y(s1)) / 2, (z(s0) + z(s1)) / 2],
        rot: [-Math.atan2(dy, dz), 0, 0],
      } satisfies Part;
    });
    const islet = drop + 0.5;
    return [
      { shape: { box: [0.16, 0.04, 1.4] }, color: ATLAS.plate, at: [0, 0.05, 0.78] },
      { shape: { box: [0.012, 0.07, 1.4] }, color: ATLAS.ink, at: [0.08, 0.1, 0.78] },
      { shape: { box: [0.012, 0.07, 1.4] }, color: ATLAS.ink, at: [-0.08, 0.1, 0.78] },
      ...arch,
      // Islote hexagonal con su tetraedro.
      {
        shape: { cyl: [0.26, 0.32, islet, 6] },
        color: BUILD.stone,
        at: [0, -islet / 2 + 0.02, 1.72],
      },
      { shape: { solid: 'tetra', r: 0.15 }, color: ATLAS.sun, at: [0, 0.14, 1.72] },
    ];
  },

  // El sólido gira: aquí solo el pedestal.
  solido: () => [{ shape: { box: [0.14, 0.12, 0.14] }, color: BUILD.stone, at: [0, 0.06, 0] }],

  plaza: () => {
    const benches: Part[] = [0, 1, 2, 3].map((k) => {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      return {
        shape: { box: [0.2, 0.04, 0.06] },
        color: BUILD.wood,
        at: [Math.cos(a) * 0.62, 0.04, Math.sin(a) * 0.62],
        rot: [0, Math.PI / 2 - a, 0],
      } satisfies Part;
    });
    const lamps: Part[] = [0, 1, 2, 3].flatMap((k) => {
      const a = (k * Math.PI) / 2;
      const x = Math.cos(a) * 0.74;
      const z = Math.sin(a) * 0.74;
      return [
        { shape: { cyl: [0.012, 0.012, 0.22, 4] }, color: ATLAS.ink, at: [x, 0.11, z] },
        { shape: { ball: [0.03, 0] }, color: ATLAS.sun, at: [x, 0.23, z] },
      ] satisfies Part[];
    });
    return [
      { shape: { cyl: [0.82, 0.82, 0.02, 12] }, color: BUILD.paving, at: [0, 0.01, 0] },
      { shape: { cyl: [0.5, 0.5, 0.024, 12] }, color: ISLE.voxcivitas, at: [0, 0.012, 0] },
      { shape: { cyl: [0.46, 0.46, 0.026, 12] }, color: BUILD.paving, at: [0, 0.013, 0] },
      ...benches,
      ...lamps,
    ];
  },

  cabildo: () => {
    const columns: Part[] = Array.from({ length: 7 }, (_, i) => ({
      shape: { cyl: [0.022, 0.022, 0.24, 6] },
      color: ATLAS.plate,
      at: [-0.36 + i * 0.12, 0.12, 0.22],
    }));
    return [
      { shape: { box: [0.9, 0.3, 0.32] }, color: BUILD.wall, at: [0, 0.15, -0.02] },
      ...columns,
      { shape: { box: [0.92, 0.03, 0.12] }, color: BUILD.roof, at: [0, 0.255, 0.2] },
      { shape: { box: [0.92, 0.025, 0.34] }, color: ISLE.voxcivitas, at: [0, 0.3, -0.02] },
      { shape: { roof: [0.94, 0.16, 0.38] }, color: BUILD.roof, at: [0, 0.31, -0.02] },
      { shape: { box: [0.22, 0.2, 0.2] }, color: BUILD.wall, at: [0, 0.45, 0] },
      {
        shape: { roof: [0.24, 0.1, 0.22] },
        color: BUILD.roofDark,
        at: [0, 0.55, 0],
        rot: [0, Math.PI / 2, 0],
      },
      {
        shape: { cyl: [0.04, 0.04, 0.01, 10] },
        color: ATLAS.plate,
        at: [0, 0.46, 0.101],
        rot: [Math.PI / 2, 0, 0],
      },
      { shape: { box: [0.1, 0.16, 0.01] }, color: BUILD.woodDark, at: [0, 0.08, 0.141] },
      { shape: { box: [0.07, 0.08, 0.01] }, color: BUILD.glassDark, at: [-0.26, 0.18, 0.141] },
      { shape: { box: [0.07, 0.08, 0.01] }, color: BUILD.glassDark, at: [0.26, 0.18, 0.141] },
    ];
  },

  campanario: () => [
    { shape: { box: [0.2, 0.6, 0.2] }, color: BUILD.wall, at: [0, 0.3, 0] },
    { shape: { box: [0.22, 0.03, 0.22] }, color: ISLE.voxcivitas, at: [0, 0.4, 0] },
    {
      shape: { cyl: [0.06, 0.06, 0.01, 12] },
      color: ATLAS.plate,
      at: [0, 0.5, 0.101],
      rot: [Math.PI / 2, 0, 0],
    },
    { shape: { box: [0.008, 0.045, 0.004] }, color: ATLAS.ink, at: [0, 0.515, 0.107] },
    { shape: { box: [0.035, 0.008, 0.004] }, color: ATLAS.ink, at: [0.015, 0.5, 0.107] },
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map(
        (sz) =>
          ({
            shape: { box: [0.03, 0.14, 0.03] },
            color: BUILD.wall,
            at: [sx * 0.085, 0.67, sz * 0.085],
          }) satisfies Part,
      ),
    ),
    { shape: { ball: [0.04, 0] }, color: ATLAS.sun, at: [0, 0.66, 0] },
    {
      shape: { cone: [0.17, 0.2, 4] },
      color: BUILD.roof,
      at: [0, 0.84, 0],
      rot: [0, Math.PI / 4, 0],
    },
  ],

  casona: (ctx) => [
    {
      shape: { box: [0.32, 0.2, 0.22] },
      color: pickOf([BUILD.wall, BUILD.wallWarm, BUILD.wall, '#ead2b3'], ctx.variant),
      at: [0, 0.1, 0],
    },
    { shape: { roof: [0.36, 0.12, 0.26] }, color: BUILD.roof, at: [0, 0.2, 0] },
    { shape: { box: [0.2, 0.02, 0.05] }, color: BUILD.wood, at: [0, 0.12, 0.135] },
    { shape: { box: [0.2, 0.04, 0.008] }, color: BUILD.woodDark, at: [0, 0.15, 0.158] },
    { shape: { box: [0.06, 0.1, 0.01] }, color: ISLE.voxcivitas, at: [-0.1, 0.05, 0.111] },
    { shape: { box: [0.05, 0.06, 0.01] }, color: BUILD.glassDark, at: [0.09, 0.06, 0.111] },
  ],

  astillero: ({ drop }) => {
    const slope = Math.atan2(drop, 1.0);
    const ribs: Part[] = Array.from({ length: 6 }, (_, i) => ({
      shape: { arc: [0.13, 0.012, Math.PI] },
      color: BUILD.wood,
      at: [0, 0.18 - drop * 0.42, 0.24 + i * 0.09],
      rot: [0, 0, Math.PI],
    }));
    return [
      {
        shape: { box: [0.46, 0.04, 1.1] },
        color: BUILD.stone,
        at: [0, -drop / 2, 0.5],
        rot: [slope, 0, 0],
      },
      {
        shape: { box: [0.04, 0.06, 0.6] },
        color: BUILD.woodDark,
        at: [0, 0.06 - drop * 0.42, 0.46],
      },
      ...ribs,
      { shape: { box: [0.24, 0.02, 0.5] }, color: BUILD.wood, at: [0, 0.2 - drop * 0.42, 0.46] },
      // Pórtico de grúa sobre la grada.
      {
        shape: { box: [0.04, 0.9, 0.04] },
        color: ISLE.gerencia,
        at: [0.28, 0.45 - drop * 0.42, 0.46],
      },
      {
        shape: { box: [0.04, 0.9, 0.04] },
        color: ISLE.gerencia,
        at: [-0.28, 0.45 - drop * 0.42, 0.46],
      },
      {
        shape: { box: [0.64, 0.05, 0.06] },
        color: ISLE.gerencia,
        at: [0, 0.9 - drop * 0.42, 0.46],
      },
    ];
  },

  // La pluma gira: aquí la torre y la cabina.
  grua: () => [
    { shape: { box: [0.26, 0.1, 0.26] }, color: BUILD.metal, at: [0, 0.05, 0] },
    { shape: { box: [0.08, 1.0, 0.08] }, color: ATLAS.sun, at: [0, 0.6, 0] },
    { shape: { box: [0.1, 0.02, 0.1] }, color: ATLAS.ink, at: [0, 0.35, 0] },
    { shape: { box: [0.1, 0.02, 0.1] }, color: ATLAS.ink, at: [0, 0.75, 0] },
  ],

  bodega: (ctx) => [
    {
      shape: { box: [0.5, 0.2, 0.3] },
      color: pickOf([ATLAS.plate, '#9fb0d9', ATLAS.plate, '#c9d1e6'], ctx.variant),
      at: [0, 0.1, 0],
    },
    { shape: { vault: [0.15, 0.52] }, color: ISLE.gerencia, at: [0, 0.2, 0] },
    { shape: { box: [0.2, 0.15, 0.01] }, color: ATLAS.ink, at: [0, 0.075, 0.151] },
  ],

  puesto: (ctx) => {
    const awning = pickOf(AWNINGS, ctx.variant);
    const stripes: Part[] = [0, 1, 2, 3].map((k) => ({
      shape: { box: [0.08, 0.02, 0.26] },
      color: k % 2 ? ATLAS.plate : awning,
      at: [-0.12 + k * 0.08, 0.36, 0.02],
      rot: [0.28, 0, 0],
    }));
    return [
      { shape: { box: [0.28, 0.06, 0.16] }, color: BUILD.wood, at: [0, 0.14, 0.04] },
      { shape: { box: [0.24, 0.1, 0.12] }, color: BUILD.woodDark, at: [0, 0.06, 0.04] },
      { shape: { box: [0.02, 0.36, 0.02] }, color: BUILD.woodDark, at: [0.14, 0.18, -0.08] },
      { shape: { box: [0.02, 0.36, 0.02] }, color: BUILD.woodDark, at: [-0.14, 0.18, -0.08] },
      ...stripes,
      { shape: { ball: [0.03, 0] }, color: ATLAS.sun, at: [-0.07, 0.2, 0.06] },
      { shape: { ball: [0.03, 0] }, color: ATLAS.route, at: [0, 0.2, 0.06] },
      { shape: { ball: [0.03, 0] }, color: BUILD.leaf[1], at: [0.07, 0.2, 0.06] },
    ];
  },

  cajas: (ctx) => [
    { shape: { box: [0.12, 0.12, 0.12] }, color: BUILD.wood, at: [0, 0.06, 0] },
    {
      shape: { box: [0.12, 0.12, 0.12] },
      color: BUILD.wood,
      at: [0.13, 0.06, 0.02],
      rot: [0, 0.3, 0],
    },
    {
      shape: { box: [0.11, 0.11, 0.11] },
      color: BUILD.woodDark,
      at: [0.06, 0.175, 0.01],
      rot: [0, 0.6, 0],
    },
    ...(ctx.variant % 2
      ? [
          {
            shape: { cyl: [0.05, 0.05, 0.13, 8] },
            color: ISLE.gerencia,
            at: [-0.11, 0.065, 0.05],
          } satisfies Part,
        ]
      : []),
  ],

  taller: () => {
    const teeth: Part[] = [-0.22, 0, 0.22].flatMap((x) => [
      {
        shape: { box: [0.24, 0.02, 0.42] },
        color: BUILD.metal,
        at: [x, 0.33, 0],
        rot: [0, 0, 0.5],
      },
      { shape: { box: [0.012, 0.12, 0.4] }, color: BUILD.glass, at: [x + 0.105, 0.33, 0] },
    ]);
    return [
      { shape: { box: [0.66, 0.26, 0.4] }, color: '#e9e4d6', at: [0, 0.13, 0] },
      ...teeth,
      { shape: { box: [0.24, 0.18, 0.01] }, color: ATLAS.sun, at: [-0.12, 0.09, 0.201] },
      { shape: { box: [0.12, 0.08, 0.01] }, color: BUILD.glassDark, at: [0.2, 0.14, 0.201] },
      { shape: { cyl: [0.03, 0.03, 0.2, 6] }, color: BUILD.metal, at: [0.28, 0.42, -0.12] },
      // Contenedor del taller, con el acento de la isla.
      { shape: { box: [0.18, 0.14, 0.12] }, color: ISLE.activatuidea, at: [0.46, 0.07, 0.08] },
    ];
  },

  // Las aspas giran: aquí la torre y la góndola.
  aerogenerador: () => [
    { shape: { cyl: [0.025, 0.06, 1.5, 8] }, color: ATLAS.plate, at: [0, 0.75, 0] },
    { shape: { box: [0.08, 0.07, 0.18] }, color: ATLAS.plate, at: [0, 1.5, 0] },
    { shape: { box: [0.16, 0.06, 0.16] }, color: BUILD.stone, at: [0, 0.03, 0] },
  ],

  domo: () => [
    { shape: { cyl: [0.29, 0.29, 0.04, 7] }, color: BUILD.metal, at: [0, 0.02, 0] },
    { shape: { dome: [0.28, 7] }, color: '#bfe3f2', at: [0, 0.04, 0] },
    { shape: { box: [0.08, 0.12, 0.06] }, color: ATLAS.sun, at: [0, 0.06, 0.27] },
  ],

  panel: () => [
    { shape: { cyl: [0.015, 0.015, 0.14, 4] }, color: BUILD.metal, at: [0, 0.07, 0] },
    {
      shape: { box: [0.28, 0.015, 0.18] },
      color: BUILD.panel,
      at: [0, 0.15, 0],
      rot: [0.55, 0, 0],
    },
    {
      shape: { box: [0.29, 0.008, 0.19] },
      color: ATLAS.plate,
      at: [0, 0.142, -0.004],
      rot: [0.55, 0, 0],
    },
  ],

  // El bulbo brilla: aquí el pedestal y la rosca.
  bombilla: () => [
    { shape: { cyl: [0.1, 0.12, 0.12, 8] }, color: BUILD.stone, at: [0, 0.06, 0] },
    { shape: { cyl: [0.055, 0.06, 0.1, 8] }, color: BUILD.metal, at: [0, 0.17, 0] },
  ],

  arbol: (ctx) => tree(ctx.variant, pickOf(BUILD.leaf, ctx.variant)),

  // La copa late: aquí el tronco, las raíces y la banca del encuentro.
  ceiba: () => [
    { shape: { cyl: [0.07, 0.12, 0.6, 7] }, color: BUILD.trunk, at: [0, 0.3, 0] },
    ...[0, 1, 2, 3].map(
      (k) =>
        ({
          shape: { box: [0.04, 0.12, 0.18] },
          color: BUILD.trunk,
          at: [Math.cos(k * 1.6) * 0.1, 0.05, Math.sin(k * 1.6) * 0.1],
          rot: [0, -k * 1.6, 0],
        }) satisfies Part,
    ),
    {
      shape: { arc: [0.26, 0.022, Math.PI * 2] },
      color: BUILD.wood,
      at: [0, 0.06, 0],
      rot: [Math.PI / 2, 0, 0],
    },
  ],

  huerta: (ctx) => {
    const crop = pickOf([BUILD.leaf[1], BUILD.leaf[3], BUILD.leaf[0], '#9cbf4a'], ctx.variant);
    const sprouts: Part[] = [-1, 0, 1].flatMap((row) =>
      [-1.5, -0.5, 0.5, 1.5].map(
        (col) =>
          ({
            shape: { ball: [0.035, 0] },
            color: crop,
            at: [col * 0.09, 0.085, row * 0.07],
          }) satisfies Part,
      ),
    );
    return [
      { shape: { box: [0.42, 0.06, 0.24] }, color: BUILD.soil, at: [0, 0.03, 0] },
      ...sprouts,
    ];
  },

  maloca: () => [
    { shape: { cyl: [0.24, 0.26, 0.16, 10] }, color: '#c9a36b', at: [0, 0.08, 0] },
    { shape: { cone: [0.34, 0.32, 10] }, color: BUILD.thatch, at: [0, 0.32, 0] },
    { shape: { cyl: [0.012, 0.012, 0.12, 4] }, color: BUILD.woodDark, at: [0, 0.52, 0] },
    { shape: { box: [0.08, 0.12, 0.01] }, color: BUILD.woodDark, at: [0, 0.06, 0.255] },
  ],

  // Monumentos. Lo que se mueve (el globo de diálogo, la π, el astil de la
  // balanza, la rueda del timón, el cohete y el corazón) está en STATUE_MOTION.

  // Pensamiento crítico: un cerebro con sus dos hemisferios y sus circunvoluciones.
  cerebro: () => {
    const y = PLINTH_TOP + 0.4;
    return [
      ...plinth(ISLE.comunicarte),
      // Tronco y cerebelo.
      {
        shape: { cyl: [0.05, 0.07, 0.22, 7] },
        color: BRAIN.deep,
        at: [0, PLINTH_TOP + 0.11, -0.08],
      },
      {
        shape: { ball: [0.1, 1] },
        color: BRAIN.fold,
        at: [0, y - 0.13, -0.19],
        scale: [1.5, 0.75, 0.9],
      },
      ...lobe(-1, y),
      ...lobe(1, y),
    ];
  },

  // Lógica y matemática: un libro abierto con π y el triángulo de Pitágoras.
  libro: () => {
    const pi: Part[] = [
      stroke(-0.27, 0.47, -0.1, 0.47, ATLAS.ink),
      stroke(-0.23, 0.47, -0.235, 0.31, ATLAS.ink),
      stroke(-0.14, 0.47, -0.13, 0.32, ATLAS.ink),
      stroke(-0.13, 0.32, -0.1, 0.31, ATLAS.ink),
    ];
    const triangle: Part[] = [
      stroke(0.1, 0.3, 0.27, 0.3, ATLAS.ink),
      stroke(0.1, 0.3, 0.1, 0.5, ATLAS.ink),
      stroke(0.1, 0.5, 0.27, 0.3, ISLE.neuromath),
      { shape: { box: [0.035, 0.035, 0.008] }, color: ATLAS.route, at: [0.13, 0.33, 0] },
    ];
    const tilt = -0.42;
    return [
      ...plinth(ISLE.neuromath, 0.3),
      // Atril de piedra que sostiene el libro inclinado.
      {
        shape: { box: [0.16, 0.36, 0.1] },
        color: BUILD.stoneDark,
        at: [0, PLINTH_TOP + 0.14, -0.14],
        rot: [tilt, 0, 0],
      },
      ...nest({ at: [0, PLINTH_TOP + 0.01, 0.06], rot: [tilt, 0, 0] }, [
        ...bookHalf(-1, pi),
        ...bookHalf(1, triangle),
        // Lomo y cinta marcapáginas.
        {
          shape: { cyl: [0.03, 0.03, BOOK.h + 0.05, 6] },
          color: ISLE.neuromath,
          at: [0, BOOK.h / 2, -0.03],
        },
        { shape: { box: [0.025, 0.2, 0.006] }, color: ATLAS.route, at: [0.01, -0.06, 0.03] },
      ]),
    ];
  },

  // Ética y ciudadanía: la columna de la balanza que sopesa los dilemas.
  balanza: () => [
    ...plinth(ISLE.voxcivitas),
    {
      shape: { cyl: [0.06, 0.12, 0.08, 8] },
      color: ISLE.voxcivitas,
      at: [0, PLINTH_TOP + 0.04, 0],
    },
    {
      shape: { cyl: [0.03, 0.045, 0.6, 8] },
      color: ISLE.voxcivitas,
      at: [0, PLINTH_TOP + 0.36, 0],
    },
    { shape: { ball: [0.05, 0] }, color: ATLAS.sun, at: [0, PLINTH_TOP + 0.7, 0] },
  ],

  // Liderazgo y rumbo: el poste del timón; la rueda gira aparte.
  timon: () => [
    ...plinth(ISLE.gerencia),
    { shape: { box: [0.11, 0.5, 0.11] }, color: BUILD.woodDark, at: [0, PLINTH_TOP + 0.25, -0.08] },
    { shape: { box: [0.15, 0.04, 0.15] }, color: ISLE.gerencia, at: [0, PLINTH_TOP + 0.48, -0.08] },
    {
      shape: { cyl: [0.03, 0.03, 0.1, 6] },
      color: BUILD.metal,
      at: [0, PLINTH_TOP + 0.5, -0.02],
      rot: [Math.PI / 2, 0, 0],
    },
  ],

  // Emprendimiento: el engranaje de lanzamiento y la nube del despegue.
  cohete: () => {
    const teeth: Part[] = Array.from({ length: 10 }, (_, k) => {
      const a = (k / 10) * Math.PI * 2;
      return {
        shape: { box: [0.05, 0.06, 0.06] },
        color: BUILD.metal,
        at: [Math.sin(a) * 0.18, PLINTH_TOP + 0.03, Math.cos(a) * 0.18],
        rot: [0, a, 0],
      } satisfies Part;
    });
    const puffs: Part[] = [0, 1, 2, 3, 4, 5].map((k) => {
      const a = k * 1.05 + 0.3;
      return {
        shape: { ball: [0.055 + (k % 2) * 0.025, 1] },
        color: ATLAS.plate,
        at: [Math.sin(a) * 0.15, PLINTH_TOP + 0.08 + (k % 3) * 0.015, Math.cos(a) * 0.15],
      } satisfies Part;
    });
    return [
      ...plinth(ISLE.activatuidea),
      {
        shape: { cyl: [0.165, 0.165, 0.06, 12] },
        color: BUILD.metal,
        at: [0, PLINTH_TOP + 0.03, 0],
      },
      { shape: { cyl: [0.08, 0.08, 0.065, 8] }, color: ATLAS.sun, at: [0, PLINTH_TOP + 0.03, 0] },
      ...teeth,
      ...puffs,
    ];
  },

  // Impacto social: dos brazos de arcilla que levantan el corazón.
  corazon: () =>
    [-1, 1]
      .flatMap((side) => {
        const s = side as -1 | 1;
        return [
          {
            shape: { cyl: [0.045, 0.06, 0.4, 6] },
            color: CLAY.dark,
            at: [s * 0.13, PLINTH_TOP + 0.18, 0],
            rot: [0, 0, -s * 0.38],
          } satisfies Part,
          ...nest({ at: [s * 0.2, PLINTH_TOP + 0.39, 0], rot: [0, 0, s * 0.5] }, hand(s)),
        ];
      })
      .concat(plinth(ISLE.latidosocial)),
};

/**
 * Lo que se mueve de cada monumento, en coordenadas del grupo que lo anima:
 * IslandLandmarks lo coloca, lo funde en una sola malla y lo mueve.
 */
export const STATUE_MOTION = {
  /** Globo de diálogo del cerebro; los tres puntos laten aparte. */
  bubble: (): Part[] => [
    {
      shape: { cyl: [0.15, 0.15, 0.05, 12] },
      color: ATLAS.plate,
      rot: [Math.PI / 2, 0, 0],
      scale: [1.25, 1, 1],
    },
    {
      shape: { cone: [0.06, 0.13, 4] },
      color: ATLAS.plate,
      at: [-0.1, -0.14, 0],
      rot: [0, 0, 2.6],
    },
  ],
  /** La π dorada que flota sobre el libro. */
  pi: (): Part[] => [
    { shape: { box: [0.28, 0.055, 0.055] }, color: ATLAS.sun, at: [0, 0.09, 0] },
    {
      shape: { box: [0.055, 0.2, 0.055] },
      color: ATLAS.sun,
      at: [-0.06, -0.02, 0],
      rot: [0, 0, -0.06],
    },
    {
      shape: { box: [0.055, 0.19, 0.055] },
      color: ATLAS.sun,
      at: [0.06, -0.02, 0],
      rot: [0, 0, 0.08],
    },
    { shape: { box: [0.07, 0.045, 0.055] }, color: ATLAS.sun, at: [0.1, -0.11, 0] },
  ],
  /** Astil de la balanza con su fiel; los platillos cuelgan aparte. */
  beam: (): Part[] => [
    { shape: { box: [0.8, 0.035, 0.04] }, color: ISLE.voxcivitas, at: [0, 0, 0] },
    { shape: { box: [0.025, 0.16, 0.025] }, color: ATLAS.sun, at: [0, 0.07, 0.03] },
    { shape: { ball: [0.03, 0] }, color: ATLAS.sun, at: [-0.4, 0, 0] },
    { shape: { ball: [0.03, 0] }, color: ATLAS.sun, at: [0.4, 0, 0] },
  ],
  /** Platillo que cuelga del astil, con lo que se pone en cada lado. */
  pan: (side: -1 | 1): Part[] => [
    {
      shape: { cyl: [0.005, 0.005, 0.29, 3] },
      color: ATLAS.ink,
      at: [-0.06, -0.13, 0],
      rot: [0, 0, -0.43],
    },
    {
      shape: { cyl: [0.005, 0.005, 0.29, 3] },
      color: ATLAS.ink,
      at: [0.06, -0.13, 0],
      rot: [0, 0, 0.43],
    },
    { shape: { cyl: [0.14, 0.07, 0.05, 10] }, color: ATLAS.sun, at: [0, -0.28, 0] },
    side < 0
      ? { shape: { ball: [0.045, 0] }, color: ISLE.voxcivitas, at: [0, -0.22, 0] }
      : {
          shape: { box: [0.07, 0.07, 0.07] },
          color: ATLAS.plate,
          at: [0, -0.22, 0],
          rot: [0, 0.5, 0],
        },
  ],
  /** Rueda del timón: aro, ocho cabillas con sus puños y el cubo dorado. */
  wheel: (): Part[] => [
    { shape: { arc: [0.3, 0.032, Math.PI * 2] }, color: BUILD.wood },
    { shape: { arc: [0.12, 0.022, Math.PI * 2] }, color: ISLE.gerencia },
    ...[0, 1, 2, 3].map(
      (k) =>
        ({
          shape: { box: [0.032, 0.66, 0.032] },
          color: BUILD.woodDark,
          rot: [0, 0, (k * Math.PI) / 4],
        }) satisfies Part,
    ),
    ...Array.from({ length: 8 }, (_, k) => {
      const a = (k * Math.PI) / 4;
      return {
        shape: { cyl: [0.022, 0.032, 0.13, 6] },
        color: BUILD.wood,
        at: [-Math.sin(a) * 0.39, Math.cos(a) * 0.39, 0],
        rot: [0, 0, a],
      } satisfies Part;
    }),
    {
      shape: { cyl: [0.07, 0.07, 0.08, 10] },
      color: ATLAS.sun,
      rot: [Math.PI / 2, 0, 0],
    },
  ],
  /** El cohete, de la tobera a la punta; la llama tiembla aparte. */
  rocket: (): Part[] => [
    { shape: { cyl: [0.05, 0.075, 0.07, 8] }, color: BUILD.metal, at: [0, 0.035, 0] },
    { shape: { cyl: [0.11, 0.125, 0.46, 10] }, color: ATLAS.plate, at: [0, 0.3, 0] },
    { shape: { cyl: [0.116, 0.116, 0.04, 10] }, color: ISLE.activatuidea, at: [0, 0.48, 0] },
    { shape: { cone: [0.11, 0.26, 10] }, color: ATLAS.route, at: [0, 0.66, 0] },
    {
      shape: { cyl: [0.055, 0.055, 0.02, 10] },
      color: ISLE.activatuidea,
      at: [0, 0.34, 0.11],
      rot: [Math.PI / 2, 0, 0],
    },
    {
      shape: { cyl: [0.04, 0.04, 0.025, 10] },
      color: BUILD.glass,
      at: [0, 0.34, 0.115],
      rot: [Math.PI / 2, 0, 0],
    },
    ...[0, 1, 2].map((k) => {
      const a = (k * Math.PI * 2) / 3 + Math.PI / 3;
      return {
        shape: { box: [0.02, 0.18, 0.12] },
        color: ATLAS.sun,
        at: [Math.sin(a) * 0.15, 0.13, Math.cos(a) * 0.15],
        rot: [0, a, 0],
      } satisfies Part;
    }),
  ],
  /** El corazón, abombado y de frente. */
  heart: (): Part[] => [{ shape: { heart: [0.5, 0.12] }, color: ATLAS.route }],
} as const;

function geometryOf(shape: Shape): BufferGeometry {
  if ('box' in shape) return new BoxGeometry(...shape.box);
  if ('cyl' in shape) {
    const [top, bottom, height, sides = 8] = shape.cyl;
    return new CylinderGeometry(top, bottom, height, sides);
  }
  if ('cone' in shape) {
    const [r, h, sides = 8] = shape.cone;
    return new ConeGeometry(r, h, sides);
  }
  if ('ball' in shape) return new IcosahedronGeometry(shape.ball[0], shape.ball[1] ?? 0);
  if ('dome' in shape) {
    const [r, sides] = shape.dome;
    return new SphereGeometry(
      r,
      sides,
      Math.max(2, Math.round(sides / 2)),
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    );
  }
  if ('vault' in shape) {
    const [r, length] = shape.vault;
    // Medio cilindro con el eje en X y la curva hacia arriba.
    return new CylinderGeometry(r, r, length, 8, 1, false, -Math.PI / 2, Math.PI)
      .rotateZ(Math.PI / 2)
      .rotateX(-Math.PI / 2);
  }
  if ('roof' in shape) {
    const [w, h, d] = shape.roof;
    // Prisma triangular con la arista hacia arriba y la base en y = 0.
    return new CylinderGeometry(1, 1, 1, 3, 1, false, Math.PI / 2)
      .rotateZ(Math.PI / 2)
      .scale(w, h / 1.5, d / Math.sqrt(3))
      .translate(0, h / 3, 0);
  }
  if ('solid' in shape) {
    const make = {
      ico: IcosahedronGeometry,
      octa: OctahedronGeometry,
      tetra: TetrahedronGeometry,
      dodeca: DodecahedronGeometry,
    }[shape.solid];
    return new make(shape.r, 0);
  }
  if ('heart' in shape) return heartGeometry(...shape.heart);
  const [r, tube, arc] = shape.arc;
  return new TorusGeometry(r, tube, 4, 10, arc);
}

/**
 * Corazón low-poly: la curva clásica x = 16 sen³t, y = 13 cos t − 5 cos 2t −
 * 2 cos 3t − cos 4t muestreada en pocos puntos, extruida y con bisel para que
 * se vea abombado. La punta queda abajo y el centro de la caja en el origen.
 */
function heartGeometry(width: number, depth: number): BufferGeometry {
  const k = width / 32;
  const outline = Array.from({ length: 22 }, (_, i) => {
    const t = (i / 22) * Math.PI * 2;
    return new Vector2(
      16 * Math.sin(t) ** 3 * k,
      (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t) + 2.5) * k,
    );
  });
  const bevel = depth * 0.45;
  return new ExtrudeGeometry(new ThreeShape(outline), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 2,
  }).translate(0, 0, -depth / 2);
}

const scratch = {
  m: new Matrix4(),
  q: new Quaternion(),
  e: new Euler(),
  v: new Vector3(),
  s: new Vector3(),
};

/** Geometría de una pieza ya colocada, sin índices y con su color en cada vértice. */
export function partGeometry(part: Part, transform?: Matrix4): BufferGeometry {
  const base = geometryOf(part.shape);
  const geometry = base.index ? base.toNonIndexed() : base;
  if (geometry !== base) base.dispose();
  geometry.deleteAttribute('uv');
  geometry.deleteAttribute('normal');
  const { m, q, e, v, s } = scratch;
  m.compose(
    v.set(...(part.at ?? [0, 0, 0])),
    q.setFromEuler(e.set(...(part.rot ?? [0, 0, 0]))),
    s.set(...(part.scale ?? [1, 1, 1])),
  );
  geometry.applyMatrix4(m);
  if (transform) geometry.applyMatrix4(transform);
  const color = new Color(part.color);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) colors.set([color.r, color.g, color.b], i * 3);
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

/** Matriz de una construcción en el mundo: posición, giro hacia el mar y escala. */
export function landmarkMatrix(landmark: Landmark): Matrix4 {
  const { position, rotation, scale } = landmark;
  return new Matrix4().compose(
    new Vector3(...position),
    new Quaternion().setFromEuler(new Euler(0, rotation, 0)),
    new Vector3(scale, scale, scale),
  );
}

function mergeParts(parts: BufferGeometry[]): BufferGeometry {
  const geometry = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  geometry.computeVertexNormals();
  return geometry;
}

const merged = new Map<string, BufferGeometry>();

/** Todas las piezas estáticas de una isla, fundidas en una geometría. */
export function islandKit(key: string, landmarks: readonly Landmark[]): BufferGeometry | null {
  const cached = merged.get(key);
  if (cached) return cached;
  const parts = landmarks.flatMap((l) => {
    const matrix = landmarkMatrix(l);
    return KIT[l.kind]({ variant: l.variant, drop: l.position[1] / l.scale }).map((part) =>
      partGeometry(part, matrix),
    );
  });
  if (parts.length === 0) return null;
  const geometry = mergeParts(parts);
  merged.set(key, geometry);
  return geometry;
}

const pieces = new Map<string, BufferGeometry>();

/** Una pieza móvil hecha de varias partes, fundida una vez y compartida por todas las escenas. */
export function pieceGeometry(key: string, parts: () => readonly Part[]): BufferGeometry {
  let geometry = pieces.get(key);
  if (!geometry) {
    geometry = mergeParts(parts().map((part) => partGeometry(part)));
    pieces.set(key, geometry);
  }
  return geometry;
}
