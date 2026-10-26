> **Estado:** APROBADA por Daniel el 2026-10-23, con las cinco preguntas respondidas (ver al final). Ticket 1351 (ALMARA FELICIDAD). Decisión: D-XXX (la pone la sesión principal). El diseño y las tareas de la F1 están en `design.md` y `tasks.md`, pendientes de aprobación. Se entrega por fases (F1 a F4) y cada fase se aprueba y se publica por separado.

## Why

ALMARA FELICIDAD pide un registro **completo, cronológico e inmutable** de todo lo que le pasa a un pedido: quién hizo cada cosa, cuándo, desde dónde, qué cambió (antes → después) y por qué. Hoy ese registro no existe. Esto se verificó en el código el 23 de octubre:

- **El «Historial de Estados» solo guarda cambios de `estadoProceso`.** Los escribe `recordOrderStatusChange` (`utils/orderStatusHistory.js` del backend) en la colección `order_status_history`, desde 13 puntos de 7 archivos: pedidos, despachos, logística, domicilios y Osmosis. No dejan registro:
  - la creación del pedido;
  - los pagos;
  - los cambios de cliente, dirección o facturación;
  - los productos, precios, descuentos e impuestos;
  - las notas;
  - el cambio de asesor.
- **Lo que sí se guarda le dice poco al comercio:**
  - el correo del usuario, sin nombre ni rol;
  - un origen técnico (`updateOrderInternal`, `editBatch`);
  - ningún antes → después fuera del estado y ningún motivo.
- **La consulta no se limita del todo a la empresa ni pagina.** `GET /v1/orders/:orderId/history` (`getOrderHistory`) compara la empresa con el encabezado `company` y se salta la comparación si ese encabezado no llega. La lectura (`getOrderStatusHistory`) filtra solo por `orderId` y trae todo sin paginar. Si el pedido se elimina, responde 404: el registro se conserva, pero nadie lo puede ver.
- **Nada garantiza que el registro solo crezca.** Ninguna regla impide que un código del backend edite o borre registros.
- **El Tablero en vivo (D-386) depende de esa colección.** `services/enVivo/historialEstados.js` lee todo lo que la colección acumula en el día para toda la plataforma (~160 registros diarios) y trata cada registro como un cambio de estado. Esto pesa en la decisión de dónde guardar los eventos nuevos.

**Mejora rápida, publicada el 23-oct** (ticket 1351; backend `cad71177`, front `ebe05a5e`, versión `2026.10.23.1`):

- el modal muestra la creación y los pagos «reconstruidos» con los datos actuales del pedido;
- la consulta toma la empresa del token (`requireJwtTenantOrPlatform`).

Sirve mientras tanto, y **la F1 la reemplaza** con eventos reales.

## What Changes

### Un evento por cada vez que alguien guarda

Cada evento lleva:

- la fecha y la hora del servidor, que se muestran en hora de Colombia con segundos;
- el usuario, con el nombre y el rol que tenía en ese momento;
- el **origen**: Web, POS, App, Claude/MCP, Opttia, Shopify, WooCommerce, Siigo o Sistema;
- el tipo de evento;
- los detalles: cada campo con su antes → después;
- el motivo, cuando aplica;
- los montos afectados.

Los cambios que se guardan juntos forman **un solo evento** con varios detalles. Un error se corrige con un evento nuevo: ningún evento se edita ni se borra.

### Fases

| Fase | Qué entrega |
|---|---|
| **F1** | El modelo de evento único y la **creación** con la foto inicial completa. Los **cambios de estado** (proceso, pago y entrega). Los **pagos**: registrar, editar y anular (motivo obligatorio para anular), con el saldo antes → después. La **eliminación**, que conserva el historial. **Pantalla básica:** resumen arriba, eventos agrupados por día, ícono y color por tipo, la plata resaltada y «Cerrar». **Pedidos anteriores** reconstruidos al consultarlos y marcados «registro reconstruido». Consulta limitada a la empresa del token y paginada. |
| **F2** | Las **17 opciones del pedido** con antes → después. **Motivo obligatorio** en precio, descuento e impuestos. Filtros por tipo y por usuario, y buscador. |
| **F3** | **Eventos que no hace una persona:** sistema (recálculos, vencimientos, automatizaciones), inventario, producción, integraciones (Siigo, Shopify, WooCommerce), facturación electrónica y acciones del cliente. |
| **F4** | **Comparar** el pedido entre dos fechas, **exportar** a PDF y Excel, **alertas** al administrador y consulta del historial de un pedido eliminado. |

### Dónde se guardan los eventos (decidido: opción A, Daniel, 23-oct)

- **A (escogida):** una colección nueva, solo para el historial del pedido. Solo crece: nadie la edita ni la borra. En el diseño se llama `order_history_events`. Los cambios de estado se siguen escribiendo también en `order_status_history`, como hoy, para que el Tablero en vivo y las auditorías no cambien.
  - La regla de `openspec/config.yaml` exige aprobación explícita para una colección nueva. Daniel la dio el 23-oct.
- **B (descartada):** ampliar `order_status_history`. No hay colección nueva, pero:
  - el Tablero en vivo leería varias veces más registros por día;
  - habría que enseñarle a ignorar lo que no es un cambio de estado;
  - los registros viejos y los nuevos quedarían con formas distintas en la misma colección.

## Capabilities

