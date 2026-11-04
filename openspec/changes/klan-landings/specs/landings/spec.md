## ADDED Requirements

Spec paraguas del proyecto KLAN (tickets 1396 a 1399, D-633). Fija las reglas que toda épica cumple. Cada épica detalla sus requisitos en su propio cambio. Sin decisiones de tecnología. Las reglas RL siguen la numeración de la Spec v1.1 de Jairo.

### Requirement: Una landing es un sitio, no un sistema aparte
THE sistema SHALL construir las landings sobre los sitios existentes (render, subdominio, editor, Mi marca, dominio propio) y SHALL NOT crear un segundo editor, un segundo render, una colección de landings ni un píxel paralelo sin aprobación explícita de Daniel.

#### Scenario: Landing nueva
- **WHEN** el comercio crea una landing desde «¿Qué quieres lograr?»
- **THEN** nace como un sitio de tipo `landing` con las secciones de su objetivo, y aparece en la lista de «Mis sitios» y en «Landings»

#### Scenario: Landings existentes
- **WHEN** se despliega el motor de landings
- **THEN** las landings ya publicadas se ven y miden igual hasta que el comercio las cambie

### Requirement: Una página, un objetivo, un botón (RL01)
THE sistema SHALL permitir una sola acción principal por landing (comprar, dejar datos, WhatsApp, reservar o anotarse) y SHALL NOT mostrar menú de navegación en una landing que vive sola. WHILE el visitante está en un celular, THE sistema SHALL mantener el botón principal visible en la zona del pulgar.

#### Scenario: Dos acciones principales
- **WHEN** el comercio intenta configurar dos acciones principales
- **THEN** el editor lo impide y explica por qué

#### Scenario: Estructura por objetivo
- **WHEN** el comercio elige «Vender en línea», «Conseguir contactos» o «Que conozcan mi negocio»
- **THEN** recibe la estructura de L1, L3 o L6, con el tema visual que ya elige por sector

### Requirement: Precio, stock y vigencia vienen del motor (RL02, RL08)
THE sistema SHALL tomar precio, precio tachado, existencias y vigencia de los datos reales del motor de Katuq y SHALL NOT permitir escribirlos a mano en la landing. WHEN una landing vence, THE sistema SHALL mostrar «oferta terminada», llevar al catálogo web y seguir midiendo el tráfico.

#### Scenario: Precio según el cliente
- **WHEN** el comprador es un cliente identificado de tipo Mayorista
- **THEN** ve el precio de su tipo; un visitante anónimo ve el precio base

#### Scenario: Oferta vencida
- **WHEN** pasa la fecha de vencimiento de una landing con oferta
- **THEN** el visitante ve «oferta terminada» y un enlace al catálogo, y las visitas siguen contando

### Requirement: Pedidos y leads con su origen (RL03, RL04, RL05)
WHEN un visitante compra desde una landing, THE sistema SHALL crear el pedido por el camino de pedidos existente con estado de pago PENDIENTE, la fuente LANDING, el identificador de la landing y el origen de campaña. WHEN deja sus datos, THE sistema SHALL exigir el consentimiento de la Ley 1581 marcado, guardar su fecha y el texto vigente, y crear el lead en el CRM del comercio con su origen. IF llega un lead con el mismo celular dentro de 24 h, THEN THE sistema SHALL fusionarlo y agregar la nueva fuente.

#### Scenario: Compra desde un anuncio de Meta
- **WHEN** un comprador llega con `utm_source=facebook` y `fbclid` y compra
- **THEN** el pedido entra PENDIENTE con fuente LANDING, la landing y las utm visibles en el detalle

#### Scenario: Lead sin consentimiento
- **WHEN** el visitante envía el formulario sin marcar el consentimiento
- **THEN** no se crea el lead y se le pide marcarlo

#### Scenario: Lead nuevo
- **WHEN** un prospecto deja nombre y celular en una L3
- **THEN** aparece en Clientes → prospectos con origen «landing», asignado a un comercial, que recibe aviso en menos de un minuto

### Requirement: Medición propia, del servidor y sin duplicados (RL06, RL07)
THE sistema SHALL guardar utm e identificadores de clic al entrar y llevarlos al carrito, al lead y al pedido. WHEN se crea un lead o un pedido, o el pago pasa a aprobado, THE sistema SHALL informar la conversión desde el servidor con el mismo identificador de evento que usó el navegador, aunque el navegador falle. WHILE el visitante no haya dado su consentimiento, THE sistema SHALL NOT disparar píxeles de terceros; la medición propia, sin datos personales, sí dispara.

