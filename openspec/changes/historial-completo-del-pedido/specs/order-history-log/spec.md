## ADDED Requirements

### Requirement: Evento del pedido (F1)
Cada vez que alguien o algo guarda un cambio en un pedido, el sistema SHALL registrar exactamente un evento con:

- la fecha y la hora del servidor;
- el usuario, con el nombre y el rol que tenía en ese momento, o «Sistema»;
- el origen;
- el tipo de evento;
- los detalles: cada campo con su nombre legible, su valor antes y su valor después;
- el motivo, cuando aplica;
- los montos afectados.

Los cambios guardados en una misma acción SHALL quedar en un solo evento con varios detalles.

#### Scenario: Dos campos en un guardado
- **WHEN** un asesor cambia el teléfono y el correo del cliente y guarda una vez
- **THEN** queda un evento «Cliente editado» con dos detalles, cada uno con su antes → después

#### Scenario: Acción automática
- **WHEN** una automatización cambia el estado de pago de un pedido
- **THEN** el evento muestra «Sistema» como usuario y «Sistema» como origen

### Requirement: Origen confiable (F1)
El origen SHALL ser uno de estos: Web, POS, App, Claude/MCP, Opttia, Shopify, WooCommerce, Siigo o Sistema. El servidor SHALL determinarlo a partir de la sesión o del canal autenticado, y nunca de un dato libre que mande el cliente. IF no se puede determinar, THEN SHALL registrar «Sistema» y dejar una traza estructurada (sin datos personales) para corregir la clasificación.

#### Scenario: Cambio desde Claude
- **WHEN** un usuario cambia el estado de un pedido con la herramienta de Katuq en Claude
- **THEN** el evento muestra el nombre de ese usuario y el origen «Claude/MCP»

### Requirement: Registro inmutable (F1)
Los eventos SHALL solo agregarse. Ninguna vía del sistema SHALL editarlos ni borrarlos, y las reglas de seguridad de la base de datos SHALL negar cualquier escritura desde los clientes. Una corrección SHALL ser un evento nuevo que referencia al anterior.

#### Scenario: Pedido eliminado
- **WHEN** un administrador elimina un pedido
- **THEN** se registra el evento «Pedido eliminado», con sus totales y estados, y todos los eventos anteriores se conservan

### Requirement: Creación con foto inicial (F1)
WHEN se crea un pedido por cualquier origen, el sistema SHALL registrar el evento «Pedido creado» con la foto completa del pedido en ese momento:

- número, canal y tipo, y fecha;
- vendedor y bodega;
- cliente, facturación y entrega;
- productos, con cantidad y precio;
- descuentos, impuestos y envío;
- totales;
- pagos iniciales;
- estados;
- notas y la tarjeta (mensaje o dedicatoria).

#### Scenario: Pedido del POS
- **WHEN** un cajero crea un pedido POS con 3 productos y lo cobra en efectivo
- **THEN** el primer evento es «Pedido creado», con origen POS, el cajero, los 3 productos, los totales y el pago inicial

### Requirement: Estados y pagos (F1)
El sistema SHALL registrar:

- cada cambio de **estado de proceso, de pago y de entrega**, con su antes → después;
- en la entrega, quién recibió y la foto, cuando existan;
- cada pago **registrado, editado o anulado**, con el monto, el medio y el saldo del pedido antes → después.

Anular un pago SHALL exigir un motivo. Los cambios de estado de proceso SHALL seguir llegando al Tablero en vivo como hoy.

#### Scenario: Pago anulado
- **WHEN** un usuario anula un abono de $50.000 en un pedido de $200.000 que tenía saldo $100.000, con el motivo «pago duplicado»
- **THEN** el evento muestra el pago anulado, el motivo y el saldo $100.000 → $150.000

### Requirement: Pedidos anteriores reconstruidos (F1)
Para un pedido creado antes de la F1, el sistema SHALL armar al consultarlo, sin escribir nada:

- la creación y los pagos, a partir de los datos actuales del pedido;
- los cambios de estado guardados hasta hoy, como eventos reales.

Todo lo armado SHALL quedar marcado «registro reconstruido», con la aclaración de que sale de los datos actuales.

#### Scenario: Pedido de septiembre
- **WHEN** el comercio abre el historial de un pedido de septiembre
- **THEN** ve la creación y los pagos marcados «registro reconstruido», y los cambios de estado reales sin esa marca

### Requirement: Opciones del pedido con antes → después (F2)
Cada opción del menú del pedido SHALL dejar su evento así:

