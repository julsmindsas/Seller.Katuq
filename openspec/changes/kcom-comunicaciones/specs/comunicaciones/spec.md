## ADDED Requirements

Spec paraguas del proyecto KCOM (tickets 1400 a 1404, D-632). Fija las reglas que toda épica cumple. Cada épica detalla sus requisitos en su propio cambio. Sin decisiones de tecnología. Las reglas RC siguen la numeración de la Spec v1.1 de Jairo.

### Requirement: Un solo dominio de mensajería
WHEN se agrega un canal, una cuenta o una vista de conversaciones, THE sistema SHALL reutilizar el dominio de Mensajería actual (líneas, hilos con dueño, webhook por proveedor) y SHALL NOT crear un segundo modelo de cuentas, conversaciones o mensajes, ni una bandeja paralela a las existentes.

#### Scenario: Canal nuevo
- **WHEN** se integra TikTok
- **THEN** entra como un proveedor más de líneas, con la misma conexión, el mismo webhook idempotente y la misma asignación que WhatsApp

#### Scenario: Rutas de hoy
- **WHEN** se despliega la bandeja única
- **THEN** las rutas de las bandejas de WhatsApp, Instagram y Facebook siguen abriendo, ahora como filtros

### Requirement: Ventana y reglas de cada canal en el compositor (RC02, RC03)
WHILE la ventana de respuesta de un canal está cerrada, THE sistema SHALL impedir el envío libre y mostrar al asesor qué puede hacer en ese canal. THE sistema SHALL mostrar el contador de la ventana sobre el compositor.

#### Scenario: WhatsApp fuera de las 24 h
- **WHEN** el asesor intenta escribir y pasaron más de 24 h desde el último mensaje del cliente
- **THEN** solo puede enviar una plantilla aprobada, y ve su costo estimado antes de enviar

#### Scenario: Instagram o Messenger fuera de las 24 h
- **WHEN** el asesor responde dentro de los 7 días posteriores
- **THEN** el envío sale como respuesta humana de soporte; si lo intenta KAI o es una promoción, se bloquea

#### Scenario: TikTok, mensaje once
- **WHEN** ya se enviaron 10 mensajes dentro de las 48 h de un mensaje del usuario
- **THEN** el sistema bloquea el 11.º con una explicación, y un mensaje nuevo del usuario reinicia ambos contadores

### Requirement: Costo por mensaje y saldo (RC08)
WHEN un mensaje tiene costo del proveedor, THE sistema SHALL registrar su costo en pesos y descontarlo del saldo del comercio. IF el saldo es cero, THEN THE sistema SHALL permitir recibir y responder solo en canales sin costo.

#### Scenario: Plantilla con saldo
- **WHEN** el asesor va a enviar una plantilla con costo
- **THEN** ve el valor estimado y, al enviar, se descuenta una sola vez

#### Scenario: Saldo en cero
- **WHEN** el saldo llega a cero
- **THEN** los mensajes de WhatsApp con costo se bloquean con aviso; Instagram, Messenger y TikTok siguen respondiendo

### Requirement: KAI no inventa y entrega el contexto (RC04, RC09)
THE sistema SHALL hacer que KAI tome precio, existencias y tiempos solo de las herramientas del motor de Katuq. IF una herramienta falla o el cliente pide un humano, THEN THE sistema SHALL pasar la conversación a un asesor con el carrito y un resumen en una nota interna.

#### Scenario: Cliente mayorista
- **WHEN** un cliente de tipo Mayorista pide «3 Deleite para mañana»
- **THEN** KAI responde con el precio de su lista y las existencias del canal, arma el carrito y deja la cotización con la fuente del canal visible

#### Scenario: Herramienta caída
- **WHEN** la consulta de existencias falla
- **THEN** KAI no afirma disponibilidad, escala al asesor con el carrito armado y deja la nota interna

### Requirement: El chat no escribe catálogo, precios ni inventario (D-134)
THE sistema SHALL permitir que el chat lea productos, precios y existencias, y SHALL NOT crear, editar ni borrar productos, variantes, categorías, precios, listas de precios, `inventory`, `inventoryMovement` ni datos de Shopify. WHEN el chat crea una cotización o un pedido, THE sistema SHALL hacerlo por el camino de pedidos existente, con la fuente (WHATSAPP, INSTAGRAM, FACEBOOK o TIKTOK) y el `conversationId` (RC05).