#### Scenario: Pedido contra entrega
- **WHEN** se hace un pedido contra entrega desde una landing con `fbclid`
- **THEN** Meta lo registra una sola vez como compra y el detalle del pedido muestra la campaña

#### Scenario: Consentimiento rechazado
- **WHEN** el visitante rechaza las cookies
- **THEN** no sale ninguna petición a facebook.com, google-analytics.com ni tiktok.com, y la medición propia sí registra la visita

### Requirement: Credenciales de rastreo protegidas
THE sistema SHALL guardar los tokens de Meta, Google y TikTok cifrados y SHALL NOT devolverlos al navegador ni escribirlos en logs. WHEN se migran los tokens ya guardados en texto, THE sistema SHALL correr primero en modo de prueba (`--dry-run`) y reportar cuántos cambiaría.

#### Scenario: Ver la configuración
- **WHEN** el comercio abre Configuración → Rastreo
- **THEN** ve qué plataformas están conectadas, sin ver ningún token

### Requirement: Visible para buscadores y para la IA, sin inventar (RL10, RL11, RL12)
THE sistema SHALL publicar datos estructurados válidos por tipo de landing, `sitemap.xml`, `robots.txt` y `llms.txt`, y SHALL dejar `noindex` por defecto a una landing con vigencia. IF el schema tiene errores, THEN THE sistema SHALL bloquear la publicación; las advertencias no bloquean. THE sistema SHALL calcular a diario los hechos citables (pedidos entregados, calificación) desde datos reales y SHALL NOT permitir editarlos a mano.

#### Scenario: Landing de negocio local
- **WHEN** se publica una L6 con dirección y horario
- **THEN** pasa la prueba de resultados enriquecidos de Google (LocalBusiness, FAQPage) sin errores y entra al sitemap

#### Scenario: Hecho citable
- **WHEN** el comercio ve «+12.000 pedidos entregados»
- **THEN** lleva la fecha de su último cálculo y no se puede modificar a mano

### Requirement: Cambiar de modo no rompe el enlace (RL09)
WHEN el comercio cambia una landing entre «sola» y «dentro del sitio», THE sistema SHALL crear una redirección 301 desde la ruta anterior, apuntar el canonical a la nueva y actualizar el sitemap.

#### Scenario: Cambio de modo
- **WHEN** una landing compartida en un anuncio pasa a vivir dentro del sitio
- **THEN** el enlace viejo sigue abriendo y redirige a la ruta nueva

### Requirement: El experimento cambia una sola cosa (RL13)
WHEN el comercio corre una prueba A/B, THE sistema SHALL cambiar una sola variable, repartir el tráfico 50/50 por sesión y sugerir un ganador solo con confianza de 95 % o más.

#### Scenario: Muestra insuficiente
- **WHEN** la prueba no alcanzó la muestra mínima
- **THEN** el sistema no sugiere ganador y muestra cuánto falta

### Requirement: No escribe catálogo, precios ni inventario (D-134)
THE sistema SHALL leer productos, precios y existencias, y SHALL NOT crear, editar ni borrar productos, variantes, categorías, precios, listas de precios, `inventory`, `inventoryMovement` ni datos de Shopify. Sus escrituras propias SHALL limitarse al sitio, sus eventos, los prospectos y los pedidos creados por el camino existente.

#### Scenario: Crear, editar o publicar una landing
- **WHEN** el comercio crea, edita, duplica o publica una landing
- **THEN** producto, variantes, precio, listas de precios e inventario permanecen sin cambios

#### Scenario: Pestaña «Landing» en el producto
- **WHEN** una tarea necesita escribir el maestro de productos
- **THEN** no se implementa hasta tener su propuesta aparte con aprobación explícita

### Requirement: Orden, apagado por defecto y nada nuevo sin aprobación
THE sistema SHALL ejecutar las épicas en el orden E1, E2, E3, E4, cada una con su propio cambio OpenSpec aprobado antes de escribir código. WHEN una épica entrega una función visible, THE sistema SHALL entregarla apagada, activable por empresa con bandera en Firestore (D-505), con kill switch propio y piloto en Almara. THE sistema SHALL NOT crear colecciones, endpoints ni módulos «v2» sin aprobación explícita de Daniel.

#### Scenario: Abrir una épica
- **WHEN** terminan las épicas anteriores y sus dependencias de KCAT
- **THEN** se crea el cambio de la siguiente y no se programa hasta aprobar su spec, design y tasks

#### Scenario: Propuesta de colección nueva
- **WHEN** el design de una épica propone una colección o ruta pública nueva
- **THEN** la lista como pregunta pendiente y no se implementa hasta la aprobación
