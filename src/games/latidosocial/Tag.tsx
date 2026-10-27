import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

/**
 * Rótulo flotante que siempre mira a la cámara: una placa con texto dibujada en
 * un lienzo 2D (sin fuentes ni red; drei `<Text>` y `<Html>` no sirven aquí).
 * Es decorativo: lo que importa también está en el HUD.
 */
export function Tag({
  text,
  position,
  height = 0.7,
}: {
  text: string;
  position: [number, number, number];
  /** Alto de la placa en unidades del mundo. */
  height?: number;
}) {
  const { texture, ratio } = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const font = '700 40px Archivo, system-ui, sans-serif';
    let width = 80;
    if (ctx) {
      ctx.font = font;
      width = Math.max(80, Math.ceil(ctx.measureText(text).width) + 36);
    }
    canvas.width = width;
    canvas.height = 64;
    if (ctx) {
      ctx.fillStyle = '#f3f6f8';
      ctx.fillRect(0, 0, width, 64);
      ctx.strokeStyle = '#0f2e5c';
      ctx.lineWidth = 5;
      ctx.strokeRect(2.5, 2.5, width - 5, 59);
      ctx.fillStyle = '#0f2e5c';
      ctx.font = font;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width / 2, 34);
    }
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    return { texture: map, ratio: width / 64 };
  }, [text]);
  useEffect(
    () => () => {
      texture.dispose();
    },
    [texture],
  );
  return (
    <sprite position={position} scale={[height * ratio, height, 1]}>
      <spriteMaterial map={texture} fog={false} depthWrite={false} toneMapped={false} />
    </sprite>
  );
}
