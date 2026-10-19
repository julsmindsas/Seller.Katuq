## 0. Decisiones

- [x] 0.1 Daniel aprueba la propuesta, las specs y el diseño, y responde las 5 preguntas abiertas. La primera es la colección nueva `appointments`.
- [x] 0.2 Reservar el D-XXX mirando `origin` (memoria "reservar-decision-mirar-origin") y registrar la decisión como APROBADA en `specs/CONTRACT.md`. La entrada incluye:
  - el cambio de ICP frente a lo decidido el 5-oct;
  - la colección nueva;
  - la transición condicionada a `Entregado`;
  - la bandera `serviceAgenda` con dueño Daniel y retiro el 2027-03-31.
- [x] 0.3 Avisar por SendMessage a las sesiones activas que tocan `crear-ventas`, `sites.js` u `orders.js` antes de editar esos archivos.

## 1. Servicio como tipo de ítem (sin bandera; no toca pedidos)

- [x] 1.1 Back: pruebas de la regla de guardado (`servicio ⇒ inventariable:false`, `service` por defecto 60 min si requiere cita, ítem sin marca = producto) en crear, editar, rápido e importación.
- [x] 1.2 Back: implementar la regla en el guardado de producto, sin tocar precio, IVA, listas, variantes ni imágenes. Prueba de que esos campos salen idénticos.
- [x] 1.3 Front: selector Producto/Servicio en `crear-productos` y `crear-producto-lite`. Con servicio se ocultan y dejan de ser obligatorios peso, dimensiones, tipo y tiempo de entrega, y aparecen duración, modalidad y "Requiere cita". La confirmación al pasar de producto a servicio usa Swal.
- [x] 1.4 Front: columna "Tipo" en `import-modal`, que gana sobre "Inventariable".
- [x] 1.5 Back: `get_services` prefiere los marcados como servicio (`itemType`), con caída al criterio actual. Ajustar `tests/mcp/getServices.test.js`.
- [ ] 1.6 Build de producción y backend sin errores. Crear un servicio en FLORECER por cada formulario.

## 2. Pedidos con servicios (módulo sensible: un cambio a la vez, cada uno con diff aprobado)

- [x] 2.1 Back: función pura `requiereDespacho(lineas, productosPorId)` con pruebas: solo servicios, mixto, bajo pedido, producto ilegible → `undefined`.
- [x] 2.2 Back (diff aprobado): calcular `requiresDispatch` en `POST /v1/orders/create` leyendo `products` con `getAll`. Prueba de que precio, IVA, consecutivo, estado inicial e inventario no cambian.
- [ ] 2.3 Back (diff aprobado): lo mismo en `crearPedido` de la tienda, más quitar la exigencia de bodega y dirección para carritos solo de servicios. Con servicio `home` se pide dirección y el envío es 0.
- [x] 2.4 Back (diff aprobado): `plan.js`, `carrierOffers.js` y los conteos de despachos excluyen `requiresDispatch === false`. Pruebas con pedidos viejos (sin campo) que siguen entrando.
- [x] 2.5 Front (diff aprobado): `despachos.component` y `generar-orden` excluyen `requiresDispatch === false`.
- [ ] 2.6 Front (diff aprobado): en `conf-product-to-cart`, la línea de servicio no pide entrega. En `crear-ventas`, se salta el paso Envío y se usa `bodegaId "-1"` cuando el carrito no requiere despacho. Verificar en navegador una venta solo de servicios y una mixta.
- [ ] 2.7 Buscar los consumidores de `Despachado`/`Entregado` en KPIs, informe ejecutivo, centro de operaciones y reportes, y anotar el impacto en "Avance y desvíos".
- [ ] 2.8 Back (diff aprobado): transición `ParaDespachar → Entregado` solo si `requiresDispatch === false`, con historial. Prueba de que un pedido mixto sigue rechazado.
- [ ] 2.9 Front: botón "Marcar como prestado" en el detalle y la lista de pedidos, solo para esos pedidos y los roles que decida 0.1.
- [ ] 2.10 Back (diff aprobado): SIIGO `findOrCreateProduct` usa `type:"Service"` cuando el ítem es servicio (`itemType`), y World Office crea el ítem como no inventariable. El ajuste contable automático omite servicios. Pruebas con mapper simulado; ítems existentes intactos.
- [ ] 2.11 Build de producción y pruebas del backend sin errores. En FLORECER:
  - un pedido solo de servicios no sale en despachos y se cierra como prestado;
  - uno mixto despacha solo lo físico;
  - la factura SIIGO de prueba lleva el servicio como servicio.

