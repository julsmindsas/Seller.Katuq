## ADDED Requirements

### Requirement: Acción «Despacho rápido» en el pedido
THE «Opciones del pedido» SHALL ofrecer la acción «Despacho rápido» como acción de contexto (fila «Para este pedido», D-547), con el ícono y la reseña que apruebe el diseño. WHERE el pedido se puede despachar, la acción SHALL verse habilitada. WHERE el pedido está Despachado o Entregado, SHALL verse en su lugar «Ver despacho y entrega», sin que la fila de contexto crezca. Las 16 acciones fijas SHALL NOT cambiar de lugar ni de nombre.

#### Scenario: Pedido listo para despachar
- **WHEN** el usuario abre «Opciones del pedido» en un pedido Empacado con domicilio
- **THEN** ve «Despacho rápido» en «Para este pedido», habilitada

#### Scenario: Pedido ya despachado
- **WHEN** el usuario abre el modal en un pedido Despachado
- **THEN** ve «Ver despacho y entrega» y no ve «Despacho rápido»

### Requirement: Mismas validaciones que «Crear orden de envío»
THE acción SHALL aplicar las mismas validaciones que Logística, y SHALL NOT tener otras más flojas:

- el estado del pedido no es Entregado, Despachado, EnProduccion ni SinProducir;
- el pedido no es recogida en tienda (según `carrito[0].configuracion.datosEntrega.formaEntrega`) y, si esa forma no existe, tiene dirección de entrega;
- hay método de envío y, si es mensajero o transportadora, hay transportador elegido;
- el transportador está en línea;
- el pedido no está en otra orden de envío viva;
- el pedido es de la empresa de la sesión.

IF una validación falla, THEN la ventana SHALL explicar el motivo en palabras sencillas y SHALL NOT crear ni modificar ninguna orden. La acción SHALL verse deshabilitada, con su motivo, cuando la falla se conoce antes de abrirla (estado o forma de entrega).

#### Scenario: Pedido en producción
- **WHEN** el pedido está en EnProduccion
- **THEN** «Despacho rápido» se ve deshabilitada con el motivo «Aún no está listo para despachar» y no hay llamadas al servidor

#### Scenario: Transportador fuera de línea
- **WHEN** el usuario elige un transportador que no está en línea
- **THEN** ve el aviso del servidor «Transportador no disponible» y el pedido sigue como estaba

#### Scenario: Pedido ya en una orden viva
- **WHEN** el pedido ya está en una orden de envío sin despachar
- **THEN** el servidor responde 409 y la ventana dice en qué orden está, sin crear una segunda orden

### Requirement: Mismo camino que Logística, sin lógica nueva en el servidor
WHEN el usuario confirma «Despachar», Katuq SHALL crear la orden de envío con `POST /v1/logistica/shippingorders/create` y, cuando eso salga bien, despacharla con `POST /v1/logistica/shippingorders/dispatch`, con el mismo cuerpo que arma Logística para un solo pedido. THE cambio SHALL NOT agregar endpoints, colecciones ni reglas en el servidor, y SHALL NOT usar `batch-dispatch` salvo que Daniel lo apruebe como excepción.

WHEN termina, THE pedido SHALL quedar con su `shippingOrder`, su transportador y su estado de proceso actualizado exactamente como si se hubiera hecho en Logística, y el historial del pedido SHALL mostrar los mismos eventos (D-541).

#### Scenario: Despacho completo
- **WHEN** el usuario despacha un pedido Empacado con mensajero propio
- **THEN** el pedido queda Despachado con el número de orden de envío, y la ventana lo muestra

#### Scenario: Igual que Logística
- **WHEN** se despachan dos pedidos equivalentes, uno desde el pedido y otro desde Logística
- **THEN** quedan con los mismos campos de despacho, el mismo estado y los mismos eventos de historial

### Requirement: Falla a medio camino
IF la orden se crea pero el despacho falla, THEN el pedido SHALL quedar en EnDespacho con su orden, la ventana SHALL decir que la orden ya existe y ofrecer «Reintentar despacho», y Katuq SHALL NOT crear una segunda orden. WHILE una solicitud está en curso, el botón «Despachar» SHALL permanecer deshabilitado.

#### Scenario: Corte de conexión
- **WHEN** se cae la conexión después de crear la orden y antes de despachar
- **THEN** al reintentar se despacha la misma orden y no se crea otra

### Requirement: El inventario no cambia
THE acción SHALL NOT escribir `inventory`, `inventoryMovement` ni cantidades de Shopify, y SHALL NOT modificar productos, variantes, precios ni listas de precios. Su write-set SHALL ser el de Logística: la orden de envío y los campos de despacho del pedido. El estado de pago SHALL NOT bloquear el despacho pedido por una persona (D-205).

#### Scenario: Productos, precios e inventario intactos
- **WHEN** se despacha un pedido con la acción
- **THEN** `products`, precios, listas de precios, `inventory` e `inventoryMovement` quedan idénticos a antes, y solo cambian la orden de envío y los campos de despacho del pedido

### Requirement: Permiso y bandera
WHERE el comercio tiene encendida la bandera (`featureFlags`, D-505), THE acción SHALL estar disponible. WHERE no la tiene, SHALL NOT aparecer. El servidor SHALL seguir decidiendo el permiso: un usuario sin acceso a despachar recibe el mismo rechazo que en Logística.

#### Scenario: Comercio sin la bandera
- **WHEN** un usuario de un comercio sin la bandera abre el modal
- **THEN** no ve «Despacho rápido» y todo lo demás queda igual

### Requirement: Diseño
THE ventana SHALL usar `openspec/specs/design-system/spec.md` y la regla de diseño Katuq (D-400): botón principal morado `#5F3FE0`, secundario blanco con borde, avisos en par fuerte/fondo suave, sin gradientes, radios 16/11/20 px y sin scroll horizontal a 390 px.

#### Scenario: Celular
- **WHEN** el usuario abre la ventana en un celular de 390 px
- **THEN** ve transportador, resumen y botón completos, sin scroll horizontal