| # | Opción | Qué queda | Motivo |
|---|---|---|---|
| 1-2 | PDF del pedido / orden de venta simplificada | Quién lo generó y cuál | — |
| 3 | Reenviar confirmación | Canal y destino | — |
| 4 | Duplicar | En el original: «duplicado como N». En el nuevo: «creado como duplicado de M», con la foto inicial | — |
| 5-6 | Editar cliente / dirección de entrega | Cada campo con antes → después | Opcional |
| 7 | Facturación (datos, facturar, refacturar) | Antes → después y la alerta si ya estaba facturado | Opcional |
| 8 | Cambiar asesor | Antes → después | — |
| 9 | Añadir o retirar productos | Línea agregada o retirada; cantidad, precio y totales antes → después | **Obligatorio si cambia el precio** |
| 10 | Aplicar, editar o eliminar descuento | Descuento y total antes → después | **Obligatorio** |
| 11 | Ajustar impuestos | Tarifa por línea, IVA y total antes → después | **Obligatorio** |
| 12 | Gestión de pagos | Como en la F1 | **Obligatorio al anular** |
| 13 | Actualizar estados | Como en la F1 | Opcional |
| 14 | Notas (agregar, editar, eliminar) | Texto nuevo, antes → después o texto eliminado | — |
| 15 | Eliminar notas huérfanas | Cuáles se limpiaron | — |
| 16 | Marcar o quitar revisión | Antes → después | Opcional |
| 17 | Eliminar pedido | Como en la F1 | Opcional |

IF falta un motivo obligatorio en la web, THEN el cambio SHALL NOT guardarse y SHALL mostrarse un mensaje claro. WHERE el cambio llega por la App, Claude/MCP u Opttia sin motivo, el evento SHALL registrar «sin motivo (origen)» hasta que esa vía lo pida.

#### Scenario: Precio sin motivo
- **WHEN** un asesor cambia el precio de una línea en la web y deja vacío el motivo
- **THEN** el cambio no se guarda y aparece «Escribe el motivo del cambio de precio»

### Requirement: Eventos que no hace una persona (F3)
El sistema SHALL registrar, con origen Sistema o el de la integración:

- **Sistema:** recálculos, vencimientos y automatizaciones.
- **Inventario:** reserva o descuento por bodega. Se toma de los movimientos de inventario del pedido, sin escribir inventario.
- **Producción:** avances de producción.
- **Integraciones:** sincronizaciones y errores de Siigo, Shopify y WooCommerce.
- **Facturación electrónica:** número, CUFE y si fue aceptada o rechazada.
- **Cliente:** abrió la confirmación, leyó el WhatsApp, o abrió o pagó el link de pago, solo cuando el canal lo reporta.

Un mismo aviso de una integración que se reintenta SHALL NOT duplicar el evento.

#### Scenario: Factura rechazada
- **WHEN** la DIAN rechaza la factura electrónica de un pedido
- **THEN** el historial muestra «Factura rechazada», con el número, el origen Siigo y el mensaje del rechazo

### Requirement: Alertas al administrador (F4)
WHEN pasa una de estas cosas, el sistema SHALL avisar a los administradores de la empresa:

- cambia el precio de una línea en un pedido que ya está pagado;
- se anula un pago;
- cambian los datos de facturación de un pedido ya facturado.

#### Scenario: Precio después de pagado
- **WHEN** un asesor baja el precio de una línea en un pedido pagado
- **THEN** los administradores reciben la alerta con el pedido, el usuario, el antes → después y el motivo

### Requirement: El registro nunca bloquea el pedido
Registrar un evento SHALL NOT demorar ni hacer fallar la operación del pedido. IF el registro de un evento falla, THEN la operación SHALL completarse igual, y el sistema SHALL reintentar y dejar una traza estructurada con el identificador del pedido y el tipo de evento, sin datos personales, además de un conteo de fallas.

#### Scenario: Falla al registrar
- **WHEN** la escritura del evento falla al registrar un pago
- **THEN** el pago queda guardado, el usuario no ve ningún error y la falla queda contada y trazada

### Requirement: Multiempresa y datos personales
Registrar y consultar eventos SHALL limitarse a la empresa de la sesión autenticada (la del token, no un encabezado). IF se pide el historial de un pedido de otra empresa, THEN la respuesta SHALL ser la misma que si el pedido no existiera. Los logs SHALL NOT contener datos personales completos; solo identificadores.

#### Scenario: Pedido ajeno
- **WHEN** un usuario de la empresa A pide el historial de un pedido de la empresa B
- **THEN** recibe «pedido no encontrado» y queda el rastro del intento ajeno
