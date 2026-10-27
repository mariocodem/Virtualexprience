/** Formato de dinero y etiquetas de efectos del reto 3D. */
export const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
export const signed = (value: number) =>
  `${value >= 0 ? '+' : '−'}${money.format(Math.abs(value))}`;

export const EFFECT_LABELS = {
  caja: 'Caja (miles de pesos)',
  reputacion: 'Reputación',
  equipo: 'Ánimo del equipo',
};
