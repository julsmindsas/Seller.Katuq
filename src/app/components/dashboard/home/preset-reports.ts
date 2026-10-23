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
    name: 'Los 20 productos que más unidades venden',
    description: 'Cuántas unidades se vendieron de cada producto, según tus facturas de World Office.',
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
    name: 'Los 20 productos que más dinero dejan',
    description: 'Cuánto se facturó de cada producto. Solo cuenta facturas de venta.',
    category: 'productos',
    icon: 'fa-money',
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
    name: 'Ventas de productos mes a mes',
    description: 'Unidades y valor vendido cada mes. Puedes separarlo por producto.',
    category: 'productos',
    icon: 'fa-line-chart',
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
    name: 'Descuentos dados en cada producto',
    description: 'Cuánto se descontó en cada producto. Sirve para revisar tus precios.',
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
    name: 'Qué productos compra cada cliente',
    description: 'Una fila por producto y una columna por cliente, con las unidades compradas.',
    category: 'productos',
    icon: 'fa-th',
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
    name: 'Cartera por cobrar de cada vendedor',
    description: 'Cuánto deben los clientes de cada vendedor, según World Office.',
    category: 'cartera',
    icon: 'fa-user',
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
    name: '¿Quién te debe y desde cuándo?',
    description: 'Saldos por cobrar según los días de atraso: al día, hasta 30, de 31 a 60, de 61 a 90 y más de 90 días.',
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
