# Diseño: asignación automática de bodega por línea

## Context

Solo tres lugares escriben un pedido nuevo: `controllers/orders.js` create (venta asistida, POS, iOS), `orderService.createOrder` (flows, tiendas, webhooks) y `cotizacionService` (camino muerto desde la UI). El inventario del pedido se descuenta en seis puntos distintos (rollout legacy/ledger, `sites.js` directo, `updateByChannelFromWebhook`, nodo `katuq-inventory-adjust`, `virtualStoreWebhook`, edición). El ledger ya acepta `commitAllocations` explícitas y guarda `inventoryEffect.appliedAllocations`.

## Goals / Non-Goals

**Goals:** una sola función de asignación, determinista, multi-tenant, sin configuración; que todo descuento del pedido la respete.

**Non-Goals:** reparto en venta asistida/POS/tiendas; despacho por partes; reservas.

## Decisions

### 1. Cuándo se asigna
Se asigna cuando el pedido se crea **sin bodega escogida por una persona**:
- `katuq-order-upsert` (todo flow de integración) y los webhooks de integración: siempre. La bodega que traiga el mapeo pasa a ser `preferredWarehouse` (desempate), no una imposición.
- `controllers/orders.js` create y `orderService.createOrder` con `bodegaId` vacío.
- Con bodega escogida (venta asistida, POS, iOS, tienda Katuq): no se asigna; todas las líneas heredan `bodegaId` como hoy.
La asignación corre antes de persistir y antes de cualquier descuento. Nunca se reasigna un pedido ya creado.

### 2. Bodegas candidatas (cero configuración)
1. Canal del pedido: por `channelId` si existe; si no, por nombre + tipo, filtrado por `company`. Asociaciones validadas: la bodega existe y es de la misma empresa (hay 9 asociaciones cruzadas de clones).
2. Si el canal no se reconoce o tiene cero asociaciones: todas las bodegas de la empresa.
3. En ambos casos se excluyen `tipo = Transaccional` y las inactivas (`active === false` o `activo === false`; el campo es inconsistente en datos).

### 3. Afinidad de proveedor (regla dura)
Firma de proveedor del producto (desde el maestro, solo lectura): `integrations.osmosis` → Cereza; `integrations.fulfillment.provider` → ese proveedor; nada → propio. Firma de la bodega: `osmosisStorageCode` → Cereza; `fulfillmentProvider` → ese proveedor; nada → propia. Una línea solo puede ir a bodegas con su misma firma. Si no hay ninguna compatible, cae a las candidatas generales y el pedido queda con atención "producto sin bodega de su proveedor".

### 4. Elección (determinista)
Para cada línea se calcula el conjunto de bodegas compatibles con existencias suficientes (`inventory` normalizado por docId/referencia y deduplicado, como exige CLAUDE.md).
1. Si una bodega cubre todas las líneas: todo va ahí.
2. Si no: cobertura voraz — se toma la bodega que cubre más líneas pendientes, se le asignan, y se repite.
3. Desempates, en orden: bodega que ya es parte del pedido → misma ciudad del envío (texto normalizado: minúsculas, sin tildes, sin "D.C." ni departamento, contra `ciudad` y `ciudadesCobertura[].nombre`) → `preferredWarehouse` → más unidades disponibles → menor `idBodega`. La ciudad va antes que la preferida porque en Shopify la preferida es la constante del mapeo (Cereza Medellín) y anularía la regla de cercanía.
4. Línea sin existencias suficientes en ninguna compatible: va a la compatible con más unidades (política de negativo visible), y queda registrada en `warehouseAllocation.shortages`.
5. Una línea nunca se divide.

### 5. No inventariables
La bodega compatible desde donde más unidades han salido según `inventoryMovement` (empresa + producto, solo bodegas candidatas; empate → la más reciente). No la última salida: en ORE-001393 la última fue justo el descuento erróneo en Cereza Medellín. Sin historia: se suma a la parte con más líneas compatible con su firma; si ninguna, a la candidata de menor código.

Línea cuyo producto no existe en Katuq (referencia sin resolver): no se conoce su proveedor, es compatible con cualquier bodega y se suma a la parte más grande; no arma una parte propia.

### 6. Qué se guarda
- `carrito[i].idBodega`: código de negocio.
- `bodegaId`: la bodega de la parte de mayor valor (compatibilidad con reportes, SIIGO, pantallas, push actual).
- `warehouseAllocation`: `{ mode: 'automatic'|'shadow', version, decidedAt, candidates, parts: [{idBodega, lines}], shortages, reasons }`.
- Más de una bodega: `requiereAtencionLogistica: true`, `motivoAtencion: 'varias_bodegas'` hasta que exista el cambio 3.

### 7. Descuento por línea
- Ledger: el rollout pasa `commitAllocations` agregadas por producto + bodega desde las líneas.
- Legacy: `updateByChannel`, `updateByChannelFromWebhook` y el nodo `katuq-inventory-adjust` usan `carrito[i].idBodega` cuando existe; sin él, comportamiento actual.
- Flow Shopify OMS: el mapeo de ajuste toma la bodega de cada línea, con la del config como respaldo. Versión nueva del flow, la anterior queda para revertir.

### 8. Encendido
`ALLOCATION_MODE` global (`off|shadow|active`) y `companyConfig.warehouseAllocation.mode` por empresa (gana la empresa). Sombra: calcula y guarda `warehouseAllocation` con `mode: 'shadow'` sin cambiar líneas ni descuento. Una semana de sombra en todas las empresas, comparación con lo que hizo el sistema, y luego activo. Los flags se retiran (Artículo XII) cuando el modo activo cumpla 30 días sin incidentes.

## Risks / Trade-offs
- Prueba en solo lectura sobre los 20 pedidos de integración reales desde agosto (2026-10-06): solo ORE-001393 queda en varias bodegas (Distri Sex + Fullpi Medellín + Cereza Medellín, cliente en Medellín); los demás quedan en una bodega. Tiempo medido desde local 0,8–2,5 s por pedido (idas y vueltas a Firestore); se mide en el servidor durante la sombra.
- Lecturas extra al crear el pedido (inventario por bodega candidata): acotadas a las líneas del pedido y a las bodegas candidatas; sin caché nueva.
- La cobertura voraz no es óptima en todos los casos; es explicable, determinista y suficiente para carritos de pocas líneas.
