## Why

Daniel, 18-oct: "alguna vez empecé un módulo de servicios, pero no lo terminé… la intención es que Katuq lo usen empresas que venden servicios". Esto cambia lo decidido el 5-oct para la feria ("agendamiento no se invierte porque el ICP vende producto tangible").

**Lo que quedó empezado no sirve para un comercio real:**
- El menú "Agendamiento" (`servicios/agendamiento`) es una demo de oct-2025 atada al video-agent (Haceb/Apple).
- "Solicitar servicio" simula el envío y **bota los datos** (`agendamiento.component.ts:145`, `// TODO: Integrar con backend real`).
- "Ver citas" lee el `localStorage` del navegador, con 10 técnicos inventados de Medellín (`operadores.service.ts`).
- La ruta es pública y el menú lo ve todo Administrador.

**Lo que sí existe está suelto, y un servicio hoy se comporta como una caja:**
- Un servicio es un producto con `disponibilidad.inventariable = false`. Esa misma marca significa también "bajo pedido" y "de proveedor", así que nada distingue un servicio.
- Venta asistida lo deja en `ParaDespachar` con forma "Domicilio" (`crear-ventas.component.ts:3658`). Así termina en la cola de despachos y en las ofertas a mensajeros.
- El checkout de la tienda exige dirección de envío aunque el carrito sea solo de servicios (`controllers/sites.js:2514`).
- SIIGO lo crea como `Product` con control de stock (`siigoDataMapper.js:440`).
- El formulario completo de producto exige peso, dimensiones y tipo de entrega.
- La agenda de la web (D-472, 17-oct) guarda la cita como prospecto. No avisa al comercio, no tiene servicio ni persona que atienda, y no hay dónde verlas como agenda.

## Principio: tres formas de vender un servicio, sobre lo que Katuq ya tiene

| Cómo se vende | Ejemplos | Camino en Katuq |
|---|---|---|
| **Con cita** | peluquería, consultorio, taller, instalación, clase | Agenda → atender → cobrar (nuevo, sobre POS/venta asistida) |
| **Por cotización o proyecto** | agencia, eventos, obra, reparación con diagnóstico | Cotizaciones con enlace de aprobación → pedido (existe) |
| **Venta directa sin cita** | recarga, membresía, curso, garantía | catálogo, POS y tienda como hoy, **sin despacho** |

**Comercio mixto:** un mismo pedido lleva productos y servicios (aire acondicionado + instalación, montura + examen, repuestos + mano de obra). Lo físico va por despachos como hoy. El servicio se agenda y se presta. La factura es una sola.

## What Changes

**Fase 1 — Que el servicio exista y tenga agenda**

- **El servicio como tipo de ítem.** En el formulario de producto, completo y rápido, se elige "Producto" o "Servicio".
  - Un servicio no lleva inventario y no le pide peso, dimensiones ni tipo de entrega.
  - Se le puede poner duración, dónde se presta (en el local, a domicilio o virtual) y si requiere cita.
  - La marca es un campo propio, `itemType: "service"`. Los servicios que creó el onboarding (con `identificacion.tipoReferencia = "servicio"`) se reconocen igual.
- **Pedidos con servicios.**
  - Un pedido solo de servicios no pide dirección de envío ni bodega, no entra a despachos ni a mensajeros, y se cierra con "Marcar como prestado".
  - En un pedido mixto se despacha solo lo físico.
  - En la factura electrónica, el servicio nuevo sale como servicio, sin control de stock.
- **Agenda.** Una pantalla nueva por día y semana, con una columna por cada persona que atiende.
  - Crear una cita toma tres datos: cliente, servicio y hora.
  - Se puede mover, confirmar, cancelar o marcar como no asistió.
  - "Cobrar" abre la venta con el cliente y los servicios ya cargados.
  - Una persona no queda con dos citas a la vez: la reserva es transaccional.
- **La cita nace desde cuatro lugares:** la Agenda, la venta asistida (al vender un servicio que requiere cita), la ficha del cliente en el CRM y la web.
  - El bloque "Agenda de visitas" de D-472 pasa a escribir en la Agenda. Sigue creando el prospecto como hoy.
- **Avisos.** Cita nueva desde la web: aviso dentro de Katuq y correo a quien atiende o, si no hay nadie asignado, al comercio. El botón "Confirmar por WhatsApp" de D-472 se queda.
- **Configuración.** Horario de atención, personas que atienden (no necesitan usuario en Katuq) y qué servicios hace cada una.
- **Quién lo ve.** El onboarding ya pregunta si vendes productos, servicios o ambos. La respuesta se guarda en la empresa y enciende la Agenda.
- **Se retira la demo:** menú, ruta pública, `AgendamientoService` y `OperadoresService`.
- **Opttia lee la agenda.** Tool MCP `get_appointments` ("¿qué citas tengo hoy?"). `get_services` pasa a listar solo servicios de verdad.

