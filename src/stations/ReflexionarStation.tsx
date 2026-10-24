import { useId, useState } from 'react';
import { readReflection, type ReflectionReading } from '@/ai/brujula';
import type { ReflexionarContent } from '@/data/contentSchemas';
import { useProgress } from '@/progress/store';
import type { ProgressEvent } from '@/progress/types';
import { Button } from '@/ui/Button';
import { StationSymbol } from '@/ui/StationSymbol';

/** Reflexionar: respuesta abierta que Brújula lee con una rúbrica (IA o sin conexión). */
export function ReflexionarStation({
  stationId,
  content,
  onEvents,
  onComplete,
}: {
  stationId: string;
  content: ReflexionarContent;
  onEvents: (events: ProgressEvent[]) => void;
  onComplete: (score: number) => void;
}) {
  const [text, setText] = useState('');
  const [reading, setReading] = useState<ReflectionReading | null>(null);
  const [busy, setBusy] = useState(false);
  const recordReflection = useProgress((s) => s.recordReflection);
  const fieldId = useId();
  const hintId = useId();
  const enough = text.trim().length >= content.minChars;

  const submit = async () => {
    setBusy(true);
    const result = await readReflection(text, content);
    setBusy(false);
    setReading(result);
    onEvents(recordReflection(stationId));
  };

  if (reading) {
    return (
      <div>
        <h3 className="font-display text-2xl font-extrabold">Brújula leyó tu bitácora</h3>
        <ul className="mt-4 space-y-2">
          {content.rubric.map((criterion) => {
            const met = reading.met.includes(criterion.id);
            return (
              <li key={criterion.id} className="flex items-center gap-3">
                <StationSymbol status={met ? 'completada' : 'disponible'} />
                {criterion.label}
                <span className="sr-only">{met ? ': cumplido' : ': por desarrollar'}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 max-w-[65ch]">
          <strong className="font-semibold">Lo que destaca: </strong>
          {reading.strengths}
        </p>
        <p className="mt-2 max-w-[65ch]">
          <strong className="font-semibold">Para crecer: </strong>
          {reading.suggestion}
        </p>
        <p className="mt-2 text-xs text-ink-soft">
          {reading.source === 'ia'
            ? 'Lectura con IA.'
            : 'Lectura sin conexión, por criterios de la rúbrica.'}
        </p>
        <Button
          className="mt-6"
          size="lg"
          onClick={() => {
            onComplete(Math.max(0.5, reading.score));
          }}
        >
          Guardar en la bitácora
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (enough) void submit();
      }}
    >
      <label htmlFor={fieldId} className="font-display text-2xl font-extrabold">
        {content.prompt}
      </label>
      <ul id={hintId} className="mt-3 max-w-[65ch] list-disc space-y-1 pl-5 text-ink-soft">
        {content.guidance.map((g) => (
          <li key={g}>{g}</li>
        ))}
      </ul>
      <textarea
        id={fieldId}
        aria-describedby={hintId}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
        }}
        rows={8}
        className="mt-4 w-full border-[1.5px] border-ink bg-plate p-3 text-base leading-relaxed"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft tabular-nums" aria-live="polite">
          {enough
            ? 'Listo para Brújula.'
            : `Escribe al menos ${String(content.minChars - text.trim().length)} caracteres más.`}
        </p>
        <Button type="submit" size="lg" disabled={!enough} loading={busy}>
          Entregar a Brújula
        </Button>
      </div>
    </form>
  );
}
