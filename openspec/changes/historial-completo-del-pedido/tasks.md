> Tareas de la **F1**. Las F2 a F4 tendrán sus propias tareas cuando se diseñen. Módulo sensible `orders`: un cambio a la vez, con el diff a la vista y aprobación antes de cada commit. Cada tarea de código cierra con `node --check` de los archivos tocados y sus pruebas en verde. No se avanza con el build roto. Decisión D-XXX: la sesión principal pone el número.

## 0. Decisiones y checkpoints

- [x] 0.1 Propuesta y specs aprobadas por Daniel (23-oct), con las 5 decisiones de `design.md`.
- [ ] 0.2 Aprobación de `design.md`, con las respuestas a sus Open Questions 1 a 5.
  - **Hecho:** las respuestas quedan anotadas en `design.md`.
- [ ] 0.3 Aprobación de este `tasks.md`.
- [ ] 0.4 Registrar D-XXX en `specs/CONTRACT.md` (lo hace la sesión principal):
  - las 5 decisiones;
  - la colección nueva `order_history_events`, aprobada;
  - la bandera `orderHistoryLog` (dueño Daniel, retiro 2027-04-30);
  - la excepción acotada del Artículo IX (precedente D-054).
  - Antes de escribir el número, revisar origin.

## 1. Verificación previa (solo lectura, sin escribir producción)

- [ ] 1.1 Leer 3 pedidos reales de ALMARA FELICIDAD (venta asistida, POS y tienda) y confirmar las rutas de la foto inicial:
  - tarjetas (`carrito[i].configuracion.tarjetas`), `notasPedido`, `observaciones`;
  - facturación, entrega (`carrito[0].configuracion.datosEntrega`), `asesorAsignado`, `bodegaId`;
  - campos de cada pago.
  - **Hecho:** tabla de rutas anexada a esta tarea. La foto de D2 se ajusta si algo no coincide.
- [ ] 1.2 Leer el ruleset vivo de Firestore y los índices vivos (`firebase firestore:indexes --project julsmind-katuq`).
  - **Hecho:** copia guardada fuera del repo y conteo anotado.
- [ ] 1.3 Comprobar en el código:
  - que ningún llamador ni prueba usa el valor devuelto de `recordOrderStatusChange` como algo distinto de un booleano;
  - que `controllers/logistica-backup.js` no tiene ruta (U9);
  - que `delete-demo-company.js` y los scripts de borrado por empresa no recorren colecciones sin una lista explícita.
  - **Hecho:** resultado anotado.
- [ ] 1.4 Si se aprueba D4.1: confirmar en el código de `Katuq.iOS.Gestion` y `Katuq.Android.Gestion` el `User-Agent` con que inician sesión.
  - **Hecho:** los patrones exactos quedan anotados.
- [ ] 1.5 Leer si ALMARA tiene `pickingAlistamiento` encendida (Open Questions 5).
  - **Hecho:** respuesta anotada.

## 2. Backend: pruebas primero (`katuq_admin_back_firebase/functions`, Artículo VIII)

Cada prueba se escribe antes que el código y falla por la razón esperada (falta el módulo o el enganche).

- [ ] 2.1 `tests/orders/historialPedido.construir.test.js`:
  - foto inicial: campos, sin URLs de comprobantes, partición con más de 200 líneas;
  - diferencias de pagos: registrar, editar, anular por salida y por estado, verificar;
  - claves de pago, prioridad de tipo y `tags`;
  - saldo antes → después;
  - ids deterministas.
- [ ] 2.2 `tests/orders/historialPedido.contexto.test.js`:
  - el origen de cada regla de D4;
  - un `origen`, `email` o `canal` falso en el cuerpo o los encabezados no cambia el resultado;
  - POS;
  - MCP con `oauth`, `servicekey` y `apikey`;
  - mensajero;
  - lo desconocido → Sistema más la traza.
- [ ] 2.3 `tests/orders/historialPedido.escritor.test.js`:
  - bandera apagada: cero escrituras;
  - corte general;
  - solo `create`;
  - `ALREADY_EXISTS` cuenta como éxito;
  - reintentos solo ante errores transitorios;
  - falla final → `integration_audit` sin datos personales;
  - nunca lanza, ni con el constructor roto.
- [ ] 2.4 **Contract test de inmutabilidad:** `tests/orders/historialPedido.inmutable.contract.test.js`. Escanea el código y falla si:
  - el nombre de la colección aparece fuera de `constantes.js`;
  - la constante se importa fuera de `escritor.js` y `lectura.js`;
  - hay `set`, `update`, `delete`, `FieldValue.delete`, `recursiveDelete` o `BulkWriter` sobre la colección.
  - El escaneo cubre `scripts/`.
