/**
 * Cómo la Bruma proyecta un hueco: como medida directa, fracción, porcentaje,
 * escala de plano o ecuación, según la sutileza de la fase. Siempre vale lo
 * mismo que `gap` metros: hay que calcularlo para saber cuánto mide. Puro.
 */

export type Random = () => number;
export type GapKind = 'metros' | 'fraccion' | 'porcentaje' | 'escala' | 'ecuacion';

export interface GapExpression {
  kind: GapKind;
  /** Lo que se lee en el hueco: «¾ de 16 m». */
  text: string;
  /** El valor ya calculado, para el ritmo tranquilo: «12 m». */
  meters: string;
}

const TOLERANCE = 1e-9;

/** ¿Es `n` un número con a lo más `digits` decimales? */
export function isRound(n: number, digits = 1): boolean {
  const k = 10 ** digits;
  return Math.abs(n * k - Math.round(n * k)) < TOLERANCE * k;
}

/** Número a la colombiana: coma decimal y sin ceros sobrantes. */
export function formatNumber(n: number): string {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

const FRACTIONS: readonly (readonly [number, number, string])[] = [
  [1, 2, '½'],
  [1, 3, '⅓'],
  [2, 3, '⅔'],
  [1, 4, '¼'],
  [3, 4, '¾'],
  [3, 5, '⅗'],
  [5, 8, '⅝'],
  [7, 8, '⅞'],
  [2, 5, '⅖'],
  [3, 8, '⅜'],
];
const PERCENTS = [10, 20, 25, 40, 50, 60, 75, 80, 120, 150] as const;
const SCALES = [100, 200, 250, 500] as const;

const pick = <T>(list: readonly T[], random: Random): T | undefined =>
  list[Math.floor(random() * list.length)];

function fractionOf(gap: number, random: Random): string | null {
  const options = FRACTIONS.flatMap(([num, den, glyph]) => {
    const whole = (gap * den) / num;
    return isRound(whole) && whole >= 2 && whole <= 80
      ? [`${glyph} de ${formatNumber(whole)} m`]
      : [];
  });
  return pick(options, random) ?? null;
}

function percentOf(gap: number, random: Random): string | null {
  const options = PERCENTS.flatMap((p) => {
    const whole = (gap * 100) / p;
    return isRound(whole) && whole >= 2 && whole <= 200
      ? [`${String(p)} % de ${formatNumber(whole)} m`]
      : [];
  });
  return pick(options, random) ?? null;
}

function scaleOf(gap: number, random: Random): string | null {
  const options = SCALES.flatMap((s) => {
    const cm = (gap * 100) / s;
    return isRound(cm) && cm >= 1 ? [`${formatNumber(cm)} cm en un plano 1:${String(s)}`] : [];
  });
  return pick(options, random) ?? null;
}

function equationOf(gap: number, random: Random): string | null {
  const options = [2, 3, 4, 5].flatMap((a) =>
    [1, 2, 3, 5].flatMap((b) => {
      const total = a * gap + b;
      return isRound(total)
        ? [`${String(a)}x + ${String(b)} = ${formatNumber(total)}, con x en metros`]
        : [];
    }),
  );
  return pick(options, random) ?? null;
}

/**
 * Expresión del hueco para una fase: tier 1 casi directo o fracción, tier 2
 * porcentaje o escala, tier 3 también ecuaciones. Si la medida no admite la
 * forma elegida, cae a otra y, en último caso, a metros.
 */
export function gapExpression(gap: number, tier: 1 | 2 | 3, random: Random): GapExpression {
  const meters = `${formatNumber(gap)} m`;
  const order: Record<1 | 2 | 3, GapKind[]> = {
    1: random() < 0.4 ? ['metros', 'fraccion'] : ['fraccion', 'metros'],
    2: random() < 0.5 ? ['porcentaje', 'escala', 'fraccion'] : ['escala', 'porcentaje', 'fraccion'],
    3: random() < 0.5 ? ['ecuacion', 'porcentaje', 'escala'] : ['escala', 'ecuacion', 'porcentaje'],
  };
  for (const kind of order[tier]) {
    const text =
      kind === 'metros'
        ? meters
        : kind === 'fraccion'
          ? fractionOf(gap, random)
          : kind === 'porcentaje'
            ? percentOf(gap, random)
            : kind === 'escala'
              ? scaleOf(gap, random)
              : equationOf(gap, random);
    if (text) return { kind, text, meters };
  }
  return { kind: 'metros', text: meters, meters };
}
