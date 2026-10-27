import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from '@/a11y/useReducedMotion';
import type { ExplorarContent } from '@/data/contentSchemas';
import { useProgress } from '@/progress/store';
import type { ProgressEvent } from '@/progress/types';
import type { BrujulaMessage } from '@/stations/BrujulaBubble';
import { AudioFormat } from '@/stations/formats/AudioFormat';
import { InfografiaFormat } from '@/stations/formats/InfografiaFormat';
import { InteractivoFormat } from '@/stations/formats/InteractivoFormat';
import { TextoFormat } from '@/stations/formats/TextoFormat';
import { VideoFormat } from '@/stations/formats/VideoFormat';
import { useMastery } from '@/stations/useMastery';
import type { FormatKind, Island } from '@/types/domain';
import { IconClose } from '@/ui/icons';
import { FORMAT_LABEL } from '@/world/stationText';
import { ISLE } from '@/world/palette';
import { DecisionCard } from '../shared/hud';
import { arcSpots, type Spot } from './plaza';
import { PlazaStage } from './PlazaStage';
import { Beacon, Lectern, Mural, RadioSet, Screen, SpotProp, Workbench } from './StationSet';
import { useQuiz } from './useQuiz';

const ORDER: FormatKind[] = ['texto', 'audio', 'video', 'infografia', 'interactivo'];
const CHECK = 'comprobar';

const OPEN: Record<FormatKind, string> = {
  texto: 'Leer el texto',
  audio: 'Escuchar el audio',
  video: 'Ver el video',
  infografia: 'Ver la infografía',
  interactivo: 'Usar el interactivo',
};

/**
 * Explorar en 3D: el tema está repartido por la plaza de la isla. Cada objeto
 * es un formato (el atril es el texto, la radio el audio, la pantalla el video,
 * el mural la infografía, la mesa lo interactivo); el estudiante camina hasta
 * el que prefiera. Con al menos uno consultado, el farol de la estación se
 * enciende y allí se comprueba lo aprendido, con la misma evaluación de la
 * versión accesible.
 */
