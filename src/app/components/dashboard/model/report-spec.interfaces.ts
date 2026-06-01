/**
 * Contrato del motor de reportes Looker-style.
 * Usado tanto en frontend (builder) como en backend (validación + ejecución).
 */

export type DimensionType = 'string' | 'date' | 'number' | 'boolean';
export type MeasureAgg = 'sum' | 'avg' | 'count' | 'count_distinct' | 'min' | 'max';
export type FilterOp = 'eq' | 'neq' | 'in' | 'nin' | 'between' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'is_null' | 'not_null';
export type DateGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year';
export type VizType = 'table' | 'pivot' | 'bar' | 'line' | 'pie' | 'kpi';

export interface DimensionDef {
  id: string;
  label: string;
  type: DimensionType;
  /** Para fechas: granularidades disponibles. */
  granularities?: DateGranularity[];
  /** Para strings: si tiene cardinalidad acotada (ej. estados). */
  enumValues?: string[];
  group?: string;
}

export interface MeasureDef {
  id: string;
  label: string;
  /** Aggregations permitidas. La primera es la default. */
  aggs: MeasureAgg[];
  format?: 'number' | 'currency' | 'percent';
  group?: string;
}

export interface SourceDef {
  id: string;
  label: string;
  description: string;
  /** Si está presente, el source solo aparece para empresas con esa integración activa. */
  requiresIntegration?: string;
  /** Si está presente, indica que la source tiene un campo de vendedor — habilita el banner "Estás viendo solo tus ventas" cuando el rol del user es vendedor. */
  sellerField?: string;
  dimensions: DimensionDef[];
  measures: MeasureDef[];
}

export interface FilterClause {
  field: string;
  op: FilterOp;
  value?: unknown;
  values?: unknown[];
}

export interface DimensionRef {
  id: string;
  granularity?: DateGranularity;
}

export interface MeasureRef {
  id: string;
  agg: MeasureAgg;
  alias?: string;
}

export interface OrderClause {
  field: string;
  dir: 'asc' | 'desc';
}

/**
 * Medida calculada: fórmula aritmética que combina otras medidas del reporte.
 * El backend NO la conoce — el frontend evalúa la expresión sobre las filas
 * agregadas y agrega la columna resultado con `axis='measure'`.
 *
 * Sintaxis: `[Label (agg)] op [Label (agg)] op número`
 *   - Operadores: + - * / ( )
 *   - Refs: `[Total Pedido (sum)]` — exact match con el label de la columna agregada
 *   - Calcs pueden referenciar otros calcs SI vienen antes en el array (orden de evaluación)
 */
export interface CalculatedMeasureDef {
  id: string;
  label: string;
  expression: string;
  format?: 'number' | 'currency' | 'percent';
}

/** Cuerpo del POST /v1/reports/query */
export interface ReportSpec {
  source: string;
  rows: DimensionRef[];
  cols?: DimensionRef[];
  values: MeasureRef[];
  filters?: FilterClause[];
  orderBy?: OrderClause[];
  limit?: number;
  /**
   * Medidas calculadas — evaluadas en frontend tras recibir el result.
   * Persistidas en el SavedReport para que se restauren al reabrir.
   */
  calculated?: CalculatedMeasureDef[];
  /**
   * Periodos a comparar (request Harmony Lens punto 5: "comparativos por rango").
   * Si presente, el frontend ejecuta N queries adicionales con date filters
   * sobrescritos y merge las columnas como `<measure>_<periodLabel>`.
   * Backend opcional — implementación FE first.
   */
  comparePeriods?: Array<{ label: string; from: string; to: string }>;
}

export interface ReportColumn {
  field: string;
  label: string;
  type: 'dimension' | 'measure';
  dataType: DimensionType;
  format?: 'number' | 'currency' | 'percent';
  /**
   * Eje al que pertenece esta columna en el ReportSpec original.
   * Permite a las vizualizaciones pivotar correctamente (row → eje Y de la tabla,
   * col → headers pivotados, measure → cells). Opcional para compat con backends
   * antiguos: si falta, las vizes caen al heurístico "última dim = col".
   */
  axis?: 'row' | 'col' | 'measure';
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  meta: {
    totalRows: number;
    truncated: boolean;
    sourceUsed: string;
    durationMs: number;
  };
}

export interface SavedReport {
  id?: string;
  name: string;
  description?: string;
  source: string;
  spec: ReportSpec;
  viz: {
    /** Tipo principal seleccionado (la visualización activa por defecto). */
    type: VizType;
    /** Multi-selección de visualizaciones activas (bar + line + table, etc.). */
    activeTypes?: VizType[];
    options?: Record<string, unknown>;
  };
  /** Rango de fechas usado en el filtro global cuando se guardó el reporte. */
  dateFrom?: string;
  dateTo?: string;
  ownerEmail: string;
  ownerCompany: string;
  /** Si true, todos los usuarios de la empresa pueden ver el reporte. */
  isPublic?: boolean;
  /** Emails de usuarios específicos con acceso (además del owner). */
  visibleToUsers?: string[];
  /** Roles con acceso (además del owner). */
  visibleToRoles?: string[];
  createdAt?: string;
  updatedAt?: string;
}
