# Spec 017 — Integración Fullpi (WMS) para OH MY STORE

> **Status:** approved (Daniel, 2026-07-05 "aprobado, sigue con el plan") — F1-F3 implementadas, F4 bloqueada por credenciales del proveedor.
> **Empresa piloto:** OH MY STORE. **Decisión:** D-082 en CONTRACT.md.
> **Fuente:** `Documentacion_API.pdf` (Fullpi WMS, recibido por Telegram 2026-07-05). Cierra las filas
> "Integración Fullpi — Por Cobrar" del checklist Excel de OMS (R44/R56).

## Qué y por qué

OH MY STORE opera parte de su fulfillment con **Fullpi**, un WMS externo con API pública
(3 endpoints, auth por `secret` en query param). Katuq debe cerrar el ciclo completo:

1. **Pedido Katuq → Fullpi**: cuando un pedido queda **pagado** (o es contraentrega), crear la
   orden en el WMS para que Fullpi la despache.
2. **Tracking Fullpi → Katuq**: leer el `status_history` del WMS y reflejar los estados en el
   pedido Katuq (Despachado / Entregado / No entregado) con sus notificaciones.
3. **Inventario Fullpi → Katuq**: sincronizar unidades por SKU/bodega del WMS hacia la
   colección `inventory` de Katuq (bodega dedicada).

Es el mismo triángulo que ya opera con Cereza/Osmosis — se replica el patrón, no se inventa uno.

## Criterios de aceptación (EARS)

- **CA-01 (push de pedido)** — CUANDO un pedido de una empresa con integración Fullpi activa
  quede con pago confirmado (o sea contraentrega) Y su bodega corresponda al mapping Fullpi,
  el sistema DEBERÁ crear la orden en el WMS (`POST /order/create`) con los campos requeridos
  del contrato (idOrden, buyer_*, total_Order_Amount, total_Paid_Amount, currency COP,
  payment_Type, shipping_method, products[sku, cantidad]) y registrar el resultado en el pedido
  bajo la canónica **`integrations.fullpi`** = `{ idOrden, wmsOrderId, status, lastSyncAt }`.
- **CA-02 (idempotencia)** — Un pedido con `integrations.fullpi.wmsOrderId` NO se re-envía.
  Si el WMS responde `"The idOrder has already exist"`, el sistema DEBERÁ tratarlo como
  ya-creado (recuperar/registrar el vínculo), no como error.
- **CA-03 (tracking)** — CUANDO el poll de órdenes (`GET /getorders` por rango de fechas)
  traiga un `status_history` con `ultimo=1` cuyo `statusWMS` mapee a un estado Katuq,
  el sistema DEBERÁ actualizar `estadoProceso` del pedido vinculado e invocar el **punto único
  de notificaciones** (spec 010, respetando su flag) — nunca una vía de notificación paralela.
- **CA-04 (inventario)** — CUANDO el poll de inventario (`GET /product/inventory`) traiga
  `{sku, quantity, codigoBodega}`, el sistema DEBERÁ hacer upsert en `inventory` usando el
  **business code** de la bodega Katuq mapeada (REGLA: `idBodega` nunca es Firestore doc ID)
  y normalizando `productoId` (regla anti doble-conteo del CLAUDE.md).
- **CA-05 (secretos)** — El `secret` DEBERÁ vivir SOLO en `integration_secrets` (por empresa),
  nunca en código, flows params, ni logs. Ambiente pruebas/prod = mismo endpoint con secret
  distinto → cambiar de ambiente es cambiar el doc de secrets, cero código.
- **CA-06 (/flows es el toggle)** — Activar/desactivar cada sincronización = activar/desactivar
  su flow. Sin configuración paralela en /integrations ni settings.
- **CA-07 (composición de nodos)** — Los flows DEBERÁN componerse con triggers genéricos
  (`schedule-cron`) + nodos Fullpi delgados que solo envuelvan a `fullpiService`. Errores por
  ítem van al error port con `statusReason`/`errorSamples` (observabilidad D-068).
- **CA-08 (multi-tenant)** — Nada hardcodeado por tenant: mapping de bodegas
  (`codigoBodega` WMS ↔ `idBodega` Katuq), mapping de estados y flags viven en
  `integration_configs` por empresa. OMS es el piloto, no un caso especial en código.
- **CA-09 (estados sin datos completos)** — El mapping `statusWMS → estadoProceso` DEBERÁ
  ser una tabla configurable con default conservador: estado desconocido = no-op + registro en
  auditoría (nunca adivinar un estado destino).

## NFRs

- Reintentos ante 5xx con backoff (patrón existente de flows); 401 = alerta de secret inválido.
- Auditoría en colección Firestore (patrón `inventory_audit`), no console.log.
- El API acepta batch (array de órdenes): el push agrupa lo pendiente del tick, procesa
  `success[]`/`failed[]` por ítem.

## Datos que FALTAN del proveedor (bloquean go-live, no el desarrollo)

1. **Secret** de pruebas y prod (llega por correo — aún no llega).
2. **Archivo de cobertura** de bodegas (ciudades/departamentos válidos).
3. **Tabla completa de estados** `statusWMS`/`statusAbbot` (el PDF solo muestra ejemplos:
   `TRANSITO NACIONAL`, `No entregado`/`RETURNED`). Pedirla con el secret.
4. **`codigoBodega`** asignado (ej. del PDF: `ECF1`) para el mapping.
5. Confirmar el **dominio real**: el PDF mezcla `wms.tientiempresa.com.co` y
   `wms.tiendiempresa.com.co` (typo en uno de los dos).

## Fuera de alcance

Lotes (`lote` se envía vacío), facturación desde el WMS, actualización de órdenes (`update=1`,
fase 2 si se necesita), UI nueva (el estado se ve en el pedido y en /flows).
