# Spec 004.5 — REVISION GUIA CEREZA (7 puntos del comerciante)

> Estado: **parcialmente implementado** (2026-05-21). Puntos 1, 5, 6 con fix
> ejecutable; Punto 2 standby; Punto 3 requiere clarificación; Puntos 4, 7
> sin acción del equipo.
>
> Origen: `Downloads/REVISION GUIA CEREZA.docx` enviado por el comerciante
> de OH MY STORE.

## Puntos y resultados

### ✅ Punto 1 — Producto WC dice "En stock" pero venta asistida dice 0 unidades

**URLs reportadas**:
- `https://ohmystore.shop/collections/juguetes/products/7-5-dazzle-studs-1`
- `https://ohmystore.shop/products/peluca-pink-8-60-cms`

**Causa raíz REAL detectada** (NO era cache desync como pensé al inicio):

`inventory` collection tenía **1,666 keys con docs duplicados** para mismo
`(productoId, idBodega)` en OH MY STORE. El writer `osmosisProductSyncService`
hacía `.add()` con doc auto-id cuando no encontraba el doc existente,
generando duplicados por race conditions/bugs históricos.

`productStockHelper.enrichProductsWithStock` dedupea con **first-wins** por
orden de query → cuando el primer doc tenía qty=0 y el max-doc tenía qty>0,
descartaba este último → la venta asistida (que lee el resultado enriquecido)
mostraba 0 unidades para 106 productos en producción.

**Fix aplicado (Opción A — patch helper, NO destructivo)**:
- `services/productStockHelper.js:73-110` — cambio de dedup `first-wins` a
  **MAX-WINS**: para cada `(pid, bodega)` toma el qty MAYOR entre los docs
  duplicados.
- Verificado con 30 productos del sample desync: 30/30 retornan qty correcto.

**Herramientas adicionales (no aplicadas, dejo decisión al usuario)**:
- `functions/scripts/cleanup-inventory-duplicates.js` — script idempotente
  con dry-run para limpiar 1,666 keys duplicadas. Estrategia: pickWinner
  por qty desc → updatedAt desc → createdAt desc → date_edit desc. Borra
  los perdedores en batches de 400.
- **Deuda 003.8 / 003.9**: cambiar writer `osmosisProductSyncService` para
  usar docId predictible `${productoId}_${idBodega}` con
  `.set({...}, {merge:true})` y prevenir nuevos duplicados.

### ⏸️ Punto 2 — Categorías Cereza → Katuq → web (STANDBY)

El usuario pidió explícitamente **dejar en standby**. Si surgía como
trabajo fácil del Punto 3, lo revisaría — pero P3 requirió clarificación
y no llegué a tocar P2.

### ❓ Punto 3 — Productos China + Tecnología deben aparecer en web

**Investigación realizada**: 0 productos en `OH MY STORE` tienen campos
`proveedor`, `idProveedor`, `origen`, `fabricante`, `pais_origen` con valores
"china" o "tecnologia". Tampoco aparece en `marca`, `etiquetas` o
`categorias`. `integraciones.osmosis` solo expone 4 campos (id, reference,
syncSource, lastSync) — no incluye proveedor sub-id de Cereza.

**Necesita clarificación del usuario**:
- ¿Cómo se identifican esos productos en Cereza? ¿Tienen un campo
  específico (proveedor_nombre, supplier_code, tag) que llega al sync?
- ¿Es un filtro lógico en la página web (Shopify collection) que NO
  depende de un campo del producto?
- ¿O es un campo en Cereza que NO está sincronizando a Katuq y hay que
  expandir `osmosisProductSyncService` para traerlo?

**Pendiente**: el usuario debe aclarar cómo se reconocen estos productos
para implementar el fix.

### ✅ Punto 4 — Pedido cuando se compra llega perfecto a Katuq

**Sin acción**: el usuario reporta que funciona. ✅

### ✅ Punto 5 — Auto-push a Cereza solo si pedido pagado

**Fix aplicado**: agregado gate `requirePaid` en el nodo
`services/flows/nodes/osmosis/osmosis-order-create.action.js`:

- Nuevo campo en schema: `requirePaid: { type: 'boolean', default: true }`.
- En `execute()`, antes del `mapKatuqOrderToOsmosis`: si `requirePaid` y
  NO `isPaid` → skip silencioso con item `{skipped: true, reason: 'not_paid', ...}`.
- `isPaid` se evalúa como: `pago.financialStatus === 'paid'` ó
  `estadoPago === 'PreAprobado'`.
- Pedidos no pagados: el operador los envía manualmente desde el módulo
  de logística (que llama el endpoint REST `osmosis-order-create` directo,
  NO el flow — no afectado por el gate).

### ✅ Punto 6 — Pedidos deben llegar a Cereza "PARA DESPACHAR" (no "SIN PRODUCIR")

**Resuelto indirectamente por P5**: el comportamiento de Cereza es:
- `is_paid: true` → orden marcada "PARA DESPACHAR".
- `is_paid: false` → orden marcada "SIN PRODUCIR".

Con el gate de P5 activo, solo se pushean órdenes pagadas → Cereza recibe
`is_paid: true` → "PARA DESPACHAR".

**Nota adicional del usuario**: "no están marcados en la creación del
producto, este producto se produce". Esto es un campo a nivel de producto
(no de pedido) en Cereza que indica si el producto requiere ciclo de
producción. **Fuera de scope** de este spec — requiere coordinación con
Cereza o flag manual por producto en Katuq.

### ✅ Punto 7 — Confirmar con Michael Pratt que envío manual desde logística llegó OK

**Sin acción del equipo**: requiere confirmación humana del comerciante
con su contacto. ✅

## Decisiones registradas

Ver CONTRACT.md § D-026.

## Archivos modificados / creados

- `services/productStockHelper.js` — dedup MAX-WINS (Punto 1 fix A).
- `services/flows/nodes/osmosis/osmosis-order-create.action.js` — gate
  `requirePaid` (Puntos 5+6).
- `scripts/cleanup-inventory-duplicates.js` (nuevo) — limpiador opcional
  para 1,666 docs duplicados (Punto 1 fix B, dry-run por default).

## Pendiente operativo

1. **Desplegar fix Punto 1** a prod (pull + restart EC2). Crítico: 106
   productos en venta asistida van a mostrar stock correcto inmediatamente.
2. **Decidir si correr** `cleanup-inventory-duplicates.js --apply --company "OH MY STORE"`
   en off-hours. Reduce 5,375 docs duplicados → 1,666 deletes neto.
3. **Clarificar Punto 3** con el comerciante: cómo identificar productos
   "China" + "Tecnología".
4. **Spec 003.8 / 003.9** para fix definitivo del writer
   `osmosisProductSyncService` (docId predictible) — previene futuros
   duplicados.
5. **Validar Punto 5** con próximo pedido NO pagado: confirmar que el
   flow lo skipea correctamente y aparece en `flow_runs` como
   `skipped: true, reason: 'not_paid'`.