- [ ] 2.5 **Contract test del write-set:** `tests/orders/historialPedido.writeset.contract.test.js`, con una base de datos falsa que anota colección y operación.
  - Escritor: solo `order_history_events.create` e `integration_audit.create`.
  - Lectura: solo lecturas.
  - Ninguno toca `orders`, `inventory`, `inventoryMovement`, `products` ni precios.
- [ ] 2.6 `tests/orders/historialPedido.lectura.test.js`:
  - el espejo oculta el registro de antes;
  - lo reconstruido aparece solo sin evento real;
  - 50 por página con cursor estable, en asc y desc, sin dobles en la frontera;
  - pedido ajeno → 404 más rastro;
  - bandera apagada o índice faltante → vista de antes.
- [ ] 2.7 `tests/orders/historialPedido.puntos.contract.test.js`: un caso por punto (C1–C10, E1–E14, P1–P5, U1–U8).
  - Para los controladores monolíticos, por inspección del código (patrón `tests/sellerMobileNotifications/orderControllerHook.test.js`).
  - Donde hay dependencias inyectables, por inyección (`ejecutarPlan`, `whatsappConfirmacionPedido`, `borrarPedido`, `updateOrderStatus`).
  - Arranca en rojo y cada caso pasa a verde en su tarea de la sección 4.
- [ ] 2.8 `tests/orders/historialPedido.noBloquea.emulator.test.js` y `historialPedido.flujo.emulator.test.js`, con `firebase emulators:exec` como `test:domicilios:emulador`.
- [ ] 2.9 Script `test:historial-pedido` en `package.json`, que corre 2.1 a 2.7, y `test:historial-pedido:emulador`, que corre 2.8.

## 3. Backend: el módulo, todavía sin enganchar

- [ ] 3.1 `orderHistoryLog` en `FEATURE_FLAG_NAMES` (`services/companyFeatureFlags.js`), con su comentario: dueño, fecha de retiro y Artículo XII.
  - **Hecho:** pasan las pruebas existentes de banderas.
- [ ] 3.2 `services/orders/historialPedido/constantes.js` y `etiquetas.js`: catálogos cerrados de D2 a D4 y textos de D3 y D8.5.
- [ ] 3.3 `construir.js`, con funciones puras.
  - **Hecho:** 2.1 en verde.
- [ ] 3.4 `contexto.js`.
  - **Hecho:** 2.2 en verde.
- [ ] 3.5 `log.js`, con la lista cerrada de campos de D11.
- [ ] 3.6 `escritor.js`.
  - **Hecho:** 2.3, 2.4 y 2.5 en verde.
- [ ] 3.7 `lectura.js`, que adapta `utils/historialReconstruido.js` sin cambiarlo.
  - **Hecho:** 2.6 en verde.
- [ ] 3.8 `index.js`, más `node --check` de los archivos del módulo.

## 4. Backend: los enganches (uno a la vez; diff y aprobación antes de cada commit)

- [ ] 4.1 `utils/orderStatusHistory.js`: el espejo después del `.add()` y los parámetros opcionales `historialPedido` y `contexto` (D6.1).
  - Firma y valor devuelto, iguales.
  - **Hecho:**
    - la regresión de los lectores de `order_status_history` (`tests/enVivo/*`, `osmosisWebhookHistorial`, `liberarPedidosQuitados`, `carrierCompliance`) en verde;
    - los casos E5 a E12 y E14 de 2.7 en verde con el contexto por fuente.
- [ ] 4.2 `updateOrderInternal`:
  - `options.contexto`;
  - quitar `_motivoCambio`;
  - evento combinado después de escribir (D6.5).
  - **Hecho:** E1 y P1 en verde; `retrocesoManual.contract`, `editBatchSinCamposDePago` y las suites de Tesorería en verde.
- [ ] 4.3 Contexto en los llamadores de `updateOrderInternal`, uno por archivo: U1 `exports.edit`, U2 MCP, U3 plan de despachos, U4 producción, U5 Tesorería (incluidos `controllers/treasury.js` y `controllers/integration.js:2524`), U6, U7 y U8.
  - **Hecho:** cada caso U en verde; `tests/despachos/ejecutarPlan*.contract`, `tests/opttiaPropuestas/*` y `tests/mcp/*` en verde.
