import { motion } from 'motion/react';
import { useState } from 'react';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import { world } from '@/data';
import { competencyLevel, explorerStanding } from '@/progress/levels';
import { completedCount, hasProgress, islandProgress } from '@/progress/selectors';
import { Stamp } from '@/progress/Stamp';
import { pickProgress, useProgress } from '@/progress/store';
import type { Progress } from '@/progress/types';
import { Button } from '@/ui/Button';
import { ButtonLink } from '@/ui/ButtonLink';
import { cx } from '@/ui/cx';
import { Dialog } from '@/ui/Dialog';
import { IconArrowRight } from '@/ui/icons';
import { Panel } from '@/ui/Panel';
import { useToast } from '@/ui/toastContext';
import { download, passportImage } from './exportImage';
import { badgeTally, dayLabel, journalByDay, journalText } from './journal';

const TILT = [-7, 4, -3, 8, -5, 3, -8, 5];
const JOURNAL_PREVIEW = 3;

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

function Meter({ label, value, className }: { label: string; value: number; className?: string }) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${String(percent)} %`}
      className={cx('h-2.5 border-[1.5px] border-ink bg-plate', className)}
    >
      <div className="h-full bg-ink" style={{ width: `${String(percent)}%` }} />
    </div>
  );
}

/**
 * Pasaporte del explorador: nivel, fragmentos de luz, sellos y bitácora.
 * Se exporta como imagen (tarjeta para compartir) o se imprime en PDF.
 */
export default function PassportPage() {
  const state = useProgress((s) => s);
  const progress = pickProgress(state);
  const started = hasProgress(progress);

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-12 sm:px-8 sm:py-16 print:max-w-none print:p-0">
      <title>Pasaporte · Archipiélago VirtuX</title>
      <Cover progress={progress} />
      {started ? (
        <>
          <Actions progress={progress} />
          <Fragments progress={progress} />
          <Stamps progress={progress} />
          <Journal progress={progress} />
        </>
      ) : (
        <Panel tone="sunk" className="mt-10 max-w-3xl">
          <h2 className="font-display text-2xl font-extrabold">Tu pasaporte está en blanco</h2>
          <p className="mt-3 max-w-[56ch] text-ink-soft">
            Cada estación que completes suma XP; cada isla terminada te da un fragmento de luz, y
            cada logro se sella aquí. Zarpa hacia la primera isla o mira un recorrido de muestra.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink to="/mundo">Entrar al mundo</ButtonLink>
            <ButtonLink to="/pasaporte?demo=1" variant="quiet" className="gap-2">
              Ver un pasaporte de demostración
              <IconArrowRight size={18} />
            </ButtonLink>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Cover({ progress }: { progress: Progress }) {
  const standing = explorerStanding(progress.xp, world.levels);
  const earned = Object.keys(progress.badges).length;
  const stats: [string, string][] = [
    [String(completedCount(progress)), 'estaciones completadas'],
    [
      `${String(progress.visitedIslands.length)} de ${String(world.islands.length)}`,
      'islas visitadas',
    ],
    [
      `${String(progress.fragments.length)} de ${String(world.islands.length)}`,
      'fragmentos de luz',
    ],
    [`${String(earned)} de ${String(world.badges.length)}`, 'insignias selladas'],
  ];
  return (
    <header className="grid gap-10 border-b-[1.5px] border-ink pb-10 lg:grid-cols-[3fr_2fr] lg:items-end lg:gap-16">
      <div>
        <p className="toponym text-ink-soft">Pasaporte del explorador</p>
        <h1 className="mt-4 display text-[clamp(3rem,2rem+4vw,5.75rem)]">
          <span className="sr-only">Pasaporte del explorador: nivel </span>
          {standing.current.name}
        </h1>
        <p className="mt-5 text-lg text-ink-soft">
          <span className="font-semibold text-ink tabular-nums">{progress.xp} XP</span>
          {standing.next
            ? ` · faltan ${String(standing.next.minXp - progress.xp)} para ${standing.next.name}`
            : ' · nivel máximo del archipiélago'}
        </p>
        <Meter
          label={standing.next ? `Avance hacia ${standing.next.name}` : 'Nivel máximo'}
          value={standing.toNext}
          className="mt-3 max-w-md"
        />
      </div>
      <dl className="grid grid-cols-2 border-t-[1.5px] border-l-[1.5px] border-ink">
        {stats.map(([value, label]) => (
          <div
            key={label}
            className="flex flex-col border-r-[1.5px] border-b-[1.5px] border-ink px-4 py-4 sm:px-5"
          >
            <dt className="text-sm text-ink-soft">{label}</dt>
            <dd className="order-first font-display text-3xl font-extrabold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

function Actions({ progress }: { progress: Progress }) {
  const reset = useProgress((s) => s.reset);
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const exportImage = async () => {
    setBusy(true);
    try {
      download(await passportImage(progress, world), 'pasaporte-archipielago-virtux.png');
      notify({ title: 'Imagen del pasaporte descargada', tone: 'success' });
    } catch {
      notify({
        title: 'No se pudo crear la imagen',
        description: 'Prueba con Imprimir o guardar en PDF.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 py-6 print:hidden">
      <Button variant="secondary" loading={busy} onClick={() => void exportImage()}>
        Exportar como imagen
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          window.print();
        }}
      >
        Imprimir o guardar en PDF
      </Button>
      <Button
        variant="quiet"
        className="sm:ml-auto"
        onClick={() => {
          setConfirm(true);
        }}
      >
        Reiniciar progreso
      </Button>
      <Dialog
        open={confirm}
        onClose={() => {
          setConfirm(false);
        }}
        title="¿Reiniciar tu expedición?"
        description="Se borran tu XP, tus insignias, tus fragmentos de luz y la bitácora en este navegador. No se puede deshacer."
      >
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => {
              reset();
              setConfirm(false);
              notify({ title: 'Expedición reiniciada', description: 'El archipiélago te espera.' });
            }}
          >
            Reiniciar progreso
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setConfirm(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Fragments({ progress }: { progress: Progress }) {
  return (
    <section aria-labelledby="fragmentos" className="py-10 print:break-inside-avoid">
      <h2 id="fragmentos" className="font-display text-3xl font-extrabold">
        Fragmentos de luz
      </h2>
      <p className="mt-2 max-w-[60ch] text-ink-soft">
        Cada isla guarda un fragmento. Con los seis, el Faro Minuto se enciende y se abre el Gran
        Reto Integrador.
      </p>
      <ul className="mt-6 border-t-[1.5px] border-ink">
        {world.islands.map((island) => {
          const route = islandProgress(progress, world, island.id);
          const visited = progress.visitedIslands.includes(island.id);
          const mastery = progress.mastery[island.id];
          return (
            <li
              key={island.id}
              className="grid gap-x-6 gap-y-2 border-b-[1.5px] border-ink py-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="flex items-center gap-3">
                <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                  <circle
                    cx="11"
                    cy="11"
                    r="9"
                    fill={route.hasFragment ? `var(--isle-${island.id})` : 'none'}
                    stroke={`var(--isle-${island.id})`}
                    strokeWidth="2"
                    strokeDasharray={route.hasFragment ? undefined : '3 3'}
                  />
                </svg>
                <div>
                  <p
                    className="placename text-[0.8125rem]"
                    style={{ color: `var(--isle-${island.id})` }}
                  >
                    {island.name}
                  </p>
                  <p className="text-sm text-ink-soft">{island.fragmentName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Meter
                  label={`Estaciones de ${island.name}`}
                  value={route.ratio}
                  className="w-full max-w-xs"
                />
                <span className="shrink-0 text-sm tabular-nums">
                  {route.completed} de {route.playable}
                </span>
              </div>
              <p className="text-sm sm:text-right">
                <span className="font-semibold">
                  {route.hasFragment ? 'Fragmento recuperado' : 'Fragmento pendiente'}
                </span>
                <span className="block text-ink-soft">
                  {visited
                    ? `Competencia: ${competencyLevel(mastery ?? 0, world.levels).name}`
                    : 'Isla sin visitar'}
                </span>
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Stamps({ progress }: { progress: Progress }) {
  const reduced = useReducedMotion();
  const earned = world.badges.filter((b) => b.id in progress.badges);
  const pending = world.badges.filter((b) => !(b.id in progress.badges));
  return (
    <section aria-labelledby="sellos" className="py-10">
      <h2 id="sellos" className="font-display text-3xl font-extrabold">
        Sellos
      </h2>
      <p className="mt-2 text-ink-soft">
        {earned.length} de {world.badges.length} insignias selladas.
      </p>
      {earned.length > 0 && (
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {earned.map((badge, i) => (
            <motion.li
              key={badge.id}
              className="flex flex-col items-center text-center print:break-inside-avoid"
              initial={reduced ? false : { opacity: 0, scale: 1.45 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.38, delay: (i % 6) * 0.08, ease: [0.2, 1.4, 0.4, 1] }}
            >
              <div style={{ rotate: `${String(TILT[i % TILT.length] ?? 0)}deg` }}>
                <Stamp badge={badge} size={128} />
              </div>
              <p className="mt-3 text-sm text-ink-soft">
                Sellada el{' '}
                <time dateTime={progress.badges[badge.id]}>
                  {dateOf(progress.badges[badge.id] ?? '')}
                </time>
              </p>
            </motion.li>
          ))}
        </ul>
      )}
      {pending.length > 0 && (
        <>
          <h3 className="mt-12 toponym text-ink-soft">Por sellar</h3>
          <ul className="mt-4 grid gap-x-10 border-t-[1.5px] border-ink sm:grid-cols-2">
            {pending.map((badge) => {
              const tally = badgeTally(badge, progress, world);
              return (
                <li key={badge.id} className="border-b-[1.5px] border-ink py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="font-semibold">{badge.name}</p>
                    {tally && (
                      <span className="shrink-0 text-sm text-ink-soft tabular-nums">
                        {tally.current} de {tally.target}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{badge.description}</p>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function Journal({ progress }: { progress: Progress }) {
  const [all, setAll] = useState(false);
  const days = journalByDay(progress.journal);
  const shown = all ? days : days.slice(0, JOURNAL_PREVIEW);
  return (
    <section aria-labelledby="bitacora" className="py-10">
      <h2 id="bitacora" className="font-display text-3xl font-extrabold">
        Bitácora
      </h2>
      <p className="mt-2 text-ink-soft">
        Tu ruta por el archipiélago, de lo más reciente a lo primero.
      </p>
      <div className="mt-6 grid gap-8">
        {shown.map(({ day, entries }) => (
          <section key={day} aria-label={dayLabel(day)}>
            <h3 className="toponym text-ink-soft">{dayLabel(day)}</h3>
            <ol className="mt-3 border-t-[1.5px] border-ink">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 border-b border-plate-edge py-2.5"
                >
                  <time dateTime={entry.at} className="text-sm text-ink-soft tabular-nums">
                    {timeOf(entry.at)}
                  </time>
                  <span>{journalText(entry, world)}</span>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      {days.length > JOURNAL_PREVIEW && (
        <Button
          variant="secondary"
          className="mt-8 print:hidden"
          aria-expanded={all}
          onClick={() => {
            setAll((v) => !v);
          }}
        >
          {all
            ? 'Mostrar solo los últimos días'
            : `Ver toda la bitácora (${String(days.length)} días)`}
        </Button>
      )}
    </section>
  );
}