## 3. Agenda — backend

- [x] 3.1 Bandera `serviceAgenda` en los dos catálogos (`companyFeatureFlags.js`, `company-features.service.ts`) y en la prueba del catálogo.
- [x] 3.2 `utils/agenda.js` (puro), que generaliza `siteAgenda.js`: disponibilidad por hora y duración, por franja y cupo, choque por persona, "cualquiera disponible" y zona horaria de Colombia. `siteAgenda.js` queda como fachada y sus 9 pruebas siguen en verde.
- [x] 3.3 Pruebas de contrato de `/v1/appointments`:
  - empresa solo del JWT;
  - bandera apagada → 403;
  - reserva concurrente → una sola gana;
  - `requestId` repetido → misma cita;
  - transiciones de estado e historial;
  - sin datos personales en el log.
- [x] 3.4 `services/agenda/reservar.js` con `runTransaction`, `tx.get(query)` y `tx.create`; id del documento = hash(empresa + requestId).
- [x] 3.5 `routers/appointments.js` (`isAuth + requireJwtTenant + requireFeature`): listar por rango y persona, crear, mover, cambiar estado, ligar pedido, disponibilidad. También `GET/PUT` de `companyConfig.agenda`.
- [x] 3.6 Índices `(company, date)` y `(company, staffId, date)` desplegados con Firebase CLI (memoria "firestore-indices-como-crear").
- [x] 3.7 Web: con la bandera encendida, `agendaPublica` y `agendarCita` usan la Agenda (transaccional) y siguen creando el prospecto. Con la bandera apagada, nada cambia. Prueba de cada camino.
- [x] 3.8 Ficha pública de un servicio con `requiresAppointment`: botón "Agendar" que usa los mismos endpoints públicos.
- [ ] 3.9 Al crear un pedido con `appointmentId`, ligar la cita y pasarla a `completed` en un paso que no hace fallar el pedido.
- [x] 3.10 Avisos: `writeSellerNotification` y correo en una cita web nueva, y al mover o cancelar si lo hace otra persona. Idempotentes por `appointmentId + evento + destinatario`.
- [x] 3.11 Tool MCP `get_appointments` en el registro, con prueba de aislamiento por empresa.
- [x] 3.12 Onboarding: guardar `businessProfile.sells` y encender `serviceAgenda` para servicios o ambos (patrón D-395, con el mismo interruptor general).
- [x] 3.13 Pruebas en verde y el backend arranca.

## 4. Agenda — front

- [x] 4.1 `AgendaService extends BaseService` y modelos.
- [x] 4.2 Módulo lazy `components/agenda/` con ruta `agenda`, guard de la bandera y entrada de menú "Agenda" (verificar que se vea, memoria "menu-invisible-modulo-nuevo"). Agregar la ruta a las plantillas de rol que decida 0.1.
- [x] 4.3 `reserva-selector` compartido: servicio, persona o "cualquiera", día y horas libres.
- [x] 4.4 `agenda-page`: vista día/semana con CSS grid por persona y "Sin asignar", estado vacío, crear en espacio libre y mover.
- [x] 4.5 `cita-panel`: confirmar, cancelar, no asistió, abrir cliente y "Cobrar" (borrador de venta asistida con `appointmentId`).
- [x] 4.6 `agenda-config`: horario por día, modo, `slotMinutes`, franjas y cupo, y personas con sus servicios y estado activo.
- [ ] 4.7 Venta asistida: la línea de servicio con cita usa `reserva-selector` y la cita se crea ligada al pedido.
- [x] 4.8 CRM: botón "Agendar" en `crm-detail`.
- [x] 4.9 Onboarding: guardar la respuesta productos/servicios/ambos en la empresa.
- [x] 4.10 Diseño: base `config-pagina`, plano, `#5F3FE0`, sin clases con "p-", `span` con color propio y `:focus-visible`. Conteo de gradientes y primarios prohibidos sin subir.
- [ ] 4.11 Build de producción sin errores. Revisión en navegador a 1440 y 390 px, sin scroll horizontal ni texto invisible.

