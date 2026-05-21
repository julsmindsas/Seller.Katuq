import { SourceDef } from './report-spec.interfaces';

/**
 * Catálogo declarativo de fuentes para el builder.
 * Mismo contrato replicado en backend (services/reports/sources).
 */
export const SOURCE_CATALOG: SourceDef[] = [
  {
    id: 'orders',
    label: 'Pedidos',
    description: 'Pedidos con totales, canal, estado y entrega.',
    dimensions: [
      // Pedido
      { id: 'nro_pedido', label: 'Nro. Pedido', type: 'string', group: 'Pedido' },
      // Tiempo
      { id: 'fecha_dia', label: 'Fecha', type: 'date', granularities: ['day', 'week', 'month', 'quarter', 'year'], group: 'Tiempo' },
      { id: 'fecha_procesamiento', label: 'Fecha procesamiento', type: 'date', granularities: ['day', 'week', 'month'], group: 'Tiempo' },
      { id: 'fecha_despacho', label: 'Fecha despacho', type: 'date', granularities: ['day', 'week', 'month'], group: 'Tiempo' },
      { id: 'fecha_entrega', label: 'Fecha entrega', type: 'date', granularities: ['day', 'week', 'month'], group: 'Tiempo' },
      // Canal
      { id: 'canal_nombre', label: 'Canal', type: 'string', group: 'Canal' },
      { id: 'canal_tipo', label: 'Tipo de canal', type: 'string', group: 'Canal' },
      { id: 'tipo_orden', label: 'Tipo de orden', type: 'string', group: 'Canal' },
      // Estado
      { id: 'estado_proceso', label: 'Estado proceso', type: 'string', group: 'Estado' },
      { id: 'estado_pago', label: 'Estado pago', type: 'string', group: 'Estado' },
      { id: 'estado_entrega', label: 'Estado entrega', type: 'string', group: 'Estado' },
      // Pago
      { id: 'forma_pago', label: 'Forma de pago', type: 'string', group: 'Pago' },
      { id: 'proveedor_pago', label: 'Proveedor de pago', type: 'string', group: 'Pago' },
      // Logística
      { id: 'forma_entrega', label: 'Forma de entrega', type: 'string', group: 'Logística' },
      { id: 'ciudad', label: 'Ciudad', type: 'string', group: 'Geografía' },
      { id: 'departamento', label: 'Departamento', type: 'string', group: 'Geografía' },
      { id: 'zona_cobro', label: 'Zona de cobro', type: 'string', group: 'Geografía' },
      { id: 'bodega_id', label: 'Bodega', type: 'string', group: 'Logística' },
      { id: 'transportador', label: 'Transportador', type: 'string', group: 'Logística' },
      { id: 'horario_entrega', label: 'Horario entrega', type: 'string', group: 'Logística' },
      // Cliente
      { id: 'cliente_nombre', label: 'Cliente', type: 'string', group: 'Cliente' },
      { id: 'cliente_documento', label: 'Documento cliente', type: 'string', group: 'Cliente' },
      { id: 'cliente_email', label: 'Email cliente', type: 'string', group: 'Cliente' },
      // Asesor
      { id: 'asesor_nombre', label: 'Asesor', type: 'string', group: 'Asesor' },
      { id: 'asesor_email', label: 'Email asesor', type: 'string', group: 'Asesor' },
      // Otros
      { id: 'company_label', label: 'Empresa', type: 'string', group: 'Empresa' },
      { id: 'prioridad', label: 'Prioridad', type: 'string', group: 'Otros' },
      { id: 'cupon_aplicado', label: 'Cupón aplicado', type: 'string', group: 'Otros' },
    ],
    measures: [
      { id: 'pedido_doc_id', label: 'Pedidos', aggs: ['count', 'count_distinct'], format: 'number' },
      { id: 'total_pedido', label: 'Total pedido', aggs: ['sum', 'avg', 'min', 'max'], format: 'currency' },
      { id: 'subtotal', label: 'Subtotal', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'total_envio', label: 'Total envío', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'total_descuento', label: 'Total descuento', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'total_impuesto', label: 'Total impuesto', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'total_sin_descuento', label: 'Total sin descuento', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'anticipo', label: 'Anticipo', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'falta_por_pagar', label: 'Falta por pagar', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'puntaje_kai', label: 'Puntaje KAI', aggs: ['avg', 'min', 'max'], format: 'number' },
      { id: 'tiempo_estimado_entrega', label: 'Tiempo estimado entrega (min)', aggs: ['avg', 'min', 'max'], format: 'number' },
    ],
  },
  {
    id: 'products',
    label: 'Productos',
    description: 'Catálogo con precio, stock y disponibilidad.',
    dimensions: [
      { id: 'referencia', label: 'Referencia', type: 'string' },
      { id: 'titulo', label: 'Título', type: 'string' },
      { id: 'marca', label: 'Marca', type: 'string' },
      { id: 'tipo_producto', label: 'Tipo de producto', type: 'string' },
      { id: 'tipo_entrega', label: 'Tipo de entrega', type: 'string' },
      { id: 'activo', label: 'Activo', type: 'boolean' },
      { id: 'disponible', label: 'Disponible', type: 'boolean' },
      { id: 'inventariable', label: 'Inventariable', type: 'boolean' },
      { id: 'destacado', label: 'Destacado', type: 'boolean' },
      { id: 'oferta', label: 'En oferta', type: 'boolean' },
      { id: 'codigo_barras', label: 'Código de barras', type: 'string' },
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
      { id: 'rating', label: 'Calificación', aggs: ['avg', 'min', 'max'], format: 'number' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventario',
    description: 'Stock por bodega y producto.',
    dimensions: [
      { id: 'bodega_id_norm', label: 'Bodega ID', type: 'string', group: 'Bodega' },
      { id: 'bodega_nombre', label: 'Nombre bodega', type: 'string', group: 'Bodega' },
      { id: 'bodega_ciudad', label: 'Ciudad bodega', type: 'string', group: 'Bodega' },
      { id: 'bodega_tipo', label: 'Tipo bodega', type: 'string', group: 'Bodega' },
      { id: 'producto_id', label: 'Producto ID', type: 'string', group: 'Producto' },
      { id: 'producto_referencia', label: 'Referencia producto', type: 'string', group: 'Producto' },
      { id: 'producto_titulo', label: 'Título producto', type: 'string', group: 'Producto' },
      { id: 'sku', label: 'SKU', type: 'string', group: 'Producto' },
      { id: 'talla', label: 'Talla', type: 'string', group: 'Variante' },
      { id: 'color', label: 'Color', type: 'string', group: 'Variante' },
      { id: 'origen', label: 'Origen sync', type: 'string' },
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
    description: 'Clientes registrados.',
    dimensions: [
      { id: 'documento', label: 'Documento', type: 'string' },
      { id: 'tipo_documento', label: 'Tipo documento', type: 'string' },
      { id: 'nombre_completo', label: 'Nombre', type: 'string' },
      { id: 'email', label: 'Email', type: 'string' },
      { id: 'celular', label: 'Celular', type: 'string' },
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
  {
    id: 'accounting_documents',
    label: 'Documentos contables (WO)',
    description: 'Facturas venta, notas crédito/débito, recibos y comprobantes sincronizados desde World Office.',
    requiresIntegration: 'worldoffice',
    dimensions: [
      { id: 'tipo', label: 'Tipo documento', type: 'string', enumValues: ['factura_venta','cotizacion','nota_credito_venta','nota_debito_venta','pedido','remision_venta','recibo_caja','comprobante_egreso','factura_compra','nota_credito_compra','nota_debito_compra'], group: 'Documento' },
      { id: 'tipo_codigo', label: 'Código (WO)', type: 'string', group: 'Documento' },
      { id: 'numero', label: 'Número', type: 'string', group: 'Documento' },
      { id: 'prefijo', label: 'Prefijo', type: 'string', group: 'Documento' },
      { id: 'numero_completo', label: 'Número completo', type: 'string', group: 'Documento' },
      { id: 'fecha', label: 'Fecha', type: 'date', granularities: ['day', 'week', 'month', 'quarter', 'year'], group: 'Tiempo' },
      { id: 'cliente_nombre', label: 'Cliente', type: 'string', group: 'Tercero' },
      { id: 'cliente_id', label: 'ID Cliente WO', type: 'number', group: 'Tercero' },
      { id: 'vendedor_nombre', label: 'Vendedor', type: 'string', group: 'Tercero' },
      { id: 'vendedor_id', label: 'ID Vendedor WO', type: 'number', group: 'Tercero' },
      { id: 'forma_pago', label: 'Forma de pago', type: 'string', group: 'Otros' },
      { id: 'concepto', label: 'Concepto', type: 'string', group: 'Otros' },
      { id: 'responsable', label: 'Responsable', type: 'string', group: 'Otros' },
      { id: 'empresa_wo', label: 'Empresa WO', type: 'string', group: 'Otros' },
      { id: 'contabilizado', label: 'Contabilizado', type: 'boolean', group: 'Estado' },
      { id: 'cuadrado', label: 'Cuadrado', type: 'boolean', group: 'Estado' },
      { id: 'enviado_dian', label: 'Enviado a DIAN', type: 'boolean', group: 'Estado' },
      { id: 'anulado', label: 'Anulado', type: 'boolean', group: 'Estado' },
    ],
    measures: [
      { id: 'count', label: 'Documentos', aggs: ['count', 'count_distinct'], format: 'number' },
      { id: 'total', label: 'Total', aggs: ['sum', 'avg', 'min', 'max'], format: 'currency' },
      { id: 'subtotal', label: 'Subtotal', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'iva', label: 'IVA', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'descuento', label: 'Descuento', aggs: ['sum', 'avg'], format: 'currency' },
    ],
  },
  {
    id: 'accounting_balances',
    label: 'Cartera (CxC / CxP)',
    description: 'Saldos por tercero con aging (corriente, 0-30, 31-60, 61-90, 90+) y datos de contacto. Filtrar esCliente=true → CxC, esProveedor=true → CxP.',
    requiresIntegration: 'worldoffice',
    dimensions: [
      // Tercero
      { id: 'tercero_id', label: 'ID Tercero WO', type: 'number', group: 'Tercero' },
      { id: 'tercero_nombre', label: 'Tercero', type: 'string', group: 'Tercero' },
      { id: 'identificacion', label: 'NIT / Cédula', type: 'string', group: 'Tercero' },
      // Contacto
      { id: 'email', label: 'Email', type: 'string', group: 'Contacto' },
      { id: 'telefono', label: 'Teléfono', type: 'string', group: 'Contacto' },
      { id: 'ciudad', label: 'Ciudad', type: 'string', group: 'Contacto' },
      { id: 'departamento', label: 'Departamento', type: 'string', group: 'Contacto' },
      { id: 'pais', label: 'País', type: 'string', group: 'Contacto' },
      { id: 'direccion', label: 'Dirección', type: 'string', group: 'Contacto' },
      // Relación
      { id: 'es_cliente', label: 'Es Cliente (CxC)', type: 'boolean', group: 'Relación' },
      { id: 'es_proveedor', label: 'Es Proveedor (CxP)', type: 'boolean', group: 'Relación' },
      { id: 'forma_pago_predominante', label: 'Forma Pago Habitual', type: 'string', group: 'Relación', enumValues: ['CR', 'CO', 'OTRO'] },
      // Vendedor
      { id: 'vendedor_id', label: 'ID Vendedor', type: 'number', group: 'Vendedor' },
      { id: 'vendedor_nombre', label: 'Vendedor', type: 'string', group: 'Vendedor' },
      // Cartera
      { id: 'estado_cartera', label: 'Estado Cartera', type: 'string', group: 'Cartera', enumValues: ['al_dia', 'corriente', 'vencido', 'con_saldo_sin_docs'] },
      // Fechas
      { id: 'primera_factura_fecha', label: 'Primera Factura', type: 'date', granularities: ['day', 'month', 'year'], group: 'Fechas' },
      { id: 'ultima_factura_fecha', label: 'Última Factura', type: 'date', granularities: ['day', 'month', 'year'], group: 'Fechas' },
      { id: 'fecha_corte', label: 'Fecha Corte', type: 'date', granularities: ['day', 'month', 'year'], group: 'Fechas' },
      { id: 'universe_source', label: 'Fuente Universo', type: 'string', enumValues: ['wo', 'docs', 'docs-fallback'], group: 'Cartera' },
    ],
    measures: [
      // Saldo
      { id: 'saldo', label: 'Saldo Total', aggs: ['sum', 'avg', 'min', 'max'], format: 'currency' },
      { id: 'terceros', label: 'Terceros', aggs: ['count', 'count_distinct'], format: 'number' },
      // Aging
      { id: 'saldo_corriente', label: 'Saldo Corriente', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'saldo_vencido_0_30', label: 'Vencido 0-30 días', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'saldo_vencido_31_60', label: 'Vencido 31-60 días', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'saldo_vencido_61_90', label: 'Vencido 61-90 días', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'saldo_vencido_90_plus', label: 'Vencido +90 días', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'dias_mora_promedio', label: 'Días Mora Promedio', aggs: ['avg', 'min', 'max'], format: 'number' },
      // Histórico
      { id: 'monto_facturado_historico', label: 'Facturado Histórico', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'monto_pagado_historico', label: 'Pagado Histórico', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'dias_desde_ultima_factura', label: 'Días Desde Última Factura', aggs: ['avg', 'min', 'max'], format: 'number' },
      // Documentos
      { id: 'docs_fv', label: 'Facturas Venta', aggs: ['sum', 'avg'], format: 'number' },
      { id: 'docs_fc', label: 'Facturas Compra', aggs: ['sum', 'avg'], format: 'number' },
      { id: 'docs_rc', label: 'Recibos Caja', aggs: ['sum', 'avg'], format: 'number' },
      { id: 'docs_ce', label: 'Comprobantes Egreso', aggs: ['sum', 'avg'], format: 'number' },
    ],
  },
  {
    id: 'accounting_document_lines',
    label: 'Líneas de documentos (WO)',
    description: 'Renglones individuales de facturas, notas y comprobantes WO. Habilita reportes por producto/servicio comprado o vendido. Requiere persistLines=true en el sync.',
    requiresIntegration: 'worldoffice',
    dimensions: [
      { id: 'doc_code', label: 'Código documento', type: 'string', enumValues: ['FV','CZ','NCV','NDV','PD','REM','RC','CE','FC','NCC','NDC'], group: 'Documento' },
      { id: 'doc_category', label: 'Categoría', type: 'string', group: 'Documento' },
      { id: 'doc_id', label: 'ID Documento WO', type: 'number', group: 'Documento' },
      { id: 'doc_numero', label: 'Número', type: 'string', group: 'Documento' },
      { id: 'doc_prefijo', label: 'Prefijo', type: 'string', group: 'Documento' },
      { id: 'doc_fecha', label: 'Fecha documento', type: 'date', granularities: ['day', 'week', 'month', 'quarter', 'year'], group: 'Tiempo' },
      { id: 'id_inventario', label: 'ID Producto WO', type: 'number', group: 'Producto' },
      { id: 'concepto', label: 'Concepto / Producto', type: 'string', group: 'Producto' },
      { id: 'unidad_medida', label: 'Unidad medida', type: 'string', group: 'Producto' },
      { id: 'id_bodega', label: 'ID Bodega WO', type: 'number', group: 'Logística' },
      { id: 'id_centro_costo', label: 'ID Centro Costo', type: 'number', group: 'Logística' },
      { id: 'tercero_id', label: 'ID Tercero WO', type: 'number', group: 'Tercero' },
      { id: 'tercero_nombre', label: 'Tercero', type: 'string', group: 'Tercero' },
      { id: 'line_index', label: 'Posición renglón', type: 'number', group: 'Documento' },
    ],
    measures: [
      { id: 'count', label: 'Renglones', aggs: ['count', 'count_distinct'], format: 'number' },
      { id: 'cantidad', label: 'Cantidad', aggs: ['sum', 'avg', 'min', 'max'], format: 'number' },
      { id: 'valor_unitario', label: 'Valor unitario', aggs: ['avg', 'min', 'max'], format: 'currency' },
      { id: 'valor_total', label: 'Valor total renglón', aggs: ['sum', 'avg', 'min', 'max'], format: 'currency' },
      { id: 'valor_descuento', label: 'Descuento', aggs: ['sum', 'avg'], format: 'currency' },
      { id: 'por_descuento', label: '% Descuento', aggs: ['avg', 'min', 'max'], format: 'number' },
      { id: 'valor_iva', label: 'IVA', aggs: ['sum', 'avg'], format: 'currency' },
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
