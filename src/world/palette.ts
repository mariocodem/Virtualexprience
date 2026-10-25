/**
 * Colores del Atlas para la escena 3D. Reflejan src/styles/tokens.css: si un
 * token cambia (p. ej. al aplicar el manual de marca), se actualiza aquí también.
 */
export const ATLAS = {
  plate: '#f3f6f8',
  ink: '#0f2e5c',
  route: '#d7262e',
  sun: '#fed300',
  /** Batimetría: de bajos a abismo. */
  sea: ['#9ccbe4', '#6fa8d3', '#3f7fb8', '#004b93', '#173f75', '#0f2e5c'],
  /** Hipsometría: de llanura a cumbre. */
  land: ['#5e9e4b', '#a9b94a', '#fed300', '#c7782e', '#f3f6f8'],
  /** Bruma del amanecer: tiñe las islas que aún no recuperan su fragmento. */
  haze: '#dfe7ea',
  dawn: '#ffd9a8',
} as const;

/** Acento de cada isla (tokens --isle-*), para techos, franjas y detalles. */
export const ISLE = {
  comunicarte: '#a8375e',
  neuromath: '#0d6c66',
  voxcivitas: '#97500a',
  gerencia: '#4a5bb8',
  activatuidea: '#7a5c00',
  latidosocial: '#286f45',
} as const;

/** Materiales de las construcciones: cal, teja, madera, piedra, vidrio y follaje. */
export const BUILD = {
  wall: '#f1ebdd',
  wallWarm: '#f3d9a4',
  wallRose: '#e9bccb',
  wallSky: '#bcd7ea',
  roof: '#b4533a',
  roofDark: '#8c3f2e',
  wood: '#a87a4f',
  woodDark: '#5e3d26',
  thatch: '#c49a55',
  stone: '#a7adb3',
  stoneDark: '#6f7882',
  metal: '#4f5b6b',
  glass: '#9ccbe4',
  glassDark: '#3f7fb8',
  panel: '#1f3f73',
  paving: '#e3dccb',
  soil: '#7a5236',
  trunk: '#6b4a2f',
  leaf: ['#3e7d3a', '#5e9e4b', '#2f6440', '#7aa64a'],
} as const;
