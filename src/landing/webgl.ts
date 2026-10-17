/** ¿Puede este navegador pintar el mundo 3D? Sin WebGL 2 se usa la plancha 2D. */
export function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}
