## ADDED Requirements

### Requirement: Módulo NPS en el menú
El sistema SHALL ofrecer un módulo "NPS" con tres pestañas: Resultados, Encuestas y Seguimiento.

- Lo ven la familia Administrador y los roles a los que el administrador les dé la ruta del módulo.
- Crear, editar, pausar o activar encuestas SHALL ser solo de la familia Administrador.
- Cada empresa SHALL ver y configurar solo sus propias encuestas y respuestas.

#### Scenario: Vendedor sin la ruta
- **WHEN** un vendedor sin la ruta del módulo entra al Seller
- **THEN** no ve "NPS" en el menú, y si abre la dirección directamente, el sistema le niega los datos

### Requirement: Crear una encuesta
El administrador SHALL poder crear una encuesta con:

- un nombre interno;
- la pregunta NPS, con escala fija de 0 a 10 y texto editable. El texto por omisión es "Del 0 al 10, ¿qué tan probable es que le recomiendes {comercio} a un amigo?";
- la pregunta abierta según la nota: tres textos editables (0 a 6, 7 y 8, 9 y 10), con textos por omisión;
- hasta tres preguntas adicionales opcionales, de opción única (2 a 6 opciones) o de texto corto (máximo 300 caracteres);
- el canal: "después de la entrega" o "enlace y QR";
- para "después de la entrega", los días de espera (1 a 30; por omisión 3);
- el responsable de los detractores: un usuario activo de la empresa;
- el estado: borrador, activa o pausada.

Una encuesta SHALL NOT activarse sin la pregunta NPS ni sin responsable.

#### Scenario: Encuesta posterior a la entrega
- **WHEN** el administrador crea una encuesta "después de la entrega" a 3 días, con Ana como responsable, y la activa
- **THEN** los pedidos que queden Entregado desde ese momento programan su encuesta, y los detractores le llegan a Ana

#### Scenario: Activar sin responsable
- **WHEN** el administrador intenta activar una encuesta sin responsable
- **THEN** el sistema no la activa y le dice qué falta

### Requirement: Una sola encuesta activa por canal
El sistema SHALL permitir como máximo una encuesta activa "después de la entrega" por empresa. Al activar otra, SHALL pedir confirmación y pausar la anterior. Las encuestas "enlace y QR" pueden estar activas varias a la vez.

#### Scenario: Cambiar la encuesta de entrega
- **WHEN** el administrador activa una segunda encuesta de entrega y confirma
- **THEN** la anterior queda pausada y los pedidos nuevos usan la nueva

### Requirement: Editar sin perder lo respondido
Cambiar una encuesta que ya tiene respuestas SHALL NOT alterar las respuestas guardadas: cada respuesta conserva el texto de las preguntas que vio. Una encuesta con respuestas SHALL NOT poder eliminarse, solo pausarse.

#### Scenario: Cambiar el texto
- **WHEN** el administrador cambia la pregunta abierta de los detractores en una encuesta con 40 respuestas
- **THEN** las 40 respuestas siguen mostrando la pregunta que vio cada comprador

### Requirement: La encuesta de Julsmind a sus comercios
La pregunta a los comercios dentro del Seller (D-483) SHALL aparecer como una encuesta de Julsmind con el canal "dentro del Seller", con su configuración actual. Su estado SHALL seguir gobernado por la etapa de la bandera `NPS_COMERCIOS`.

#### Scenario: Julsmind abre Encuestas
- **WHEN** un administrador de Julsmind abre la pestaña Encuestas
- **THEN** ve la encuesta a comercios con su etapa actual, junto a las demás de Julsmind

### Requirement: Encendido por etapas por comercio
El módulo SHALL poder encenderse por comercio, sin cambiar código, antes de abrirlo a todos.

#### Scenario: Comercio sin el módulo encendido
- **WHEN** un comercio sin el módulo encendido entra al Seller
- **THEN** no ve "NPS" en el menú y no se le programan encuestas
