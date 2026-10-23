> **Estado:** TAREAS de la **F1**, **pendientes de aprobación**. D-548, tickets 1357 y 1358. La F0 está hecha. Las F2 a F4 tendrán sus tareas cuando se diseñen (sección 10). Backend en `katuq_admin_back_firebase/functions`, front en `Seller.Katuq`. Cada tarea de código cierra con `node --check` de los archivos tocados (backend) o `npm run build` (front) y sus pruebas en verde; no se avanza con el build roto. Los enganches de la sección 5 van **uno a la vez, con el diff a la vista y aprobación antes de cada commit**. Leer los archivos antes de editarlos. Nunca `git add -A`.

## 0. Checkpoints

- [x] 0.1 Propuesta y specs aprobadas por Daniel (23-oct), con las 4 respuestas recomendadas.
- [x] 0.2 **F0 hecha:** «Última edición» en hora de Colombia y con quién en las cuatro pestañas de Listas de precios (Seller `27c3fc4a`) y usuario del token en precios por tipo de cliente (backend `9d2fa325`). Lo que la propuesta anotaba además para cerrar la F0 pasa a las tareas 5.1 a 5.3 y 6.1.
- [ ] 0.3 Aprobación de `design.md` y respuesta a sus 2 Open Questions.
  - **Hecho cuando:** Daniel aprueba y las respuestas quedan anotadas en `design.md`.
- [ ] 0.4 Aprobación de este `tasks.md`.
  - **Hecho cuando:** Daniel lo aprueba por escrito.
- [ ] 0.5 Bitácora de D-548 en `specs/CONTRACT.md`: diseño aprobado, versión 2 de `productHistory`, bandera `productHistoryLog` (dueño Daniel, retiro 2027-04-30) y excepción acotada del Artículo IX. Antes de escribir, revisar `origin`.
  - **Depende de:** 0.3, 0.4.
  - **Hecho cuando:** la entrada está en el contrato.

## 1. Verificación previa (solo lectura, sin escribir producción)

- [ ] 1.1 Leer 3 productos reales de ALMARA (uno con precios por tipo de cliente, uno con volumen, uno inactivo o agotado) y confirmar las rutas de D2: «se puede vender», disponible/agotado, precio que muestra «Precio tipo clientes» (con o sin IVA) y forma de `preciosPorTipoCliente`. Solo nombres de campo y tipos, ningún valor personal.
  - **Depende de:** 0.4.
  - **Hecho cuando:** la tabla de rutas reales queda en `design.md` («Desvíos») y el catálogo de D2 coincide.
- [ ] 1.2 Leer los índices vivos y reusar la copia del ruleset de D-541 (tarea 1.2 de D-541); confirmar que no hay índices de `productHistory` con `occurredAt`.
  - **Depende de:** 0.4.
  - **Hecho cuando:** la lista de índices a crear queda escrita en la tarea 7.1.
- [ ] 1.3 Por cada punto P1-P12, anotar si el escritor ya lee el producto antes de escribir, si usa transacción y de dónde saca la empresa.
  - **Depende de:** 0.4.
  - **Hecho cuando:** una tabla P1-P12 con esas tres columnas queda en `design.md` D6.
- [ ] 1.4 Censo de solo lectura de los roles de ALMARA: cuáles tienen el menú `lista-precios/lista-precios` y cuáles pasan `puedeVerMargen` (solo nombres de rol).
  - **Depende de:** 0.3.
  - **Hecho cuando:** la lista de roles que verían costos queda en `design.md` D9.

## 2. Backend: pruebas primero (Artículo VIII; fallan por la razón esperada)

- [ ] 2.1 [P] `tests/productos/historialProducto.diferencias.test.js`: catálogo, normalización, arreglos por clave, quitar precio, variación (GCJ1236: $42.621 → $78.291 = +$35.670, +83,7 %; GCJ1236C: +$19.867, +43,9 %), campos técnicos y stock ignorados, prioridad, `tags`, ids.
  - **Depende de:** 1.1.
  - **Hecho cuando:** falla con `Cannot find module`.
- [ ] 2.2 [P] `tests/productos/historialProducto.contexto.test.js`: actor del token; una cabecera `email` falsa no cambia nada; MCP `oauth`, `servicekey`, `apikey`; sin clasificar → Sistema más traza.
  - **Depende de:** 0.4.
  - **Hecho cuando:** falla con `Cannot find module`.
