import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

/**
 * Rótulo de lienzo 2D como sprite (sin red ni <Html>): sirve para el letrero
 * del puesto y el globo del ayudante. Es decorativo; lo importante va en el HUD.
 */
export function TextSprite({
  text,
  position,
  height = 0.5,
  color = '#0f2e5c',
  background = '#f3f6f8',
  border = '#0f2e5c',
  size = 56,
}: {
  text: string;
  position: [number, number, number];
  /** Alto del rótulo en metros; el ancho sale del texto. */
  height?: number;
  color?: string;
  background?: string;
  border?: string;
  size?: number;
}) {
  const made = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const font = `800 ${String(size)}px Archivo, Inter, sans-serif`;
    if (!ctx) return { texture: new CanvasTexture(canvas), ratio: 3 };
    ctx.font = font;
    const pad = size * 0.5;
    canvas.width = Math.ceil(ctx.measureText(text).width + pad * 2);
    canvas.height = Math.ceil(size * 1.6);
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 6;
    ctx.strokeStyle = border;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return { texture, ratio: canvas.width / canvas.height };
  }, [text, color, background, border, size]);

  useEffect(
    () => () => {
      made.texture.dispose();
    },
    [made],
  );

  return (
    <sprite position={position} scale={[height * made.ratio, height, 1]}>
      <spriteMaterial map={made.texture} toneMapped={false} depthWrite={false} />
    </sprite>
  );
}
