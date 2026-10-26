import type { BossContent, CabildoContent, DeliberativeMove } from '@/data/contentSchemas';
import { MOVE_LABEL } from '../cabildo/session';

/**
 * Las voces de la plaza: lo que dice quien alza la voz y cómo se le puede
 * responder. Salen de las rondas del cabildo (la misma deliberación del reto)
 * y de los embates de la Bruma (preguntas de ciudadanía con su sutileza).
 */

export type Quality = 0 | 0.5 | 1;
export type Source = 'cabildo' | 'bruma';

export interface VoiceOption {
  id: string;
  text: string;
  quality: Quality;
  /** Tipo de intervención, en las voces del cabildo. */
  move: DeliberativeMove | null;
  feedback: string;
  /** Lo que Brújula enseña tras elegirla. */
  lesson: string;
}

export interface Voice {
  /** Único en el conjunto: «cabildo:sustento», «bruma:voz-3». */
  key: string;
  /** Id del ítem en su contenido (para el dominio). */
  itemId: string;
  source: Source;
  tier: 1 | 2 | 3;
  /** Grupo del cabildo que habla (id), o nulo si puede preguntar cualquier vecino. */
  group: string | null;
  /** «intervencion»: alguien plantea su postura; «pregunta»: alguien pide ayuda para pensar. */
  kind: 'intervencion' | 'pregunta';
  prompt: string;
  context?: string;
  options: VoiceOption[];
}

/** Todas las voces posibles: rondas del cabildo (si hay) y embates de la Bruma. */
export function voicesFrom(boss: BossContent, cabildo: CabildoContent | null): Voice[] {
  const fromCabildo: Voice[] = (cabildo?.rounds ?? []).map((round) => ({
    key: `cabildo:${round.id}`,
    itemId: round.id,
    source: 'cabildo',
    tier: round.tier,
    group: round.speaker,
    kind: 'intervencion',
    prompt: round.statement,
    options: round.options.map((o) => ({
      id: o.id,
      text: o.text,
      quality: o.quality,
      move: o.move,
      feedback: o.feedback,
      lesson: `${MOVE_LABEL[o.move]}. ${cabildo?.tips[o.move] ?? ''}`.trim(),
    })),
  }));
  const fromBruma: Voice[] = boss.items.map((item) => ({
    key: `bruma:${item.id}`,
    itemId: item.id,
    source: 'bruma',
    tier: item.tier,
    group: null,
    kind: 'pregunta',
    prompt: item.prompt,
    ...(item.context ? { context: item.context } : {}),
    options: item.options.map((o) => ({
      id: o.id,
      text: o.text,
      quality: o.correct ? 1 : 0,
      move: null,
      feedback: o.feedback,
      lesson: item.explanation,
    })),
  }));
  return [...fromCabildo, ...fromBruma];
}

/**
 * La siguiente voz: de la sutileza de la fase (o la más cercana), sin repetir
 * mientras queden, y alternando entre el cabildo y la Bruma cuando se puede.
 */
export function pickVoice(
  pool: readonly Voice[],
  tier: 1 | 2 | 3,
  used: readonly string[],
  last: Source | null,
  random: () => number,
): Voice {
  const fresh = pool.filter((v) => !used.includes(v.key));
  const base = fresh.length > 0 ? fresh : pool;
  const exact = base.filter((v) => v.tier === tier);
  const near = base.filter((v) => Math.abs(v.tier - tier) === 1);
  let candidates = exact.length > 0 ? exact : near.length > 0 ? near : base;
  const other = candidates.filter((v) => v.source !== last);
  if (last && other.length > 0) candidates = other;
  const choice = candidates[Math.floor(random() * candidates.length)] ?? candidates[0];
  if (!choice) throw new Error('La plaza no tiene voces.');
  return choice;
}

/** Qué pasa con quien alzó la voz: enciende su farol, se calma a medias o se apaga. */
export type Reply = 'enciende' | 'a-medias' | 'apaga';

export interface Judgement {
  option: VoiceOption;
  reply: Reply;
  /** Solo la intervención sólida cuenta como acierto (y carga la linterna). */
  correct: boolean;
}

export function judge(voice: Voice, optionId: string): Judgement | null {
  const option = voice.options.find((o) => o.id === optionId);
  if (!option) return null;
  const reply: Reply =
    option.quality === 1 ? 'enciende' : option.quality === 0 ? 'apaga' : 'a-medias';
  return { option, reply, correct: reply === 'enciende' };
}

export const QUALITY_TEXT: Record<Quality, string> = {
  1: 'Intervención sólida',
  0.5: 'Intervención aceptable',
  0: 'Intervención contraproducente',
};
