import { explorerStanding } from '@/progress/levels';
import { stampInk } from '@/progress/stampInk';
import type { Progress } from '@/progress/types';
import type { Badge, World } from '@/types/domain';

const W = 1200;
const H = 630;
const DISPLAY = '"Archivo Variable", "Archivo", sans-serif';
const BODY = '"Inter Variable", "Inter", sans-serif';
const TILT = [-7, 4, -3, 8, -5, 3, -8, 5];

const CATEGORY: Record<Badge['category'], string> = {
  competencia: 'COMPETENCIA',
  exploracion: 'EXPLORACIÓN',
  accesibilidad: 'ACCESIBILIDAD',
  constancia: 'CONSTANCIA',
};

/** Resuelve `var(--token)` contra la hoja de estilos: el lienzo no entiende variables CSS. */
function color(value: string): string {
  const match = /^var\((--[\w-]+)\)$/.exec(value);
  if (!match?.[1]) return value;
  return getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim() || '#0f2e5c';
}

function arcText(
  ctx: CanvasRenderingContext2D,
  text: string,
  radius: number,
  bottom: boolean,
): void {
  const chars = Array.from(new Intl.Segmenter('es').segment(text), (s) => s.segment);
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) / radius;
  let angle = bottom ? Math.PI / 2 + total / 2 : -Math.PI / 2 - total / 2;
  chars.forEach((ch, i) => {
    const step = (widths[i] ?? 0) / radius;
    angle += bottom ? -step / 2 : step / 2;
    ctx.save();
    ctx.rotate(bottom ? angle - Math.PI / 2 : angle + Math.PI / 2);
    ctx.fillText(ch, 0, bottom ? radius : -radius);
    ctx.restore();
    angle += bottom ? -step / 2 : step / 2;
  });
}

/** El sello de insignia dibujado a mano: mismos aros, arco y estrella que `<Stamp />`. */
function drawStamp(ctx: CanvasRenderingContext2D, badge: Badge, r: number, tilt: number): void {
  const ink = color(stampInk(badge));
  ctx.save();
  ctx.rotate((tilt * Math.PI) / 180);
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = r * 0.05;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.93, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = r * 0.017;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fontStretch = 'normal';
  ctx.letterSpacing = `${(r * 0.027).toFixed(1)}px`;
  let size = r * 0.175;
  ctx.font = `700 ${size.toFixed(1)}px ${DISPLAY}`;
  // Los nombres largos se achican para no cerrar el anillo.
  while (ctx.measureText(badge.name.toUpperCase()).width > r * 2.1 && size > r * 0.11) {
    size -= 0.5;
    ctx.font = `700 ${size.toFixed(1)}px ${DISPLAY}`;
  }
  arcText(ctx, badge.name.toUpperCase(), r * 0.66, false);
  ctx.font = `500 ${(r * 0.12).toFixed(1)}px ${DISPLAY}`;
  arcText(ctx, CATEGORY[badge.category], r * 0.64, true);

  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r * 0.27 : r * 0.11;
    ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius + r * 0.03);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Tarjeta del pasaporte en PNG (1200×630, buena para compartir): nivel, XP,
 * cifras, fragmentos y los sellos más recientes. Se dibuja con la API de
 * lienzo y las fuentes ya cargadas, sin dependencias ni red.
 */
