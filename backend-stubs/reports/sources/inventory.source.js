module.exports = {
  id: 'inventory',
  label: 'Inventario',
  description: 'Stock por bodega y producto.',
  view: 'v_inventory',
  tenantFilter: { column: 'company' },
  dimensions: [
    { id: 'bodega_id_norm', column: 'bodega_id_norm', label: 'Bodega', type: 'string' },
    { id: 'producto_id', column: 'producto_id', label: 'Producto', type: 'string' },
    { id: 'sku', column: 'sku', label: 'SKU', type: 'string' },
    { id: 'talla', column: 'talla', label: 'Talla', type: 'string' },
    { id: 'color', column: 'color', label: 'Color', type: 'string' },
    { id: 'origen', column: 'origen', label: 'Origen', type: 'string' },
    { id: 'tipo_movimiento', column: 'tipo_movimiento', label: 'Tipo movimiento', type: 'string' },
    { id: 'company', column: 'company', label: 'Empresa', type: 'string' },
    { id: 'fecha_creacion', column: 'fecha_creacion', label: 'Fecha creación', type: 'date', granularities: ['day', 'month'] },
  ],
  measures: [
    { id: 'inventory_doc_id', column: 'inventory_doc_id', label: 'Registros', aggs: ['count'], format: 'number' },
    { id: 'cantidad', column: 'cantidad', label: 'Unidades', aggs: ['sum', 'avg', 'min', 'max'], format: 'number' },
    { id: 'producto_id', column: 'producto_id', label: 'Productos distintos', aggs: ['count_distinct'], format: 'number' },
  ],
};
