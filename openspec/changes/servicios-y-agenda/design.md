## Context

Prefijos: **F** = `Seller.Katuq/src/app/`, **B** = `katuq_admin_back_firebase/functions/`. Revisado el 18-oct contra el árbol local y contra `origin/feature/venta-asistida-mejorada` (la agenda web de D-472 solo está en origin).

**La demo que se retira:**
- F `components/servicios/agendamiento/`: el formulario simula el envío (`agendamiento.component.ts:145`) y usa `confirm()`/`alert()`.
- F `shared/services/agendamiento.service.ts` y `operadores.service.ts`: `localStorage` con 10 técnicos ficticios.
- Ruta pública en F `app-routing.module.ts:133`, `shared/data/rutas-publicas.ts:28`, `interceptor/http.interceptor.ts:34` y `app.component.ts:398`.
- Menú en F `nav.service.ts:592-607`.
- La usa el video-agent: `agent-result.component.ts:99-108` y `company-config.interface.ts:66,94`.

**Cómo se marca hoy un servicio:**
- `disponibilidad.inventariable === false` mezcla servicio, bajo pedido y proveedor (B `tools/getServices.js:5`, `controllers/productosPaginated.js:1058`).
- `identificacion.tipoReferencia = "producto" | "servicio"` solo lo escribe el onboarding (B `controllers/onboarding.js:1077-1099`, que ya rechaza un servicio inventariable; F `onboarding-wizard.component.ts:719-750`). **Ojo:** el mismo campo significa otra cosa en el resto de Katuq: "referencia manual o automática" (`propio`/`externo`) en el formulario de producto (F `crear-productos.component.html:603`), `"SKU"` en WooCommerce y `"Propio"` en fulfillment.

**Inventario:** ya respeta el no inventariable de punta a punta:
- B `inventoryService.js:140,336,627`: no descuenta y deja un movimiento informativo.
- B `orderInventoryEffectPolicy.js:57`, `transactionalInventoryLedger.js:97` y `saleAvailabilityGate.js:48`.

**Dónde se filtra el servicio como si fuera físico:**
- **Venta asistida:**
  - F `crear-ventas.component.ts:3658` pone `ParaDespachar` sin mirar el tipo;
  - F `conf-product-to-cart.component.ts:280-289,4145-4183` exige forma, fecha y horario de entrega y asigna "domicilio" por defecto;
  - el paso Envío exige dirección (`crear-ventas:3235-3272`).
- **Tienda:**
  - B `controllers/sites.js:2454` exige bodega;
  - `sites.js:2514` exige dirección y ciudad;
  - B `utils/siteOrden.js:350` hace nacer el pedido en `ParaDespachar`.
- **Despachos:**
  - F `despachos.component.ts:3411-3424` y `generar-orden.component.ts:834-858`;
  - B `services/despachos/plan.js:25,105-126` y `controllers/carrierOffers.js:26`.

  Ninguno lee el tipo, y "despachable" = no es recogida.
- **Estados:** a `Entregado` solo se llega desde `Despachado` o `Rechazado` (B `controllers/orders.js:3329-3353`).
- **Contabilidad:**
  - SIIGO crea el ítem faltante con `type: katuqProduct.type || 'Product'` (B `siigoDataMapper.js:439-449`); el producto de Katuq no trae `type`, así que sale `Product` con stock;
  - World Office crea ítem de inventario (B `worldOfficeDataMapper.js:260-290`);
  - el ajuste contable automático recorre todo el carrito (B `controllers/orders.js:401-427`).
- **Lo que ya está bien:**
  - POS nace `Entregado` (B `orders.js:5927`);
  - el alistamiento omite los no inventariables (F `picking-mensajes.ts:152-181`).

**Agenda web (D-472, origin):**
- Módulo puro B `utils/siteAgenda.js`: días, franjas, cupo y textos.
- `GET/POST /v1/sites/public/:slug/agenda|cita` en B `controllers/sites.js:1390-1481`.
- Escribe en `prospects` con `tipo:"cita"`.
- El cupo no es transaccional.
- No avisa al comercio.
- No hay endpoints privados.

**Piezas reutilizables:**
- Banderas: B `services/companyFeatureFlags.js` y F `company-features.service.ts` (D-385).
- `companyConfig/{empresa}`: ya guarda la config del CRM (B `controllers/crm.js:87,537`).
- `requireJwtTenant` (B `routers/crm.js:33`).
- `writeSellerNotification` (B `notificationHooks.js:1682`).
- Correo al asesor, como en `cotizarProducto` (B `sites.js:1355-1365`).
- Borradores de venta asistida.
- `GET /v1/crm/equipo`.

