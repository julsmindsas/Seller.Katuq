## Why

La pantalla de alistamiento ("Picking y packing" en el menú) da 404 en producción. Llama a `POST /v1/picking`, `GET /v1/picking/:id` y `POST /v1/picking/:id/completar`, y esas rutas no existen. El servidor las tiene en `/v1/inventory/picking/iniciar`, `/completar` y `/estado/:ordenId`, y la consulta del estado es **por pedido**, no por id de picking. La pantalla está en los roles de 6 empresas (Dulces Mafe, Mi Campo Verde, HASU, Yavalva, HARMONY LENS y OH MY STORE). Daniel decidió terminarla, no quitarla.

Al revisar el código para terminarla (2026-10-08) salió más que las tres rutas:

- **La pantalla está rota por más lados.** `GET /v1/bodegas` y `GET /v1/productos` tampoco existen (la pantalla "Nuevo picking" se queda cargando para siempre); buscar un pedido por número devuelve una lista y la pantalla espera un pedido; el detalle abre el pedido con su id interno aunque la búsqueda es por número; los productos del pedido se leen de un campo que el pedido no tiene (`productos`; el real es `carrito`); y la bodega se manda con el id interno de Firestore cuando el servidor exige el código de negocio (BOD-001).
- **Hay un defecto multiempresa en el servidor.** Probado con una base simulada: con el código de hoy, una empresa con una bodega propia llamada BOD-001 inicia el alistamiento de un pedido de OTRA empresa (responde 200), le cambia el estado a `EnPicking` y deja un picking a su nombre. Lo mismo pasa al completar el picking de otra empresa, al iniciar y completar el packing, y, con un picking cruzado creado por ese mismo hueco, la consulta del estado devuelve datos del pedido ajeno.
- **Las garantías de "una sola vez" solo valen en llamadas seguidas.** El estado del picking se lee y se valida fuera de la transacción: dos "completar" simultáneos (dos pestañas, un reintento) descuentan el inventario dos veces, y dos "iniciar" simultáneos crean dos alistamientos activos. Además el servidor deja iniciar de nuevo un pedido que ya pasó por el alistamiento (`ListoParaPacking`, `EnPacking`, `ListoParaDespacho`) y volver a completarlo.
- **La consulta del estado del picking exige un índice compuesto que no está declarado** en `firestore.indexes.json` (empresa, pedido y fecha; el equivalente de `packing` sí está). Ese archivo está desactualizado respecto a la base viva, así que puede existir o no; el cambio evita depender de él.
- **Hay riesgos de fondo que este cambio NO resuelve** y que Daniel tiene que decidir antes de encender la función en un comercio real: al completar se descuenta inventario por segunda vez (ya se descontó al crear el pedido), completar falla con 2 o más productos, el alistamiento deja el pedido en estados que el resto de la app no conoce, la lista de pedidos pendientes se llena de pedidos ya alistados y a iniciar se le exige un saldo que la venta ya descontó. Están documentados con evidencia en `design.md` (R1, R2, R3, R8, R10).
- **La función ya estaba en los roles de 6 empresas.** Arreglar la pantalla la volvería funcional de golpe para ellas, incluida OH MY STORE (cliente actual, con Shopify). La regla de Daniel es que toda función nace **apagada** y se enciende por comercio, probándola primero en FLORECER.

## What Changes

Un solo cambio, en tres partes (primero la bandera y el servidor; el front después):

| Parte | Qué hace |
|---|---|
| **Bandera por comercio** (catálogo de `companyFeatureFlags.js` y de `company-features.service.ts`) | Suma `pickingAlistamiento` al catálogo cerrado, siguiendo el contrato común (campo `featureFlags` del documento de la empresa; ausente o distinto de `true` = apagada). Nace apagada para todos. |
| **Servidor** (`katuq_admin_back_firebase`) | Candado multiempresa en las 6 rutas del alistamiento: el pedido, el picking o el packing tienen que ser de la empresa que llama, y si no, 404 con el mismo texto de "no existe"; lo mismo para el pedido o el picking enlazados. La empresa sale del token firmado (`requireJwtTenant`). Las 4 rutas que **escriben** (iniciar y completar, de picking y de packing) quedan detrás de la bandera (403 sin ella). Iniciar y completar el picking se vuelven seguros ante llamadas simultáneas (el estado se vuelve a leer dentro de la transacción) y un pedido ya alistado no se inicia otra vez. Consulta del estado del picking sin `orderBy` (no necesita índice nuevo). Tres pruebas: aislamiento y concurrencia (base simulada), contrato del write-set y rutas con bandera. **No toca cómo se escribe el inventario.** |
| **Front** (`Seller.Katuq`) | Sin la bandera: la entrada "Picking y packing" no sale en el menú y las direcciones del módulo llevan a la página de inicio con un aviso. Con la bandera: la pantalla usa las rutas reales; consulta el alistamiento por pedido (la URL lleva el número del pedido); los productos salen del carrito del pedido; la bodega va por código de negocio y se sugiere la del pedido; "Nuevo picking" (ruta propia, sin número) pasa a "Elegir el pedido"; antes de completar se avisa que se descuenta inventario; los errores se explican sin jerga y nombran el pedido y el producto. El servicio pasa a extender `BaseService`. |

Lo que se ve por fuera:

