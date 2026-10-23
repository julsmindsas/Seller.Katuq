> **Estado:** PROPUESTA, pendiente de aprobación. Ticket 1333 (ALMARA FELICIDAD). Decisión: D-XXX (la pone la sesión principal). Depende de D-541 (historial del pedido), de D-543 y D-544 (vista previa y confirmación de precio y de lista) y de D-532 (Opttia para empleados, permisos por rol). Solo documento: sin diseño, sin tareas y sin código. `orders` es un módulo sensible: cada fase y cada opción se aprueban y se publican por separado.

## Why

ALMARA FELICIDAD quiere editar desde Claude, con el MCP de Katuq, las opciones de un pedido que hoy cambia en la pantalla de pedidos:

- cargar o aplicar un pago, total o abono, con monto, medio, fecha y referencia o comprobante;
- editar la tarjeta del pedido;
- cliente, productos, cantidades, dirección y datos de entrega, fechas y observaciones.

Pide que sigan **el mismo camino y las mismas validaciones** que la pantalla, que dejen **historial con quién** y que **pidan aprobación** antes de aplicarse.

Verificado en el código el 23-oct, sin leer producción. Backend en `backend-aws-security` (`f322affe`).

- **La única escritura de pedidos por MCP es `update_order_status`** (`tools/updateOrderStatus.js`).
  - Usa el camino de la pantalla, `updateOrderInternal` (`controllers/orders.js:3321`). No mueve estados finales ni pedidos cancelados, y acepta hasta 50 pedidos.
  - **No pide aprobación:** escribe en la primera llamada. `create_support_ticket` y `update_product` sí la piden, con el comprobante firmado de `services/mcp/confirmacion.js`. El ticket da por hecho que todas la piden.
- **El comprobante ya resuelve la aprobación humana.**
  - Firma la propuesta con los valores de antes y vence a los 10 minutos.
  - Al aprobar vuelve a leer y rechaza si algo cambió, lo que cubre los reintentos y las carreras.
  - No tiene estado ni colección propia.
- **Quién escribe se decide por menú, no por acción.** `services/mcp/permisoDeEscritura.js` deja escribir a la familia Administrador o a quien tenga el módulo en su menú: `ventas/pedidos` o `despachos` para `update_order_status` (`tools/toolRegistry.js:186`). D-543 introdujo permisos por acción (`ventas.correct_price`, `ventas.change_price_list`) para lo que mueve plata.
- **El historial de hoy solo guarda el estado de proceso.** D-541 (aprobada, en curso) agrega eventos con quién, origen «Claude/MCP», antes → después y motivo. Su decisión 4 dice que el MCP registra «sin motivo» hasta que esa vía lo pida.
- **La plata tiene su propio núcleo.** D-543 y D-544, en curso en otra sesión, construyen el flujo **preparar → revisar → confirmar** para el precio de una línea y la lista de precios. Su diseño concluye que el guardado genérico (`updateOrderInternal`) no sirve como confirmación de un cambio de plata: recalcula, puede mover inventario y dispara avisos.
- **Los pagos tienen dos caminos según la empresa.**
  - Sin Tesorería, la web manda el pedido completo con `PagosAsentados` cambiado (`asentarpagomanual.component.ts:319, 746`).
  - Con Tesorería, el pago pasa por `controllers/treasury.js` y `treasuryService`.
- **«Tarjeta» se interpreta como la tarjeta de regalo de una línea** (para, mensaje y de; `Produccion.ts:115`), que no mueve plata. Si el ticket se refería al pago con tarjeta, queda en la F3 (pagos).

## What Changes

### Cómo funciona cada edición desde Claude

1. **Propuesta:** la herramienta devuelve el antes → después y sus efectos (total, saldo, inventario, avisos al cliente). No escribe nada.
2. **Aprobación:** la persona aprueba en la tarjeta del MCP. El modelo no puede aprobar.
3. **Aplicación:** el servidor aplica el cambio por **la misma operación y las mismas validaciones** que usa la pantalla, solo sobre los campos aprobados.
4. **Historial:** queda un evento de D-541 con la persona, el origen «Claude/MCP», el antes → después y el motivo.

Cada aprobación es **un pedido y una opción**. Exige **el mismo permiso** que la pantalla exige para esa opción y una **persona identificada**: una llave de empresa sin persona no edita pedidos.

### Fases, de la más segura a la más delicada

| Fase | Qué entrega |
|---|---|
| **F0** | Prerrequisitos, sin escrituras nuevas: D-541 F1 en producción; `update_order_status` pasa a pedir aprobación en la tarjeta (pregunta 1); una consulta de solo lectura de «qué puedo editar en este pedido». |
| **F1** | Sin plata ni inventario: **notas** del pedido (agregar y editar), **observaciones** de entrega y **tarjeta de regalo** (para, mensaje y de). |
| **F2** | **Entrega y contacto:** dirección, ciudad, fecha y franja de entrega, y contacto de quien recibe. También el **asesor** y los **datos de facturación** de un pedido no facturado. Si el cambio altera el valor del domicilio, no se aplica en esta fase. |
| **F3** | **Pagos:** registrar un pago total o un abono (monto, medio, fecha, referencia y comprobante) y anular un pago con motivo. Por el camino de Gestión de pagos o de Tesorería, según la empresa. Actualiza el estado de pago, el saldo y la cartera. El comprobante se adjunta con la tarjeta de `mcp-adjuntos-tickets`. |
| **F4** | **Plata y productos**, solo a través del núcleo de D-543 y D-544: corregir el precio de una línea y cambiar la lista de precios. Después, agregar o quitar productos, cantidades, descuentos, impuestos y cambiar el cliente del pedido, cada uno cuando la pantalla tenga su propia vista previa y confirmación. |

