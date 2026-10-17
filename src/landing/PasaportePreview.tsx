import { motion } from 'motion/react';
import { world } from '@/data';
import { explorerStanding } from '@/progress/levels';
import { Stamp } from '@/progress/Stamp';
import { useProgress } from '@/progress/store';
import { ButtonLink } from '@/ui/ButtonLink';

const PREVIEW_IDS = [
  'primer-zarpe',
  'voz-de-los-ecos',
  'editor-riguroso',
  'verificador',
  'otra-mirada',
  'cartografo',
  'bitacora-viva',
  'primer-fragmento',
];

const TILT = [-7, 4, -3, 8, -5, 3, -8, 5];

/** Vista previa del pasaporte: los sellos se estampan al entrar en pantalla. */
export function PasaportePreview({ reduced }: { reduced: boolean }) {
  const xp = useProgress((s) => s.xp);
  const earned = useProgress((s) => s.badges);
  const fragments = useProgress((s) => s.fragments.length);
  const level = explorerStanding(xp, world.levels).current;
  const badges = PREVIEW_IDS.map((id) => world.badges.find((b) => b.id === id)).filter(
    (b) => b !== undefined,
  );
  const earnedCount = Object.keys(earned).length;

  return (
    <section
      id="pasaporte-vista"
      aria-labelledby="pasaporte-titulo"
      className="relative z-[1] bg-plate px-4 py-24 sm:px-8 sm:py-32"
    >
      <div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <div>
          <h2
            id="pasaporte-titulo"
            data-escala
            className="display text-[clamp(2.25rem,1.4rem+2.8vw,4rem)]"
          >
            Tu pasaporte de explorador
          </h2>
          <p className="mt-6 max-w-[46ch] text-lg text-ink-soft">
            Cada insignia se sella aquí. El pasaporte guarda tus fragmentos de luz, tu nivel y la
            ruta que recorriste, y lo puedes exportar para compartirlo.
          </p>
          <ButtonLink to="/pasaporte" variant="secondary" className="mt-8">
            Abrir mi pasaporte
          </ButtonLink>
        </div>

        <figure className="bg-plate-sunk plate-rule">
          <div className="grid grid-cols-3 border-b-[1.5px] border-ink text-sm">
            <div className="border-r-[1.5px] border-ink px-4 py-3">
              <p className="text-ink-soft">Nivel</p>
              <p className="font-display text-lg font-extrabold">{level.name}</p>
            </div>
            <div className="border-r-[1.5px] border-ink px-4 py-3">
              <p className="text-ink-soft">Fragmentos</p>
              <p className="font-display text-lg font-extrabold tabular-nums">{fragments} de 6</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-ink-soft">Insignias</p>
              <p className="font-display text-lg font-extrabold tabular-nums">
                {earnedCount} de {world.badges.length}
              </p>
            </div>
          </div>
          <ul className="grid grid-cols-2 place-items-center gap-y-6 p-6 sm:grid-cols-4 sm:p-8">
            {badges.map((badge, i) => (
              <motion.li
                key={badge.id}
                initial={reduced ? false : { opacity: 0, scale: 1.45, rotate: (TILT[i] ?? 0) - 10 }}
                whileInView={{ opacity: 1, scale: 1, rotate: TILT[i] ?? 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.38, delay: i * 0.12, ease: [0.2, 1.4, 0.4, 1] }}
                style={reduced ? { rotate: TILT[i] ?? 0 } : undefined}
              >
                <Stamp badge={badge} size={124} />
              </motion.li>
            ))}
          </ul>
          <figcaption className="border-t-[1.5px] border-ink px-5 py-3 text-sm text-ink-soft">
            {earnedCount > 0
              ? 'Vista previa de algunos sellos del pasaporte; los tuyos están en la página Pasaporte.'
              : 'Vista previa: así se ven los sellos cuando los ganas.'}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
