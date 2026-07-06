import { AgingBuckets } from '../../shared/services/cartera/cartera.models';

/**
 * Spec 014 — Finanzas MVP (CxC / Cartera). Constantes de UI del módulo.
 * El cálculo de cartera/aging vive en el SERVIDOR; aquí solo hay metadatos de
 * presentación (colores por rango, opciones de filtro, badges de estado de pago).
 */

/** Metadatos de un rango de antigüedad para renderizar segmentos y columnas. */
export interface AgingBucketMeta {
  /** Clave del rango dentro de AgingBuckets. */
  key: keyof AgingBuckets;
  /** Etiqueta completa (KPIs, leyenda). */
  label: string;
  /** Etiqueta corta (columnas de tabla, segmentos). */
  short: string;
  /** Clase CSS de color del rango (semáforo verde→rojo). */
  cssClass: string;
}

/** Los 4 rangos de aging en orden de severidad creciente. */
export const AGING_BUCKETS: AgingBucketMeta[] = [
  { key: 'corriente', label: 'Corriente (0-15 días)', short: 'Corriente', cssClass: 'cx-seg-corriente' },
  { key: 'd16_30',    label: '16-30 días',            short: '16-30 d',   cssClass: 'cx-seg-d16' },
  { key: 'd31_60',    label: '31-60 días',            short: '31-60 d',   cssClass: 'cx-seg-d31' },
  { key: 'd60',       label: '60+ días',              short: '60+ d',     cssClass: 'cx-seg-d60' },
];

/** Filtro de riesgo del tab "Cartera por Cliente". */
export type RiskFilter = 'todos' | 'vencida' | 'cupo80' | 'excede';

export const RISK_OPTIONS: { label: string; value: RiskFilter }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Con cartera vencida', value: 'vencida' },
  { label: 'Cupo > 80%', value: 'cupo80' },
  { label: 'Exceden cupo', value: 'excede' },
];

/** Metadatos de un badge de estado de pago (para el detalle de pedidos). */
export interface PagoBadgeMeta {
  label: string;
  badgeClass: string;
}

/**
 * Estados de pago que pueden aparecer en cartera (Pendiente/Pospendiente/
 * PreAprobado + legacy). Colores alineados a los tokens $badge-pago-* usados
 * en tesorería para mantener paridad visual entre pantallas.
 */
export const PAGO_BADGE_META: { [estado: string]: PagoBadgeMeta } = {
  Pendiente:      { label: 'Pendiente',    badgeClass: 'cx-badge-pendiente' },
  Pospendiente:   { label: 'Por revisar',  badgeClass: 'cx-badge-pendiente' },
  PreAprobado:    { label: 'Pre-aprobado', badgeClass: 'cx-badge-preaprobado' },
  'Pago Parcial': { label: 'Pago parcial', badgeClass: 'cx-badge-preaprobado' },
  Procesando:     { label: 'Procesando',   badgeClass: 'cx-badge-preaprobado' },
};

/** Metadatos de un estado de pago, con fallback seguro. */
export function metaPago(estado: string): PagoBadgeMeta {
  return PAGO_BADGE_META[estado] || { label: estado || '—', badgeClass: 'cx-badge-neutral' };
}
