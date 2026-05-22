import { ReportSpec, VizType } from '../model/report-spec.interfaces';

/**
 * Plantillas pre-armadas de reportes — Harmony Lens 2026-05-21 (punto 6 del documento).
 *
 * Cada preset define una `spec` directamente compatible con el builder + el viz
 * sugerido. El usuario hace click en el preset y el builder se llena con esa
 * configuración (sin guardar nada hasta que el usuario lo decida).
 *
 * Los presets de productos requieren la integración World Office activa
 * (los sources `accounting_document_lines`, `accounting_documents` lo exigen
 * vía `requiresIntegration: 'worldoffice'`).
 */
export interface ReportPreset {
  id: string;
  name: string;
  description: string;
  category: 'productos' | 'ventas' | 'cartera' | 'inventario';
  icon: string;
  spec: ReportSpec;
  viz: { type: VizType; activeTypes?: VizType[] };
  requiresIntegration?: string;
}

export const REPORT_PRESETS: ReportPreset[] = [
  // ── PRODUCTOS ─────────────────────────────────────────────────────────────
  {
    id: 'top20-productos-unidades',
    name: 'Top 20 productos por unidades vendidas',
    description: 'Concepto (producto) con sum de cantidad. Requiere persistLines=true en sync WO.',
    category: 'productos',
    icon: 'fa-trophy',
    requiresIntegration: 'worldoffice',
    spec: {
      source: 'accounting_document_lines',
      rows: [{ id: 'concepto' }],
      cols: [],
      values: [{ id: 'cantidad', agg: 'sum' }],
      filters: [{ field: 'doc_code', op: 'eq', value: 'FV' }],
      orderBy: [{ field: 'cantidad', dir: 'desc' }],
      limit: 20,
    },
    viz: { type: 'bar', activeTypes: ['bar', 'table'] },
  },
  {
    id: 'top20-productos-ingreso',
    name: 'Top 20 productos por ingreso',
    description: 'Concepto con sum de valor total renglón. Solo facturas de venta (FV).',
    category: 'productos',
    icon: 'fa-coins',
    requiresIntegration: 'worldoffice',
    spec: {
      source: 'accounting_document_lines',
      rows: [{ id: 'concepto' }],
      cols: [],
      values: [{ id: 'valor_total', agg: 'sum' }],
      filters: [{ field: 'doc_code', op: 'eq', value: 'FV' }],
      orderBy: [{ field: 'valor_total', dir: 'desc' }],
      limit: 20,
    },
    viz: { type: 'bar', activeTypes: ['bar', 'table'] },
  },
  {
    id: 'tendencia-mensual-productos',
    name: 'Tendencia mensual de ventas (productos)',
    description: 'Cantidad y valor por mes, agrupable por producto.',
    category: 'productos',
    icon: 'fa-chart-line',
    requiresIntegration: 'worldoffice',
    spec: {
      source: 'accounting_document_lines',
      rows: [{ id: 'doc_fecha', granularity: 'month' }],
      cols: [],
      values: [
        { id: 'cantidad', agg: 'sum' },
        { id: 'valor_total', agg: 'sum' },
      ],
      filters: [{ field: 'doc_code', op: 'eq', value: 'FV' }],
      orderBy: [{ field: 'doc_fecha', dir: 'asc' }],
      limit: 24,
    },
    viz: { type: 'line', activeTypes: ['line', 'table'] },
  },
  {
    id: 'descuento-por-producto',
    name: 'Descuento aplicado por producto',
    description: 'Concepto con sum descuento — útil para revisar política de precios.',
    category: 'productos',
    icon: 'fa-tags',
    requiresIntegration: 'worldoffice',
    spec: {
      source: 'accounting_document_lines',
      rows: [{ id: 'concepto' }],
      cols: [],
      values: [
        { id: 'valor_descuento', agg: 'sum' },
        { id: 'cantidad', agg: 'sum' },
      ],
      filters: [
        { field: 'doc_code', op: 'eq', value: 'FV' },
        { field: 'valor_descuento', op: 'gt', value: 0 },
      ],
      orderBy: [{ field: 'valor_descuento', dir: 'desc' }],
      limit: 30,
    },
    viz: { type: 'table', activeTypes: ['table'] },
  },
  {
    id: 'ventas-producto-x-tercero',
    name: 'Productos × Cliente (pivot)',
    description: 'Concepto en filas, cliente en columnas, sum cantidad como valor.',
    category: 'productos',
    icon: 'fa-table-cells',
    requiresIntegration: 'worldoffice',
    spec: {
      source: 'accounting_document_lines',
      rows: [{ id: 'concepto' }],
      cols: [{ id: 'tercero_nombre' }],
      values: [{ id: 'cantidad', agg: 'sum' }],
      filters: [{ field: 'doc_code', op: 'eq', value: 'FV' }],
      limit: 500,
    },
    viz: { type: 'pivot', activeTypes: ['pivot'] },
  },
  // ── CARTERA ───────────────────────────────────────────────────────────────
  {
    id: 'cartera-cxc-por-vendedor',
    name: 'Cartera CxC por vendedor',
    description: 'Saldo CxC agrupado por vendedor responsable (de balances WO).',
    category: 'cartera',
    icon: 'fa-user-tie',
    requiresIntegration: 'worldoffice',
    spec: {
      source: 'accounting_balances',
      rows: [{ id: 'vendedor_nombre' }],
      cols: [],
      values: [{ id: 'saldo_cxc', agg: 'sum' }],
      filters: [{ field: 'es_cliente', op: 'eq', value: true }],
      orderBy: [{ field: 'saldo_cxc', dir: 'desc' }],
      limit: 30,
    },
    viz: { type: 'bar', activeTypes: ['bar', 'table'] },
  },
  {
    id: 'cartera-aging-buckets',
    name: 'Cartera por antigüedad (aging)',
    description: 'Suma de saldos por bucket de antigüedad: corriente, 0-30, 31-60, 61-90, +90.',
    category: 'cartera',
    icon: 'fa-hourglass-half',
    requiresIntegration: 'worldoffice',
    spec: {
      source: 'accounting_balances',
      rows: [{ id: 'estado_cartera' }],
      cols: [],
      values: [
        { id: 'saldo_corriente', agg: 'sum' },
        { id: 'saldo_vencido_0_30', agg: 'sum' },
        { id: 'saldo_vencido_31_60', agg: 'sum' },
        { id: 'saldo_vencido_61_90', agg: 'sum' },
        { id: 'saldo_vencido_90_plus', agg: 'sum' },
      ],
      filters: [{ field: 'es_cliente', op: 'eq', value: true }],
      limit: 10,
    },
    viz: { type: 'table', activeTypes: ['table', 'bar'] },
  },
];

export function findPreset(id: string): ReportPreset | undefined {
  return REPORT_PRESETS.find((p) => p.id === id);
}

export function presetsByCategory(category: ReportPreset['category']): ReportPreset[] {
  return REPORT_PRESETS.filter((p) => p.category === category);
}
