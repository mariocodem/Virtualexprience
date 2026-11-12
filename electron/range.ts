/**
 * Rango pedido con `Range: bytes=…` sobre un archivo de `size` bytes; `null` si
 * no se puede servir (416). Lo usa el video para adelantar sin leerlo entero.
 */
export function byteRange(header: string, size: number): { start: number; end: number } | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, from = '', to = ''] = match;
  if (!from && !to) return null;
  const start = from ? Number(from) : Math.max(0, size - Number(to));
  const end = from && to ? Math.min(Number(to), size - 1) : size - 1;
  return start <= end && start < size ? { start, end } : null;
}
