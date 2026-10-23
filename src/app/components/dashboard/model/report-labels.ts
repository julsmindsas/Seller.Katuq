import { DateGranularity, MeasureAgg, VizType } from './report-spec.interfaces';
import { findSource } from './source-catalog';

/**
 * Nombres en español solo para mostrar (ticket 1347). Los valores que se guardan
 * en el reporte ('sum', 'month', 'bar'…) no cambian: las fórmulas y los reportes
 * guardados siguen leyendo las claves originales.
 */
export const VIZ_LABELS: Record<VizType | 'donut', string> = {
  table: 'Tabla',
  pivot: 'Tabla dinámica',
  bar: 'Barras',
  line: 'Líneas',
  pie: 'Torta',
  donut: 'Dona',
  kpi: 'Indicador',
};

export const AGG_LABELS: Record<MeasureAgg, string> = {
  sum: 'Suma',
  avg: 'Promedio',
  count: 'Conteo',
  count_distinct: 'Conteo sin repetir',
  min: 'Mínimo',
  max: 'Máximo',
};

export const GRANULARITY_LABELS: Record<DateGranularity, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
  quarter: 'Trimestre',
  year: 'Año',
};

export function vizLabel(type?: string | null): string {
  if (!type) return VIZ_LABELS.table;
  return VIZ_LABELS[type as VizType | 'donut'] || type;
}

export function aggLabel(agg: string): string {
  return AGG_LABELS[agg as MeasureAgg] || agg;
}

export function granularityLabel(granularity: string): string {
  return GRANULARITY_LABELS[granularity as DateGranularity] || granularity;
}

export function sourceLabel(sourceId?: string | null): string {
  if (!sourceId) return '';
  return findSource(sourceId)?.label || sourceId;
}
