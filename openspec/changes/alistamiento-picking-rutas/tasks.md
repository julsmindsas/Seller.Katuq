## 0. Decisiones

- [x] 0.1 Terminar el alistamiento, no quitarlo (Daniel).
- [x] 0.2 Función nueva = nace apagada y se enciende por comercio, con FLORECER como prueba: bandera `pickingAlistamiento` (regla de Daniel; implementada en esta propuesta).
- [ ] 0.3 Aprobar este diff (bandera, servidor y front) antes de aplicarlo.
- [ ] 0.4 Decidir R1 (descuento doble: A, B o C), R3 (estados de pedido) y R8 (lista de pendientes) antes de encender la bandera en una empresa **real**; R10 se decide junto con R1 (`design.md`, Open Questions). Para FLORECER no hace falta.
- [ ] 0.5 Registrar la decisión como D-??? en `specs/CONTRACT.md` (el número lo asigna quien haga el commit, mirando el contrato del remoto).

## 1. Bandera por comercio (catálogo; archivos del contrato común, una línea en cada uno)

- [x] 1.1 `pickingAlistamiento` en `FEATURE_FLAG_NAMES` de `functions/services/companyFeatureFlags.js` y en la prueba que fija el catálogo (`functions/tests/companies/companyFeatureFlags.test.js`).
- [x] 1.2 `pickingAlistamiento` en `COMPANY_FEATURE_FLAGS` de `src/app/shared/services/company-features.service.ts`.

## 2. Servidor: candado multiempresa, una sola vez y bandera (módulo sensible: un cambio a la vez, diff y aprobación)

- [x] 2.1 Prueba de aislamiento y concurrencia con base simulada que serializa transacciones: falla con el código de hoy y pasa con el parche (`functions/tests/inventory/pickingTenantIsolation.test.js`, 37 comprobaciones; cada candado nuevo se verificó quitándolo).
- [x] 2.2 Prueba de contrato del write-set: sin `products`/precios, solo las colecciones del contrato, solo `completarPicking` mueve stock, candado de empresa antes de la primera escritura, estado del picking leído dentro de la transacción, pedido enlazado validado antes de escribir, las 6 rutas con `auth` y `requireJwtTenant` y las 4 que escriben con la bandera (`pickingPackingWriteSet.contract.test.js`).
- [x] 2.3 Prueba de rutas con la bandera: apagada = 403 y no llega al controlador; prendida = llega; la bandera de otra empresa no se presta (`pickingFlagRoutes.test.js`).
- [x] 2.4 Candado `esDeLaEmpresa` en iniciar, completar y estado de picking y packing, con 404 igual al de "no existe"; `requireJwtTenant` en las 6 rutas; `requireFeature(pickingAlistamiento)` en las 4 que escriben.
- [x] 2.5 Pedido y picking enlazados verificados antes de escribir; los alistamientos activos y completados de otra empresa se ignoran.
- [x] 2.6 Iniciar picking: verificaciones, creación del picking y cambio de estado del pedido en una sola transacción; un pedido ya alistado no se inicia otra vez.
- [x] 2.7 Completar picking: el estado del picking se vuelve a leer dentro de la transacción (descuento único aunque lleguen dos llamadas).
- [x] 2.8 Estado del picking sin `orderBy` (no depende de un índice compuesto).
- [ ] 2.9 Aplicar los parches del servidor (00a y 01), correr las pruebas, `node --check` y reinicio local sin errores.
- [ ] 2.10 (Informativo, solo lectura) Revisar en producción si hay `picking` o `packing` cuya `company` no coincida con la de su pedido, o sin `company`. Ya no bloquea nada: con el candado en los documentos enlazados un documento cruzado no puede hacer daño.

## 3. Front: la pantalla contra las rutas reales, detrás de la bandera

