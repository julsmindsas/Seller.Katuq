# Propuesta: Maestro de combos + agregado rápido al carrito en venta asistida

## Why (con datos reales, no asunciones)

Ticket ClickUp `wdu9v75qqj` (space MODO CRITICO, lista LISTA DE MODO CRITICO), creado por Jairo Arango, asignado a Julian Navarro: *"Gestión de combos: (ampliar) sin precio para combo, si es un precio individual manejar por código descuento, el precio del combo es la suma de los productos agrupados."* Sin descripción adicional ni comentarios — el alcance se aclaró en conversación directa con el usuario antes de escribir esta propuesta (ver Decisions en `design.md`).

**Confirmado en código: la funcionalidad de "combo" no existe hoy en ninguno de los dos repos.** Los únicos hits de la palabra son falsos positivos: un atajo de teclado comentado (`pos-crear-ventas.component.ts:197`), "Combos" como categoría de ejemplo en el wizard de onboarding para restaurantes (`onboarding\steps\categories-step.component.ts:35`), y "combo"/"combinations" en el mapper de variantes de Shopify (`services\shopify\mappers\variant.js:139-144`) que se refiere a combinaciones de opciones de variante (talla × color), no a un producto agrupado.

Lo que sí existe y es directamente reusable:
- **Descuento por código, ya maduro**: `descuentosPromociones` (colección Firestore, `functions/controllers/descuentosPromociones.js` + `functions/routers/descuentosPromociones.js`, montado en `/v1/descuentos-promociones` — `index.js:435,656`). Soporta `tipo: 'porcentaje'|'valor_fijo'|'envio_gratis'`, target por `categoriaId`/`productoId`, `combinable`. Es el mecanismo que el ticket pide reusar para "precio individual" del combo — **no se amplía en esta propuesta**, se usa tal cual ya existe.
- **Flag de "requiere configuración" por producto, ya en producción**: `producto.procesoComercial.configProcesoComercialActivo` + sub-flags (`llevaCalendario`, `aceptaVariable`, `llevaTarjeta`, `aceptaAdiciones`, `aceptaOcasion`, `aceptaGenero`, `aceptaComentarios`, `aceptaColorDecoracion`), evaluado por `requiereConfiguracion(producto)` en `src\app\components\ventas\catalogo\ecomerce-products\ecomerce-products.component.ts:1182-1203`.
- **Flujo de "agregar rápido"**: `agregarRapido(producto)` (mismo archivo, línea 1281+) ya resuelve cantidad mínima, precio por categoría de cliente y datos de entrega por defecto para un producto que NO requiere configuración; si lo requiere, abre el modal de configuración en su lugar (`configurarProducto`, línea 1285).
- **Patrón de "maestro" cacheado al login**: `PedidosUtilService.getAllMaestros()` (`src\app\components\ventas\service\pedidos.util.service.ts:197-260`) hace `forkJoin` de todos los `getX()` de `MaestroService` (`src\app\shared\services\maestros\maestro.service.ts`) y cachea el resultado por empresa.

## What Changes

