/**
 * Source: orders → vista `v_orders` en BigQuery.
 * Define dimensiones, medidas y filtros válidos.
 */
module.exports = {
  id: 'orders',
  label: 'Pedidos',
  description: 'Pedidos con totales, canal, estado y entrega.',
  view: 'v_orders',
  // Filtro tenant aplicado siempre. Si la columna no existe en la vista, omite.
  tenantFilter: { column: 'company_label' },
  dimensions: [
    { id: 'fecha_dia', column: 'fecha_dia', label: 'Fecha', type: 'date', granularities: ['day', 'week', 'month', 'quarter', 'year'] },
    { id: 'fecha_procesamiento', column: 'fecha_procesamiento', label: 'Fecha procesamiento', type: 'date', granularities: ['day', 'week', 'month'] },
    { id: 'fecha_despacho', column: 'fecha_despacho', label: 'Fecha despacho', type: 'date', granularities: ['day', 'week', 'month'] },
    { id: 'fecha_entrega', column: 'fecha_entrega', label: 'Fecha entrega', type: 'date', granularities: ['day', 'week', 'month'] },
    { id: 'canal_nombre', column: 'canal_nombre', label: 'Canal', type: 'string' },
    { id: 'canal_tipo', column: 'canal_tipo', label: 'Tipo de canal', type: 'string' },
    { id: 'tipo_orden', column: 'tipo_orden', label: 'Tipo de orden', type: 'string' },
    { id: 'estado_proceso', column: 'estado_proceso', label: 'Estado proceso', type: 'string' },
    { id: 'estado_entrega', column: 'estado_entrega', label: 'Estado entrega', type: 'string' },
    { id: 'forma_pago', column: 'forma_pago', label: 'Forma de pago', type: 'string' },
    { id: 'forma_entrega', column: 'forma_entrega', label: 'Forma de entrega', type: 'string' },
    { id: 'ciudad', column: 'ciudad', label: 'Ciudad', type: 'string' },
    { id: 'bodega_id', column: 'bodega_id', label: 'Bodega', type: 'string' },
    { id: 'cliente_nombre', column: 'cliente_nombre', label: 'Cliente', type: 'string' },
    { id: 'asesor_nombre', column: 'asesor_nombre', label: 'Asesor', type: 'string' },
    { id: 'asesor_email', column: 'asesor_email', label: 'Email asesor', type: 'string' },
    { id: 'company_label', column: 'company_label', label: 'Empresa', type: 'string' },
  ],
  measures: [
    { id: 'pedido_doc_id', column: 'pedido_doc_id', label: 'Pedidos', aggs: ['count', 'count_distinct'], format: 'number' },
    { id: 'total_pedido', column: 'total_pedido', label: 'Total pedido', aggs: ['sum', 'avg', 'min', 'max'], format: 'currency' },
    { id: 'subtotal', column: 'subtotal', label: 'Subtotal', aggs: ['sum', 'avg'], format: 'currency' },
    { id: 'total_envio', column: 'total_envio', label: 'Total envío', aggs: ['sum', 'avg'], format: 'currency' },
    { id: 'total_descuento', column: 'total_descuento', label: 'Total descuento', aggs: ['sum', 'avg'], format: 'currency' },
    { id: 'total_impuesto', column: 'total_impuesto', label: 'Total impuesto', aggs: ['sum', 'avg'], format: 'currency' },
    { id: 'total_sin_descuento', column: 'total_sin_descuento', label: 'Total sin descuento', aggs: ['sum', 'avg'], format: 'currency' },
  ],
};