### New Capabilities
- `order-history-log`: registro inmutable de los eventos de un pedido: quién, cuándo, desde dónde, qué cambió y por qué, con reglas de multiempresa, rendimiento y no bloqueo.
- `order-history-view`: pantalla «Historial del pedido»: resumen, línea de tiempo por día, filtros, buscador, comparación y exportación.

### Modified Capabilities
- Ninguna archivada. El Tablero en vivo (D-386) y las auditorías que leen `order_status_history` siguen igual.

## Impact

- **Backend** (`katuq_admin_back_firebase/functions`):
  - **F1:**
    - `utils/orderStatusHistory.js`, que se amplía o se acompaña de un registrador de eventos;
    - en `controllers/orders.js`: `create`, `edit`/`updateOrderInternal`, `editBatch`, `editByTransporter`, `delete` y `getOrderHistory`;
    - pagos y cambios de estado;
    - `update_order_status` del MCP.
  - **F2:** notas, descuentos, IVA por línea (D-135), facturación, asesor, duplicar, reenviar confirmación y PDF.
  - **F3:** webhooks e integraciones (solo agregan el evento), facturación electrónica y notificaciones.
- **Front:**
  - `components/ventas/order-history-timeline/*` se rehace como «Historial del pedido»;
  - el modal de `ventas/list` (`list.component.html`, ~línea 2959);
  - un servicio que extiende `BaseService`;
  - en la F2, el campo «Motivo» en los modales de precio, descuento e impuestos.
- **Datos:** la colección de la opción A, con un índice por pedido, empresa y fecha.
- **Write-set:** el historial solo escribe sus eventos y, como hoy, `order_status_history`.
  - El inventario (F3) se **lee** de los movimientos que ya existen para el pedido.
  - No se escribe inventario y no se amplía el write-set de inventario (D-134).
  - No se escriben productos, precios ni listas de precios.
- **Sin endpoints «v2»:** la consulta sigue siendo `GET /v1/orders/:orderId/history`, que crece de forma compatible y con paginación.

## No-goals

- Deshacer cambios desde el historial: el historial es solo de lectura.
- Un backfill que escriba eventos para los pedidos viejos. Esos pedidos se reconstruyen al consultarlos y no se escribe nada.
- Cambiar las reglas de negocio de las opciones del pedido. Lo único que se agrega es el motivo obligatorio de la F2.
- El historial de productos, clientes o inventario. Ya existen otros registros para eso.
- Crear rastreos nuevos (aperturas de correo, lecturas de WhatsApp). La F3 registra solo lo que el canal ya reporta.
- Cambiar el Tablero en vivo o las auditorías de retrocesos de estado.

## Riesgos (módulo sensible: `orders`)

- **Muchos puntos de escritura:** se estimaron unos 15 en la F1, y el diseño contó más: 10 de creación, 14 de estado, 5 de pago y 8 llamadores de `updateOrderInternal`. Habrá más en la F2 y la F3. Se cambia uno a la vez, con diff aprobado. Un contract test verifica que el pedido se guarda igual aunque falle el registro del evento.
- **Volumen y costo:** se esperan entre 10 y 40 eventos por pedido. La consulta se pagina y el Tablero en vivo no los lee (opción A).
- **Datos personales en los eventos:** el antes → después de cliente y dirección vive en la base de datos, igual que el pedido, pero nunca en los logs. Exportar queda solo para quien puede ver el pedido.
- **Motivo obligatorio y clientes de la API:** la App, el MCP y Opttia también cambian precios y descuentos. Si el servidor exige el motivo de una vez, esos clientes se rompen. Lo propuesto:
  - el motivo es obligatorio en la web desde la F2;
  - las demás vías registran «sin motivo (origen)» hasta que se adapten.
- **Lo reconstruido no es la realidad:** los datos actuales pueden ser distintos a los del día de la creación. Por eso se marca siempre como reconstruido.
- **Integraciones (Artículo IV):** si un webhook se reintenta, no se duplica el evento. Antes de tocar webhooks en la F3 se contrasta con `specs/002-flows-osmosis-shopify-marco/findings.md`.
- **Foto inicial grande:** un pedido con cientos de líneas debe caber en un documento. El diseño define cómo se parte si no cabe.
- **Sesión paralela (cerrado):** la mejora rápida se publicó el 23-oct (`cad71177`, `ebe05a5e`). La F1 parte de esa versión.

## Preguntas respondidas (Daniel, 23-oct)

1. **¿Opción A u opción B?**
   - **A:** una colección nueva solo para el historial. Solo crece: nadie la edita ni la borra.
   - `order_status_history` sigue como hoy, porque la lee el Tablero en vivo (D-386).
2. **¿Quién ve el historial y quién lo exporta?**
   - Lo ve todo el que ve el pedido.
   - Exportar (F4) queda solo para los administradores: la familia Administrador, `isAdminFamilyRole`.
3. **¿Por dónde llegan las alertas de la F4 y a qué roles?** A la campana de Katuq de los administradores.
4. **¿Motivo obligatorio solo en la web desde la F2?**
   - Sí: obligatorio solo en la web desde la F2.
   - La App, el MCP y Opttia registran «sin motivo» por ahora.
5. **¿Para todos o con bandera?**
   - La F1 sale con bandera por empresa (D-505: `featureFlags.<nombre>` en `companies`, con `requireFeature` / `CompanyFeaturesService`; nada en el `.env`).
   - Primero ALMARA FELICIDAD.
