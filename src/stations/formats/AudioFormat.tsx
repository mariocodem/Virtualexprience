import { useEffect, useRef, useState } from 'react';
import { Button } from '@/ui/Button';
import { cx } from '@/ui/cx';

/**
 * Audio narrado con la voz del sistema (Web Speech API) y subtitulado línea a
 * línea. Sin voz disponible, el guion completo queda como transcripción.
 */
export function AudioFormat({ script }: { script: string[] }) {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [line, setLine] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const cancelled = useRef(false);

  useEffect(
    () => () => {
      cancelled.current = true;
      if (supported) window.speechSynthesis.cancel();
    },
    [supported],
  );

  const speakFrom = (start: number) => {
    if (!supported) return;
    cancelled.current = false;
    window.speechSynthesis.cancel();
    const say = (i: number) => {
      const text = script[i];
      if (cancelled.current || text === undefined) {
        setPlaying(false);
        if (text === undefined) setLine(-1);
        return;
      }
      setLine(i);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-CO';
      utterance.rate = 0.98;
      utterance.onend = () => {
        say(i + 1);
      };
      window.speechSynthesis.speak(utterance);
    };
    setPlaying(true);
    say(start);
  };

  const stop = () => {
    cancelled.current = true;
    window.speechSynthesis.cancel();
    setPlaying(false);
  };

  return (
    <div>
      {supported ? (
        <div className="flex flex-wrap items-center gap-3">
          {playing ? (
            <Button onClick={stop}>Pausar narración</Button>
          ) : (
            <Button
              onClick={() => {
                speakFrom(line < 0 ? 0 : line);
              }}
            >
              {line < 0 ? 'Escuchar' : 'Continuar'}
            </Button>
          )}
          {line >= 0 && (
            <Button
              variant="quiet"
              onClick={() => {
                speakFrom(0);
              }}
            >
              Desde el principio
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-soft">
          Este navegador no tiene voz sintetizada; aquí está la transcripción completa.
        </p>
      )}
      <ol aria-label="Transcripción" className="mt-5 space-y-2">
        {script.map((text, i) => (
          <li
            key={text}
            aria-current={i === line ? 'true' : undefined}
            className={cx(
              'max-w-[65ch] px-3 py-1.5 leading-relaxed transition-colors duration-(--dur-base)',
              i === line ? 'bg-land-sun/35 font-semibold' : 'text-ink-soft',
            )}
          >
            {text}
          </li>
        ))}
      </ol>
    </div>
  );
}
