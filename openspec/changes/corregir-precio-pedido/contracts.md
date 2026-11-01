# Contratos compartidos aprobados — D-543/D-544

**23-oct-2026 · parte del diseño APROBADO:** «Apruebo ambos diseños y la adaptación». No son endpoints implementados. Rutas normales v1, sin colección adicional.

## Opciones autorizadas, sin efectos

`POST /v1/orders/price-change/options { orderId }` devuelve capacidades de las dos acciones, disponibilidad/motivo de bloqueo, líneas con `index/productId/fingerprint` calculado por el servidor, precios resueltos actuales y listas activas del tenant cuando la acción de lista está permitida. Si ya hay lineKey persistido lo devuelve; no lo crea en esta lectura. La UI no calcula fingerprints ni deduce permisos de nombres de rol. Leer opciones no genera ids persistidos, historial o avisos. Pedido ajeno responde 404; sesión/permiso/falla de configuración no conceden capacidad. Preview y confirm vuelven a comprobar todo: options no autoriza una escritura futura.

## Preparar

`POST /v1/orders/price-change/preview`

```json
{
  "kind": "linePrice",
  "orderId": "docId",
  "line": {"index": 1, "productId": "docId", "fingerprint": "sha256"},
  "unitPriceWithoutTax": 20000,
  "reason": "Corrección del precio registrado"
}
```

El servidor lee el pedido real y valida que índice/producto/huella identifiquen la línea exacta. Sin acuerdo previo, options emite una referencia provisional `{index,productId,fingerprint}`; preview fija un lineKey determinista por operación/posición/huella, lo devuelve y vincula al digest, y **solo se persiste en confirm**. Repetir preparación dentro de confirm usa esa misma derivación, sin UUID nuevo por línea. Si ya existe acuerdo, se usa su lineKey estable validado. La huella incluye configuración relevante, cantidad y posición/versión original; dos líneas iguales no se confunden. Un cliente no puede inventar un lineKey persistido. `orderId`, límites y montos son datos de intención, no autorización; rechazar claves desconocidas, dotted keys, montos inválidos y contenido que pretenda fijar empresa/actor/productos/totales.

Respuesta 200:

```json
{
  "operationId": "uuid-servidor",
  "previewToken": "token-firmado",
  "expiresAt": "ISO-servidor",
  "orderVersion": "version-leida",
  "lines": [{"lineKey": "...", "productId": "...", "source": "manual", "before": {}, "after": {}}],
  "before": {"productsGross": 0, "discount": 0, "shipping": 0, "tax": 0, "orderTotal": 0, "paid": 0, "amountDue": 0, "overpayment": 0},
  "after": {"productsGross": 0, "discount": 0, "shipping": 0, "tax": 0, "orderTotal": 0, "paid": 0, "amountDue": 0, "overpayment": 0},
  "warnings": [],
  "capabilities": {"correctLinePrice": true, "changePriceList": false, "updateCustomerType": false}
}
```

`before/after` son DTO de presentación con semántica explícita: bruto de productos sin envío ni impuesto, descuentos, envío, impuestos y total final. `lines` incluye base unitaria, tarifa, cantidades e importes de base/extras/neto/IVA/total para no recomponer dinero en UI. No redondear de nuevo en el navegador; reutilizar precisión del calculador actual.

Preview **cero escrituras**, incluidos ids, recibos, historial y avisos. El token no requiere guardar una sesión de preview. Firma del servidor con propósito/audiencia exclusiva `order-price-preview`, actor+tenant+pedido, operación, intención normalizada/motivo, versión de esquema/calculador, huellas de lecturas y resultado, `issuedAt/exp`. Vida máxima propuesta **10 minutos**, acortada al siguiente vencimiento comercial conocido. Codec pequeño `priceChange/comprobante.js` siguiendo los precedentes `services/mcp/confirmacion.js` y `services/despachos/comprobantePlan.js`: derivación HMAC del secreto existente `SECRET_TOKEN`, etiqueta exclusiva `orders-price-change-preview-v1`, firma/verificación solo HS256, esquema cerrado y fallo cerrado si falta llave. No cambiar el helper/TTL MCP, agregar secretos ni registrar claves. No usar el JWT del usuario como llave. Un token de preview no sirve para autenticarse.

