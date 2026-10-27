import { pickItem, type Random } from '@/boss/engine';
import type { MercadoContent, QuizItem } from '@/data/contentSchemas';
import { bestOrder, type MarketDay } from '@/minigames/dia-de-mercado/engine';

/**
 * Decisiones con datos del contramaestre. Salen de dos fuentes: los embates
 * de la Bruma de la isla y las jornadas del mercado (cuántas empanadas pedir
 * y qué hacer ante el dilema del equipo), que son las mismas del reto.
 */

const list = (day: MarketDay) => day.data.map((row) => `${row.label}: ${row.value}`).join(' · ');

/** «¿Cuántas encargas?» con los datos de la jornada: acierta el pedido más cercano a la demanda. */
export function orderDecision(day: MarketDay, unit: string): QuizItem {
  const best = bestOrder(day);
  return {
    id: `pedido-${day.id}`,
    tier: day.tier,
    prompt: `${day.title}: ¿cuántas ${unit} encargas a la cocina?`,
    context: list(day),
    options: day.orders.map((order) => ({
      id: `o-${String(order)}`,
      text: `${String(order)} ${unit}`,
      correct: order === best,
      feedback:
        order === best ? day.reasoning : `Los datos pedían ${String(best)}. ${day.reasoning}`,
    })),
    explanation: day.reasoning,
  };
}

/** El dilema del día, solo si tiene una única salida sólida (la que cuida al negocio y a las personas). */
export function dilemmaDecision(day: MarketDay): QuizItem | null {
  const solid = day.dilemma.options.filter((o) => o.quality === 1);
  if (solid.length !== 1) return null;
  return {
    id: `dilema-${day.id}`,
    tier: day.tier,
    prompt: day.dilemma.prompt,
    options: day.dilemma.options.map((o) => ({
      id: o.id,
      text: o.text,
      correct: o.quality === 1,
      feedback: o.feedback,
    })),
    explanation: solid[0]?.feedback ?? day.reasoning,
  };
}

/** Todas las decisiones con datos del mercado. */
export function marketDecisions(content: MercadoContent): QuizItem[] {
  return content.days.flatMap((day) => {
    const dilemma = dilemmaDecision(day);
    return [orderDecision(day, content.product.unit), ...(dilemma ? [dilemma] : [])];
  });
}

/**
 * Siguiente parte del contramaestre: de la sutileza de la fase, sin repetir.
 * Alterna entre los embates de la Bruma y los datos del mercado; si una
 * fuente se agota, sigue con la otra.
 */
export function pickDecision(
  own: QuizItem[],
  market: QuizItem[],
  tier: 1 | 2 | 3,
  used: readonly string[],
  random: Random,
): QuizItem {
  const fresh = (items: QuizItem[]) => items.filter((i) => !used.includes(i.id));
  const preferMarket = used.length % 2 === 1;
  const first = preferMarket ? market : own;
  const second = preferMarket ? own : market;
  const source =
    fresh(first).length > 0 ? first : fresh(second).length > 0 ? second : [...own, ...market];
  return pickItem(source, tier, used, random);
}