export async function passportImage(progress: Progress, world: World, now = new Date()) {
  await Promise.all([
    document.fonts.load(`800 72px ${DISPLAY}`),
    document.fonts.load(`700 18px ${DISPLAY}`),
    document.fonts.load(`400 20px ${BODY}`),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('El navegador no permite dibujar la imagen.');
  ctx.scale(2, 2);

  const ink = color('var(--ink)');
  const soft = color('var(--ink-soft)');
  ctx.fillStyle = color('var(--plate)');
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  const toponym = (text: string, x: number, y: number, align: CanvasTextAlign = 'left') => {
    ctx.font = `700 15px ${DISPLAY}`;
    ctx.fontStretch = 'expanded';
    ctx.letterSpacing = '3.5px';
    ctx.textAlign = align;
    ctx.fillStyle = soft;
    ctx.fillText(text, x, y);
    ctx.fontStretch = 'normal';
    ctx.letterSpacing = '0px';
  };

  ctx.textBaseline = 'alphabetic';
  toponym('PASAPORTE DEL EXPLORADOR', 56, 78);
  toponym('ARCHIPIÉLAGO VIRTUX', W - 56, 78, 'right');
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(56, 100);
  ctx.lineTo(W - 56, 100);
  ctx.stroke();

  // Columna izquierda: nivel, XP y cifras.
  const standing = explorerStanding(progress.xp, world.levels);
  toponym('NIVEL', 56, 150);
  ctx.fillStyle = ink;
  ctx.textAlign = 'left';
  ctx.font = `800 76px ${DISPLAY}`;
  ctx.fontStretch = 'semi-condensed';
  ctx.fillText(standing.current.name, 52, 222);
  ctx.fontStretch = 'normal';
  ctx.font = `400 20px ${BODY}`;
  ctx.fillStyle = soft;
  ctx.fillText(
    standing.next
      ? `${String(progress.xp)} XP · faltan ${String(standing.next.minXp - progress.xp)} para ${standing.next.name}`
      : `${String(progress.xp)} XP · nivel máximo`,
    56,
    262,
  );
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(56, 280, 460, 12);
  ctx.fillStyle = ink;
  ctx.fillRect(56, 280, 460 * standing.toNext, 12);

  const completed = Object.values(progress.stations).filter((r) => r.completedAt).length;
  const stats: [string, string][] = [
    [String(completed), completed === 1 ? 'estación completada' : 'estaciones completadas'],
    [
      `${String(progress.visitedIslands.length)} de ${String(world.islands.length)}`,
      'islas visitadas',
    ],
    [
      `${String(Object.keys(progress.badges).length)} de ${String(world.badges.length)}`,
      'insignias',
    ],
    [
      String(progress.activeDays.length),
      progress.activeDays.length === 1 ? 'día de expedición' : 'días de expedición',
    ],
  ];
  stats.forEach(([value, label], i) => {
    const x = 56 + (i % 2) * 240;
    const y = 350 + Math.floor(i / 2) * 78;
    ctx.fillStyle = ink;
    ctx.font = `800 34px ${DISPLAY}`;
    ctx.fillText(value, x, y);
    ctx.fillStyle = soft;
    ctx.font = `400 16px ${BODY}`;
    ctx.fillText(label, x, y + 26);
  });

  toponym(
    `FRAGMENTOS DE LUZ · ${String(progress.fragments.length)} DE ${String(world.islands.length)}`,
    56,
    522,
  );
  world.islands.forEach((island, i) => {
    const x = 74 + i * 52;
    const has = progress.fragments.includes(island.id);
    ctx.beginPath();
    ctx.arc(x, 556, 16, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = color(`var(--isle-${island.id})`);
    ctx.setLineDash(has ? [] : [4, 4]);
    ctx.stroke();
    if (has) {
      ctx.fillStyle = color(`var(--isle-${island.id})`);
      ctx.fill();
    }
  });
  ctx.setLineDash([]);

  // Columna derecha: los sellos más recientes.
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(588, 124);
  ctx.lineTo(588, H - 56);
  ctx.stroke();
  const earned = world.badges
    .filter((b) => b.id in progress.badges)
    .sort((a, b) => (progress.badges[b.id] ?? '').localeCompare(progress.badges[a.id] ?? ''));
  toponym('SELLOS', 620, 150);
  if (earned.length === 0) {
    ctx.fillStyle = soft;
    ctx.font = `400 20px ${BODY}`;
    ctx.textAlign = 'left';
    ctx.fillText('Aún sin sellos: el primero llega al completar una estación.', 620, 200);
  }
  earned.slice(0, 8).forEach((badge, i) => {
    ctx.save();
    ctx.translate(680 + (i % 4) * 134, 238 + Math.floor(i / 4) * 150);
    drawStamp(ctx, badge, 60, TILT[i] ?? 0);
    ctx.restore();
  });
  if (earned.length > 8) {
    ctx.fillStyle = soft;
    ctx.font = `400 16px ${BODY}`;
    ctx.textAlign = 'right';
    ctx.fillText(`y ${String(earned.length - 8)} sellos más`, W - 56, 540);
  }

  ctx.fillStyle = soft;
  ctx.font = `400 15px ${BODY}`;
  ctx.textAlign = 'right';
  ctx.fillText(
    `Expedido el ${now.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    W - 56,
    H - 50,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo crear la imagen.'));
    }, 'image/png');
  });
}

/** Descarga un archivo generado en el navegador. */
export function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
