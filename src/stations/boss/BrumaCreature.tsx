import { useEffect, useRef } from 'react';

export interface BrumaPulse {
  kind: 'acierto' | 'fallo';
  /** Marca de tiempo del golpe; cambiarla dispara el efecto. */
  at: number;
}

interface Wisp {
  angle: number;
  orbit: number;
  size: number;
  speed: number;
  phase: number;
  shade: number;
}

const WISPS: Wisp[] = Array.from({ length: 64 }, (_, i) => {
  // Distribución determinista: la Bruma tiene siempre la misma silueta.
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    angle: r(1) * Math.PI * 2,
    orbit: 0.15 + r(2) * 0.85,
    size: 0.18 + r(3) * 0.32,
    speed: 0.15 + r(4) * 0.35,
    phase: r(5) * Math.PI * 2,
    shade: r(6),
  };
});

/**
 * La Bruma, dibujada en canvas 2D (funciona también sin WebGL): un cúmulo de
 * jirones de niebla con dos ojos que brillan con la luz robada al Faro. Su
 * tamaño y opacidad siguen la densidad; un acierto la atraviesa con el haz
 * de la linterna y un fallo la hace crecer. Decorativa: el estado se anuncia
 * en el DOM.
 */
export function BrumaCreature({
  density,
  phase,
  pulse,
  still,
  className,
}: {
  density: number;
  phase: 1 | 2 | 3;
  pulse: BrumaPulse | null;
  still: boolean;
  className?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ density, phase, pulse, shown: density });
  // En modo quieto se redibuja con cada cambio; animada, el bucle lee los valores vivos.
  const redraw = still ? `${String(density)}:${String(phase)}` : 'vivo';

  useEffect(() => {
    live.current = { ...live.current, density, phase, pulse };
  }, [density, phase, pulse]);

  useEffect(() => {
    const node = canvas.current;
    const ctx = node?.getContext('2d');
    if (!node || !ctx) return;

    let width = 0;
    let height = 0;

    const draw = (time: number) => {
      const t = time / 1000;
      const state = live.current;
      // La densidad visible persigue a la real: la Bruma se encoge, no salta.
      state.shown += (state.density - state.shown) * (still ? 1 : 0.06);
      const d = state.shown;
      const since = state.pulse ? (time - state.pulse.at) / 1000 : 99;
      const hit = state.pulse?.kind === 'acierto' && since < 0.9 ? 1 - since / 0.9 : 0;
      const surge = state.pulse?.kind === 'fallo' && since < 1.1 ? 1 - since / 1.1 : 0;

      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height * 0.48;
      const base = Math.min(width, height) * 0.46;
      const scale = (0.32 + 0.68 * d) * (1 + 0.18 * surge - 0.1 * hit);
      const radius = base * scale;

      // Halo oscuro: la Bruma apaga lo que la rodea.
      const shadow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 1.5);
      shadow.addColorStop(0, `rgba(6, 18, 40, ${String(0.55 * (0.3 + 0.7 * d))})`);
      shadow.addColorStop(1, 'rgba(6, 18, 40, 0)');
      ctx.fillStyle = shadow;
      ctx.fillRect(0, 0, width, height);

      // Jirones: gris frío que se tiñe de violeta en las fases finales.
      const tint =
        state.phase === 1 ? [196, 210, 224] : state.phase === 2 ? [176, 186, 214] : [168, 160, 214];
      for (const w of WISPS) {
        const drift = still ? 0 : t * w.speed;
        const angle = w.angle + drift * 0.6;
        const wobble = still ? 0 : Math.sin(t * 1.3 + w.phase) * 0.08;
        const r = radius * (w.orbit + wobble) * 0.8;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r * 0.62;
        const size = radius * w.size * (0.8 + 0.4 * d);
        const alpha = (0.07 + 0.11 * w.shade) * (0.25 + 0.75 * d);
        const shade = 0.75 + 0.25 * w.shade;
        const [rr = 0, gg = 0, bb = 0] = tint.map((c) => Math.round(c * shade));
        const g = ctx.createRadialGradient(x, y, 0, x, y, size);
        g.addColorStop(0, `rgba(${String(rr)}, ${String(gg)}, ${String(bb)}, ${String(alpha)})`);
        g.addColorStop(1, `rgba(${String(rr)}, ${String(gg)}, ${String(bb)}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ojos: la luz robada al Faro. Se entrecierran a medida que la Bruma pierde fuerza.
      if (d > 0.02) {
        const blink = still ? 1 : Math.abs(Math.sin(t * 0.7)) > 0.985 ? 0.15 : 1;
        const open = Math.max(0.12, d) * blink * (1 - 0.7 * hit);
        const gap = radius * 0.32;
        const eyeY = cy - radius * 0.08;
        for (const side of [-1, 1]) {
          const ex = cx + side * gap;
          const glow = ctx.createRadialGradient(ex, eyeY, 0, ex, eyeY, radius * 0.22);
          glow.addColorStop(0, `rgba(254, 211, 0, ${String(0.55 * d + 0.3 * surge)})`);
          glow.addColorStop(1, 'rgba(254, 211, 0, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(ex, eyeY, radius * 0.22, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff3b0';
          ctx.beginPath();
          ctx.ellipse(ex, eyeY, radius * 0.07, radius * 0.07 * open, side * -0.18, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Haz de la linterna del explorador: atraviesa la Bruma al acertar.
      if (hit > 0) {
        const beam = ctx.createLinearGradient(cx, height, cx, cy - radius);
        beam.addColorStop(0, `rgba(254, 211, 0, ${String(0.75 * hit)})`);
        beam.addColorStop(1, 'rgba(255, 243, 176, 0)');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(cx - width * 0.03, height);
        ctx.lineTo(cx - radius * 0.7, cy - radius);
        ctx.lineTo(cx + radius * 0.7, cy - radius);
        ctx.lineTo(cx + width * 0.03, height);
        ctx.closePath();
        ctx.fill();
      }
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = node.clientWidth;
      height = node.clientHeight;
      node.width = Math.round(width * dpr);
      node.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (still) draw(performance.now());
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);

    let frame = 0;
    if (!still) {
      const loop = (time: number) => {
        draw(time);
        frame = requestAnimationFrame(loop);
      };
      frame = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [still, redraw]);

  return <canvas ref={canvas} aria-hidden="true" className={className} />;
}
