import { useState } from 'react';
import type { PracticarContent } from '@/data/contentSchemas';
import type { Island } from '@/types/domain';
import type { BrujulaMessage } from './BrujulaBubble';
import { QuizRunner } from './QuizRunner';
import { useMastery } from './useMastery';

/** Practicar: micro-ejercicios con retroalimentación inmediata. */
export function PracticarStation({
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
  const { record } = useMastery(island.id);
  const [round, setRound] = useState(0);
  return (
    <div>
      <p className="mb-6 max-w-[65ch] text-lg">{content.intro}</p>
      <QuizRunner
        key={round}
        items={content.items}
        competency={island.competency}
        finishLabel="Ver resultado"
        onBrujula={onBrujula}
        onAnswer={(item, correct) => {
          record(item.tier, correct ? 1 : 0);
        }}
        onFinish={(correct) => {
          const score = correct / content.items.length;
          if (score >= content.passing) onComplete(score);
          else {
            onFail(score);
            setRound((r) => r + 1);
          }
        }}
      />
    </div>
  );
}