export default function Explorar3D({
  content,
  island,
  onBrujula,
  onEvents,
  onComplete,
}: {
  content: ExplorarContent;
  island: Island;
  onBrujula: (message: BrujulaMessage | null) => void;
  onEvents: (events: ProgressEvent[]) => void;
  onComplete: (score: number) => void;
}) {
  const still = useReducedMotion();
  const accent = ISLE[island.id];
  const available = useMemo(
    () => ORDER.filter((f) => f === 'texto' || content.formats[f] !== undefined),
    [content],
  );
  const spots = useMemo<Spot[]>(
    () => [...arcSpots(available, 4.9), { id: CHECK, x: 0, z: 1.5 }],
    [available],
  );
  const [near, setNear] = useState<Spot | undefined>();
  const [open, setOpen] = useState<FormatKind | typeof CHECK | null>(null);
  const [seen, setSeen] = useState<FormatKind[]>([]);
  const [last, setLast] = useState<FormatKind>('texto');
  const [misses, setMisses] = useState(0);
  const [announce, setAnnounce] = useState('');
  const recordFormat = useProgress((s) => s.recordFormat);
  const { record } = useMastery(island.id);
  const ready = seen.length > 0;

  const quiz = useQuiz({
    items: content.check,
    competency: island.competency,
    onBrujula,
    onAnswer: (item, correct) => {
      record(item.tier, correct ? 1 : 0);
      if (correct) return;
      const count = misses + 1;
      setMisses(count);
      // Dos fallos: Brújula propone otra manera de verlo, como en la versión accesible.
      const other = available.find((f) => !seen.includes(f)) ?? available.find((f) => f !== last);
      if (count >= 2 && other) {
        onBrujula({
          text: `¿Y si lo vemos de otra forma? Busca ${FORMAT_LABEL[other].toLowerCase()} en la plaza antes de seguir.`,
          source: 'local',
        });
      }
    },
    onFinish: (correct) => {
      onComplete(correct / content.check.length);
    },
  });

  const use = (spot: Spot) => {
    if (spot.id === CHECK) {
      if (!ready) {
        setAnnounce('El farol aún está apagado: primero consulta el tema en algún formato.');
        return;
      }
      setOpen(CHECK);
      onBrujula(null);
      return;
    }
    const format = spot.id as FormatKind;
    setOpen(format);
    setLast(format);
    if (!seen.includes(format)) setSeen([...seen, format]);
    onEvents(recordFormat(format));
    setAnnounce(`${FORMAT_LABEL[format]} abierto.`);
  };

  const close = () => {
    setOpen(null);
    if (open && open !== CHECK && seen.length === 1)
      setAnnounce(
        'El farol de la estación se encendió: ve a comprobar lo aprendido cuando quieras.',
      );
  };

  return (
    <PlazaStage
      island={island}
      label={`Explorar en 3D: la plaza de ${island.name}`}
      spots={spots}
      near={near}
      onNear={setNear}
      onUse={use}
      announce={announce}
      hint={(spot) =>
        spot.id === CHECK
          ? ready
            ? 'Comprobar lo aprendido'
            : 'Farol apagado: consulta un formato primero'
          : OPEN[spot.id as FormatKind]
      }
      goal={
        <>
          <p className="toponym text-[0.625rem] text-sea-100">Explorar · {island.name}</p>
          <p className="mt-1 text-sm text-plate">
            Camina hasta el formato que prefieras y pulsa E. Después, enciende el farol de la
            estación.
          </p>
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-plate">
            {available.map((f) => (
              <li key={f}>
                <span aria-hidden="true">{seen.includes(f) ? '● ' : '○ '}</span>
                {FORMAT_LABEL[f]}
                <span className="sr-only">
                  {seen.includes(f) ? ': consultado' : ': sin consultar'}
                </span>
              </li>
            ))}
          </ul>
        </>
      }
      overlay={
        open === CHECK && quiz.item ? (
          <DecisionCard
            title={`Comprueba lo aprendido · ${String(quiz.index + 1)} de ${String(quiz.total)}`}
            item={quiz.item}
            feedback={quiz.feedback}
            onChoose={quiz.choose}
            onContinue={quiz.next}
            continueLabel={quiz.last ? 'Completar estación' : 'Siguiente pregunta'}
            className="max-h-full overflow-auto"
          />
        ) : open && open !== CHECK ? (
          <FormatPanel title={FORMAT_LABEL[open]} onClose={close}>
            <p className="mb-4 max-w-[65ch] text-lg">{content.intro}</p>
            {open === 'texto' && <TextoFormat content={content.formats.texto} />}
            {open === 'audio' && content.formats.audio && (
              <AudioFormat script={content.formats.audio.script} />
            )}
            {open === 'video' && content.formats.video && (
              <VideoFormat scenes={content.formats.video.scenes} />
            )}
            {open === 'infografia' && content.formats.infografia && (
              <InfografiaFormat content={content.formats.infografia} />
            )}
            {open === 'interactivo' && content.formats.interactivo && (
              <InteractivoFormat content={content.formats.interactivo} />
            )}
          </FormatPanel>
        ) : null
      }
      onCloseOverlay={() => {
        if (open !== CHECK || !quiz.chosen) close();
      }}
      props={
        <>
          {spots.map((spot) => {
            if (spot.id === CHECK)
              return (
                <SpotProp key={spot.id} spot={spot} label="Comprobar" dim={!ready} labelY={3}>
                  <Beacon lit={ready} still={still} />
                </SpotProp>
              );
            const format = spot.id as FormatKind;
            return (
              <SpotProp
                key={spot.id}
                spot={spot}
                label={FORMAT_LABEL[format]}
                done={seen.includes(format)}
              >
                {format === 'texto' && <Lectern accent={accent} />}
                {format === 'audio' && <RadioSet accent={accent} still={still} />}
                {format === 'video' && <Screen accent={accent} still={still} />}
                {format === 'infografia' && <Mural accent={accent} />}
                {format === 'interactivo' && <Workbench accent={accent} still={still} />}
              </SpotProp>
            );
          })}
        </>
      }
    />
  );
}

/** Panel de lectura sobre la escena: el formato elegido, con su cierre (Esc). */
export function FormatPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <section
      aria-labelledby="formato-titulo"
      className="pointer-events-auto relative max-h-full w-full max-w-2xl overflow-auto bg-plate p-5 text-ink [--focus:var(--route)] plate-rule sm:p-7"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-2 right-2 inline-flex size-11 items-center justify-center hover:bg-plate-sunk"
        aria-label="Cerrar y volver a la plaza"
      >
        <IconClose size={20} />
      </button>
      <h2
        id="formato-titulo"
        ref={heading}
        tabIndex={-1}
        className="pr-10 font-display text-2xl font-extrabold outline-none"
      >
        {title}
      </h2>
      <div className="mt-4">{children}</div>
      <button
        type="button"
        onClick={onClose}
        className="mt-6 inline-flex min-h-11 items-center border-[1.5px] border-sea-900 bg-sea-900 px-5 font-display font-bold text-land-sun"
      >
        Volver a la plaza <span className="ml-2 text-xs text-sea-100">Esc</span>
      </button>
    </section>
  );
}
