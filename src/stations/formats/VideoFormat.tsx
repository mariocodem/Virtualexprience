import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { Button } from '@/ui/Button';
import { CompassRose } from '@/ui/CompassRose';
import type { ExplorarContent } from '@/data/contentSchemas';

type Scene = NonNullable<ExplorarContent['formats']['video']>['scenes'][number];

const SCENE_MS = 6000;

/**
 * Cápsula animada: escenas con subtítulo que avanzan solas (o a mano). Con
 * movimiento reducido no avanza sola ni anima transiciones.
 */
export function VideoFormat({ scenes }: { scenes: Scene[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const scene = scenes[index];

  useEffect(() => {
    if (!playing || reduced) return;
    const timer = window.setTimeout(() => {
      setIndex((i) => {
        if (i + 1 >= scenes.length) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, SCENE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [playing, reduced, index, scenes.length]);

  if (!scene) return null;

  return (
    <figure>
      <div className="on-sea relative flex aspect-video items-center justify-center overflow-hidden bg-sea-900 text-plate plate-rule">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={reduced ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduced ? { opacity: 1 } : { opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex max-w-[34rem] flex-col items-center px-6 text-center"
          >
            <CompassRose size={56} className="text-plate" />
            <p className="mt-4 display text-[clamp(1.5rem,1rem+2vw,2.5rem)]">{scene.title}</p>
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-x-0 bottom-0 h-1 bg-sea-700">
          <div
            className="h-full bg-land-sun"
            style={{ width: `${String(((index + 1) / scenes.length) * 100)}%` }}
          />
        </div>
      </div>
      <figcaption role="status" aria-live="polite" className="mt-3 min-h-12 max-w-[65ch] text-lg">
        {scene.caption}
      </figcaption>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          disabled={index === 0}
          onClick={() => {
            setIndex((i) => Math.max(0, i - 1));
          }}
        >
          Anterior
        </Button>
        {!reduced && (
          <Button
            onClick={() => {
              setPlaying((p) => !p);
            }}
          >
            {playing ? 'Pausar' : 'Reproducir'}
          </Button>
        )}
        <Button
          variant="secondary"
          disabled={index === scenes.length - 1}
          onClick={() => {
            setIndex((i) => Math.min(scenes.length - 1, i + 1));
          }}
        >
          Siguiente
        </Button>
        <span className="text-sm text-ink-soft tabular-nums">
          Escena {index + 1} de {scenes.length}
        </span>
      </div>
    </figure>
  );
}
