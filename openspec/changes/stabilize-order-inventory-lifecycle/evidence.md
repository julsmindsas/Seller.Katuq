# Evidencia de implementación en rama — ciclo pedido/inventario

Fecha: 2026-07-23. Ramas locales: `codex/inventory-stabilization-openspec`. No desplegado y sin escrituras en Firestore productivo.

## Regla de pago única

- Estados que comprometen: `Pagado`, `Aprobado`, `PreAprobado`.
- Entrar al conjunto compromete; cambiar dentro del conjunto no repite; salir libera solo si existe huella aplicada.
- El estado interno explícito prevalece sobre estados viejos del proveedor. Un pedido `Cancelado` con `financialStatus=paid` no revive.
- El nodo de Cereza dejó de considerar `Cancelado` como `is_paid: true` y usa la misma política.

## Huella y transacción

- `orders/{orderId}.inventoryEffect` guarda versión, revisión, routing, asignaciones aplicadas y movimientos de la última operación.
- No se creó una colección nueva.
- Pedido, `inventory` e `inventoryMovement` confirman en una transacción.
- La operación lee el pedido canónico dentro de la transacción; no confía en un payload potencialmente viejo.
- La revisión no incluye precios ni listas de precios.
- La reversa parte de asignaciones aplicadas. Cancelar un pedido sin huella no suma inventario.
- Cambiar bodega con efecto activo retorna atención; no ejecuta un traslado escondido.

Prueba Firestore Emulator aprobada:

`PASS emulator: huella de pedido + saldo + movimiento atómicos e idempotentes`

Casos cubiertos: pendiente, aprobado, cambio elegible, cancelado con provider viejo, cancelación repetida, reactivación, recompra, reducción, cambio solo de precio, concurrencia, código de bodega `005`, document ID rechazado y producto sin escrituras.

## Escritores de pedido conectados, todavía apagados

- Creación y edición de pedidos clasifican el origen (`assisted_sale`, `pos` o `channel_order`) y conservan el escritor anterior únicamente en `legacy`/`shadow`.
- En `transactional`, una falla no cae al escritor legacy: queda reintentable para evitar dos manos sobre el mismo saldo.
- Shopify `orders/create`, `orders/updated`, `orders/paid`, cancelaciones, borrados y refunds vuelven a conciliar el pedido persistido.
- `orders/paid` ya no se descarta antes de actualizar el pedido.
- Ninguna bandera fue activada y no hubo despliegue.

## Segundo escritor encontrado en el flow OMS

El respaldo lógico confirmó que el flow activo `shopify-orders-to-cereza-7e6ab5a3` contiene:

`shopify-order-created → katuq-order-upsert → katuq-inventory-adjust`

Ese último nodo aplicaba un delta propio, separado del procesador Shopify. En modo transaccional ahora busca el pedido persistido y delega al mismo `orders.inventoryEffect`; si el procesador ya comprometió, el flow observa la huella y no repite. En `legacy`/`shadow` conserva el comportamiento anterior para permitir comparación y apagado inmediato.

Los ajustes absolutos de proveedores (`setTo`, por ejemplo Fullpi) siguen siendo una operación distinta. En modo transaccional usan el ledger canónico, validan la bodega exacta contra el maestro y fallan cerrado ante inventario ambiguo. Se retiró la heurística que confundía un código de negocio largo con un document ID.

Prueba Firestore Emulator aprobada:

`PASS emulator: flow Shopify delega al pedido y sync proveedor usa ledger`

Casos cubiertos: dos items del mismo pedido, reintento, cancelación con estado Shopify viejo, devolución exacta, `setTo` de Fullpi y código de bodega alfanumérico largo. Los productos y precios permanecen idénticos.

Fixture adicional de processors aprobado:

`PASS emulator: Shopify paid/create retry/cancel/stale concilian una sola huella`

Esto prueba el inventario del pago tardío, pero no autoriza el despacho automático.

Fixtures de orígenes aprobadas:

`PASS emulator: Venta Asistida/POS/pago tardío/despacho usan una sola huella`

Casos cubiertos: Venta Asistida aprobada, POS pendiente, entrada a `PreAprobado`, cambio posterior a `Pagado`, despacho sin segundo movimiento y rechazo con devolución exacta. Los dos documentos de producto y sus precios quedaron idénticos.

Smoke del controlador real aprobado en Firestore Emulator, proyecto aislado `demo-katuq-order-controller-http-smoke-20260723`:

`PASS emulator: controller create/edit HTTP shape usa una sola huella`

El `create` real de Venta Asistida descontó 10→8 y dejó un movimiento y `inventoryEffect.version=1`; `updateOrderInternal` de `Aprobado` a `Pagado` no repitió; el cambio a `Rechazado` retornó 8→10 con un único movimiento compensatorio. El documento de producto y sus precios permanecieron idénticos. Correo y servicios externos fueron reemplazados por contratos locales; el proyecto `demo-*` impidió acceso a servicios no emulados.