- [ ] 4.4 E2 `editByTransporter` → `delivery_reported`, con la evidencia y el actor mensajero.
- [ ] 4.5 E3 `editBatch` → contexto de la sesión, pasado a `processBatchAuditAndNotifications`.
- [ ] 4.6 E4 `delete` → `order_deleted` con resumen.
  - **Hecho:** `borrarPedido.test.js` en verde.
- [ ] 4.7 C1 `exports.create`: después de `createOrderWithinLimit`, con `newOrderData`.
  - **Hecho:** `orderControllerHook`, `warehouseAllocationShadow`, `freePlanLimits`, `mobilePosConsistency.contract` y `precioManualSubtotal` en verde.
- [ ] 4.8 C2 a C7: `options.contextoHistorial` en `orderService.createOrder` y en sus llamadores (Shopify, WooCommerce, tienda, tienda virtual, flows, reparto).
  - **Hecho:** `test:reparto-por-bodega`, `test:flows` y `test:bajo-pedido-shopify` en verde.
- [ ] 4.9 C8 cotización convertida, C9 domicilios (solo si `!repetido`) y C10 Kuvo (después de confirmar).
  - **Hecho:** `test:domicilios`, `test:cotizaciones-contract` y las suites de `tests/kuvo` en verde.
- [ ] 4.10 Pagos P2 (rama `legacyWrite`), P3 Wompi, P4 `payment-callback` y P5 ePayco, con ids por transacción.
  - **Hecho:** las suites de Tesorería y de pagos de tienda en verde.
- [ ] 4.11 Contexto de sesión en E5, E6, E7 (`logistica.js`) y E13 (cancelar envío de Cereza).
- [ ] 4.12 `getOrderHistory`:
  - `vista=eventos`;
  - 404 más rastro para un pedido ajeno;
  - con la bandera apagada o un error, la vista de antes;
  - log `pedido.historial.lectura`.
  - **Hecho:** 2.6 en verde y `tests/companies/companyAccess.test.js` en verde.
- [ ] 4.13 Solo si se aprueba D4.1: claim `canal` al iniciar sesión (`controllers/authentication.js:217`, `controllers/login.js:55`), en un cambio aparte, con su prueba.
  - **Hecho:** sin cambios en `middleware/auth.js`; las suites de `tests/auth` en verde.
- [ ] 4.14 Regresión completa:
  - `npm run test:historial-pedido`;
  - `test:historial-pedido:emulador`;
  - las suites de 4.1 a 4.12.
  - `node --check` de cada archivo tocado.
  - Sin `node index.js` contra producción, porque arranca los crones.
- [ ] 4.15 Mostrar el diff completo del backend y esperar aprobación. Luego commit con sello y push a `backend-aws-security`.

## 5. Datos, antes de encender la bandera (cada paso con autorización)

- [ ] 5.1 Índices y `fieldOverrides` de D1, con un `firestore.indexes.json` temporal que lleve solo lo nuevo más los `fieldOverrides` vivos. `firebase deploy --only firestore:indexes`, **sin `--force`**.
  - **Hecho:** índices en estado `READY` y conteo vivo = conteo anterior + 3.
- [ ] 5.2 Reglas:
  - versionar el ruleset vivo (copia de 1.2);
  - agregar la exclusión de `order_history_events` (D7.3);
  - probar en el emulador que un cliente no lee, no crea, no edita y no borra, y que las demás colecciones siguen igual que hoy;
  - publicar con aprobación explícita y dejar listo el ruleset anterior para revertir.
  - Coordinar con D-513 (`cerrar-reglas-firebase`).
  - **Hecho:** regla publicada y comprobada en el Rules Playground.
- [ ] 5.3 No crear `config/feature_flags.orderHistoryLog`: si no existe, no corta nada. Dejar documentado cómo usar el corte general.

## 6. Front: pruebas primero (`Seller.Katuq`)

- [ ] 6.1 `tests/ventas/historial-pedido.util.test.js`:
  - agrupar por día en hora de Colombia (Hoy, Ayer, fecha, cruce de la medianoche UTC);
  - hora con segundos;
  - COP y diferencia con signo «−»;
  - aspecto por tipo.
  - Debe fallar antes de 7.3.

## 7. Front: cambios

- [ ] 7.1 `orderHistoryLog` en `COMPANY_FEATURE_FLAGS` (`shared/services/company-features.service.ts`).
- [ ] 7.2 `shared/models/historial-pedido.model.ts` y `shared/services/ventas/historial-pedido.service.ts`, que extiende `BaseService`.
- [ ] 7.3 `components/ventas/historial-pedido/historial-pedido.util.ts`.
  - **Hecho:** 6.1 en verde.
