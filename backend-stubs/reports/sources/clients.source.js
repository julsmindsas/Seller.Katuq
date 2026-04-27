module.exports = {
  id: 'clients',
  label: 'Clientes',
  description: 'Clientes registrados.',
  view: 'v_clients',
  tenantFilter: { column: 'company' },
  dimensions: [
    { id: 'documento', column: 'documento', label: 'Documento', type: 'string' },
    { id: 'tipo_documento', column: 'tipo_documento', label: 'Tipo documento', type: 'string' },
    { id: 'estado', column: 'estado', label: 'Estado', type: 'string' },
    { id: 'categoria_nombre', column: 'categoria_nombre', label: 'Categoría', type: 'string' },
    { id: 'source', column: 'source', label: 'Origen', type: 'string' },
    { id: 'company', column: 'company', label: 'Empresa', type: 'string' },
    { id: 'fecha_creacion', column: 'fecha_creacion', label: 'Fecha registro', type: 'date', granularities: ['day', 'month', 'year'] },
  ],
  measures: [
    { id: 'cliente_doc_id', column: 'cliente_doc_id', label: 'Clientes', aggs: ['count', 'count_distinct'], format: 'number' },
  ],
};
