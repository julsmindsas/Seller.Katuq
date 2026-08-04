# Diseño: maestro de combos + agregado rápido al carrito

## Context

No existe hoy ninguna entidad "combo" en el proyecto — se confirmó por búsqueda exhaustiva en ambos repos (ver `proposal.md`, sección Why). El alcance de este cambio se acotó en conversación directa con el usuario (dueño del ticket), resolviendo tres preguntas abiertas antes de diseñar:

1. **Modelo de línea**: el combo se "explota" en N líneas normales de carrito al agregarlo — NO es una línea colapsada con precio propio. Confirmado por el usuario: *"cuando yo le de click a ese combo automaticamente se agreguen los productos al carrito que estan asociados a ese combo... de ahi se sigue la venta sin problema"*.
2. **Composición**: maestro fijo definido por un admin (opción elegida explícitamente sobre "combo dinámico armado en el carrito").
3. **Shopify**: fuera de alcance — solo canal directo/POS.

Esta decisión evita por completo tocar `orderCalculationService.js`: al no existir una línea "combo" con precio propio, el motor de cálculo nunca necesita aprender un concepto nuevo — cada línea del combo es indistinguible, para el motor de precios, de una línea agregada manualmente.

## Goals / Non-Goals

**Goals:**
- Un admin arma un catálogo de combos (nombre + lista de productos) sin necesidad de definir un precio.
- El vendedor, en venta asistida, agrega un combo completo al carrito con un solo click.
- Los productos que requieren configuración adicional (`requiereConfiguracion()`) quedan visualmente marcados en el carrito en vez de bloquear el agregado masivo con N modales.
- El precio total del combo es siempre la suma exacta de sus líneas, sin lógica de cálculo nueva.

**Non-Goals:**
- No se crea un tipo de producto "combo" vendible por sí mismo, ni se sincroniza a Shopify.
- No se le da precio propio al combo, ni una forma de "descuento de combo" nueva — el mecanismo existente de `descuentosPromociones` (por producto/categoría) ya cubre "precio individual" si se necesita.
- No se valida disponibilidad conjunta ("todo o nada" si falta stock de un componente) — cada línea sigue las reglas de disponibilidad que ya aplican hoy a un producto agregado individualmente.
- No se toca `orderCalculationService.js`, `resolverPrecioLinea` ni ningún consumidor de precio por línea (PDF, SIIGO, World Office) — quedan exactamente igual porque no hay concepto nuevo que resolver a ese nivel.

## Decisions

### 1. El combo vive en su propia colección, sin precio, con snapshot denormalizado de productos

`combos` (Firestore): `{ nombre, descripcion, productos: [{ productoId, referencia, nombre }], activo, company, creadoEn }`. Se denormaliza `referencia`/`nombre` del producto en el momento de armar el combo (igual que `descuentosPromociones` denormaliza `productoNombre`/`productoReferencia` en `CAMPOS_EDITABLES`, `descuentosPromociones.js:20-21`) para que la pantalla de administración liste combos sin un join extra a `products`. El `productoId` es la fuente de verdad para resolver el producto real al agregar al carrito (igual que el resto del proyecto: `products.cd` como Firestore doc ID, ver convención de IDs en `CLAUDE.md`).

**Por qué sin precio**: es el requisito explícito del ticket ("sin precio para combo... el precio del combo es la suma de los productos agrupados") y evita duplicar la fuente de verdad del precio — el precio de cada producto (incluyendo `preciosPorTipoCliente`, precios por volumen, IVA) ya vive resuelto en el producto y en el motor de cálculo del pedido; un precio de combo propio se desincronizaría con cualquier cambio de precio de sus componentes.

### 2. CRUD backend espejo de `descuentosPromociones.js`, no de `cupones.js` (legacy)

`descuentosPromociones.js` es el patrón activo del proyecto (reemplazó a `cupones.js`, marcado legacy en `carrito.component.ts` según `CLAUDE.md` del módulo). Se replica su estructura: whitelist `CAMPOS_EDITABLES` para create/edit (evita que el cliente escriba `company`/`creadoEn`/campos arbitrarios), función `validarCombo` (tipos y presencia de `productos` no vacío), `ordenarPorCreadoDesc` (evita índice compuesto de Firestore combinando `where(company)` + orden en memoria, mismo truco que `descuentosPromociones.js:70-78`).