- [ ] 2.3 [P] `tests/productos/historialProducto.escritor.test.js`: bandera apagada = cero escrituras; corte general; solo `create`; `ALREADY_EXISTS` = éxito; reintentos solo ante transitorios; falla final → `integration_audit` sin datos personales; nunca lanza; lote de 30 con el mismo `batch.id` y una sola lectura de bandera.
  - **Depende de:** 0.4.
  - **Hecho cuando:** falla con `Cannot find module`.
- [ ] 2.4 [P] `tests/productos/historialProducto.inmutable.contract.test.js`: escaneo de D7.1 con su lista permitida.
  - **Depende de:** 0.4.
  - **Hecho cuando:** falla porque `constantes.js` no existe.
- [ ] 2.5 [P] `tests/productos/historialProducto.writeset.contract.test.js`: el módulo solo hace `productHistory.create` e `integration_audit.create`; ningún archivo de inventario lo importa; un ajuste de existencias deja producto, variantes, precios y listas sin cambios y sin evento.
  - **Depende de:** 0.4.
  - **Hecho cuando:** falla por la razón esperada.
- [ ] 2.6 [P] `tests/productos/historialProducto.lectura.test.js`: 404 ajeno con rastro; empresa del token; costos ocultos sin permiso; mezcla con registros v1 de fotos; 140 eventos en páginas de 50 sin dobles, asc y desc; bandera apagada o índice faltante → vista de antes; sin `vista`, respuesta idéntica a la de hoy.
  - **Depende de:** 0.4.
  - **Hecho cuando:** falla con `Cannot find module`.
- [ ] 2.7 `tests/productos/historialProducto.puntos.contract.test.js`: un caso por punto P1-P12 (inspección del código, patrón `tests/sellerMobileNotifications/orderControllerHook.test.js`), más la prueba de que con el registrador roto cada escritor guarda en `products` lo mismo que antes, incluido `date_edit`.
  - **Depende de:** 1.3.
  - **Hecho cuando:** sus 12 casos están en rojo a propósito y el de «producto igual» en verde.
- [ ] 2.8 Scripts `test:historial-producto` (2.1 a 2.6) y `test:historial-producto:puntos` (2.7) en `package.json`.
  - **Depende de:** 2.1-2.7.
  - **Hecho cuando:** los dos scripts corren y muestran los rojos esperados.

## 3. Backend: el módulo, todavía sin enganchar

- [ ] 3.1 `productHistoryLog` en `FEATURE_FLAG_NAMES` (`services/companyFeatureFlags.js`) con su comentario (D-548, dueño Daniel, retiro 2027-04-30, corte general) y en `tests/companies/companyFeatureFlags.test.js`.
  - **Depende de:** 0.5.
  - **Hecho cuando:** las pruebas de banderas pasan y la bandera no nace encendida.
- [ ] 3.2 `services/productos/historialProducto/constantes.js` y `etiquetas.js`.
  - **Depende de:** 1.1.
  - **Hecho cuando:** 2.4 en verde.
- [ ] 3.3 `diferencias.js` (funciones puras).
  - **Depende de:** 2.1, 3.2.
  - **Hecho cuando:** 2.1 en verde.
- [ ] 3.4 `contexto.js`.
  - **Depende de:** 2.2, 3.2.
  - **Hecho cuando:** 2.2 en verde.
- [ ] 3.5 `log.js` con la lista cerrada de D11.
  - **Depende de:** 3.2.
  - **Hecho cuando:** un texto con «@» sale como `[omitido]` en su prueba.
- [ ] 3.6 `escritor.js` (`registrar` y `registrarLote`).
  - **Depende de:** 2.3, 2.5, 3.3, 3.4, 3.5.
  - **Hecho cuando:** 2.3, 2.4 y 2.5 en verde.
- [ ] 3.7 `lectura.js` (vista nueva, vista de antes, registros v1, filtro de costos con `menusDelRol` y `puedeVerMargen`).
  - **Depende de:** 2.6, 1.4.
  - **Hecho cuando:** 2.6 en verde.
- [ ] 3.8 `index.js` y `node --check` de los 8 archivos.
  - **Depende de:** 3.6, 3.7.
  - **Hecho cuando:** `npm run test:historial-producto` en verde.

## 4. Backend: la lectura

- [ ] 4.1 `controllers/productos.js:2930` delega en `lectura.js` (las dos vistas) y `routers/productos.js:733` suma `requireJwtTenantOrPlatform`.
  - **Depende de:** 3.8.
  - **Hecho cuando:** 2.6 en verde contra el controlador; sin `vista`, la respuesta es idéntica a la de hoy para un producto con historial de fotos.

## 5. Backend: usuario del token y enganches (uno a la vez; diff y aprobación antes de cada commit)