**No se editan desde Claude:** eliminar o duplicar pedidos, facturar o refacturar (ya existe una herramienta aparte), pedidos cancelados o en estado final, pedidos con caja o Kuvo cerrados, POS y cambios en lote.

## Capabilities

### New Capabilities
- `mcp-order-editing`: editar opciones de un pedido desde el MCP con propuesta, aprobación de la persona, el mismo camino y las mismas validaciones de la pantalla, permiso por opción e historial D-541.

### Modified Capabilities
- Ninguna archivada. Se apoya en `order-history-log` (D-541) y en `order-line-price-correction` y `order-price-list-change` (D-543, D-544), sin cambiarlas.

## Impact

- **Backend:**
  - herramientas nuevas en `tools/` y su registro en `tools/toolRegistry.js`, con módulo y permiso;
  - `services/mcp/confirmacion.js`, reutilizado sin cambiar su contrato;
  - `services/mcp/permisoDeEscritura.js`, que gana el permiso por acción;
  - `tools/updateOrderStatus.js` en la F0.
  - Las herramientas llaman a las operaciones del pedido que ya existen: `updateOrderInternal`, Tesorería y el núcleo de precio. **Nunca escriben el pedido directo.**
- **Front:** ninguno. Se reutiliza la tarjeta de confirmación del MCP.
- **Write-set por fase:** F1, notas y tarjetas; F2, campos de entrega, contacto, asesor y facturación; F3, pagos por su camino de hoy; F4, lo que permiten D-543 y D-544. Más el evento de D-541.
- **Inventario (D-134):** las herramientas no escriben inventario. Si un cambio de productos lo mueve (F4), es por el camino del pedido que ya existe. Nunca se escriben productos, catálogo, precios de catálogo ni listas.
- **Sin colecciones nuevas ni endpoints «v2».**
- **Coordinación:** las carpetas de `corregir-precio-pedido` y `cambiar-lista-precios-pedido` las trabaja otra sesión. Esta propuesta no las edita.

## No-goals

- Cambiar las reglas de negocio o las validaciones de la pantalla.
- Ediciones en lote o de varios pedidos por aprobación.
- Escrituras desde el chat integrado de Opttia (D-545 es una excepción solo para soporte).
- Reembolsos, documentos fiscales o reparar pedidos viejos.

## Riesgos (módulo sensible: `orders`)

- **Un cambio a la vez:** cada opción se habilita con diff aprobado y con la bandera por empresa, ALMARA primero.
- **Pisar cambios ajenos:** la web manda el pedido completo. El MCP solo manda lo aprobado, y un cambio en el pedido entre la propuesta y la aprobación la invalida.
- **Pagos:** dos caminos (con y sin Tesorería), pasarelas y avisos al cliente. La propuesta debe decir si se avisará al cliente.
- **Identidad:** hay correos repetidos en `users`. Si la persona es ambigua, no escribe, como hoy.
- **Cambio de costumbre:** quien hoy cambia estados desde Claude sin tarjeta pasará a aprobarlos (F0).
- **Demasiadas herramientas confunden al modelo:** el diseño decide cómo agruparlas.
- **Dependencias abiertas:** la F3 depende de `mcp-adjuntos-tickets` para el comprobante y la F4 del núcleo de D-543 y D-544. Ninguna fase se adelanta a su dependencia.

## Preguntas para Daniel

1. **¿`update_order_status` también pide aprobación en la tarjeta (F0)?**
   - **Recomendada:** sí. Así hay una sola regla para escribir pedidos desde Claude, y el ticket ya lo supone.
2. **¿Qué permiso exige cada opción?**
   - **Recomendada:** el mismo que exige la pantalla. Donde la pantalla solo pide el menú de pedidos (notas, tarjeta, entrega), el menú. Pagos y plata, un permiso por acción como D-543. Nunca «tiene el menú, puede todo».
3. **¿El motivo es obligatorio desde Claude?**
   - **Recomendada:** sí donde la web lo exige en D-541 F2 (precio, descuento, impuestos, anular un pago) y al cambiar el cliente; opcional en lo demás. Esto actualiza la decisión 4 de D-541 para el MCP: la tarjeta lo pide.
4. **¿Para todos o con bandera?**
   - **Recomendada:** bandera por empresa y por fase (D-505: `featureFlags.<nombre>` en `companies`, nada en el `.env`), ALMARA primero, como D-541 y D-543.