Huellas incluyen `snapshot.updateTime` y campos relevantes de pedido, pagos, facturación, usuario, rol, banderas/configuración, producto y lista; en D-544, cliente opcional. No basta `date_upd`, que algunos escritores no actualizan. Se evita persistir datos sensibles dentro del token: usar hashes, identificadores opacos y propósito; motivo/intención detallados se conservan en UI y se comparan por digest. No registrar tokens o motivos en logs.

## Confirmar y repetición

`POST /v1/orders/price-change/confirm`

```json
{
  "operationId": "el-mismo-uuid",
  "previewToken": "el-token",
  "intent": {"kind": "linePrice", "orderId": "docId", "line": {}, "unitPriceWithoutTax": 20000, "reason": "..."}
}
```

La intención coincide exactamente con su digest firmado; no se aceptan precios/totales distintos de lo revisado. Respuesta 200: `{ applied:true, replay:false, operationId, order, history:{status:'delivered'|'pending',eventId} }`. `order` es el persistido, con importes actuales y excedente; la respuesta no inventa devolución o pago. Repetición confirmada devuelve `replay:true` y pedido actual, sin sobrescribir pagos/ediciones posteriores.

Secuencia transaccional:

1. Autenticar; validar propósito/firma y actor/tenant. Resolver referencias de usuario/rol y volver a comprobar unicidad, membresía y vigencia; lectura transaccional de sus versiones y de las banderas. No autorización derivada de headers ni acceso de otro comercio por docId.
2. Leer pedido, productos/lista y cliente opcional en transacción; todos los `get` antes de escribir. Para consultas de resolución previas se comprueba otra vez la identidad/versiones, no se reutiliza una autorización anterior al commit.
3. Si `lastPriceChange` coincide con operación/hash, devolver recibo/pedido actual sin otro efecto; un token firmado ya expirado solo puede reconocer una operación ya aplicada, nunca aplicar otra. Mismo id con hash diferente → conflicto. Operación vieja sin recibo vigente → conflicto de versión, no reaplicación.
4. Si hay cápsula pendiente de **otra** corrección → `HISTORY_PENDING`. Comprobar huellas/versiones, permisos explícitos, pertenencia/identidad de productos, cierres de Kuvo/caja y situación/candado fiscal. Exigir producto editable **solo** para `linePrice` o una decisión `manual` de D-544; aplicar lista/conservar un precio pactado no lo exige. Cualquier lectura incompleta o incierta rechaza.
5. Volver a preparar mediante el cálculo compartido y comparar resultado comercial con el preview; cambio de campaña o condición temporal exige otra vista previa. El momento no se compara como número mutable dentro del digest del resultado: se validan vigencia y condiciones, además del vencimiento firmado.
6. Escribir patch cerrado del pedido, nuevo `date_upd`, marca/acuerdos y **un recibo compacto** `lastPriceChange` + **una cápsula** `pendingPriceChangeEvent`, con `priceChangeHistoryPending=true`. Solo en D-544 con opción/permiso, escribir patch del tipo/lista del cliente dentro de esa misma transacción.
7. Después del commit, intentar proyección idempotente del evento mediante el escritor D-541. Fallo de proyección no deshace dinero aplicado; devolver aplicado/pendiente. No invocar el guardado genérico, facturación, inventario o avisos comerciales.

El cliente conserva `operationId` tras timeout/5xx: consulta de nuevo el pedido por su ruta de lectura existente o repite **la misma** confirmación. No reenvía con id nuevo ni anuncia rollback. Si el recibo ya fue superado por otra corrección, el token/base anterior nunca puede aplicarse de nuevo; se devuelve conflicto con necesidad de recarga.

## Metadatos y recuperación del historial