## Goals / Non-Goals

**Goals:**
- Que un servicio sea un ítem de primera clase, sin romper los productos "bajo pedido".
- Que un pedido solo de servicios no toque la logística, y que uno mixto despache solo lo físico.
- Una Agenda real, multiempresa y transaccional, que reemplace la demo y absorba la agenda web.
- Reusar ventas, POS, cotizaciones, CRM, banderas, avisos y Opttia.

**Non-Goals:**
- Recordatorios automáticos por WhatsApp, reserva por Opttia, app de técnicos y pago anticipado (fase 2).
- Paquetes, bonos, suscripciones de clientes finales y comisiones.
- `requiresShipping` en Shopify: toca flows de catálogo, D-134.
- Re-marcar productos de forma masiva.
- El video-agent, salvo quitarle el enlace.

## Decisions

### 1. Marca de servicio: `itemType: "service"` + subobjeto `service`

```
products/{id}
  itemType: "product" | "service"                          // nuevo; ausente = producto
  disponibilidad.inventariable: false                      // forzado si es servicio
  service: {                                               // nuevo, solo si es servicio
    durationMinutes: 45,           // por defecto 60 si requiresAppointment
    mode: "onsite" | "home" | "virtual",
    requiresAppointment: true
  }
```

- **Por qué no `inventariable === false`:** ya significa "bajo pedido" en OH MY STORE, Cereza y Elixir. Reinterpretarlo sacaría de despachos productos físicos.
- **Por qué no `identificacion.tipoReferencia`** (era la primera idea): ese campo ya significa "referencia manual o automática" en el formulario de producto, y WooCommerce, Shopify y fulfillment escriben ahí otras cosas. Al editar un servicio en el formulario completo se perdería la marca.
- **Compatibilidad:** un ítem sin `itemType` con `tipoReferencia === "servicio"` (los que creó el onboarding) se trata como servicio, y al guardarlo queda con `itemType`. `itemType: "product"` siempre gana.
- **El subobjeto va en inglés:** los campos nuevos son canónicos en inglés y los heredados se dejan como están.
- **Dónde se escribe:** el back normaliza en el guardado de producto (crear, editar e importación): `servicio ⇒ inventariable:false` y `service` con sus valores por defecto (`utils/productoServicio.js`).

### 2. Pedido: campo derivado `requiresDispatch`, calculado en el servidor

- **Se calcula al crear** el pedido en `POST /v1/orders/create` y en `crearPedido` de la tienda:
  - `true` si hay al menos una línea física (todo lo que no sea servicio, incluido "bajo pedido");
  - `false` si todas las líneas son servicios, incluso a domicilio: el técnico va por la Agenda, no por despachos.
- **La fuente es `products`**, leído por id en un solo `getAll`. No se confía en el `producto` que manda el navegador. Si la lectura falla, el campo queda **sin definir** y el pedido se despacha como hoy (falla seguro).
- **Quién lo lee:** despachos (front), `plan.js`, `carrierOffers.js` y `generar-orden`. Excluyen solo `requiresDispatch === false`. Los pedidos viejos y los de otros canales no tienen el campo, así que no cambian.
- **Alternativa descartada:** un estado nuevo "Prestado". Rompe filtros, reportes, la app del mensajero y los conteos que hoy usan `Entregado`.

### 3. Cierre: `ParaDespachar → Entregado` solo si `requiresDispatch === false`

- Es una transición aditiva en `allowedTransitions` (B `orders.js:3329`), condicionada por el campo. No quita ninguna.
- El front muestra "Marcar como prestado" solo en esos pedidos.
- El pedido sigue naciendo `ParaDespachar`: así no se toca la creación de estados de producción ni de pago.

### 4. Venta asistida y tienda sin envío para servicios

- **`conf-product-to-cart`:**
  - una línea de servicio con `requiresAppointment` pide **fecha, hora y persona** (componente de reserva compartido) en lugar de forma, fecha y horario de entrega;
  - un servicio sin cita no pide nada de entrega.