## 5. Retiro de la demo

- [x] 5.1 Borrar `components/servicios/agendamiento/`, `agendamiento.service.ts` y `operadores.service.ts`, y quitar la ruta pública de `app-routing`, `rutas-publicas.ts`, el interceptor y `app.component.ts`.
- [x] 5.2 Redirigir `servicios/agendamiento` a `agenda`, y quitar el menú "Agendamiento".
- [x] 5.3 Video-agent: ocultar "Agendar" sin `scheduleUrl`, y quitar `scheduleUrl` de `company-config.interface.ts` y `appointments-list` del video-agent si solo dependía del mock.
- [x] 5.4 Mover `AGENDAMIENTO_SYSTEM.md`, `ACCESO_CITAS.md` y `SISTEMA_OPERADORES.md` a `docs/documentacion/historico/`.
- [x] 5.5 Build de producción sin errores; `grep` sin referencias a `AgendamientoService` ni `OperadoresService`.

## 6. Salida

- [x] 6.1 Encender `serviceAgenda` en FLORECER con `set-company-feature.js`: primero en simulación, luego real.
- [ ] 6.2 Recorrido completo en FLORECER:
  - crear un servicio;
  - agendar desde la web, la Agenda, la venta asistida y el CRM;
  - recibir el aviso;
  - cobrar;
  - facturar;
  - comprobar que no sale en despachos.

  Adjuntar las capturas a la entrada del CONTRACT.
- [x] 6.3 OK de Daniel. Despliegue con el candado de publicación (backend y front desde la punta de la rama).
- [ ] 6.4 Bitácora del CONTRACT actualizada y D-XXX en PUBLICADO con los commits.

## 7. Después (propuestas aparte)

- [ ] 7.1 Fase 2: plantilla de confirmación y recordatorio por WhatsApp (Kapso/Meta), Opttia agenda por WhatsApp, visitas de técnicos en la app del mensajero, pago anticipado.
- [ ] 7.2 `requiresShipping:false` para servicios en Shopify (flows de catálogo; D-134).
- [ ] 7.3 Retirar la bandera `serviceAgenda` el 2027-03-31: encendida para todos o eliminada.

## Avance y desvíos

**18-oct (D-491 reservado y escrito en el contrato).** Backend `b5d4a4c2` + `18621af7` y front `a7cc645e`, locales y sin desplegar. `npm run test:agenda`: 66 pruebas en verde; build completo del front sin errores.

Desvíos frente al diseño:
- **Marca del servicio: `itemType: "service"`, no `identificacion.tipoReferencia`.** Ese campo ya significa "referencia manual o automática" (`propio`/`externo`) en el formulario de producto y "SKU" en WooCommerce; marcar ahí perdía el servicio al editarlo. Se sigue leyendo el `"servicio"` del onboarding.
- `siteAgenda.js` no se tocó: `utils/agenda.js` reusa sus fechas. Sus 10 pruebas siguen igual.
- Config: `capacity` (cupo por franja o, sin personas, citas a la vez) en vez de `capacityPerWindow`; se sumó `notifyEmails` ("Avisarme a"), que reemplaza "usuarios con acceso a la Agenda" como destinatarios cuando la persona no tiene correo.
- 3.6: no hacen falta índices compuestos: todo se consulta por igualdad (empresa + fecha, o empresa + `itemType`).
- 3.9: ligar la cita al pedido es `PUT /v1/appointments/:id/pedido`, que solo LEE `orders`; no se tocó `orders.js`. Falta el botón "Cobrar", que necesita la venta asistida (tarea 4.7, módulo sensible).
- 4.9: el asistente ya mandaba "¿Qué vendes?" en el progreso; el backend lo toma de ahí (`users.saveOnboardingProgress`), sin cambio en el front.
- 5.1: `AgendamientoService` y `OperadoresService` se quedan: el video-agent los usa en su propia lista de citas demo. Se borró el módulo `components/servicios/`.
- La configuración de la Agenda la guarda solo la familia Administrador (pregunta abierta 3, por defecto).