- [ ] 5.1 Usuario del token, no de la cabecera, en costo (`controllers/productCosts.js:168, 267, 416`).
  - **Depende de:** 0.4.
  - **Hecho cuando:** una prueba con cabecera `email` falsa guarda el correo del token en `costo.actualizadoPor` y en `productCostHistory.importedBy`.
- [ ] 5.2 Lo mismo en importar precios (`productos.js:3349`) y limpiar precios (`:3727`).
  - **Depende de:** 0.4.
  - **Hecho cuando:** misma prueba sobre `user_edit`.
- [ ] 5.3 Lo mismo en acciones masivas (`productos.js:3952`).
  - **Depende de:** 0.4.
  - **Hecho cuando:** misma prueba sobre `user_edit`.
- [ ] 5.4 P1 `create` (`productos.js:447`): `product_created` con `snapshot`.
  - **Depende de:** 3.8, 2.7.
  - **Hecho cuando:** su caso de 2.7 en verde y las pruebas de alta de productos y de tienda en un paso siguen en verde.
- [ ] 5.5 P2 `edit` (`productos.js:1895`): evento combinado.
  - **Depende de:** 5.4.
  - **Hecho cuando:** su caso en verde; prueba de que `date_edit` se escribe igual.
- [ ] 5.6 P3 `delete` (`:2025`) y P4 `deleteAllByCompany` (`:2843`).
  - **Depende de:** 5.5.
  - **Hecho cuando:** sus casos en verde; el lote de P4 lleva un solo `batch.id`.
- [ ] 5.7 P5 `bulkUpdateField` (`:1800`).
  - **Depende de:** 5.6.
  - **Hecho cuando:** su caso en verde; un producto que ya tenía el valor no deja evento.
- [ ] 5.8 P6 `updatePreciosTipoCliente` (`:3861`).
  - **Depende de:** 5.7.
  - **Hecho cuando:** su caso en verde (incluido el cambio de base en el mismo evento) y `tests/orders/preciosPorTipoFase0.test.js` sigue en verde.
- [ ] 5.9 P7 `bulkPatch` (`:3950`, `:3957`).
  - **Depende de:** 5.3, 5.8.
  - **Hecho cuando:** inactivar 30 productos deja 30 eventos con el mismo lote.
- [ ] 5.10 P8 `updateProductCost` (`productCosts.js:457`).
  - **Depende de:** 5.1, 5.9.
  - **Hecho cuando:** su caso en verde y `productCostHistory` se sigue escribiendo igual.
- [ ] 5.11 P9 importaciones de precios (`productos.js:3363, 3530, 3664`).
  - **Depende de:** 5.2, 5.10.
  - **Hecho cuando:** un Excel de 400 filas que cambia 120 deja 120 eventos con el mismo lote y el nombre del archivo.
- [ ] 5.12 P10 `limpiarPrecios` (`:3724`).
  - **Depende de:** 5.11.
  - **Hecho cuando:** su caso en verde con `after: null`. El `batch.commit()` sin esperar queda anotado como hallazgo, no se corrige aquí.
- [ ] 5.13 P11 `applyCostImport` (`productCosts.js:335`).
  - **Depende de:** 5.12.
  - **Hecho cuando:** su caso en verde.
- [ ] 5.14 P12 `update_product` (`tools/updateProduct.js:221`), origen Claude/MCP.
  - **Depende de:** 5.13.
  - **Hecho cuando:** su caso en verde y las pruebas MCP de `update_product` siguen en verde.
- [ ] 5.15 Suite completa: `test:historial-producto`, `test:historial-producto:puntos` (se suma al principal) y la regresión de `design.md` («Pruebas»).
  - **Depende de:** 5.4-5.14.
  - **Hecho cuando:** 0 fallas.

## 6. Front

- [ ] 6.1 «Última edición» en hora de Colombia y con quién en el listado (`productos.component.html:774`) y en la ficha (`crear-productos.component.html:2079`), con el mismo formato de la F0 de Listas de precios.
  - **Depende de:** 0.4.
  - **Hecho cuando:** `npm run build` sin errores y GCJ1236 muestra «23 oct 2026, 10:54 a. m.» y el correo, sin texto ISO.
- [ ] 6.2 `productHistoryLog` en `COMPANY_FEATURE_FLAGS` (`company-features.service.ts`), modelo `shared/models/historial-producto.model.ts` y servicio `shared/services/productos/historial-producto.service.ts extends BaseService`.
  - **Depende de:** 4.1.
  - **Hecho cuando:** compila; ningún `HttpClient` en componentes.
