> **Estado:** TAREAS, **pendientes de aprobación**. D-550, ticket 1333. Detalle para la **F0, la F1 y la F2**; la F3 y la F4 tienen aquí su tarea de diseño y sus gates, y sus tareas de código se escriben cuando cierren sus dependencias. Backend en `katuq_admin_back_firebase/functions`; el front del Seller no cambia. **Módulo sensible `orders`: un cambio a la vez, con el diff a la vista y aprobación antes de cada commit.** Cada tarea de código cierra con `node --check` de los archivos tocados y sus pruebas en verde; no se avanza con el build roto. Leer los archivos antes de editarlos. Nunca `git add -A`. No se editan las carpetas `corregir-precio-pedido` ni `cambiar-lista-precios-pedido`.

## 0. Checkpoints

- [x] 0.1 Propuesta y spec aprobadas por Daniel (23-oct), con las 4 respuestas recomendadas.
- [ ] 0.2 Aprobación de `design.md` y respuesta a sus 2 Open Questions.
  - **Hecho cuando:** Daniel aprueba y las respuestas quedan en `design.md`.
- [ ] 0.3 Aprobación de este `tasks.md`.
  - **Hecho cuando:** Daniel lo aprueba por escrito.
- [ ] 0.4 Bitácora de D-550 en `specs/CONTRACT.md`: diseño aprobado, las 5 banderas con dueño y retiro, el corte general y el cambio a la decisión 4 de D-541 (el MCP registra motivo). Revisar `origin` antes.
  - **Depende de:** 0.2, 0.3.
  - **Hecho cuando:** la entrada está en el contrato.

## 1. Verificación previa (solo lectura, sin escribir producción)

- [ ] 1.1 Confirmar con 3 pedidos reales de ALMARA (reutilizando la tabla de la tarea 1.1 de D-541) las rutas de las opciones de F1 y F2, incluido dónde está el contacto de quien recibe y qué campos marcan un pedido facturado (`pedidoYaFacturado`). Solo nombres de campo.
  - **Depende de:** 0.3.
  - **Hecho cuando:** la tabla de rutas por opción queda en `design.md` («Desvíos») y cada opción tiene su ruta.
- [ ] 1.2 Leer en `list.component.ts` y sus diálogos qué permiso o rol exige la pantalla para cada opción de F1 y F2 (en especial, cambiar el asesor y la facturación).
  - **Depende de:** 0.3.
  - **Hecho cuando:** una tabla opción → regla de la pantalla (con archivo:línea) queda en `design.md` D5.
- [ ] 1.3 Ubicar el servicio que resuelve la zona y el valor del domicilio cuando la pantalla cambia la ciudad o la dirección.
  - **Depende de:** 0.3.
  - **Hecho cuando:** queda su archivo:línea en `design.md` D4 y una prueba con dobles lo puede llamar sin escribir.
- [ ] 1.4 Caracterizar con dobles qué avisos dispara `updateOrderInternal` para el parche de cada opción (`claimDirectNotifEvents`, `detectSellerNotification`).
  - **Depende de:** 1.1.
  - **Hecho cuando:** una tabla opción → aviso al cliente / al vendedor queda en `design.md` D4.
- [ ] 1.5 Estado de las dependencias: D-541 (enganches 4.2 y 4.3, catálogo de la F2), D-543 (T-18) y D-549.
  - **Depende de:** 0.3.
  - **Hecho cuando:** una línea por dependencia con commit y estado queda en la bitácora.

## 2. F0: pruebas primero (Artículo VIII)

- [ ] 2.1 [P] `tests/mcp/pedidos/updateOrderStatus.aprobacion.contract.test.js`: con la bandera, la primera llamada no escribe ni avisa; aprobación aplica; pedido movido entre propuesta y aprobación = rechazo; reintento = «ya aplicado» sin escribir; lote de N pedidos en una tarjeta (según la Open Question 1); sin la bandera, resultado idéntico al de hoy.
  - **Depende de:** 0.3.
  - **Hecho cuando:** los casos con bandera fallan y los de sin bandera pasan.
- [ ] 2.2 [P] `tests/mcp/pedidos/opciones.test.js`: matriz rol × opción × bandera × estado del pedido para `get_order_edit_options`; cero escrituras.
  - **Depende de:** 1.2.
  - **Hecho cuando:** falla con `Cannot find module`.
- [ ] 2.3 [P] `tests/mcp/confirmarTarjeta.test.js`: la tarjeta con `motivo` y `efectos` los pinta y exige el motivo obligatorio; sin ellos, el HTML de la propuesta es el de hoy.
  - **Depende de:** 0.3.
  - **Hecho cuando:** falla porque los bloques no existen.

