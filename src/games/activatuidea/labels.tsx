import { useEffect, useMemo } from 'react';
import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three';

/**
 * Rótulos del taller dibujados en un lienzo y puestos como sprites: sin red
 * (nada de fuentes remotas) y sin DOM sobre el lienzo 3D, que por cuadro es
 * más caro. Son decorativos: lo que importa también está en el HUD.
 */

export interface LabelSpec {
  /** Texto principal, con saltos de línea automáticos. */
  text: string;
  /** Línea pequeña encima del texto (el nombre de quien habla). */
  title?: string;
  bg: string;
  fg: string;
  /** Alto de letra en píxeles del lienzo. */
  font?: number;
  /** Ancho máximo del texto en píxeles del lienzo. */
  wrap?: number;
  bold?: boolean;
}

const FAMILY = "'Inter Variable', Inter, system-ui, sans-serif";
const SCALE = 2;

function wrapLines(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > max) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Dibuja el rótulo y devuelve el lienzo con su proporción. */
function drawLabel(spec: LabelSpec): HTMLCanvasElement {
  const font = (spec.font ?? 26) * SCALE;
  const wrap = (spec.wrap ?? 360) * SCALE;
  const pad = font * 0.6;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const weight = spec.bold ? 800 : 500;
  ctx.font = `${String(weight)} ${String(font)}px ${FAMILY}`;
  const lines = wrapLines(ctx, spec.text, wrap);
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width), 1);
  const titleFont = font * 0.78;
  let titleWidth = 0;
  if (spec.title) {
    ctx.font = `800 ${String(titleFont)}px ${FAMILY}`;
    titleWidth = ctx.measureText(spec.title).width;
  }
  const inner = Math.max(widest, titleWidth);
  const lineHeight = font * 1.22;
  const height = pad * 2 + lines.length * lineHeight + (spec.title ? titleFont * 1.3 : 0);
  canvas.width = Math.ceil(inner + pad * 2);
  canvas.height = Math.ceil(height);
  ctx.fillStyle = spec.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = spec.fg;
  ctx.lineWidth = 3 * SCALE;
  ctx.strokeRect(1.5 * SCALE, 1.5 * SCALE, canvas.width - 3 * SCALE, canvas.height - 3 * SCALE);
  ctx.fillStyle = spec.fg;
  ctx.textBaseline = 'top';
  let y = pad;
  if (spec.title) {
    ctx.font = `800 ${String(titleFont)}px ${FAMILY}`;
    ctx.fillText(spec.title, pad, y);
    y += titleFont * 1.3;
  }
  ctx.font = `${String(weight)} ${String(font)}px ${FAMILY}`;
  for (const line of lines) {
    ctx.fillText(line, pad, y);
    y += lineHeight;
  }
  return canvas;
}

/** Sprite con un rótulo; `unit` son unidades del mundo por píxel del lienzo. */
export function TextLabel({
  position,
  unit = 0.0035,
  anchor = 0,
  ...spec
}: LabelSpec & {
  position: readonly [number, number, number];
  unit?: number;
  /** 0 = centrado, −1 = el rótulo crece hacia arriba desde la posición. */
  anchor?: number;
}) {
  const { text, title, bg, fg, font, wrap, bold } = spec;
  const texture = useMemo(() => {
    const canvas = drawLabel({ text, title, bg, fg, font, wrap, bold });
    const t = new CanvasTexture(canvas);
    t.colorSpace = SRGBColorSpace;
    t.minFilter = LinearFilter;
    t.generateMipmaps = false;
    return t;
  }, [text, title, bg, fg, font, wrap, bold]);
  useEffect(
    () => () => {
      texture.dispose();
    },
    [texture],
  );
  const image = texture.image;
  const w = image.width * unit;
  const h = image.height * unit;
  return (
    <sprite
      position={[position[0], position[1] + (h / 2) * -anchor, position[2]]}
      scale={[w, h, 1]}
      renderOrder={20}
    >
      <spriteMaterial map={texture} depthTest={false} transparent toneMapped={false} />
    </sprite>
  );
}