- `pricingAgreement`: versión, revisión/operación y procedencia del pacto; cada línea tiene identidad estable y origen. Los montos resueltos siguen en los campos existentes; no se crean dos fórmulas ni dos precios efectivos que puedan discrepar.
- `lastPriceChange`: operación/hash, actor opaco, versión de resultado, id de evento y estado de entrega. Un recibo compacto actual, no un arreglo de historial; la historia duradera pertenece a D-541.
- `pendingPriceChangeEvent`: evento normalizado, validado contra el catálogo D-541 extendido solo con `line_price_corrected` y `price_list_changed`, detalles cerrados y montos antes/después. No se expone en listados o reportes como un segundo historial. Límites de tamaño y documento verificados antes de commit; exceso rechaza sin aplicación parcial.
- Proyección: escritor único D-541, id determinista por operación. `created/already_exists` permiten limpiar la cápsula en una transacción corta **solo si coincide eventId/operationId**. Los demás resultados la conservan. No actualizar/borrar eventos del historial, ni limpiar una cápsula distinta.
- Recuperación: intento inmediato después de confirm/replay y reconciliador acotado cada **60 s**, por empresa del registro de recuperación y lotes de **25 pedidos**, consultando empresa + pendiente, orden estable por id y cursor de avance; sin scan global. Rotar/paginar tras cada lote, incluso si todos fallan, y volver al inicio al terminar; una cápsula venenosa no puede impedir procesar la 26. Mantener cursor operativo por empresa en memoria; al reiniciar vuelve al inicio y puede repetir un lote idempotente, pero las cápsulas siguen persistidas y se recorren las páginas posteriores. No escribir cursor ni cola en otra colección. Registro operativo en la colección `config` existente: documento `order_price_change_recovery`, lista `companies`; se incorpora ALMARA al activar el piloto y se conserva aunque se apaguen las acciones nuevas. No retirar una empresa con cápsulas pendientes. Reutilizar inicialización de jobs existente, corte en Firestore y logs de ids/códigos. Pruebas de indexación/coexistencia, reinicio y avance justo antes de activarlo. No introducir escrituras ocultas en options/preview ni en la lectura D-541 que hoy es read-only.
- Pausar nuevas correcciones no debe apagar la entrega de cápsulas ya aceptadas. Si D-541 está apagado/cortado, no se acepta una corrección nueva; pendientes conservadas hasta recuperar el escritor. No se pierde payload tras agotar reintentos.

## Errores

| HTTP / code | Conducta |
|---|---|
| 400 `INVALID_INTENT` | Entrada/tipo/clave/token mal formado; sin escritura |
| 401 / 403 `PRICE_PERMISSION_DENIED` | Sesión o permiso insuficiente; cero datos de otro comercio |
| 404 `ORDER_NOT_FOUND` | No existe o no pertenece al tenant; sin revelar existencia ajena |
| 409 `PREVIEW_STALE`, `LINE_MISMATCH`, `OPERATION_CONFLICT` | Recargar/preparar; no reintento automático con otra intención |
| 409 `FISCAL_LOCK`, `ORDER_ALREADY_INVOICED`, `FINANCIAL_LOCKED` | Explicar bloqueo; sin emisión, desbloqueo ni escritura parcial |
| 409 `HISTORY_PENDING` | Mostrar resultado previo y recuperación pendiente; impedir otra corrección |
| 410 `PREVIEW_EXPIRED` | Preparar y revisar otra vez |
| 422 `PRICE_DECISION_REQUIRED`, `AGREEMENT_INVALID` | Completar decisión o resolver acuerdo inválido; nunca fallback a cero/catálogo |
| 5xx / corte de red | Resultado puede ser incierto; comprobar/repetir mismo operationId |

## Write-set de este flujo

Solo pedido objetivo (precio/acuerdo/importes/recibo/cápsula/versiones) y proyección mediante historial/auditoría aprobados. En D-544, solo tipo/lista y metadatos de la ficha del cliente cuando se pidió y autorizó. Nada en productos/listas maestras, inventario, movimientos, pagos, estados de proceso, facturas, `shipping_orders` o proveedores. Options/preview/consulta de pedido no generan correos, factura, pedido, notificación o evento; la proyección de una operación ya aplicada es recuperación explícita de su entrega pendiente. Configuración del registro de recuperación y concesión de capacidades son operaciones administrativas separadas, con su propia autorización; las rutas financieras no escriben config, users o roles. El reconciliador solo escribe la proyección/limpieza de cápsula, sin config o datos comerciales adicionales; su cursor es efímero.
