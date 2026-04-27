-- =====================================================================
-- Vistas BI aplanadas — Katuq Analytics
-- Fuente: katuq_analytics.* (cargado desde Firestore export)
-- =====================================================================

-- ---------------------------------------------------------------------
-- v_orders — pedidos
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW `katuq-new.katuq_analytics.v_orders` AS
SELECT
  __key__.name                                                AS pedido_doc_id,
  COALESCE(nroPedido.string, CAST(nroPedido.integer AS STRING)) AS nro_pedido,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', fecha)         AS fecha,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', fechaProcesamiento) AS fecha_procesamiento,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', fechaEntrega.string)  AS fecha_entrega,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', fechaDespacho) AS fecha_despacho,
  DATE(SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', fechaProcesamiento)) AS fecha_dia,
  COALESCE(
    SAFE_CAST(totalPedididoConDescuento.integer AS NUMERIC),
    SAFE_CAST(totalPedididoConDescuento.float   AS NUMERIC),
    SAFE_CAST(totalPedididoConDescuento.entity.valor AS NUMERIC)
  ) AS total_pedido,
  COALESCE(
    SAFE_CAST(totalPedidoSinDescuento.integer AS NUMERIC),
    SAFE_CAST(totalPedidoSinDescuento.float   AS NUMERIC),
    SAFE_CAST(totalPedidoSinDescuento.entity.valor AS NUMERIC)
  ) AS total_sin_descuento,
  COALESCE(
    SAFE_CAST(subtotal.integer AS NUMERIC),
    SAFE_CAST(subtotal.float   AS NUMERIC)
  ) AS subtotal,
  COALESCE(
    SAFE_CAST(totalEnvio.integer AS NUMERIC),
    SAFE_CAST(totalEnvio.entity.valor AS NUMERIC)
  ) AS total_envio,
  COALESCE(
    SAFE_CAST(totalDescuento.integer AS NUMERIC),
    SAFE_CAST(totalDescuento.float   AS NUMERIC),
    SAFE_CAST(totalDescuento.entity.valor AS NUMERIC)
  ) AS total_descuento,
  COALESCE(
    SAFE_CAST(totalImpuesto.integer AS NUMERIC),
    SAFE_CAST(totalImpuesto.float   AS NUMERIC),
    SAFE_CAST(totalImpuesto.entity.valor AS NUMERIC)
  ) AS total_impuesto,
  estadoProceso.string                                        AS estado_proceso,
  estadoEntrega                                               AS estado_entrega,
  formaDePago.string                                          AS forma_pago,
  formaEntrega.string                                         AS forma_entrega,
  channel.name                                                AS canal_nombre,
  channel.tipo                                                AS canal_tipo,
  channel.id                                                  AS canal_id,
  typeOrder                                                   AS tipo_orden,
  ciudadNombre                                                AS ciudad,
  clienteNombre                                               AS cliente_nombre,
  bodegaId                                                    AS bodega_id,
  company.string                                              AS company_label,
  asesorAsignado.entity.name                                  AS asesor_nombre,
  asesorAsignado.entity.email                                 AS asesor_email,
  COALESCE(nroFactura.string, CAST(nroFactura.integer AS STRING)) AS nro_factura
FROM `katuq-new.katuq_analytics.orders`
WHERE __has_error__ IS NOT TRUE;

-- ---------------------------------------------------------------------
-- v_products — catálogo
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW `katuq-new.katuq_analytics.v_products` AS
SELECT
  __key__.name                                                AS producto_doc_id,
  identificacion.referencia                                   AS referencia,
  identificacion.codigoBarras                                 AS codigo_barras,
  identificacion.sku                                          AS sku,
  identificacion.marca                                        AS marca,
  identificacion.tipoProducto                                 AS tipo_producto,
  crearProducto.titulo                                        AS titulo,
  COALESCE(
    SAFE_CAST(precio.precioUnitarioConIva.integer AS NUMERIC),
    SAFE_CAST(precio.precioUnitarioConIva.float   AS NUMERIC),
    SAFE_CAST(precio.precioUnitarioConIva.string  AS NUMERIC)
  ) AS precio_con_iva,
  COALESCE(
    SAFE_CAST(precio.precioUnitarioSinIva.integer AS NUMERIC),
    SAFE_CAST(precio.precioUnitarioSinIva.float   AS NUMERIC),
    SAFE_CAST(precio.precioUnitarioSinIva.string  AS NUMERIC)
  ) AS precio_sin_iva,
  COALESCE(
    SAFE_CAST(disponibilidad.cantidadDisponible.integer AS NUMERIC),
    SAFE_CAST(disponibilidad.cantidadDisponible.string  AS NUMERIC)
  ) AS stock_disponible,
  COALESCE(
    SAFE_CAST(disponibilidad.inventarioSeguridad.integer AS NUMERIC),
    SAFE_CAST(disponibilidad.inventarioSeguridad.string  AS NUMERIC)
  ) AS inventario_seguridad,
  disponibilidad.tipoEntrega                                  AS tipo_entrega,
  disponibilidad.activo                                       AS activo,
  CAST(disponibilidad.totalVentas AS NUMERIC)                  AS total_ventas,
  company                                                     AS company_id,
  status                                                      AS status,
  SAFE.PARSE_TIMESTAMP('%Y-%m-%dT%H:%M:%E*SZ', date_add)      AS fecha_creacion,
  date_edit.date_time                                         AS fecha_edicion,
  createdAt.date_time                                         AS created_at,
  updatedAt.date_time                                         AS updated_at
FROM `katuq-new.katuq_analytics.products`
WHERE __has_error__ IS NOT TRUE
  AND identificacion IS NOT NULL;

-- ---------------------------------------------------------------------
-- v_inventory — stock por bodega
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW `katuq-new.katuq_analytics.v_inventory` AS
SELECT
  __key__.name                                                AS inventory_doc_id,
  productoId                                                  AS producto_id,
  productId                                                   AS producto_id_alt,
  bodegaId                                                    AS bodega_id,
  idBodega                                                    AS bodega_id_alt,
  COALESCE(idBodega, bodegaId)                                AS bodega_id_norm,
  COALESCE(
    SAFE_CAST(cantidad.integer AS NUMERIC),
    SAFE_CAST(cantidad.float   AS NUMERIC)
  )                                                           AS cantidad,
  CAST(cantidadAnterior AS NUMERIC)                           AS cantidad_anterior,
  sku                                                         AS sku,
  talla                                                       AS talla,
  color                                                       AS color,
  origen                                                      AS origen,
  origenFulfillment                                           AS origen_fulfillment,
  source                                                      AS source,
  syncSource                                                  AS sync_source,
  tipoMovimiento                                              AS tipo_movimiento,
  razon                                                       AS razon,
  COALESCE(company, companyId)                                AS company,
  createdAt                                                   AS fecha_creacion,
  updatedAt                                                   AS fecha_actualizacion
FROM `katuq-new.katuq_analytics.inventory`
WHERE __has_error__ IS NOT TRUE;

-- ---------------------------------------------------------------------
-- v_clients — clientes
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW `katuq-new.katuq_analytics.v_clients` AS
SELECT
  __key__.name                                                AS cliente_doc_id,
  cd                                                          AS cd,
  documento                                                   AS documento,
  tipo_documento_comprador                                    AS tipo_documento,
  nombres_completos                                           AS nombres,
  apellidos_completos                                         AS apellidos,
  TRIM(CONCAT(COALESCE(nombres_completos,''), ' ', COALESCE(apellidos_completos,''))) AS nombre_completo,
  correo_electronico_comprador                                AS email,
  numero_celular_comprador                                    AS celular,
  indicativo_celular_comprador                                AS celular_indicativo,
  numero_celular_whatsapp                                     AS whatsapp,
  whatsappSameAsPhone                                         AS whatsapp_igual_celular,
  estado                                                      AS estado,
  categoria.nombre                                            AS categoria_nombre,
  categoria.descripcion                                       AS categoria_descripcion,
  categoria.id                                                AS categoria_id,
  source                                                      AS source,
  importBatchId                                               AS import_batch_id,
  displayLabel                                                AS display_label,
  company                                                     AS company,
  date_add.date_time                                          AS fecha_creacion,
  date_edit                                                   AS fecha_edicion
FROM `katuq-new.katuq_analytics.clients`
WHERE __has_error__ IS NOT TRUE;
