import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

const INK = '#0f2e5c';
const PLATE = '#f3f6f8';
const SUN = '#fed300';
const FONT = '700 30px Sora, "Plus Jakarta Sans", system-ui, sans-serif';

interface Drawn {
  texture: CanvasTexture;
  /** Ancho entre alto de la etiqueta. */
  ratio: number;
}

function draw(text: string, badge: string | null, fill: string): Drawn {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const h = 56;
  const pad = 14;
  if (!ctx) return { texture: new CanvasTexture(canvas), ratio: 1 };
  ctx.font = FONT;
  const textWidth = text ? ctx.measureText(text).width : 0;
  const badgeWidth = badge ? h - 14 : 0;
  const w = Math.ceil(pad * 2 + badgeWidth + (badge && text ? 10 : 0) + textWidth);
  canvas.width = w;
  canvas.height = h;
  ctx.font = FONT;
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, w - 4, h - 4);
  let x = pad;
  ctx.textBaseline = 'middle';
  if (badge) {
    ctx.fillStyle = INK;
    ctx.fillRect(x - 4, 7, badgeWidth, h - 14);
    ctx.fillStyle = SUN;
    ctx.textAlign = 'center';
    ctx.fillText(badge, x - 4 + badgeWidth / 2, h / 2 + 1);
    x += badgeWidth + 10 - 4;
  }
  if (text) {
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(text, x, h / 2 + 1);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return { texture, ratio: w / h };
}

/**
 * Rótulo del lienzo: una placa con texto (y número) dibujada en un canvas 2D y
 * puesta como sprite. Sustituye a `<Html>`, que falla con el doble montaje del
 * modo estricto. Es decorativo: lo que importa también está en el HUD.
 */
export function Label({
  text,
  badge = null,
  position,
  height = 0.5,
  fill = PLATE,
  compact = false,
}: {
  text: string;
  badge?: string | null;
  position: readonly [number, number, number];
  /** Alto de la placa en unidades del mundo. */
  height?: number;
  fill?: string;
  /** Solo el número, sin texto (pantallas angostas). */
  compact?: boolean;
}) {
  const shown = compact && badge ? '' : text;
  const drawn = useMemo(() => draw(shown, badge, fill), [shown, badge, fill]);
  useEffect(
    () => () => {
      drawn.texture.dispose();
    },
    [drawn],
  );
  return (
    <sprite position={[...position]} scale={[height * drawn.ratio, height, 1]} renderOrder={10}>
      <spriteMaterial map={drawn.texture} depthTest={false} transparent toneMapped={false} />
    </sprite>
  );
}