#### Scenario: Cotización desde el chat
- **WHEN** KAI o el asesor arma un carrito y lo cierra
- **THEN** producto, variantes, precio, listas de precios e inventario permanecen sin cambios, y aparece la cotización con su fuente

#### Scenario: Pedido en vez de cotización
- **WHEN** el comercio activó «pedido con pago PENDIENTE»
- **THEN** el pedido se crea por el camino existente; no se reserva ni descuenta inventario por una regla distinta a la vigente

### Requirement: Entradas idempotentes y firmadas (RC12)
WHEN llega un evento de un proveedor, THE sistema SHALL validar su firma, guardar el evento crudo y procesarlo una sola vez por identificador externo.

#### Scenario: Mensaje duplicado
- **WHEN** el proveedor entrega dos veces el mismo mensaje
- **THEN** aparece una vez en la bandeja y el bot no responde dos veces

#### Scenario: Firma inválida
- **WHEN** el evento llega sin firma válida
- **THEN** se rechaza y no se guarda como mensaje

### Requirement: Bandeja única con dueño, SLA y notas (RC06, RC07, RC10)
THE sistema SHALL listar en una sola bandeja las conversaciones de todos los canales y números a los que el usuario tiene acceso, con filtros por canal, número, equipo, asignado y estado. WHEN vence el SLA de primera respuesta, THE sistema SHALL alertar al asesor y al líder y subir la conversación. THE sistema SHALL NOT enviar al cliente una nota interna.

#### Scenario: Comercio con 18 números
- **WHEN** un comercio con 18 números abre la bandeja
- **THEN** ve todo en una lista, filtra por número y cada conversación cae al equipo de ese número

#### Scenario: Vendedor sin permiso
- **WHEN** un asesor sin acceso a un número abre la bandeja
- **THEN** el servidor no devuelve las conversaciones de ese número

### Requirement: Origen de anuncio heredado por el pedido
WHEN una conversación empieza desde un anuncio o un link con referencia, THE sistema SHALL guardar el origen en la conversación y SHALL pasarlo al pedido que salga de ella.

#### Scenario: Click-to-WhatsApp
- **WHEN** el cliente escribe desde un anuncio y luego compra
- **THEN** el pedido muestra el anuncio de origen

### Requirement: Seguridad, retención y borrado (RC11)
THE sistema SHALL guardar los tokens de canal cifrados y fuera de logs y del frontend, aislar cada empresa, registrar quién lee, envía, transfiere o exporta una conversación, y procesar con IA solo con proveedores que no entrenan con los datos. WHEN un comercio desconecta un canal o lo pide, THE sistema SHALL revocar el token de inmediato y programar el borrado de los datos de ese canal, una vez autorizado por Daniel para `katuq-db`.

#### Scenario: Desconectar TikTok
- **WHEN** el comercio desconecta TikTok
- **THEN** el token se revoca al instante y el borrado queda programado dentro del plazo aprobado

#### Scenario: Declaración ante TikTok
- **WHEN** se prepara la respuesta al cuestionario de TikTok
- **THEN** cada control declarado existe y tiene evidencia; lo que no existe se marca como pendiente

### Requirement: Nada nuevo sin aprobación, apagado por defecto
THE sistema SHALL NOT crear colecciones, endpoints ni módulos «v2» sin aprobación explícita de Daniel registrada en el cambio de la épica. WHEN una épica entrega una función visible, THE sistema SHALL entregarla apagada, activable por empresa con bandera en Firestore (D-505), con kill switch propio y piloto en un comercio.

#### Scenario: Propuesta de colección nueva
- **WHEN** el design de una épica propone una colección o ruta pública nueva
- **THEN** la lista como pregunta pendiente y no se implementa hasta la aprobación

#### Scenario: Canal vivo
- **WHEN** se activa una función nueva en un comercio piloto
- **THEN** el número compartido de Katuq, las notificaciones de pedido y el bot de otros comercios siguen igual