**18-oct, publicado (OK de Daniel).** El número quedó D-491 (D-488 lo tomó otra sesión). Backend `12da9a84` en EC2 y front 2026.10.18.3, con el candado de publicación. `serviceAgenda` encendida solo en FLORECER (simulación y luego real).
- 2.2: `exports.create` escribe `requiresDispatch` (diff aprobado, backend `7bc62caa`). Solo agrega el campo después de calcular precios, consecutivo e inventario; si no se puede saber, no lo escribe. Nadie lo lee todavía.
- 5.4: los tres `.md` de la demo están en `docs/documentacion/historico/`, con una nota de que se retiró.
- Verificado en producción: sin la bandera, `/agenda` lleva a la bienvenida, y el menú de la demo ya no aparece.

- 3.8 (backend `6f10d7b7`, en producción desde `ed3ab1cd`): la ficha pública de un servicio con "requiere cita" muestra "Agendar cita" cuando la Agenda está encendida y configurada. No hace falta el bloque "Agenda de visitas". Usa `GET /public/:slug/agenda?servicio=` y `POST /public/:slug/cita` con `servicio`. La cita dura lo que dura el servicio, solo cuentan las personas que lo prestan, y si es a domicilio pide la dirección. El modal reusa los estilos de "Cotizar". Pruebas: `tests/agenda/fichaServicio.test.js` (ficha real y endpoints sobre una Firestore en memoria) y 3 más en `web.test.js`. Las suites de sitios fallan igual que antes del cambio: 3 pruebas y 5 casos de publicación.

- 2.4 (diff aprobado por Daniel, backend `1a69796e`, publicado): el plan de despachos (`leerDatosDelPlan`) y las ofertas a mensajeros (`carrierOffers`) dejan fuera `requiresDispatch === false`. Tomar un pedido así desde la app da 409 «Este pedido no lleva envío.». Los pedidos sin el campo siguen igual. Pruebas: bloque 7 de `leerDatosDelPlan.contract.test.js` y `tests/mensajeros/ofertasServicios.test.js`; las dos fallan sin el cambio. `test:independientes`, mensajeros, despachos y agenda pasan.
- 2.5 (diff aprobado por Daniel; backend `c1a552f5`, front `502ff3d2`, publicado en 2026.10.18.13): `/v1/orders/all/filter/optimized` acepta `soloConDespacho: true`, que solo mandan Despachos y Generar orden. Deja fuera `requiresDispatch === false` en los tres caminos (filtros de columna, con métricas y sin métricas), así el total, las páginas y las métricas cuadran. La lista de Pedidos no cambia. Prueba: `tests/orders/despachosSinServicios.test.js`, que falla sin el cambio. `listadoYExportacionSinMemoria` sigue en verde. Las 3 fallas de `tests/orders` (correo de confirmación, emulador, precios por tipo) ya estaban.
- Queda fuera: las tarjetas de conteo de Despachos (`/logistica/shippingorders/metrics`, con `count()`) siguen contando los pedidos solo de servicios. Descontarlos pide un índice nuevo; va aparte.

Pendiente: 1.6, 4.11 y 6.2 (recorrido en FLORECER a 1440 y 390 px: falta una sesión de FLORECER en el navegador); 4.7 y el resto del bloque 2 (pedidos, de a un diff aprobado); 6.4 al cerrar.