## 3. F0: implementación

- [ ] 3.1 `mcpOrderStatusApproval` en `FEATURE_FLAG_NAMES` con su comentario (D-550, dueño Daniel, retiro 2027-04-30) y en la prueba de banderas.
  - **Depende de:** 0.4.
  - **Hecho cuando:** las pruebas de banderas pasan; nace apagada.
- [ ] 3.2 `services/mcp/pedidos/`: `resolver.js`, `bloqueos.js`, `identidad.js`, `log.js` y `aplicar.js` (parche mínimo, `_baseVersion`, contexto D-541 e invalidación del caché de pedidos).
  - **Depende de:** 1.5.
  - **Hecho cuando:** sus pruebas unitarias pasan y `aplicar.js` llama `updateOrderInternal` con el contexto de la tarea 4.3 de D-541.
- [ ] 3.3 Tarjeta: extraer `apps/_comun/propuesta.js` (o reutilizarlo si D-549 llegó primero) y agregar los bloques de motivo y efectos; compilar.
  - **Depende de:** 2.3.
  - **Hecho cuando:** 2.3 en verde y `node services/mcp/apps/build.js --check` pasa.
- [ ] 3.4 `tools/updateOrderStatus.js`: propuesta y aprobación con la bandera; sin ella, igual que hoy. **Diff y aprobación antes del commit.**
  - **Depende de:** 2.1, 3.1, 3.2, 3.3.
  - **Hecho cuando:** 2.1 en verde y `tests/mcp/*` sigue en verde.
- [ ] 3.5 `tools/getOrderEditOptions.js` (lectura) y su registro.
  - **Depende de:** 2.2, 3.2.
  - **Hecho cuando:** 2.2 en verde.
- [ ] 3.6 Suite `test:mcp-pedidos` en `package.json` y regresión (`tests/mcp/*`, `retrocesoManual.contract`, suites de D-541).
  - **Depende de:** 3.4, 3.5.
  - **Hecho cuando:** 0 fallas.

## 4. F0: despliegue y encendido

- [ ] 4.1 Diff revisado, commit y push; desplegar con la bandera apagada.
  - **Depende de:** 3.6.
  - **Hecho cuando:** producción corre la versión y `update_order_status` se comporta como hoy.
- [ ] 4.2 FLORECER encendida; probar en Claude: un pedido, un lote, cancelar, aprobar dos veces y un pedido movido por otra persona.
  - **Depende de:** 4.1.
  - **Hecho cuando:** cada caso da lo esperado y el historial D-541 muestra «Claude/MCP» con la persona.
- [ ] 4.3 ALMARA encendida y 5 días hábiles de observación.
  - **Depende de:** 4.2 y OK de Daniel.
  - **Hecho cuando:** ningún cambio de estado sin tarjeta en ALMARA y ningún error sin explicar en los registros.

## 5. F1: pruebas primero

- [ ] 5.1 [P] `tests/mcp/pedidos/editOrder.f1.contract.test.js`: nota (agregar y editar), observaciones y tarjeta; propuesta sin escrituras; parche mínimo; guard sin plata (un pedido con total guardado de $1 se bloquea); pedido con `pricingAgreement` bloqueado en las opciones que tocan `carrito`; `servicekey` y `apikey` no editan; motivo opcional registrado como `given` o `not_required`.
  - **Depende de:** 1.1, 4.3.
  - **Hecho cuando:** falla porque `edit_order` no existe.
- [ ] 5.2 [P] `tests/mcp/pedidos/writeset.contract.test.js`: solo `orders.update` por `updateOrderInternal` y eventos D-541; nunca `products`, `inventory`, `inventoryMovement`, precios ni listas; F1 no llama `inventoryService`.
  - **Depende de:** 4.3.
  - **Hecho cuando:** falla por la razón esperada.
- [ ] 5.3 `tests/mcp/pedidos/historial.emulator.test.js` (F1): cada opción aplicada deja su evento con origen `mcp`, persona, antes → después y motivo; una propuesta cancelada no deja evento.
  - **Depende de:** 4.3.
  - **Hecho cuando:** falla porque el evento no existe.

## 6. F1: implementación

- [ ] 6.1 Catálogo de D-541 con los tipos y campos de nota, observaciones y tarjeta: reutilizar los de la F2 de D-541 si ya existen; si no, agregar solo esas entradas en `services/orders/historialPedido/constantes.js` y `etiquetas.js`, **coordinado con el dueño de D-541 y con su aprobación**.
  - **Depende de:** 1.5.
  - **Hecho cuando:** las pruebas de D-541 siguen en verde y los tipos nuevos tienen texto de negocio.
