import { CanvasTexture, SRGBColorSpace } from 'three';

export interface LabelOptions {
  /** Alto de letra en píxeles del lienzo. */
  size?: number;
  fg?: string;
  bg?: string;
  /** Ancho máximo del texto en píxeles del lienzo: más allá se parte en renglones. */
  maxWidth?: number;
  weight?: number;
  align?: 'center' | 'left';
}

export interface LabelTexture {
  texture: CanvasTexture;
  /** Ancho entre alto, para dimensionar el plano. */
  aspect: number;
}

/** Parte el texto en renglones que no pasen de `maxWidth`, según lo que mida `measure`. */
export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (line: string) => number,
): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word;
    if (current && measure(next) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Rótulo dibujado en un lienzo 2D: letras locales, sin descargar fuentes ni
 * depender del DOM (la escena 3D no usa `<Text>` ni `<Html>`).
 */
export function labelTexture(text: string, options: LabelOptions = {}): LabelTexture {
  const {
    size = 30,
    fg = '#f3f6f8',
    bg = 'rgba(11,29,61,0.82)',
    maxWidth = 380,
    weight = 700,
  } = options;
  const align = options.align ?? 'center';
  const pad = Math.round(size * 0.45);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const font = `${String(weight)} ${String(size)}px "Archivo Variable", Archivo, system-ui, sans-serif`;
  if (!ctx) return { texture: new CanvasTexture(canvas), aspect: 1 };
  ctx.font = font;
  const lines = wrapLines(text, maxWidth, (line) => ctx.measureText(line).width);
  const widest = Math.max(...lines.map((line) => ctx.measureText(line).width), size);
  const lineHeight = Math.round(size * 1.22);
  canvas.width = Math.ceil(widest + pad * 2);
  canvas.height = Math.ceil(lines.length * lineHeight + pad * 1.2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.font = font;
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.textAlign = align;
  lines.forEach((line, i) => {
    const x = align === 'center' ? canvas.width / 2 : pad;
    ctx.fillText(line, x, pad * 0.6 + lineHeight * (i + 0.5));
  });
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return { texture, aspect: canvas.width / canvas.height };
}