### 3. Maestro cacheado igual que `categorias`/`adiciones`, no un servicio aparte

`combos` se agrega como una llave más al `forkJoin` de `PedidosUtilService.getAllMaestros()` (`pedidos.util.service.ts:204-253`), con el mismo `catchError` defensivo (`of([])` si falla) que ya tienen todos los demás maestros. `MaestroService` gana `getCombos()` → `GET /v1/combos/all`, `createCombo()`/`editCombo()` → `POST /v1/combos/create`/`/edit`, mismo patrón que `getCategorias()`/`createCategorias()` (`maestro.service.ts:433-439`).

**Trade-off aceptado**: el caché de maestros se refresca al login (o al invalidar caché manualmente, patrón ya existente para otros maestros) — si un admin edita un combo, los vendedores con sesión activa no lo ven hasta refrescar. Es el mismo comportamiento ya aceptado para `categorias`/`adiciones`, no se resuelve distinto aquí para no introducir una excepción al patrón.

### 4. Agregar combo = N llamadas a la lógica de "agregar un producto", no una función nueva de bulk-insert

**Hallazgo durante implementación, no previsto en el diseño original**: el catálogo de venta asistida (`EcomerceProductsComponent`) es paginado/buscado — `this.productos` solo contiene la página o resultado de búsqueda actual, NO todo el catálogo. Resolver los `productoId` de un combo contra ese array local habría fallado silenciosamente para cualquier producto que no estuviera en la página cargada en ese momento (el caso normal). Se corrige con un endpoint nuevo `POST /v1/productos/by-ids` (`functions/controllers/productos.js::getByIds`, espejo del batch-fetch + enrichment de stock/promo que ya usa `quickSearch`) — `agregarCombo` resuelve los productos del combo por ID directo contra Firestore, no contra el catálogo en memoria.

`agregarRapido(producto)` (`ecomerce-products.component.ts:1281+`) ya resuelve todo lo necesario para una línea individual (cantidad mínima, precio por categoría de cliente, entrega por defecto) cuando el producto NO requiere configuración. Se extrae esa resolución a un método privado (`agregarProductoAlCarrito(producto)`, nombre tentativo) que:
- `agregarRapido` sigue llamando exactamente igual (comportamiento observable intacto — mismo caso de "no requiere configuración").
- El nuevo `agregarCombo(combo)` itera `combo.productos`, resuelve cada `productoId` contra el catálogo cargado, y por cada uno:
  - Si `!requiereConfiguracion(producto)` → llama al método extraído (se agrega tal cual `agregarRapido`).
  - Si `requiereConfiguracion(producto)` → **se agrega igual al carrito** (no abre modal, no bloquea el loop) con `configuracion: null` y un flag nuevo `_requiereConfiguracionPendiente: true` en el ítem de carrito.

**Por qué no abrir el modal por cada producto que lo requiera**: la alternativa (abrir N modales secuenciales) es exactamente el flujo lento que el ticket busca evitar ("solución que podría ser light de implementar"). Marcar y diferir es más simple de implementar y más rápido para el vendedor — completa la configuración de las líneas marcadas cuando quiera, antes de cerrar la venta.

### 5. La pill/banner en el carrito reabre el modal existente, en modo edición de línea

`CarritoComponent` recorre las líneas (`productInCart`); las que tengan `_requiereConfiguracionPendiente === true` muestran un pill (mismo lenguaje visual que el badge `-X%` de descuento ya usado en `checkout.component.html`, tema `openspec/specs/design-system/spec.md`). Click en la pill invoca `configurarProducto(producto, cartItemId existente)` — el modal de configuración YA existe (`configurarProducto`, `ecomerce-products.component.ts` línea ~1285 referenciada desde `agregarRapido`); se reusa pasándole el `cartItemId` de la línea para que, al guardar, actualice esa línea (`CartSingletonService.updateProductQuantity`, que ya soporta merge por índice, `cart.singleton.service.ts:95-100`) en vez de agregar un ítem duplicado, y limpie `_requiereConfiguracionPendiente`.