- [x] 3.1 Prueba de textos y conversiones sin jerga (`tests/picking-packing/picking-mensajes.test.js`, 23 pruebas): incluye el aviso de existencias sin "corrige el inventario" (R10), "pedido ya alistado" y `destinoDelDetalle`.
- [x] 3.2 Prueba de bandera, rutas, guard y menú (`tests/picking-packing/picking-alistamiento-bandera.test.js`): todas las rutas cuelgan del guard, el guard avisa o deja pasar, el menú sale solo con la bandera y se recalcula cuando cambia, `picking/nuevo` se reconoce por su ruta.
- [x] 3.3 Servicio con las rutas reales, consulta por pedido y `BaseService`.
- [x] 3.4 Modelos alineados con el pedido real (`Pedido`) y con la respuesta del servidor.
- [x] 3.5 Detalle: número de pedido en la URL, `picking/nuevo` por su ruta, productos del carrito, bodega por código de negocio y sugerida, confirmación antes de completar, errores sin jerga.
- [x] 3.6 Lista: navegar por número de pedido, búsqueda que devuelve lista, estados en palabras, total del pedido.
- [x] 3.7 Guard `PickingAlistamientoGuard` en una ruta raíz del módulo; entrada del menú solo con la bandera (`NavService`); `nav-responsive.test.js` recibe el cuarto argumento.
- [ ] 3.8 Aplicar los parches del front (00b y 02) y `npm run build` sin errores (en esta propuesta **no se compiló**: solo se revisó la sintaxis y se probó la lógica pura).
- [ ] 3.9 Revisión visual con el servidor corriendo y la bandera prendida en FLORECER; sin la bandera, comprobar el menú, el aviso y la redirección.

## 4. Prueba manual en FLORECER (front local apuntando a producción; con el servidor ya desplegado)

- [ ] 4.1 Prender la bandera solo en FLORECER (`node scripts/set-company-feature.js "FLORECER" pickingAlistamiento on --execute`) y comprobar que ALMARA FELICIDAD sigue sin entrada en el menú y recibe 403.
- [ ] 4.2 Cliente de prueba con un correo propio (FLORECER trae clientes reales clonados: no usar uno de ellos). Pedido de 1 producto; anotar el inventario antes y después de crearlo.
- [ ] 4.3 Iniciar el alistamiento: el inventario no cambia; el pedido pasa a "En alistamiento". "Nuevo Picking" lleva a elegir el pedido.
- [ ] 4.4 Completar: confirmar el aviso; anotar el inventario (R1: baja otra vez).
- [ ] 4.5 Pedido de 2 productos: iniciar y completar (R2: aviso claro y nada escrito).
- [ ] 4.6 Pedido entregado, abierto por búsqueda: "Iniciar Picking" deshabilitado con el motivo.
- [ ] 4.7 Pedido cuya venta se llevó las últimas unidades: el aviso explica que la venta ya descontó y no manda a corregir el inventario (R10).
- [ ] 4.8 Doble clic / dos pestañas en "Completar": el inventario baja una sola vez.

## 5. Cierre

- [ ] 5.1 Desplegar el servidor (leer `MANUAL-EC2` y la nota de PM2 antes; prod real es 13.222.206.185, rama `backend-aws-security`). No necesita índices.
- [ ] 5.2 Con R1, R3, R8 y R10 decididos, abrir las propuestas siguientes: completar (semántica de stock, 2+ productos y existencias de iniciar), estados del pedido, lista de pendientes del alistamiento (módulo de pedidos), front de packing (con R11) y control por rol.
- [ ] 5.3 Desplegar el front con el flujo de despliegue normal (la pantalla está detrás de la bandera, así que el árbol de trabajo no la expone).
- [ ] 5.4 Antes de encender la bandera en una empresa real: R1, R3, R8 y R10 resueltos y, si publica existencias en Shopify o WooCommerce, el camino de solo stock de D-134. **OH MY STORE no se enciende hasta entonces.**
- [ ] 5.5 Registrar en `CONTRACT.md` y cerrar contra el tablero único de inventario.
