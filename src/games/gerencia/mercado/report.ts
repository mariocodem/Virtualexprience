import type { MercadoContent } from '@/data/contentSchemas';
import type { DayResult, MarketReport, MarketState } from '@/minigames/dia-de-mercado/engine';

/**
 * Textos de cierre del reto 3D. Dicen lo mismo que la versión accesible
 * (mismas métricas del motor), solo que aquí viven en un módulo puro y
 * probado en lugar de dentro del componente.
 */

/** Consejo de Brújula tras cerrar una jornada. */
export function closingTip(result: DayResult, team: number): string {
  if (team < 40)
    return 'Tu equipo está agotado y atiende a menos clientes. Cuidar el ánimo también es cuidar las ventas.';
  if (result.order === result.best)
    return 'Tu pedido respondió a los datos: vendiste sin desperdiciar.';
  if (result.order > result.best)
    return 'Pediste por encima de lo que decían los datos: cada empanada sobrante es caja perdida.';
  return 'Te quedaste corto: hubo clientes que se fueron sin comprar. Revisa qué dato anticipaba más demanda.';
}

/** Lectura de la temporada para el informe: texto de Brújula y hechos que se le pasan a la IA. */
export function seasonReading(
  state: MarketState,
  result: MarketReport,
  content: MercadoContent,
  money: (value: number) => string,
): { text: string; highlights: string[] } {
  const days = state.ledger.length;
  const solid = state.ledger.filter((d) => d.quality === 1).length;
  const parts: string[] = [];
  parts.push(
    result.accuracy >= 0.75
      ? 'Tus pedidos siguieron los datos: así se gestiona con información y no con corazonadas.'
      : 'Varios pedidos se alejaron de lo que decían los datos. Antes de decidir, combina todas las cifras de la jornada.',
  );
  if (result.waste > 40)
    parts.push(
      `Se perdieron ${String(result.waste)} ${content.product.unit}: el sobrante es dinero que no vuelve.`,
    );
  parts.push(
    result.criteria >= 0.75
      ? 'En los dilemas cuidaste a tu equipo y a tus clientes: eso es liderar con propósito.'
      : 'En los dilemas, busca la salida que cuide a la vez el negocio, las personas y la confianza.',
  );
  return {
    text: parts.join(' '),
    highlights: [
      `Jornadas con el pedido que mejor respondía a los datos: ${String(result.toolsUsed)} de ${String(days)}.`,
      `Decisiones de gestión sólidas: ${String(solid)} de ${String(days)}.`,
      `Ganancia promedio por jornada: ${money(result.averageProfit)}; meta: ${money(content.goal)}.`,
      `Unidades perdidas por sobrantes: ${String(result.waste)}.`,
      `Ánimo final del equipo: ${String(Math.round(state.team))} de 100. Reputación final: ${String(Math.round(state.reputation))} de 100.`,
    ],
  };
}