### 6. Guard de checkout — por confirmar en implementación, no asumido aquí

El ticket no especifica si debe **bloquear** el checkout con líneas pendientes o solo advertir. Se investiga en la fase de implementación (tarea dedicada) si ya existe algún punto de validación de "producto sin configurar" antes de decidir dónde agregar el guard — evitar duplicar una validación que ya exista en otro lugar del flujo de checkout.

### 7bis. Producto de un combo que ya no existe o está inactivo

No estaba resuelto: ¿qué pasa si, al hacer click en un combo, uno de sus `productoId` referencia un producto que fue desactivado o eliminado después de armar el combo? **Decisión**: `agregarCombo` resuelve cada `productoId` contra el catálogo cargado; si no lo encuentra o está inactivo, ese producto se **omite silenciosamente del agregado** (no bloquea el resto del combo) y se informa con un toast no bloqueante ("N producto(s) del combo ya no están disponibles y no se agregaron"). Mismo espíritu que el resto del proyecto: nunca romper el flujo de venta por un dato inconsistente, pero sin ocultar la inconsistencia (antipatrón "filtrar `active !== false` sin mostrar" ya documentado en `CLAUDE.md`).

### 7. Componente/módulo aparte, gateado por el maestro de roles dinámico — no un guard nuevo

La pantalla admin de combos es un módulo lazy-loaded propio dentro de `proceso` (mismo nivel que `descuentos-promociones`), no mezclado con el módulo de productos ni con el catálogo de venta asistida (consistente con la convención de "módulos con SRP" del proyecto).

**No se crea un guard de rol nuevo.** El proyecto no tiene un `RoleGuard` genérico por ruta — el patrón real, confirmado en código, es que la visibilidad de cada item de menú (`NavService.filterMenuItemsByAuthorization()`, `nav.service.ts:164-282`) se resuelve contra `authorizedMenuItems` en localStorage, una lista de paths que el backend arma dinámicamente según el maestro de roles/permisos de cada empresa (módulo `/rol`, CRUD de roles por-empresa, no un enum fijo). `descuentos-promociones` sigue exactamente este patrón: **sin guard propio en la ruta**, visible solo si el rol del usuario logueado tiene ese path habilitado — decisión que toma el propio admin de cada empresa desde el módulo de roles, no algo hardcodeado en el código.

Se decidió (confirmado con el usuario) replicar ese mismo patrón para combos: sin restricción hardcodeada a "Administrador"/"Super Administrador" — cada empresa decide qué rol puede administrar combos vía su maestro de roles existente, igual que ya decide quién administra descuentos y promociones. Esto evita introducir una excepción al patrón dominante (que solo existe hoy para dos casos especiales muy puntuales: `isOnlySuperAdministrador`/`isOnlyAdmin` en `NavService`, reservados al súper-admin de la plataforma y al admin de Julsmind específicamente — no aplican aquí).

Ruteo: `path: 'combos'` en `proceso-routing.module.ts` (mismo archivo donde vive `descuentos-promociones`, `proceso-routing.module.ts:57-60`), bajo el mismo `canActivate: [AuthGuard]` que ya protege todo el módulo `proceso` a nivel de sesión (`routes.ts:70-76`) — sin guard adicional.

### 8. Borrado de combo: soft-delete + hard-delete, espejo exacto de `descuentosPromociones`

`descuentosPromociones.js`/`.router.js` ya resuelve esto con dos rutas distintas: `POST /v1/descuentos-promociones/remove` (soft-delete, `activo: false`) y `POST /v1/descuentos-promociones/delete-permanent` (hard-delete, `descuentosPromociones.js` router líneas 74 y 92). Se replica igual para combos: `remove` (desactivar, reversible, no rompe pedidos históricos que ya se armaron citando ese combo) + `delete-permanent` (borrado real, para limpieza). Sin esto quedaba sin definir si "borrar un combo" afecta pedidos ya facturados que lo usaron — no aplica, porque el combo nunca se persiste en el pedido (Decisión 4: se explota en líneas normales de producto), así que borrar o desactivar un combo no toca ningún pedido existente.

