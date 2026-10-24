import type { BossContent, QuizItem, ReflexionarContent } from '@/data/contentSchemas';
import { askAi } from './llmClient';

/**
 * Brújula y la voz de la Bruma. Cada función tiene una versión local inmediata
 * (plantillas y rúbrica, sin red) y otra que pide al modelo una versión más
 * rica; si el modelo no responde, queda la local.
 */

export type Moment = 'intro' | 'acierto' | 'fallo' | 'fase' | 'victoria' | 'retirada';

export function pick<T>(list: readonly T[], random: () => number = Math.random): T {
  const value = list[Math.floor(random() * list.length)] ?? list[0];
  if (value === undefined) throw new Error('Lista vacía.');
  return value;
}

/** Línea local de la Bruma según el momento de la batalla. */
export function brumaLocalLine(
  bruma: BossContent['bruma'],
  moment: Moment,
  phase: 1 | 2 | 3,
  random?: () => number,
): string {
  switch (moment) {
    case 'intro':
      return bruma.intro;
    case 'victoria':
      return bruma.defeat;
    case 'retirada':
      return bruma.victory;
    case 'acierto':
      return pick(bruma.taunts.hit, random);
    case 'fallo':
      return pick(bruma.taunts.miss, random);
    case 'fase':
      return pick(
        phase === 1 ? bruma.taunts.phase1 : phase === 2 ? bruma.taunts.phase2 : bruma.taunts.phase3,
        random,
      );
  }
}

export async function brumaAiLine(params: {
  island: string;
  bruma: BossContent['bruma'];
  level: number;
  phase: 1 | 2 | 3;
  moment: Moment;
  streak: number;
}): Promise<string | null> {
  const output = await askAi({
    task: 'bruma-linea',
    island: params.island,
    name: params.bruma.name,
    nature: params.bruma.nature,
    level: params.level,
    phase: params.phase,
    moment: params.moment,
    streak: Math.max(-20, Math.min(20, params.streak)),
  });
  return output?.line ?? null;
}

/** Retroalimentación local: la de la opción elegida y la explicación del ítem. */
export function localFeedback(
  item: QuizItem,
  optionId: string | null,
): { feedback: string; tip: string } {
  const option = item.options.find((o) => o.id === optionId);
  return {
    feedback: option?.feedback ?? 'Se agotó el tiempo antes de decidir.',
    tip: item.explanation,
  };
}

export async function aiFeedback(item: QuizItem, optionId: string | null, competency: string) {
  const option = item.options.find((o) => o.id === optionId);
  const right = item.options.find((o) => o.correct);
  if (!right) return null;
  return askAi({
    task: 'brujula-retro',
    competency,
    prompt: item.prompt,
    ...(item.context ? { context: item.context } : {}),
    chosen: option?.text ?? 'No respondió a tiempo',
    correct: Boolean(option?.correct),
    correctText: right.text,
    explanation: item.explanation,
  });
}

export interface ReflectionReading {
  score: number;
  met: string[];
  strengths: string;
  suggestion: string;
  source: 'ia' | 'local';
}

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Lectura local por rúbrica: cada criterio se cumple si aparece alguna de sus señales. */
export function localReflection(answer: string, content: ReflexionarContent): ReflectionReading {
  const text = normalize(answer);
  const met = content.rubric
    .filter((criterion) => criterion.keywords.some((k) => text.includes(normalize(k))))
    .map((criterion) => criterion.id);
  const lengthOk = answer.trim().length >= content.minChars;
  const ratio = met.length / content.rubric.length;
  const score = Math.min(1, lengthOk ? ratio : ratio * 0.6);
  const metLabels = content.rubric
    .filter((r) => met.includes(r.id))
    .map((r) => r.label.toLowerCase());
  const missing = content.rubric.find((r) => !met.includes(r.id));
  return {
    score,
    met,
    strengths:
      metLabels.length > 0
        ? `Tu bitácora muestra: ${metLabels.join('; ')}.`
        : 'Ya diste el primer paso: escribir sobre tu propia decisión.',
    suggestion: missing
      ? `Para la próxima, agrega: ${missing.label.toLowerCase()}.`
      : lengthOk
        ? 'Tu reflexión cubre todos los criterios. ¡Buen trabajo de editor!'
        : 'Desarrolla un poco más tus ideas con un ejemplo concreto.',
    source: 'local',
  };
}

export async function readReflection(
  answer: string,
  content: ReflexionarContent,
): Promise<ReflectionReading> {
  const output = await askAi(
    {
      task: 'reflexion',
      prompt: content.prompt,
      answer: answer.slice(0, 2500),
      rubric: content.rubric.map(({ id, label }) => ({ id, label })),
    },
    9000,
  );
  if (!output) return localReflection(answer, content);
  const valid = new Set(content.rubric.map((r) => r.id));
  return { ...output, met: output.met.filter((id) => valid.has(id)), source: 'ia' };
}

/** Informe de cierre de un minijuego: Brújula comenta la partida si hay IA en línea. */
export async function aiReport(params: {
  competency: string;
  game: string;
  score: number;
  highlights: string[];
}): Promise<string | null> {
  const output = await askAi(
    {
      task: 'informe-reto',
      competency: params.competency,
      game: params.game,
      score: Math.min(1, Math.max(0, params.score)),
      highlights: params.highlights.slice(0, 6).map((h) => h.slice(0, 200)),
    },
    9000,
  );
  return output ? [output.feedback, output.tip].filter(Boolean).join(' ') : null;
}