- [ ] 7.4 Componentes `HistorialPedidoComponent`, `HistorialResumenComponent` y `HistorialEventoComponent`, con `OnPush`, declarados en `VentasModule`. Aplican la regla de diseño Katuq de D10 y las trampas de CSS global.
- [ ] 7.5 `list.component.html` / `.ts`, todo detrás de la bandera:
  - nombre «Historial del pedido» en las dos entradas;
  - encabezado, contenido y «Cerrar» secundario del modal;
  - `order-history-timeline` intacto.
- [ ] 7.6 `asentarpagomanual.component.ts:645`: con la bandera encendida, motivo obligatorio en el Swal de eliminar y `_motivoCambio` en el cuerpo. Revisar si `components/pos/pos-asentarpagomanual` también elimina pagos; si sí, el mismo cambio.
- [ ] 7.7 `npm run build:prod` sin errores. Si no se publica, revertir el aumento de versión de `environment*.ts`.
  - Los gradientes y los primarios prohibidos de `components/ventas` no suben.
  - **Hecho:** conteos antes y después anotados.
- [ ] 7.8 Revisión en el navegador a 1440 y 390 px, sin scroll horizontal ni texto invisible:
  - con la bandera encendida (FLORECER) y apagada;
  - estados cargando, vacío, error y «Ver más».
  - **Hecho:** capturas de antes y después.
- [ ] 7.9 Mostrar el diff del front y esperar aprobación. Luego commit con sello y push.

## 8. Despliegue por fases (cada paso con autorización; fuera del modo auto)

- [ ] 8.1 Backend en producción con la bandera apagada en todas partes: commit y push antes, luego `git pull` y `pm2 restart katuq-api`, según MANUAL-EC2.
  - **Hecho:**
    - arranque limpio en `pm2 logs`;
    - `GET /v1/orders/:id/history` de un pedido de ALMARA responde igual que antes (solo lectura);
    - cero documentos en `order_history_events`.
- [ ] 8.2 Front en producción con el candado de publicación: `git pull`, build desde la punta y despliegue enseguida.
  - **Hecho:** sin cambios visibles con la bandera apagada.
- [ ] 8.3 FLORECER encendida: `set-company-feature.js` en simulación y luego con `--execute`. Requiere permiso, porque escribe pedidos reales en la empresa demo. Escenarios:
  - venta asistida;
  - POS con pago en efectivo;
  - cambio de estado desde la web, desde Producción y por el MCP;
  - pago registrado, editado y anulado con motivo;
  - entrega del mensajero;
  - borrado.
  - **Hecho:**
    - cada escenario deja su evento con el actor, el origen y la hora correctos;
    - la vista no muestra dobles;
    - la falla simulada (bandera encendida y corte general en `false`) no toca el pedido;
    - el Tablero en vivo, igual.
- [ ] 8.4 **Gate:** la exclusión de reglas (5.2) está publicada.
- [ ] 8.5 ALMARA FELICIDAD encendida, con OK de Daniel. Observación de 5 días hábiles.
  - **Hecho:**
    - `integration_audit` sin `order_history_write_failed`;
    - p95 de la primera página < 1,5 s con al menos 30 aperturas (`pedido.historial.lectura`);
    - 10 pedidos revisados sin dobles ni huecos;
    - eventos por día anotados para el costo.
- [ ] 8.6 Ensayo de reversa en FLORECER: apagar, comprobar que la vista vuelve a la de antes, encender y comprobar que no quedan huecos ni dobles (D8.3).

## 9. Cierre

- [ ] 9.1 Bitácora de D-XXX en `specs/CONTRACT.md` (sesión principal): commits, despliegue, mediciones y qué quedó para la F2.
- [ ] 9.2 Ticket 1351, según el flujo de tickets: comentario con lo publicado y evidencia (captura de la vista en ALMARA).
- [ ] 9.3 Retiro de la bandera (Artículo XII), a más tardar el 2027-04-30: encendida para todos o eliminada, y retiro de `order-history-timeline` y de la rama de antes del lector. Queda como tarea en el CONTRACT.
- [ ] 9.4 El cambio sigue abierto para las F2 a F4. Se archiva con `/opsx:archive` al cerrar la F4, o se parte en un cambio por fase si Daniel lo prefiere.