- [ ] 6.2 `mcpOrderEditNotes` en el catálogo de banderas y `config/feature_flags.mcpOrderEdit` como corte general en `opciones.js`.
  - **Depende de:** 0.4.
  - **Hecho cuando:** pruebas de banderas en verde; el corte en `false` devuelve «no disponible».
- [ ] 6.3 `opciones.js` (F1) y `propuesta.js`.
  - **Depende de:** 5.1, 6.2.
  - **Hecho cuando:** los casos de propuesta de 5.1 pasan.
- [ ] 6.4 `sinDinero.js`.
  - **Depende de:** 5.1.
  - **Hecho cuando:** los casos del guard pasan, incluido el pedido de $1.
- [ ] 6.5 `tools/editOrder.js` con las opciones de F1 y su registro (`ESCRITURA`, módulo `['ventas/pedidos']`). **Diff y aprobación antes del commit.**
  - **Depende de:** 6.1, 6.3, 6.4.
  - **Hecho cuando:** 5.1, 5.2 y 5.3 en verde.
- [ ] 6.6 Despliegue con `mcpOrderEditNotes` apagada; FLORECER; ALMARA (OK de Daniel); 5 días hábiles.
  - **Depende de:** 6.5.
  - **Hecho cuando:** en ALMARA, cada cambio de F1 tiene su evento y ningún total cambió (comparación de 10 pedidos antes y después).

## 7. F2: pruebas e implementación

- [ ] 7.1 [P] `tests/mcp/pedidos/editOrder.f2.contract.test.js`: entrega con cambio de domicilio bloqueada; facturación de pedido facturado bloqueada; asesor con la regla de la pantalla (1.2); contacto de quien recibe.
  - **Depende de:** 1.1, 1.2, 1.3, 6.6.
  - **Hecho cuando:** falla porque las opciones no existen.
- [ ] 7.2 Catálogo de D-541 con entrega, contacto, asesor y facturación (mismo criterio que 6.1).
  - **Depende de:** 6.1.
  - **Hecho cuando:** pruebas de D-541 en verde.
- [ ] 7.3 `mcpOrderEditDelivery` y las opciones de F2 en `opciones.js` y `edit_order`. **Diff y aprobación antes del commit.**
  - **Depende de:** 7.1, 7.2.
  - **Hecho cuando:** 7.1, 5.2 y la prueba de historial de F2 en verde.
- [ ] 7.4 Despliegue con la bandera apagada; FLORECER; ALMARA (OK de Daniel); 5 días hábiles.
  - **Depende de:** 7.3.
  - **Hecho cuando:** ningún cambio de F2 movió el valor del domicilio ni el total, y cada uno tiene su evento.

## 8. Cierre de F0 a F2

- [ ] 8.1 Bitácora en `specs/CONTRACT.md` (commits, encendidos, observaciones) y nota en el ticket 1333 cuando corresponda.
  - **Depende de:** 7.4.
  - **Hecho cuando:** la entrada está con commits y fechas.

## 9. F3, pagos (gate de diseño)

- [ ] 9.1 Trazar «Gestión de pagos» (`asentarpagomanual.component.ts:319, 674, 746`) y Tesorería (`/payments/submit`, `/payments/direct`, `/payments/:id/review`): quién calcula saldo, estado de pago y cartera, y qué hace la factura automática.
  - **Depende de:** 8.1.
  - **Hecho cuando:** queda escrito si el servidor calcula todo. Si no, la F3 se detiene y se propone una operación de servidor como cambio aparte.
- [ ] 9.2 Diseño detallado y tareas de la F3 (permisos `ventas.register_payment` y `ventas.void_payment` según la Open Question 2, comprobante con la sesión de D-549, efectos).
  - **Depende de:** 9.1 y D-549 encendido.
  - **Hecho cuando:** Daniel aprueba el diseño y las tareas de la F3.

## 10. F4, plata (gate de diseño)

- [ ] 10.1 Diseño detallado y tareas de la F4 sobre los servicios de D-543 y D-544, con el adaptador de identidad por correo y empresa acordado con el dueño de D-543.
  - **Depende de:** D-543 y D-544 publicados y su piloto estable en ALMARA.
  - **Hecho cuando:** Daniel aprueba el diseño y las tareas de la F4.

## 11. Retiro (Artículo XII)

- [ ] 11.1 2027-04-30: cada bandera de D-550 encendida para todos o eliminada; la rama sin aprobación de `update_order_status` se borra.
  - **Depende de:** 4.3, 6.6, 7.4.
  - **Hecho cuando:** no queda lectura de las banderas retiradas y `update_order_status` siempre pide aprobación.