- **`crear-ventas`:** si `!requiereDespacho(carrito)`, el paso Envío se salta y el pedido usa `bodegaId "-1"`, el mismo camino de `carritoSoloBajoPedido` (`crear-ventas:4516`).
- **Tienda (`crearPedido`):** con carrito solo de servicios, no exige bodega ni dirección. Con servicio `home`, exige la dirección como lugar del servicio y cobra envío 0.
- **Servicio de precios:** sin cambios.

### 5. Agenda: colección nueva `appointments` (pide aprobación)

```
appointments/{id}
  company            // de la sesión (requireJwtTenant) o del sitio publicado
  status             "requested" | "confirmed" | "completed" | "cancelled" | "no_show"
  date               "2026-10-20"            // día Colombia, para consultar
  start, end         Timestamp               // modo por hora
  window             "8:00 - 10:00"          // modo por franja (opcional)
  staffId, staffName // null = sin asignar
  customer           { clientId?, name, phone, email? }
  services           [{ productId, name, durationMinutes, price }]
  location           { mode, address?, city?, lat?, lng? }
  source             "agenda" | "sales" | "crm" | "web"
  requestId          // idempotencia (web, venta, Opttia)
  orderId?, prospectId?, siteId?
  notes, history[]   // {at, by, from, to, what}
  createdAt, updatedAt, createdBy
```

- **Índices:** `(company, date)` y `(company, staffId, date)`.
- **Alternativas descartadas:**
  - **`prospects`:** es captación. Su `status` es el del lead (se cambia libre con `PATCH /:id/status`) y no tiene persona, duración ni servicio.
  - **`crm_tasks`:** es pendiente interno ligado a `corporate_clients`, sin cliente final, servicio ni duración. Mezclarlos ensucia los recordatorios del CRM.
  - **`orders`:** una cita existe antes de vender, o sin venta (no asistió). Además `orders` es módulo sensible.

### 6. Reserva transaccional sin colección de contadores

- **Dentro de `runTransaction`:**
  - `tx.get(query)` de las citas de `(company, date)`, más `staffId` si se pidió persona;
  - se calcula el choque con el módulo puro;
  - luego `tx.create`.
- **Idempotencia:** el id del documento es `hash(company + requestId)`. Un reintento devuelve la misma cita.
- **Módulo puro:** `siteAgenda.js` se generaliza a `utils/agenda.js`: disponibilidad por hora y duración, por franja y cupo, choque y textos. `siteAgenda.js` queda como fachada para no romper sus 9 pruebas.
- **También la web:** el bloque D-472 pasa a reservar por aquí cuando la bandera está encendida. Con eso deja de ser no transaccional.

### 7. Configuración en `companyConfig/{empresa}.agenda`

```
agenda: {
  mode: "hourly" | "window",
  slotMinutes: 15 | 30 | 60,
  hours: { "1": [["08:00","18:00"]], ..., "7": [] },   // lunes=1, como el bloque web
  windows: ["8:00 - 10:00", ...], capacityPerWindow: 1,
  maxDaysAhead: 30,
  staff: [{ id, name, email?, userId?, serviceIds: [], active: true }]
}
```

- **Va en `companyConfig`:** ese documento ya existe por empresa (CRM), así que no hace falta otra colección.
- **Personas sin usuario:** así lo exige el caso de las peluquerías.
- **Escritura:** solo roles con la Agenda en su menú. Ver la pregunta abierta 3.

### 8. Bandera `serviceAgenda` y `businessProfile.sells`

- **`featureFlags.serviceAgenda`:**
  - va en los dos catálogos, con dueño Daniel y retiro el **2027-03-31** (Artículo XII);
  - nace encendida para las empresas nuevas que responden "servicios" o "ambos" (patrón D-395);
  - las existentes se encienden con `set-company-feature.js`, que simula por defecto.
- **`businessProfile.sells: "products" | "services" | "both"`:** va en el documento de la empresa y lo escribe el onboarding. Hoy esa respuesta se pierde en `buildProgress`, F `onboarding-wizard:859`.
- **Endpoints `/v1/appointments/*`:** `isAuth + requireJwtTenant + requireFeature(serviceAgenda)`.
- **Endpoints públicos de la web:** siguen en `/v1/sites/public/:slug/*` con `leadLimiter`.

### 9. Front: módulo `agenda` lazy, sobre la base D-400

- **Ubicación:** `components/agenda/`, con estas piezas:
  - `agenda-page` (día/semana);
  - `cita-panel` (lateral de detalle y acciones);
  - `reserva-selector`: elegir servicio, persona y hora. Lo comparten la Agenda, la venta asistida y la ficha CRM.
  - `agenda-config`.