### 9. Selector de productos en el admin: variante multi-select del typeahead ya existente

`crear-descuento-promocion.component.ts:207-232` ya implementa un typeahead server-side de productos (`productoInput$` con `debounceTime`+`switchMap` contra el buscador de catálogo, cachea resultados en `productosBuscados`) para un `ng-select` de selección **única** (`productoId`). Se reusa la misma lógica de búsqueda con `ng-select[multiple]="true"` para permitir seleccionar N productos al armar un combo — no se reimplementa la búsqueda, solo cambia el modo de selección del componente.

## Risks / Trade-offs

- **Refactor de `agregarRapido`** para extraer lógica reusable — riesgo de regresión en el flujo de agregado rápido individual, ya en producción. Mitigado con extracción quirúrgica + prueba manual antes/después (agregar un producto individual sin configuración, confirmar comportamiento idéntico).
- **Caché de maestros desactualizado** tras editar un combo — trade-off aceptado, igual que el resto de maestros (Decisión 3).
- **Checkout con configuración pendiente sin resolver** — riesgo de venta incompleta si no se agrega el guard adecuado; se resuelve investigando el flujo actual antes de implementar (Decisión 6), no se asume una solución.
- **Denormalización de `productos[].nombre`/`referencia` en el combo puede quedar obsoleta** si el producto se renombra después — mismo trade-off ya aceptado en `descuentosPromociones` para `productoNombre`; el `productoId` sigue siendo la fuente de verdad al momento de agregar al carrito (se resuelve el producto real, no se usa el snapshot para el precio).

## Migration Plan

1. Backend: `functions/controllers/combos.js` + `functions/routers/combos.js` (CRUD espejo de `descuentosPromociones.js`), registrar en `index.js`.
2. Frontend maestro: `MaestroService.getCombos()`/`createCombo()`/`editCombo()`, agregar `combos` al `forkJoin` de `PedidosUtilService.getAllMaestros()`.
3. Pantalla admin de combos (espejo de `descuentos-promociones.component`), con selector de productos reusando el buscador de catálogo existente.
4. Refactor quirúrgico de `agregarRapido` → extraer lógica reusable; prueba de regresión manual.
5. `agregarCombo(combo)` en `ecomerce-products.component.ts` + apartado "Combos" en el catálogo de venta asistida.
6. Pill/banner en `carrito.component.ts`/`.html`/`.scss` para líneas con `_requiereConfiguracionPendiente`, reabriendo `configurarProducto` en modo edición de línea existente.
7. Investigar y decidir el guard de checkout (Decisión 6) antes de darlo por cerrado.
8. Verificación manual end-to-end: crear un combo con 2+ productos (uno que requiera configuración, otro que no), agregarlo desde venta asistida, confirmar que el carrito muestra las líneas correctas + pill en la que lo requiere, completar la configuración desde la pill, y confirmar que el total del pedido es la suma exacta de los precios individuales (con IVA/descuento de línea funcionando igual que si se hubieran agregado uno por uno).

## Open Questions

1. **RESUELTO durante implementación — Guard de checkout: bloquear, no solo advertir.** Se investigó `checkout.component.ts` completo (1090 líneas): no existía ningún punto de validación de "producto sin configurar" en el flujo — `gotToPaymentOrder()` solo validaba forma de pago (`this.form.valid`). Se agregó el guard ahí mismo: si `pedido.carrito` tiene alguna línea con `_requiereConfiguracionPendiente === true`, se bloquea con `mostrarError()` listando los productos pendientes, mismo patrón que el guard de forma de pago existente. Se eligió **bloquear** (no solo advertir) porque vender sin esa configuración (fecha de calendario, variable, mensaje de tarjeta, adiciones) puede dejar producción/fulfillment sin datos que ya no se pueden pedir después de cobrado el pedido — el costo de un click extra es menor que el de una venta con datos de producción incompletos.
2. **Invalidación de caché de maestros al editar un combo**: ¿aceptar el mismo trade-off que `categorias`/`adiciones` (refresca al login) o vale la pena invalidar el caché de `combos` específicamente al guardar? Por defecto se sigue el patrón existente; se revisita solo si en la práctica genera fricción reportada por usuarios.
