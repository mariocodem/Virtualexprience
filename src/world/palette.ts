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