## Hallazgo de Logística/Cereza

El binding activo de OMS para `shopify-orders-to-cereza-7e6ab5a3` escucha únicamente `orders/create`. El bridge sí publica `orders/paid`, pero lo convierte en `order.updated`; el flow instalado no está suscrito a ese evento. Por tanto, un pedido que nace pendiente y luego se paga hoy actualiza su estado, pero no tiene una ruta automática confirmada hacia Cereza.

No se agregó un atajo directo desde Shopify a la API de Cereza. Antes se deben cerrar el mapping multibodega/carrier, la idempotencia logística y la regla “éxito solo con ID externo”. Después, `orders/paid` debe invocar la misma operación de Logística/Despachos, separada de la huella de inventario.

El contrato técnico multibodega ya quedó implementado y probado en la rama: bodega exacta por `osmosisStorageCode`, `defaultCarrierCode` obligatorio, alerta visible y éxito únicamente con ID externo. La prueba aislada reportó `PASS emulator: Cereza usa mapping+carrier, falla cerrado e idempotente` y confirmó un lote parcial: el pedido válido conservó su ID, mientras el no mapeado permaneció bloqueado. Sigue pendiente el valor real del carrier de OMS y el canario autorizado; por eso la activación automática de `orders/paid` permanece apagada aunque la ruta ya está preparada.

El processor `orders/paid` ya quedó conectado a `LogisticsManager` detrás de `shopifyOrderLogisticsMode = off | shadow | active`, ausente=`off`; `paidOrderAutoPushMode` sigue aceptado como alias legacy. La huella `orders/{orderId}.logisticsEffect.osmosis` es independiente de inventario y usa un claim temporal para impedir dos pushes concurrentes. La prueba aislada reportó:

`PASS emulator: pago tardío usa Logística con off/shadow/active e idempotencia`

Cubrió apagado sin llamada externa, sombra de bodega/carrier sin escrituras, pago no elegible, dos eventos concurrentes con una sola llamada, retry después de ID externo y fallo visible sin cambiar a despachado. Una prueba adicional hizo competir el flow `orders/create` contra `orders/paid`: ambos usaron `logisticsEffect.osmosis` y solo uno llamó Logística. El processor Shopify existente volvió a pasar completo con logística apagada.

## Cancelación Cereza y carrera con el push

`orders/cancelled`, el flow y el módulo Logística convergen en `orders/{orderId}.logisticsEffect.osmosisCancellation`; no llaman al provider por rutas paralelas. Sin ID externo y sin push activo no hacen ninguna llamada. Si el push está en curso, dejan `waiting_for_external_id`; al volver Cereza, el ID se persiste pero una transacción impide cambiar `Cancelado` a `EnDespacho`, y se ejecuta una sola cancelación externa.

Prueba Firestore Emulator aprobada:

`PASS emulator: cancelación Cereza es idempotente y gana la carrera contra push`

Casos cubiertos: pedido nunca enviado, cancelación con ID, retry, modo sombra, rechazo visible sin revivir el pedido, cancelación manual por `LogisticsManager` resolviendo el pedido desde la guía, y cancelación que entra durante el POST de creación. En la carrera hubo un create y un cancel; `estadoProceso` permaneció `Cancelado`; las dos huellas terminaron exitosas. El documento de producto y sus precios permanecieron idénticos.

## Corte lógico OH MY STORE

Respaldo analizado en modo local/read-only:

- corte: `2026-07-22T21:18:59.182Z`;
- 440 pedidos: 220 con algún movimiento y 220 sin movimiento;
- 297 pedidos hoy elegibles: 139 con salida y 158 sin salida;
- 143 pedidos hoy no elegibles: 81 con salida y 62 sin salida;
- no se encontraron movimientos de devolución enlazados a esos pedidos en el corte;
- 282 auditorías `updateStock`: 139 exitosas y 143 fallidas;
- 142 fallos fueron `stock_insufficient`; uno, canal sin bodegas;
- 1.668 movimientos: 827 con código vigente, 245 con document ID de Firestore y 596 con código histórico/ausente del maestro actual.

El resultado es reproducible con `inventory:cutoff:analyze` sobre el respaldo lógico. La salida es agregada y no imprime clientes, productos ni pedidos.

Conclusión: el descuadre no se puede reparar copiando el estado actual. Hay pedidos elegibles sin salida y pedidos no elegibles con salida. La migración histórica requiere evidencia por movimiento/bodega; los ambiguos no se corrigen automáticamente.

## Gate pendiente

- Las rutas están conectadas en la rama, pero todas siguen en `legacy/off`.
- No activar flags de OMS.
- Los fixtures reales de controladores, pago tardío y despacho están aprobados; falta ejecutar y observar el shadow con datos nuevos.
- Clasificar pedidos históricos; el shadow no debe corregirlos.
- El primer canario debe usar pedidos nuevos posteriores a la huella, una bodega y aprobación explícita.