- **A. Nuevo maestro de combos (Firestore, sin precio propio).** Colección `combos` (español camelCase, siguiendo la convención más viva del proyecto — `descuentosPromociones`, no la legacy `cupones`). Cada combo: `nombre`, `descripcion`, `productos: [{ productoId, referencia, nombre }]` (snapshot denormalizado, mismo patrón que `productoId`/`productoNombre` en `descuentosPromociones`), `activo`, `company`. **Sin campo de precio** — decisión de diseño explícita, no un olvido.
- **B. CRUD backend**, espejo de `descuentosPromociones.js`: `functions/controllers/combos.js` + `functions/routers/combos.js`, montado en `/v1/combos`. Reusa el mismo patrón de `CAMPOS_EDITABLES` (whitelist), validación de tipos/rangos, `ordenarPorCreadoDesc`, filtro por `company`.
- **C. Pantalla admin de combos**, espejo de `descuentos-promociones.component`: listar/crear/editar combos, seleccionando productos desde el buscador de catálogo ya existente en el proyecto.
- **D. Maestro cacheado en frontend**: `MaestroService.getCombos()`/`createCombo()`/`editCombo()` + `combos` agregado al `forkJoin` de `PedidosUtilService.getAllMaestros()`, mismo patrón que `categorias`/`adiciones`.
- **E. Apartado "Combos" en el catálogo de venta asistida** (`EcomerceProductsComponent`). Click en un combo → se agregan al carrito, como líneas normales independientes, todos los productos asociados:
  - Producto sin `requiereConfiguracion()` → se agrega igual que `agregarRapido` (cantidad mínima, precio por categoría, entrega por defecto).
  - Producto con `requiereConfiguracion() === true` → **se agrega también** (no bloquea el flujo abriendo N modales), pero la línea queda marcada con un flag nuevo (`_requiereConfiguracionPendiente: true`) que el carrito muestra como banner/pill visual, para que el vendedor la complete antes de cerrar la venta.
  - Refactor quirúrgico: se extrae de `agregarRapido` la lógica de "agregar un producto individual resolviendo cantidad mínima + precio por categoría + entrega por defecto" a un método privado reusado por `agregarRapido` (comportamiento observable intacto) y por el nuevo `agregarCombo`.
  - Los productos del combo se resuelven contra Firestore vía `POST /v1/productos/by-ids` (nuevo, batch fetch por docId) — no contra el catálogo paginado/buscado en memoria del componente, que solo contiene la página actual (hallazgo durante implementación, ver `design.md` Decisión 4).
- **F. Carrito**: pill/banner "Requiere configuración" por línea marcada; click en la pill abre el modal de configuración existente (`configurarProducto`) pre-cargado para esa línea (edita in-place, no duplica el ítem).
- **G. Precio: sin cálculo nuevo.** El precio del combo emerge de sumar las líneas normales agregadas — cada una resuelve su propio precio/IVA/descuento igual que si el vendedor las hubiera agregado una por una manualmente. `orderCalculationService.js` no se toca.

## Impact

- Specs afectadas: nueva capability `combo-management` (delta nuevo).
- Backend: `functions/controllers/combos.js` (nuevo), `functions/routers/combos.js` (nuevo), `functions/index.js` (registro del router).
- Frontend: `src/app/shared/services/maestros/maestro.service.ts` (nuevos métodos), `src/app/components/ventas/service/pedidos.util.service.ts` (nueva llave `combos` en el `forkJoin`), nuevo componente admin `src/app/components/proceso/combos/` (mirror de `descuentos-promociones`), `ecomerce-products.component.ts` (refactor de `agregarRapido` + `agregarCombo` nuevo + apartado "Combos" en el catálogo), `carrito.component.ts`/`.html`/`.scss` (pill/banner de configuración pendiente).
- Nueva colección Firestore: `combos`. Multi-tenant: filtrado por `company`, igual que `descuentosPromociones`/`productos`.
- Sin cambios en `orderCalculationService.js`, sin sincronización a Shopify, sin cambios en inventario.
- Decisión registrada como **D-147** en `specs/CONTRACT.md` (próximo número libre confirmado — ver nota de colisiones vigente en `CONTRACT.md:2372-2380`).

## Riesgos / no-objetivos

- **No** crea un tipo de "producto combo" dentro de la colección `products` ni lo publica a Shopify — el combo vive únicamente como maestro propio y como atajo de UI en venta asistida/POS.
- **No** amplía el scope de `descuentosPromociones` para dirigirse a un "combo" como target — si se necesita un precio especial para un combo, se usa el mecanismo existente (código de descuento por producto/categoría), sin cambios al modelo de descuentos en este cambio.
- **No** toca `orderCalculationService.js` ni la resolución de precio/IVA por línea — cada producto del combo se comporta exactamente igual que si se hubiera agregado manualmente.
- **No** implementa validación de "todo o nada" por stock insuficiente de algún componente del combo — cada línea se valida individualmente por el flujo de venta ya existente (mismo comportamiento que agregar los productos uno por uno).
- Riesgo de regresión en `agregarRapido` al extraer su lógica interna a un método reusado por `agregarCombo` — mitigado con extracción quirúrgica sin cambiar el comportamiento observable de `agregarRapido` (contract test / prueba manual antes/después).
- Riesgo de que el checkout permita finalizar una venta con líneas `_requiereConfiguracionPendiente: true` sin completar — se investiga si hoy existe algún otro punto de validación de configuración antes de asumir dónde agregar el guard (tarea de implementación, no asunción).
