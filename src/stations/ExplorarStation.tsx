import { useState } from 'react';
import type { ExplorarContent } from '@/data/contentSchemas';
import { useProgress } from '@/progress/store';
import type { ProgressEvent } from '@/progress/types';
import type { FormatKind, Island } from '@/types/domain';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';
import { FORMAT_LABEL } from '@/world/stationText';
import type { BrujulaMessage } from './BrujulaBubble';
import { AudioFormat } from './formats/AudioFormat';
import { InfografiaFormat } from './formats/InfografiaFormat';
import { InteractivoFormat } from './formats/InteractivoFormat';
import { TextoFormat } from './formats/TextoFormat';
import { VideoFormat } from './formats/VideoFormat';
import { QuizRunner } from './QuizRunner';
import { useMastery } from './useMastery';

const ORDER: FormatKind[] = ['texto', 'audio', 'video', 'infografia', 'interactivo'];

/** Explorar: el mismo tema en el formato que el estudiante elija (DUA: representación). */
export function ExplorarStation({
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
  const available = ORDER.filter((f) => f === 'texto' || content.formats[f] !== undefined);
  const [format, setFormat] = useState<FormatKind>('texto');
  const [phase, setPhase] = useState<'explorar' | 'comprobar'>('explorar');
  const [misses, setMisses] = useState(0);
  const recordFormat = useProgress((s) => s.recordFormat);
  const { record } = useMastery(island.id);

  const choose = (next: FormatKind) => {
    setFormat(next);
    onEvents(recordFormat(next));
  };

  if (phase === 'comprobar') {
    return (
      <QuizRunner
        items={content.check}
        competency={island.competency}
        finishLabel="Completar estación"
        onBrujula={onBrujula}
        onAnswer={(item, correct) => {
          record(item.tier, correct ? 1 : 0);
          if (!correct) {
            const count = misses + 1;
            setMisses(count);
            // Dos fallos con el mismo formato: Brújula propone otra manera de verlo.
            const other = available.find((f) => f !== format);
            if (count >= 2 && other) {
              onBrujula({
                text: `¿Y si lo vemos de otra forma? Prueba el formato ${FORMAT_LABEL[other].toLowerCase()} antes de seguir.`,
                source: 'local',
              });
            }
          }
        }}
        onFinish={(correct) => {
          onComplete(correct / content.check.length);
        }}
      />
    );
  }

  return (
    <div>
      <p className="max-w-[65ch] text-lg">{content.intro}</p>
      <fieldset className="mt-6">
        <legend className="text-sm font-semibold text-ink-soft">¿Cómo quieres aprenderlo?</legend>
        <div className="mt-2 flex flex-wrap border-[1.5px] border-ink">
          {available.map((f) => (
            <label
              key={f}
              className={cx(
                'relative flex min-h-11 flex-1 cursor-pointer items-center justify-center px-4 font-display text-sm font-bold not-last:border-r-[1.5px] not-last:border-ink',
                'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-[-6px] has-[:focus-visible]:outline-(--focus)',
                format === f ? 'bg-ink text-land-sun' : 'hover:bg-plate-sunk',
              )}
            >
              <input
                type="radio"
                name="formato"
                className="sr-only"
                checked={format === f}
                onChange={() => {
                  choose(f);
                }}
              />
              {FORMAT_LABEL[f]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-6">
        {format === 'texto' && <TextoFormat content={content.formats.texto} />}
        {format === 'audio' && content.formats.audio && (
          <AudioFormat script={content.formats.audio.script} />
        )}
        {format === 'video' && content.formats.video && (
          <VideoFormat scenes={content.formats.video.scenes} />
        )}
        {format === 'infografia' && content.formats.infografia && (
          <InfografiaFormat content={content.formats.infografia} />
        )}
        {format === 'interactivo' && content.formats.interactivo && (
          <InteractivoFormat content={content.formats.interactivo} />
        )}
      </div>

      <div className="mt-8 border-t-[1.5px] border-ink pt-5">
        <Button
          size="lg"
          onClick={() => {
            onEvents(recordFormat(format));
            setPhase('comprobar');
            onBrujula(null);
          }}
        >
          Comprobar lo aprendido
        </Button>
      </div>
    </div>
  );
}
