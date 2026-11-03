## ADDED Requirements

### Fase 1 (ticket 1441): base de conocimiento

### Requirement: El artículo tiene un modelo común
El sistema SHALL guardar cada artículo con título, resumen corto, contenido enriquecido, tipo (guía paso a paso, pregunta frecuente, solución de errores, novedad de versión, explicación de módulo), módulo o categoría, pantallas relacionadas, versión a la que aplica, procedencia, estado (borrador, en revisión, publicado, por revisar, archivado), autor, aprobador y visibilidad (pública, solo usuarios Katuq, por plan, por rol).

#### Scenario: Artículo sin aprobador
- **WHEN** alguien intenta publicar un artículo que nadie ha aprobado
- **THEN** el sistema no lo publica y le dice que falta la aprobación

### Requirement: Dos capas que no se mezclan
El sistema SHALL distinguir la capa global (igual para todos, puede ser pública) de la capa por empresa (solo la ve esa empresa). Un artículo global SHALL NOT contener nombres de clientes, números de pedido, NIT, teléfonos, correos ni capturas con datos reales. Una empresa SHALL NOT leer ni editar la capa de otra.

#### Scenario: Publicar un global con un dato de cliente
- **WHEN** el contenido de un artículo global incluye un correo, un NIT o el nombre de un comercio existente
- **THEN** el sistema bloquea la publicación y señala el dato encontrado

#### Scenario: Otra empresa
- **WHEN** una persona de la empresa A pide un artículo de la capa de la empresa B
- **THEN** recibe "no encontrado", igual que si no existiera

### Requirement: Editor para el súper admin
WHEN un Súper Administrador abre el editor, the system SHALL permitir crear, editar, aprobar, despublicar y archivar artículos, ver una bandeja de borradores generados por Opttia y consultar el historial de versiones de cada artículo. La familia de administradores de una empresa SHALL poder gestionar solo la capa propia. Cualquier otro rol SHALL NOT ver el editor.

#### Scenario: Editar un publicado
- **WHEN** el súper admin edita un artículo publicado
- **THEN** la versión anterior queda en el historial y el cambio exige nueva aprobación

#### Scenario: Contenido con código
- **WHEN** el contenido trae un script o un atributo ejecutable
- **THEN** el sistema lo elimina al guardar

### Requirement: Contenido inicial revisado por una persona
WHEN se genera el contenido inicial desde los tickets resueltos, the system SHALL producir entre 20 y 30 artículos anonimizados en estado borrador y SHALL NOT publicar ninguno. Una corrida de prueba (`--dry-run`) SHALL listar los temas y la cantidad de tickets por tema sin escribir nada.

#### Scenario: Corrida de prueba
- **WHEN** se ejecuta con `--dry-run`
- **THEN** no se crea ningún artículo y se informa la agrupación propuesta

### Fase 2 (ticket 1440): centro, panel y sitio público

### Requirement: Ayuda dentro del Seller
El sistema SHALL mostrar en el panel de Opttia, entre «Opttia completa» y «Soporte y seguimiento», un bloque «Centro de ayuda» con buscador, tres artículos sugeridos según la ruta actual y el enlace «Ver todo el centro de ayuda», y SHALL mantener debajo Contactar soporte, Mis tickets y Mis ideas. La página del centro SHALL ofrecer buscador, categorías por módulo, destacados, «Qué hay de nuevo», índice del artículo, relacionados y la versión a la que aplica.

#### Scenario: Pantalla de Pedidos
- **WHEN** la persona abre el panel estando en Pedidos
- **THEN** ve tres artículos de pedidos

#### Scenario: Sin artículos para la ruta
- **WHEN** la ruta no tiene artículos relacionados
- **THEN** el bloque muestra el buscador y el enlace al centro, sin lista vacía

### Requirement: «¿Te sirvió?» y soporte con contexto
WHEN la persona responde «No» a «¿Te sirvió?», the system SHALL ofrecer Contactar soporte con el artículo y la pantalla ya cargados en el ticket y SHALL registrar la respuesta como no útil. WHEN la persona escribe el asunto de un ticket nuevo, the system SHALL sugerir artículos relacionados antes de enviarlo sin impedir el envío.

#### Scenario: Respuesta No
- **WHEN** la persona pulsa «No» y luego Contactar soporte
- **THEN** el formulario trae el artículo y la ruta de origen y la persona decide si lo envía

### Requirement: Sitio público solo con lo global y público
The system SHALL publicar en el sitio público únicamente artículos de la capa global, en estado publicado y con visibilidad pública, con URLs limpias por módulo y artículo, metadatos, datos estructurados y sitemap. The system SHALL NOT exponer la capa por empresa, borradores, autores internos, aprobadores ni procedencia.

