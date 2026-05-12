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

/** Cuerpo del POST /v1/reports/query */
export interface ReportSpec {
  source: string;
  rows: DimensionRef[];
  cols?: DimensionRef[];
  values: MeasureRef[];
  filters?: FilterClause[];
  orderBy?: OrderClause[];
  limit?: number;
}

export interface ReportColumn {
  field: string;
  label: string;
  type: 'dimension' | 'measure';
  dataType: DimensionType;
  format?: 'number' | 'currency' | 'percent';
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