- [ ] 6.3 `historial-producto.util.ts` y `tests/productos/historial-producto.util.test.js` (`node --test` con ts-node, como `pos-linea-precio`).
  - **Depende de:** 6.2.
  - **Hecho cuando:** la prueba pasa: día en hora de Colombia con el cruce de la medianoche UTC, hora con segundos, COP y variación con «−».
- [ ] 6.4 Componentes `HistorialProductoComponent` y `HistorialProductoEventoComponent` (OnPush, prefijo `hp-`), con carga, error, vacío y «Ver más».
  - **Depende de:** 6.3.
  - **Hecho cuando:** build sin errores; revisión a 1440 y 390 px sin scroll horizontal ni texto invisible.
- [ ] 6.5 Pestaña «Historial» de la ficha con la bandera; sin ella, la de hoy.
  - **Depende de:** 6.4.
  - **Hecho cuando:** con la bandera apagada la ficha se ve exactamente como hoy.
- [ ] 6.6 Acción «Historial» por fila en las cuatro pestañas de Listas de precios; la de «Costo» solo si la persona puede ver costos.
  - **Depende de:** 6.4.
  - **Hecho cuando:** GCJ1236 en «Precio tipo clientes» abre solo sus cambios de precio; build sin errores; el conteo de gradientes y primarios prohibidos de `productos` y `lista-precios` no sube.

## 7. Datos (con aprobación antes de cada escritura)

- [ ] 7.1 Crear los índices y `fieldOverrides` de D1 con el Firebase CLI, sin `--force`.
  - **Depende de:** 1.2, 5.15.
  - **Hecho cuando:** los índices quedan en estado «listo».
- [ ] 7.2 Sumar `productHistory` a la regla de exclusión que publica D-541 (su tarea 5.2), probada en el emulador.
  - **Depende de:** 7.1 y la tarea 5.2 de D-541.
  - **Hecho cuando:** el ruleset publicado niega lectura y escritura de clientes sobre `productHistory`.

## 8. Despliegue, encendido y cierre

- [ ] 8.1 Backend con la bandera apagada: diff completo revisado, commit y push, `git pull` y reinicio.
  - **Depende de:** 5.15.
  - **Hecho cuando:** producción corre la versión y no hay escrituras nuevas en `productHistory`.
- [ ] 8.2 Front: build de producción y publicación con el candado.
  - **Depende de:** 6.6, 8.1.
  - **Hecho cuando:** la versión viva es la del build y sin la bandera todo se ve como antes.
- [ ] 8.3 FLORECER encendida (simulación y `--execute` de `scripts/set-company-feature.js`): crear, editar precio, importar 400 filas, inactivar 30, cambiar costo, borrar y un cambio desde Claude.
  - **Depende de:** 7.1, 8.2.
  - **Hecho cuando:** cada acción deja los eventos esperados, sin dobles, y los productos quedan iguales a una prueba sin la bandera.
- [ ] 8.4 ALMARA encendida.
  - **Depende de:** 8.3, 7.2 y OK de Daniel.
  - **Hecho cuando:** la bandera está encendida en ALMARA.
- [ ] 8.5 Observación de 5 días hábiles en ALMARA.
  - **Depende de:** 8.4.
  - **Hecho cuando:** fallas = 0, p95 de lectura < 1,5 s en 30 aperturas, 10 productos revisados sin dobles y el flow de Shopify igual.
- [ ] 8.6 Bitácora en `specs/CONTRACT.md` (commits, encendido, mediciones) y notas en los tickets 1357 y 1358 cuando corresponda.
  - **Depende de:** 8.5.
  - **Hecho cuando:** la entrada está con commits y fechas.

## 9. Retiro (Artículo XII)

- [ ] 9.1 2027-04-30: `productHistoryLog` encendida para todos o eliminada, con la rama apagada fuera del código.
  - **Depende de:** 8.5.
  - **Hecho cuando:** no queda lectura de la bandera.

## 10. Fases siguientes (cada una con su checkpoint)

- [ ] 10.1 Diseño y tareas de la F2 (integraciones con medición en sombra, fotos, atributos, importación de productos, reconstruido y filtros).
  - **Depende de:** 8.5.
  - **Hecho cuando:** Daniel aprueba el diseño y las tareas de la F2.
- [ ] 10.2 Diseño y tareas de la F3 (reporte, exportación y aviso nuevo).
  - **Depende de:** 10.1.
  - **Hecho cuando:** Daniel los aprueba.
- [ ] 10.3 Decisión sobre la F4 (revertir).
  - **Depende de:** uso real de F1 a F3.
  - **Hecho cuando:** Daniel decide hacerla o sacarla del alcance, y queda en el contrato.