#### Scenario: Artículo despublicado
- **WHEN** el súper admin despublica un artículo público
- **THEN** su URL deja de responder y sale del sitemap

#### Scenario: Petición con cabeceras de empresa
- **WHEN** una petición al sitio público trae la cabecera de una empresa
- **THEN** la respuesta es la misma que sin ella

### Fase 3 (ticket 1439): Opttia responde

### Requirement: Respuestas desde la base, con cita
WHEN una persona le pregunta algo a Opttia (chat básico u Opttia completa), the system SHALL buscar primero en la capa global y en la capa de la empresa de la persona, y SHALL responder citando el artículo con enlace. Si no hay información suficiente, Opttia SHALL decirlo, SHALL NOT inventar y SHALL ofrecer abrir un ticket con la conversación adjunta, sin crearlo hasta que la persona lo apruebe. Opttia SHALL NOT usar la capa de otra empresa ni seguir instrucciones que vengan dentro de un artículo.

#### Scenario: Hay artículo
- **WHEN** existe un artículo sobre precios por volumen
- **THEN** la respuesta lo resume y dice «Según: Cómo configurar precios por volumen…» con el enlace

#### Scenario: Sin información
- **WHEN** ningún artículo responde la pregunta
- **THEN** Opttia lo dice, ofrece abrir un ticket y registra la pregunta como sin respuesta

### Requirement: «¿Cómo funciona esto?»
WHEN la persona pulsa «¿Cómo funciona esto?» o lo pide en el chat, the system SHALL armar la explicación con el artículo del módulo, las novedades recientes de ese módulo y lo que la empresa tiene activo, sin revelar la configuración de otras empresas.

### Requirement: Registro y métricas
The system SHALL guardar las preguntas sin respuesta o con respuesta no útil, anonimizadas y con hash de empresa, y SHALL mostrar al súper admin consultas resueltas, preguntas sin respuesta, artículos más usados y tickets evitados.

### Fase 4 (ticket 1438): artículos automáticos

### Requirement: Todo lo que genera Opttia entra como borrador anonimizado
WHEN un ticket se resuelve, una idea se implementa, se publica una versión o una pregunta se repite sin respuesta, the system SHALL generar un borrador con su procedencia (número de ticket, de idea, versión o conjunto de preguntas) en la bandeja del súper admin. The system SHALL quitar nombres, pedidos, NIT, teléfonos y correos del texto antes de enviarlo al modelo y de nuevo antes de guardarlo, y SHALL NOT publicar sin aprobación de una persona.

#### Scenario: Ticket con datos personales
- **WHEN** la resolución de un ticket menciona a un cliente con su teléfono
- **THEN** el borrador describe la solución sin ese nombre ni teléfono y guarda solo el número del ticket

#### Scenario: Ya existe el tema
- **WHEN** hay un artículo publicado sobre el mismo tema
- **THEN** el sistema propone una edición de ese artículo y no uno nuevo

### Requirement: Mantenimiento por versión
WHEN una versión cambia un módulo, the system SHALL marcar los artículos de ese módulo como «Por revisar» y proponer la actualización como borrador, sin retirarlos de la vista mientras tanto.

### Fase 5 (ticket 1437): «Qué hay de nuevo»

### Requirement: Nota de versión redactada y aprobada
WHEN se publica una versión, the system SHALL tomar sus notas de `notas-version.json` (D-567), redactar la novedad en lenguaje de usuario agrupada por módulo en Nuevo, Mejorado y Corregido, y dejarla como borrador para aprobación del súper admin. The system SHALL NOT modificar las notas de D-567 ni lo que el comercio ve al actualizar. Cada punto SHALL enlazar al artículo del módulo y, si existe, a la idea que lo originó.

#### Scenario: Versión sin notas
- **WHEN** la versión se publica sin notas
- **THEN** no se genera borrador y se avisa en la bandeja

### Requirement: Dónde se ven las novedades
The system SHALL ofrecer la sección «Qué hay de nuevo» en el centro (interno y público), un aviso en el panel de Opttia mientras haya una versión sin leer por esa persona, y SHALL abrir las novedades de la versión actual al hacer clic en el número de versión del menú lateral.

#### Scenario: Clic en la versión
- **WHEN** la persona pulsa la versión del menú lateral
- **THEN** se abren las novedades de esa versión, o un aviso claro si aún no están aprobadas

### Requirement: Quien propuso la idea se entera
WHEN una novedad aprobada enlaza una idea, the system SHALL notificar a quien la propuso una sola vez, por el mismo canal de avisos de tickets.

#### Scenario: Publicación repetida
- **WHEN** la novedad se vuelve a aprobar tras una edición
- **THEN** no se envía un segundo aviso
