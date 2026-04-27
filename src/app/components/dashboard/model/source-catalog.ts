import { SourceDef } from './report-spec.interfaces';

/**
 * Catálogo declarativo de fuentes para el builder.
 * Mismo contrato debe estar replicado en backend (services/reports/sources).
 * Mapea 1:1 con vistas BigQuery v_* en katuq-new:katuq_analytics.
 */
export const SOURCE_CATALOG: SourceDef[] = [
  {
    id: 'orders',
    label: 'Pedidos',
    description: 'Pedidos con totales, canal, estado y entrega — vista v_orders.',
    dimensions: [
      { id: 'fecha_dia', label: 'Fecha', type: 'date', granularities: ['day', 'week', 'month', 'quarter', 'year'], group: 'Tiempo' },
      { id: 'fecha_procesamiento', label: 'Fecha procesamiento', type: 'date', granularities: ['day', 'week', 'month'], group: 'Tiempo' },
      { id: 'fecha_despacho', label: 'Fecha despacho', type: 'date', granularities: ['day', 'week', 'month'], group: 'Tiempo' },
      { id: 'fecha_entrega', label: 'Fecha entrega', type: 'date', granularities: ['day', 'week', 'month'], group: 'Tiempo' },
      { id: 'canal_nombre', label: 'Canal', type: 'string', group: 'Canal' },
      { id: 'canal_tipo', label: 'Tipo de canal', type: 'string', group: 'Canal' },
      { id: 'tipo_orden', label: 'Tipo de orden', type: 'string', group: 'Canal' },
      { id: 'estado_proceso', label: 'Estado proceso', type: 'string', group: 'Estado' },
      { id: 'estado_entrega', label: 'Estado entrega', type: 'string', group: 'Estado' },
      { id: 'forma_pago', label: 'Forma de pago', type: 'string', group: 'Pago' },
      { id: 'forma_entrega', label: 'Forma de entrega', type: 'string', group: 'Logística' },
      { id: 'ciudad', label: 'Ciudad', type: 'string', group: 'Geografía' },
      { id: 'bodega_id', label: 'Bodega', type: 'string', group: 'Logística' },
      { id: 'cliente_nombre', label: 'Cliente', type: 'string', group: 'Cliente' },
      { id: 'asesor_nombre', label: 'Asesor', type: 'string', group: 'Cliente' },
      { id: 'asesor_email', label: 'Email asesor', type: 'string', group: 'Cliente' },
      { id: 'company_label', label: 'Empresa', type: 'string', group: 'Empresa' },
    ],
    measures: [
      { id: 'pedido_doc_id', label: 'Pedidos', aggs: ['count', 'count_distinct'], format: 'number' },
      { id: 'total_pedido', label: 'Total pedido', aggs: ['sum', 'avg', 'min', 'max'], format: 'currency' },
      { id: 'subtotal', label: 'Subtotal', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'total_envio', label: 'Total envío', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'total_descuento', label: 'Total descuento', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'total_impuesto', label: 'Total impuesto', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'total_sin_descuento', label: 'Total sin descuento', aggs: ['sum', 'avg'], format: 'currency' },
    ],
  },
  {
    id: 'products',
    label: 'Productos',
    description: 'Catálogo con precio, stock y disponibilidad — vista v_products.',
    dimensions: [
      { id: 'referencia', label: 'Referencia', type: 'string' },
      { id: 'titulo', label: 'Título', type: 'string' },
      { id: 'marca', label: 'Marca', type: 'string' },
      { id: 'tipo_producto', label: 'Tipo de producto', type: 'string' },
      { id: 'tipo_entrega', label: 'Tipo de entrega', type: 'string' },
      { id: 'activo', label: 'Activo', type: 'boolean' },
      { id: 'company_id', label: 'Empresa', type: 'string' },
      { id: 'fecha_creacion', label: 'Fecha creación', type: 'date', granularities: ['day', 'month', 'year'] },
    ],
    measures: [
      { id: 'producto_doc_id', label: 'Productos', aggs: ['count', 'count_distinct'], format: 'number' },
      { id: 'precio_con_iva', label: 'Precio con IVA', aggs: ['avg', 'min', 'max', 'sum'], format: 'currency' },
      { id: 'precio_sin_iva', label: 'Precio sin IVA', aggs: ['avg', 'min', 'max', 'sum'], format: 'currency' },
      { id: 'stock_disponible', label: 'Stock disponible', aggs: ['sum', 'avg'], format: 'number' },
      { id: 'inventario_seguridad', label: 'Inventario seguridad', aggs: ['sum', 'avg'], format: 'number' },
      { id: 'total_ventas', label: 'Total ventas (histórico)', aggs: ['sum', 'avg'], format: 'number' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventario',
    description: 'Stock por bodega y producto — vista v_inventory.',
    dimensions: [
      { id: 'bodega_id_norm', label: 'Bodega', type: 'string' },
      { id: 'producto_id', label: 'Producto', type: 'string' },
      { id: 'sku', label: 'SKU', type: 'string' },
      { id: 'talla', label: 'Talla', type: 'string' },
      { id: 'color', label: 'Color', type: 'string' },
      { id: 'origen', label: 'Origen', type: 'string' },
      { id: 'tipo_movimiento', label: 'Tipo movimiento', type: 'string' },
      { id: 'company', label: 'Empresa', type: 'string' },
      { id: 'fecha_creacion', label: 'Fecha creación', type: 'date', granularities: ['day', 'month'] },
    ],
    measures: [
      { id: 'inventory_doc_id', label: 'Registros', aggs: ['count'], format: 'number' },
      { id: 'cantidad', label: 'Unidades', aggs: ['sum', 'avg', 'min', 'max'], format: 'number' },
      { id: 'producto_id', label: 'Productos distintos', aggs: ['count_distinct'], format: 'number' },
    ],
  },
  {
    id: 'clients',
    label: 'Clientes',
    description: 'Clientes registrados — vista v_clients.',
    dimensions: [
      { id: 'documento', label: 'Documento', type: 'string' },
      { id: 'tipo_documento', label: 'Tipo documento', type: 'string' },
      { id: 'estado', label: 'Estado', type: 'string' },
      { id: 'categoria_nombre', label: 'Categoría', type: 'string' },
      { id: 'source', label: 'Origen', type: 'string' },
      { id: 'company', label: 'Empresa', type: 'string' },
      { id: 'fecha_creacion', label: 'Fecha registro', type: 'date', granularities: ['day', 'month', 'year'] },
    ],
    measures: [
      { id: 'cliente_doc_id', label: 'Clientes', aggs: ['count', 'count_distinct'], format: 'number' },
    ],
  },
];

export function findSource(id: string) {
  return SOURCE_CATALOG.find((s) => s.id === id);
}

export function findDimension(sourceId: string, dimId: string) {
  return findSource(sourceId)?.dimensions.find((d) => d.id === dimId);
}

export function findMeasure(sourceId: string, measureId: string) {
  return findSource(sourceId)?.measures.find((m) => m.id === measureId);
}