- **Con la bandera apagada (el estado de todas las empresas):** no se escribe nada desde el alistamiento. Las 4 rutas que escriben responden 403 "Esta función todavía no está activa para tu empresa…". La única diferencia visible es que las 6 empresas que tenían la entrada en el menú ya no ven una entrada que lleva a una pantalla que falla.
- **Con la bandera prendida (solo FLORECER al principio):** la pantalla funciona de punta a punta, con los riesgos de `design.md` a la vista.

## Capabilities

### New Capabilities
- `picking-feature-flag`: el alistamiento nace apagado y se enciende por comercio.
- `picking-tenant-isolation`: el alistamiento solo toca documentos de la empresa que llama (pedido, picking y packing, y los que enlazan).
- `picking-screen`: la pantalla de alistamiento contra las rutas reales, consultando por pedido y con errores comprensibles.
- `picking-write-set`: qué escribe el alistamiento en `inventory`, `inventoryMovement` y `orders`, y que cada paso ocurre una sola vez; fijado por pruebas.

### Modified Capabilities
- Ninguna archivada.

## Impact

- **Backend:** `functions/controllers/inventory.js` (candado de empresa y su uso en 6 funciones, transacciones de iniciar y completar el picking, la consulta del estado), `functions/routers/inventory.js` (`requireJwtTenant` en 6 rutas y `requireFeature` en 4), tres pruebas nuevas en `functions/tests/inventory/`, y una línea en el catálogo de `functions/services/companyFeatureFlags.js` con su prueba (`functions/tests/companies/companyFeatureFlags.test.js`).
- **Front:** `picking-packing.service.ts`, los dos modelos, `picking-list` y `picking-detail` (ts y html), el módulo de rutas del alistamiento, el guard nuevo `picking-alistamiento.guard.ts`, el archivo puro nuevo `picking-mensajes.ts`, `nav.service.ts` (la entrada del menú solo con la bandera), una línea en `company-features.service.ts`, y las pruebas en `tests/picking-packing/` y `tests/navigation/` (la de `nav-responsive` recibe un cuarto argumento porque `NavService` ahora lo pide).
- **Datos:** sin colecciones nuevas, sin índices nuevos, sin migración. La bandera se escribe con el script que ya existe (`functions/scripts/set-company-feature.js`).
- **Otros llamadores:** ningún agente (Opttia/ADK, MCP) ni la app móvil llama estas rutas (verificado el 2026-10-08). La migración a Angular 21 (`Seller.Katuq.Angular21`) tiene servicios listos de picking y de packing sin uso todavía: al conectarlos tendrán que respetar el 403.
- **Módulos sensibles (`orders`, `inventory`):** un cambio a la vez. El diff se aprueba antes de aplicar. El write-set queda declarado en la spec `picking-write-set`: `picking`, `packing`, `inventory`, `inventoryMovement` y `orders`; **nunca** `products`, variantes, precios ni listas de precios (prueba de contrato).
- **Riesgo:** ver `design.md`, riesgos R1 a R11. Los graves existen hoy en el código y **solo se vuelven alcanzables en las empresas que tengan la bandera prendida**. La bandera no se enciende en ninguna empresa real hasta que Daniel decida R1, R3 y R8; y **nunca en OH MY STORE (ni en otra empresa con Shopify o WooCommerce) mientras completar publique existencias por el camino viejo**: D-134 pide para eso un camino solo de stock, con bandera, modo sombra e interruptor de apagado.
- **Regla de banderas por comercio:** aplicada (antes de la revisión no lo estaba). El nombre `pickingAlistamiento` no es de Effix; se suma al catálogo cerrado con el procedimiento que el propio archivo documenta.
- **Verificación contra la constitución:** I (spec primero): esta propuesta. VIII (contract test): `pickingPackingWriteSet.contract.test.js`. IX: HTTP por servicio que extiende `BaseService`; lo demás del artículo (signals, OnPush, `@if`) no aplica a un módulo existente en Angular 14. XI: no se agregan logs. XII: bandera por comercio, apagada por defecto. XIII: cada spec cabe en 3 páginas. XIV: decisión **D-???** (el número lo asigna quien haga el commit, mirando `specs/CONTRACT.md` del remoto).

## No-goals

- Cambiar cómo se escribe o se descuenta el inventario. Si `completarPicking` mueve stock, se documenta y se marca el riesgo; no se toca (instrucción de Daniel). Por eso tampoco se arregla la falla con 2 o más productos (R2): hoy es lo que impide que el descuento doble se extienda a pedidos de varios productos.
- Quitar la validación de existencias de iniciar (R10): se decide junto con R1.
- Cambiar los estados del pedido que escribe el alistamiento (`EnPicking`, `ListoParaPacking`, `EnPacking`, `ListoParaDespacho`).
- Arreglar la lista de pedidos pendientes (`GET /orders/pending`, R8): es del módulo de pedidos y necesita su propia propuesta.
- Arreglar la pantalla de **packing** (tiene sus propios desajustes; ver `design.md`, "Lo que no se entrega") ni darle candado de concurrencia a sus rutas (no mueve inventario; R11).
- Un listado de alistamientos en curso (no hay endpoint de listado).
- Control por rol en el servidor (hoy cualquier usuario autenticado de la empresa con la bandera puede; el menú lo limita).
- Migrar el módulo a componentes standalone, signals o `@if` (Angular 14).
- Crear colecciones, endpoints `v2` o cachés.
- Tocar productos, variantes, precios o listas de precios (D-134).