- **Servicio de datos:** `AgendaService extends BaseService`.
- **Sin librería de calendario:** no hay ninguna instalada y Angular 14 limita las opciones. La grilla día/semana es CSS grid propio, cada fila es una franja de `slotMinutes` y cada columna una persona. Es más liviano que FullCalendar y queda dentro del design-system.
- **Diseño:**
  - `config-pagina` (cfg-cabeza, cfg-card, cfg-vacio), acento `#5F3FE0`, plano;
  - los estados usan el par color fuerte / fondo suave;
  - las clases no contienen "p-" y los `span` llevan color propio.
- **"Cobrar":** crea un borrador de venta asistida con el cliente y las líneas, guarda `appointmentId` y navega. Después de crear el pedido, el back liga la cita y la pasa a `completed` en un paso aparte. Si ese paso falla, el pedido queda creado igual (como el rollout de inventario) y la cita se puede ligar a mano.

### 10. Avisos y Opttia

- **Cita web nueva:**
  - `writeSellerNotification` a la empresa;
  - correo con `enviarEmail` a `staff.email`, o a los usuarios con la ruta `agenda`.
  - Clave de idempotencia: `appointmentId + evento + destinatario`.
- **Opttia:** tool MCP `get_appointments(fromDate, toDate, staff?)`, de solo lectura, con la empresa de `context.mcpCompany`. Además `get_services` filtra los marcados como servicio y, si no hay ninguno, cae al criterio actual.

### 11. Retiro de la demo

- Se borran el módulo, los dos servicios mock, la ruta pública y sus excepciones en el interceptor, `app.component` y `rutas-publicas`, y la entrada del menú.
- `servicios/agendamiento` redirige a `agenda`, que sigue protegida por el guard.
- El video-agent oculta "Agendar" cuando no hay `scheduleUrl`.
- Los `.md` de la demo pasan a `docs/documentacion/historico/`.

## Risks / Trade-offs

- **Un comercio usaba `inventariable:false` para servicios y los "despachaba" a propósito** (técnico vía mensajero) → no cambia nada hasta que marque el ítem como servicio, y la marca es explícita.
- **Reportes que cuentan `Despachado`** → antes de la tarea 3.3 se buscan los consumidores de `Despachado`/`Entregado` (KPIs, informe ejecutivo, centro de operaciones).
- **El navegador manda un `producto` viejo en el carrito** → `requiresDispatch` sale de `products` en el servidor.
- **Consulta dentro de la transacción con muchas citas en un día** → se limita por `(company, date[, staffId])`; un día tiene decenas, no miles.
- **Zona horaria** → todo se calcula en Colombia (UTC-5, sin horario de verano), igual que `siteAgenda.js`.
- **Datos personales** → nunca entran al log; se usan `appointmentId` y `company`.
- **Doble fuente en la web** → con la bandera apagada, el bloque usa su configuración y `prospects` como hoy; con la bandera encendida, la Agenda. Nunca las dos a la vez.

## Migration Plan

1. Se despliega con la bandera apagada para todos. Lo único que cambia sin bandera es la marca de servicio en el producto y el `requiresDispatch` de los pedidos **nuevos** con servicios marcados.
2. Se enciende en FLORECER (demo) y se prueba el recorrido completo: servicio, cita, cobro, factura y que no salga en despachos.
3. Se enciende para las empresas nuevas de servicios. Las existentes, una por una, a pedido.
4. **Reversa:**
   - apagar la bandera esconde la Agenda y devuelve la web a su configuración propia;
   - `requiresDispatch` se ignora volviendo los lectores a su versión anterior; el campo no estorba;
   - no hay backfill.

## Open Questions

1. ¿Daniel aprueba la colección nueva `appointments`, o prefiere otra alternativa?
2. Pedido solo de servicios: ¿"Marcar como prestado" lo puede hacer cualquier rol con acceso a Pedidos, o solo administrador?
3. ¿Quién configura la Agenda: solo Administrador, o también un rol "Recepción"? Esto define si se agrega una plantilla de rol.
4. ¿El enlace de la web sigue pidiendo "Confirmar por WhatsApp" cuando la Agenda está encendida, o la cita nace Confirmada sin ese paso?
5. Fase 2: ¿se registra en Meta la plantilla de recordatorio (costo por mensaje con el saldo prepago del comercio)?