**Fase 2 — Propuesta aparte, después de usar la fase 1**
- Confirmación y recordatorio automáticos por WhatsApp. Requiere plantilla de Meta y la decide Daniel.
- Opttia agenda por WhatsApp.
- Técnicos a domicilio en la app del mensajero: visitas del día, llegué/terminé, foto y firma.
- Pago anticipado al agendar en la web.

**Después:** paquetes de sesiones o bonos, planes recurrentes (`suscripciones-en-la-tienda`), comisión por profesional y orden de servicio técnico (recepción, diagnóstico y entrega de equipos).

## Capabilities

### New Capabilities
- `service-items`: el servicio como tipo de ítem del catálogo, con sus datos (duración, modalidad, requiere cita) y sin exigencias de producto físico.
- `service-orders`: pedidos solo de servicios y mixtos. Cubre envío, despacho, cierre "prestado" y factura.
- `appointments`: la agenda (citas, disponibilidad, reserva sin choques, pantalla, cobrar) y sus cuatro orígenes.
- `appointment-notifications`: los avisos de cita nueva al comercio y a quien atiende.
- `service-business-setup`: qué vende la empresa, horario, personas que atienden, menú y retiro de la demo.

### Modified Capabilities
- Ninguna de `openspec/specs/`. `pickup-checkout` y `cart-quantities` no cambian: el retiro en punto y los productos físicos siguen igual.

## Impact

| Necesidad | Se reutiliza | Se agrega |
|---|---|---|
| Marcar servicio | `disponibilidad.inventariable`; lectura de `identificacion.tipoReferencia = "servicio"` del onboarding | `itemType`, selector en los dos formularios, subobjeto `service` |
| Vender | venta asistida, POS, borradores de venta, cotizaciones | línea "Agendar" en lugar de "Datos de entrega" |
| No despachar | regla de "recoge" en despachos, `plan.js`, ofertas | campo derivado `requiresDispatch` en el pedido |
| Cerrar servicio | estado `Entregado` existente | transición a `Entregado` sin `Despachado` solo si `requiresDispatch === false` |
| Agenda | `siteAgenda.js` (puro), bloque D-472, `prospects`, equipo del CRM | **colección `appointments`** (pide aprobación) y pantalla Agenda |
| Avisos | `writeSellerNotification`, `enviarEmail` (como `cotizarProducto`) | aviso de cita |
| Factura | `findOrCreateProduct` de SIIGO y World Office | el tipo servicio sale de `itemType` |
| Opttia | registro de tools MCP | `get_appointments` |
| Quién lo ve | banderas por comercio (D-385), onboarding | bandera `serviceAgenda` y `businessProfile.sells` |

- **Colección nueva `appointments`: requiere aprobación explícita.** Ver alternativas descartadas en el design.
- **Módulo sensible — pedidos:**
  - se agrega un campo derivado al crear el pedido;
  - se agrega una transición nueva en la máquina de estados, condicionada;
  - no se toca el cálculo de precios, el IVA, los consecutivos ni el inventario.
  - Se hace de a un cambio con diff aprobado.
- **Inventario: sin cambios.** El no inventariable ya se respeta en todo el inventario. El write-set de inventario no se toca.
- **Contabilidad:** solo cambia cómo se **crea** en SIIGO o World Office un ítem que aún no existe allá. Los productos que el comercio ya tiene no se modifican.
- **Decisión:** D-XXX, por reservar al aprobar. Mirar `origin`: hoy el siguiente libre parece D-486.
- **No-goals:**
  - Shopify: `requiresShipping` del servicio. Toca los flows mixtos de catálogo y va en propuesta aparte.
  - Re-marcar productos existentes de forma masiva: cada comercio marca sus servicios.
  - Migrar las citas demo del `localStorage`.
  - Pagos anticipados, recordatorios automáticos por WhatsApp y app de técnicos (fase 2).
  - Tocar el video-agent, que solo pierde el enlace "agendar".
  - Una vista de calendario dentro del CRM: la Agenda es la vista.
- **Riesgos:**
  - Un pedido de servicios que antes salía en despachos deja de salir. Un comercio que despachaba "servicios" que en realidad eran bajo pedido no se afecta, porque la marca es `itemType`, no `inventariable`.
  - Saltarse `Despachado` puede romper reportes que cuentan despachos: se revisan antes.
  - Doble reserva si alguien escribe por fuera de la transacción.
  - Datos personales en las notas de la cita.
