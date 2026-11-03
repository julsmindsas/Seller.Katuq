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

/**
 * Los 6 rangos de antigüedad en orden de severidad creciente (ticket 1460).
 * Son los mismos del servidor: tarjetas, barra del cliente, pestaña Aging,
 * filtro, Excel y PDF usan esta única lista.
 */
export const AGING_BUCKETS: AgingBucketMeta[] = [
  { key: 'sin_vencer', label: 'Sin vencer',   short: 'Sin vencer', cssClass: 'cx-seg-sin' },
  { key: 'd1_15',      label: '1-15 días',    short: '1-15 d',     cssClass: 'cx-seg-d1' },
  { key: 'd16_30',     label: '16-30 días',   short: '16-30 d',    cssClass: 'cx-seg-d16' },
  { key: 'd31_60',     label: '31-60 días',   short: '31-60 d',    cssClass: 'cx-seg-d31' },
  { key: 'd61_90',     label: '61-90 días',   short: '61-90 d',    cssClass: 'cx-seg-d61' },
  { key: 'd90',        label: 'Más de 90 días', short: '+90 d',    cssClass: 'cx-seg-d90' },
];

/** Filtro de riesgo del tab "Cartera por Cliente". */
export type RiskFilter = 'todos' | 'vencida' | 'cupo80' | 'excede' | 'contado' | 'credito';

export const RISK_OPTIONS: { label: string; value: RiskFilter }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Con cartera vencida', value: 'vencida' },
  { label: 'Cupo > 80%', value: 'cupo80' },
  { label: 'Exceden cupo', value: 'excede' },
  { label: 'Contado', value: 'contado' },
  { label: 'Crédito', value: 'credito' },
];

/**
 * Ticket 1502: el cliente es de crédito si tiene cupo asignado (mayor a 0);
 * con cupo en 0 o sin cupo configurado es de contado.
 */
export function esClienteCredito(creditLimit: number | null | undefined): boolean {
  return (Number(creditLimit) || 0) > 0;
}

/**
 * Filtro de antigüedad por PEDIDO (tickets 1130 y 1460). Usa las mismas claves
 * que los rangos del servidor (AgingBuckets).
 */
export type RangoAntiguedad = keyof AgingBuckets;
export type AntiguedadFiltro = 'todas' | RangoAntiguedad;

export const ANTIGUEDAD_OPTIONS: { label: string; value: AntiguedadFiltro }[] = [
  { label: 'Todas', value: 'todas' },
  { label: 'Sin vencer', value: 'sin_vencer' },
  { label: '1 a 15 días vencido', value: 'd1_15' },
  { label: '16 a 30 días vencido', value: 'd16_30' },
  { label: '31 a 60 días vencido', value: 'd31_60' },
  { label: '61 a 90 días vencido', value: 'd61_90' },
  { label: 'Más de 90 días vencido', value: 'd90' },
];

/** Nombre del rango para la descarga (Excel y PDF). */
export const RANGO_ANTIGUEDAD_LABEL: { [rango in RangoAntiguedad]: string } = {
  sin_vencer: 'Sin vencer',
  d1_15: '1 a 15 días vencido',
  d16_30: '16 a 30 días vencido',
  d31_60: '31 a 60 días vencido',
  d61_90: '61 a 90 días vencido',
  d90: 'Más de 90 días vencido',
};

/** Rango de un pedido según sus días vencidos (0 o negativo = aún no vence). Igual al del servidor. */
export function rangoAntiguedad(diasVencido: number): RangoAntiguedad {
  const dias = Number(diasVencido) || 0;
  if (dias <= 0) return 'sin_vencer';
  if (dias <= 15) return 'd1_15';
  if (dias <= 30) return 'd16_30';
  if (dias <= 60) return 'd31_60';
  if (dias <= 90) return 'd61_90';
  return 'd90';
}

/** Orden de la lista de clientes (ticket 1130). */
export type OrdenCartera = 'saldo' | 'vencido' | 'nombre';

export const ORDEN_OPTIONS: { label: string; value: OrdenCartera }[] = [
  { label: 'Mayor saldo primero', value: 'saldo' },
  { label: 'Más días vencido primero', value: 'vencido' },
  { label: 'Nombre (A-Z)', value: 'nombre' },
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
