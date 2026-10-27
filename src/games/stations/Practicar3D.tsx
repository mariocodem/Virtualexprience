import { useMemo, useState } from 'react';
import type { PracticarContent } from '@/data/contentSchemas';
import type { BrujulaMessage } from '@/stations/BrujulaBubble';
import { useMastery } from '@/stations/useMastery';
import type { Island } from '@/types/domain';
import { ISLE } from '@/world/palette';
import { DecisionCard } from '../shared/hud';
import { arcSpots, type Spot } from './plaza';
import { PlazaStage } from './PlazaStage';
import { AnswerLantern, SpotProp } from './StationSet';
import { useQuiz } from './useQuiz';

/**
 * Practicar en 3D: cada pregunta levanta sus faroles de respuesta en la plaza.
 * Se responde caminando hasta el farol y pulsando E, con las teclas 1 a 4 o
 * con un clic en la tarjeta. Mismo umbral de aprobación que la versión
 * accesible; si no se alcanza, la ronda vuelve a empezar.
 */
export default function Practicar3D({
  content,
  island,
  onBrujula,
  onComplete,
  onFail,
}: {
  content: PracticarContent;
  island: Island;
  onBrujula: (message: BrujulaMessage | null) => void;
  onComplete: (score: number) => void;
  onFail: (score: number) => void;
}) {
  const accent = ISLE[island.id];
  const { record } = useMastery(island.id);
  const [near, setNear] = useState<Spot | undefined>();
  const [correct, setCorrect] = useState(0);
  const quiz = useQuiz({
    items: content.items,
    competency: island.competency,
    onBrujula,
    onAnswer: (item, ok) => {
      record(item.tier, ok ? 1 : 0);
      if (ok) setCorrect((n) => n + 1);
    },
    onFinish: (count) => {
      const score = count / content.items.length;
      if (score >= content.passing) {
        onComplete(score);
        return;
      }
      onFail(score);
      quiz.reset();
      setCorrect(0);
    },
  });
  const item = quiz.item;
  const spots = useMemo(
    () =>
      item
        ? arcSpots(
            item.options.map((o) => o.id),
            5,
            -178,
            -108,
          )
        : [],
    [item],
  );
  const numberOf = (id: string) => (item?.options.findIndex((o) => o.id === id) ?? -1) + 1;

  return (
    <PlazaStage
      island={island}
      label={`Practicar en 3D: la plaza de ${island.name}`}
      spots={spots}
      near={near}
      onNear={setNear}
      onUse={(spot) => {
        quiz.choose(spot.id);
      }}
      hint={(spot) => `Responder con el farol ${String(numberOf(spot.id))}`}
      goal={
        <>
          <p className="toponym text-[0.625rem] text-sea-100">Practicar · {island.name}</p>
          <p className="mt-1 text-sm text-plate tabular-nums">
            Pregunta {quiz.index + 1} de {quiz.total} · {correct} aciertos
          </p>
          <p className="mt-2 text-xs text-sea-100">
            Camina hasta el farol de tu respuesta y pulsa E, o usa las teclas 1 a 4. Necesitas{' '}
            {Math.ceil(content.passing * content.items.length)} aciertos.
          </p>
        </>
      }
      side={
        item && (
          <DecisionCard
            title={`Pregunta ${String(quiz.index + 1)} de ${String(quiz.total)}`}
            item={item}
            feedback={quiz.feedback}
            onChoose={quiz.choose}
            onContinue={quiz.next}
            continueLabel={quiz.last ? 'Ver resultado' : 'Siguiente pregunta'}
          />
        )
      }
      overlay={null}
      onCloseOverlay={() => undefined}
      props={spots.map((spot) => {
        const option = item?.options.find((o) => o.id === spot.id);
        const state = !quiz.chosen
          ? 'idle'
          : option?.correct
            ? 'correct'
            : spot.id === quiz.chosen
              ? 'wrong'
              : 'idle';
        return (
          <SpotProp
            key={`${quiz.index}-${spot.id}`}
            spot={spot}
            label={`Opción ${String(numberOf(spot.id))}`}
          >
            <AnswerLantern number={numberOf(spot.id)} state={state} accent={accent} />
          </SpotProp>
        );
      })}
    />
  );
}
