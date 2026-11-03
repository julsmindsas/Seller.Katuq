## ADDED Requirements

Spec paraguas del proyecto KCAT (tickets 1389 a 1395, D-630). Fija las reglas que toda épica cumple. Cada épica detalla sus requisitos en su propio cambio. Sin decisiones de tecnología.

### Requirement: Un solo motor para Venta Asistida y los catálogos
El sistema SHALL calcular precio, impuestos, domicilio, descuentos, pedido mínimo y total con la misma lógica en Venta Asistida, el Catálogo por link y el Catálogo web. El sistema SHALL NOT mantener una segunda copia de esa lógica en la página pública.

#### Scenario: Mismo carrito, mismo total
- **WHEN** el mismo carrito, con la misma ciudad y el mismo modo de entrega, se arma en Venta Asistida y en un catálogo
- **THEN** el total, el IVA por tarifa (0 %, 5 %, 8 %, 19 %) y el domicilio son idénticos

#### Scenario: Venta Asistida no cambia al extraer el motor
- **WHEN** se despliega la extracción del motor (E1)
- **THEN** diez carritos reales de Almara dan en Venta Asistida los mismos totales que antes, y la pantalla no muestra ningún cambio visible

### Requirement: No duplicar la tienda existente
El sistema SHALL reutilizar lo que la tienda (sitios) ya hace (carrito, checkout, cupones, promociones, cuenta del comprador, carrito y pago abandonado, recoger en tienda, «Avísame») cuando un catálogo lo necesite. El sistema SHALL NOT crear un segundo carrito, un segundo checkout ni una segunda página pública para lo mismo.

#### Scenario: Función que la tienda ya tiene
- **WHEN** una épica necesita una función que la tienda ya ofrece
- **THEN** su cambio la reutiliza o la extrae a un servicio compartido, y declara en su design qué parte de la tienda toca

#### Scenario: Tienda ya creada
- **WHEN** un comercio ya tiene una tienda o un catálogo web publicado
- **THEN** lo sigue viendo igual hasta que active una función nueva o cambie de tema

### Requirement: El catálogo no escribe precios ni inventario
El catálogo SHALL leer productos, precios, tipos de cliente y existencias, y SHALL NOT crear, editar ni borrar productos, variantes, categorías, precios, precios por cliente, listas de precios, `inventory`, `inventoryMovement` ni datos de Shopify. Sus escrituras propias SHALL limitarse al catálogo, sus eventos, los prospectos y los pedidos creados por el camino de pedidos existente.

#### Scenario: Crear, editar o compartir un catálogo
- **WHEN** el comercio crea, edita, apaga o comparte un catálogo
- **THEN** producto, variantes, precio, listas de precios e inventario permanecen sin cambios

#### Scenario: Un comprador abre y navega el catálogo
- **WHEN** un visitante ve productos, filtra o agrega al carrito
- **THEN** no se escribe ningún dato de producto, precio ni existencias

#### Scenario: Excepción sobre el maestro de productos
- **WHEN** una tarea necesita escribir el maestro de productos (pestaña «Catálogo» del producto, imagen y slug de categoría, canal en el producto)
- **THEN** no se implementa hasta que exista su propuesta aparte con aprobación explícita

### Requirement: El pedido de catálogo usa el camino de pedidos existente
Cuando el comprador confirma, el sistema SHALL crear el pedido por el camino de pedidos existente, con la fuente (CATÁLOGO WEB o CATÁLOGO LINK), el catálogo, el vendedor y el método de checkout, y con estado de pago PENDIENTE. El sistema SHALL NOT mover inventario por una regla distinta a la de la tienda de hoy hasta que otra propuesta lo apruebe.

#### Scenario: Pedido anónimo desde un catálogo por link
- **WHEN** un comprador anónimo completa el pedido en el celular y paga por Wompi
- **THEN** el pedido aparece en Pedidos con fuente CATÁLOGO LINK, el catálogo y el vendedor, y estado PENDIENTE

#### Scenario: Pago confirmado no sustituye la pre-aprobación
- **WHEN** el webhook confirma el pago en línea
- **THEN** el pedido muestra el pago como recibido y sigue esperando que el comercio lo pase a PREAPROBADO

### Requirement: Precio según el comprador
El sistema SHALL mostrar el precio base al comprador sin cliente o sin tipo de cliente, y el precio de su tipo al comprador identificado. Un catálogo con destinatario SHALL usar el precio del destinatario. El sistema SHALL recalcular el carrito cuando el comprador se identifica y SHALL NOT mostrar precios de otro tipo de cliente.

#### Scenario: Comprador anónimo
- **WHEN** un visitante sin cliente abre el catálogo
- **THEN** ve el precio base

#### Scenario: Mayorista identificado
- **WHEN** el comprador se identifica y su cliente tiene tipo Mayorista
- **THEN** el carrito se recalcula con el precio de Mayorista

#### Scenario: Producto sin precio
- **WHEN** un producto no tiene precio para el comprador
- **THEN** se muestra «Consultar precio» y solo se puede pedir en modo Cotización

### Requirement: Existencias solo de las bodegas del canal
El sistema SHALL mostrar y validar las existencias solo de las bodegas asignadas al canal del catálogo, y SHALL NOT activar un catálogo cuyo canal no tenga bodega (salvo modo sin inventario). Precio y existencias SHALL revalidarse al abrir el carrito y al confirmar.

#### Scenario: Canal sin bodega
- **WHEN** el comercio intenta activar un catálogo cuyo canal no tiene bodega
- **THEN** el sistema avisa qué falta y no lo activa

#### Scenario: Cambió el precio con el carrito abierto
- **WHEN** el precio o las existencias cambian antes de confirmar
- **THEN** el comprador ve el aviso y el cambio antes de crear el pedido

### Requirement: Colecciones y endpoints nuevos solo con aprobación
El sistema SHALL NOT crear colecciones, endpoints ni módulos «v2» sin aprobación explícita de Daniel registrada en el cambio de la épica. Los links `/cat/{hash}` y los cinco catálogos de Almara SHALL seguir funcionando.

#### Scenario: Propuesta de colección nueva
- **WHEN** el design de una épica propone una colección o ruta pública nueva
- **THEN** la lista como pregunta pendiente y no se implementa hasta la aprobación

#### Scenario: Catálogo por link existente
- **WHEN** se despliega cualquier épica
- **THEN** un link `/cat/{hash}` creado antes abre el mismo catálogo

### Requirement: Orden, fases y aprobación
El sistema de trabajo SHALL ejecutar las épicas en el orden E1, E2, E3, E5, E4, E6, E7. Cada épica SHALL abrir su propio cambio OpenSpec con spec, design y tasks, cada uno con su aprobación, antes de escribir código. En pedidos, inventario y consecutivos se aplicará un cambio a la vez con diff aprobado.

#### Scenario: Abrir una épica
- **WHEN** termina la épica anterior y se empieza la siguiente
- **THEN** se crea su cambio OpenSpec y no se programa hasta aprobar su spec, design y tasks

#### Scenario: Función apagada por defecto
- **WHEN** una épica entrega una función visible
- **THEN** nace apagada, se enciende por empresa con bandera en Firestore (D-505), con kill switch propio, y se prueba primero en el comercio piloto
