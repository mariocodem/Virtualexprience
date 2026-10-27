import { useState } from 'react';
import { aiFeedback, localFeedback } from '@/ai/brujula';
import type { QuizItem } from '@/data/contentSchemas';
import type { BrujulaMessage } from '@/stations/BrujulaBubble';
import type { DecisionFeedback } from '../shared/hud';

/**
 * Preguntas una a una, como `QuizRunner` pero para decidir dentro de la escena:
 * misma retroalimentación local, misma ampliación de Brújula con IA y el mismo
 * conteo de aciertos al final.
 */
export function useQuiz({
  items,
  competency,
  onBrujula,
  onAnswer,
  onFinish,
}: {
  items: QuizItem[];
  competency: string;
  onBrujula: (message: BrujulaMessage | null) => void;
  onAnswer: (item: QuizItem, correct: boolean) => void;
  onFinish: (correctCount: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const item = items[index];
  const option = item?.options.find((o) => o.id === chosen);
  const feedback: DecisionFeedback | null = option
    ? { correct: option.correct, text: option.feedback }
    : null;

  const choose = (optionId: string) => {
    if (!item || chosen) return;
    const picked = item.options.find((o) => o.id === optionId);
    if (!picked) return;
    setChosen(optionId);
    if (picked.correct) setCorrectCount((n) => n + 1);
    onAnswer(item, picked.correct);
    onBrujula({ text: localFeedback(item, optionId).tip, source: 'local' });
    void aiFeedback(item, optionId, competency).then((output) => {
      if (output)
        onBrujula({ text: [output.feedback, output.tip].filter(Boolean).join(' '), source: 'ia' });
    });
  };

  const next = () => {
    if (!chosen) return;
    if (index >= items.length - 1) {
      onFinish(correctCount);
      return;
    }
    setIndex((i) => i + 1);
    setChosen(null);
    onBrujula(null);
  };

  const reset = () => {
    setIndex(0);
    setChosen(null);
    setCorrectCount(0);
  };

  return {
    item,
    index,
    total: items.length,
    chosen,
    feedback,
    last: index >= items.length - 1,
    choose,
    next,
    reset,
  };
}
