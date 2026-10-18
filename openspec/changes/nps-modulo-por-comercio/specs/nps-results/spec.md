## ADDED Requirements

### Requirement: Resultados de cada empresa
La pestaña Resultados SHALL mostrar, solo con las respuestas de la empresa de la sesión:
- el NPS de 90 días y el número de respuestas;
- la tasa de respuesta;
- el reparto entre promotores, pasivos y detractores;
- la tendencia de los últimos 6 meses;
- los comentarios, con filtros;
- los temas con KAI, a pedido.

SHALL permitir filtrar por encuesta y por canal (después de la entrega, enlace, dentro del Seller).

El NPS SHALL calcularse como el porcentaje de promotores (9 y 10) menos el de detractores (0 a 6). SHALL mostrar un aviso con menos de 30 respuestas y "Sin respuestas todavía" cuando no haya.

#### Scenario: Comercio con 50 respuestas
- **WHEN** un comercio tiene 25 promotores, 15 pasivos y 10 detractores en 90 días
- **THEN** ve NPS 30 con 50 respuestas

#### Scenario: Filtrar por encuesta
- **WHEN** el administrador escoge la encuesta "QR mostrador"
- **THEN** todas las cifras y los comentarios se calculan solo con esa encuesta

### Requirement: Respuestas adicionales
Para cada pregunta adicional, Resultados SHALL mostrar:
- de opción única, cuántos escogieron cada opción;
- de texto, la lista de respuestas.

#### Scenario: Pregunta de opción única
- **WHEN** una encuesta pregunta "¿Cómo nos conociste?" con tres opciones
- **THEN** Resultados muestra cuántos escogieron cada opción en el periodo

### Requirement: Del comentario al caso
Cada comentario de un detractor en Resultados SHALL enlazar a su caso de seguimiento y mostrar su estado.

#### Scenario: Ver el caso desde el comentario
- **WHEN** el administrador toca un comentario de un detractor
- **THEN** abre su caso en Seguimiento

### Requirement: Satisfacción global sin valores inventados
El indicador "satisfacción global" de los KPIs de la empresa SHALL entregar su NPS real de 90 días, o vacío. SHALL NOT entregar un valor por defecto.

#### Scenario: Empresa sin respuestas
- **WHEN** se piden los KPIs de una empresa que nunca activó una encuesta
- **THEN** la satisfacción global llega vacía, no 4,5
