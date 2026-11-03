# Delta: soporte, Mis Ideas (tickets 1442 y 1443 · D-627)

Estado: borrador, pendiente aprobación de Daniel. Requisitos en EARS; sin decisiones de tecnología.

## ADDED Requirements

### Requirement: Estados propios de la idea
THE system SHALL manejar para cada idea uno de estos estados: Recibida, En evaluación, Planeada, En desarrollo, Implementada y No viable. THE system SHALL permitir cambiarlo solo al equipo de Katuq.

#### Scenario: El equipo evalúa una idea
- **GIVEN** una idea Recibida
- **WHEN** el equipo la pasa a En evaluación
- **THEN** el comercio ve «En evaluación» en la lista, en el detalle y en los contadores

#### Scenario: El comercio no puede cambiar el estado
- **WHEN** un usuario del comercio envía un cambio de estado de idea
- **THEN** el sistema lo ignora y el estado no cambia

### Requirement: Convivencia con el estado del ticket
THE system SHALL mantener el estado del ticket de Support (Pendiente, Haciendo, Resuelto, Archivado) como hasta hoy. WHEN el equipo cambia el estado de una idea, THE system SHALL ajustar el estado del ticket así: Recibida, En evaluación y Planeada a Pendiente; En desarrollo a Haciendo; Implementada a Resuelto; No viable a Archivado, y SHALL dejar el cambio en el historial de estados. THE system SHALL NOT pedir a una idea la confirmación «¿Se resolvió?».

#### Scenario: Idea implementada
- **GIVEN** una idea En desarrollo (ticket Haciendo)
- **WHEN** el equipo la pasa a Implementada
- **THEN** el ticket queda Resuelto, el tablero de Support la cuenta como resuelta y el comercio no recibe la pregunta «¿Se resolvió?»

#### Scenario: Tablero sin cambios
- **WHEN** el tablero de Support filtra por Pendiente, Haciendo, Resuelto o Archivado
- **THEN** sigue mostrando los mismos cuatro estados y las ideas aparecen según la tabla anterior

#### Scenario: Se cierra desde el tablero
- **GIVEN** una idea Planeada
- **WHEN** alguien en Support pasa el ticket a Archivado
- **THEN** la idea se muestra como No viable

### Requirement: Estado derivado cuando falta el de idea
IF una idea no tiene estado propio, THEN THE system SHALL mostrarlo derivado del estado del ticket: Pendiente como Recibida, Haciendo como En desarrollo, Resuelto como Implementada y Archivado como No viable.

#### Scenario: Idea sin migrar
- **GIVEN** una idea creada antes de este cambio con ticket Resuelto
- **WHEN** el comercio abre Mis Ideas
- **THEN** la ve como Implementada y cuenta en «Implementadas»

### Requirement: Migración de las ideas existentes
WHEN se migran las ideas existentes, THE system SHALL ejecutar primero una corrida de prueba (`--dry-run`) que liste cada idea con su estado actual y el propuesto, SHALL aplicar solo tras aprobación de Daniel, y SHALL NOT borrar ni modificar el estado del ticket, comentarios, adjuntos ni notas. THE migración SHALL ser repetible sin pisar un estado de idea ya asignado.

#### Scenario: Corrida de prueba
- **WHEN** se ejecuta la migración con `--dry-run`
- **THEN** no se escribe ningún dato y el informe lista, por idea, el estado propuesto y las que requieren revisión caso a caso

#### Scenario: Repetir la migración
- **GIVEN** una idea ya migrada que el equipo pasó a Planeada
- **WHEN** se vuelve a ejecutar la migración
- **THEN** la idea sigue Planeada

### Requirement: Rediseño maestro-detalle
THE system SHALL mostrar Mis Ideas con el mismo diseño y componentes de Mis Tickets: encabezado con migas «Soporte / Mis ideas», subtítulo, botón de refrescar y «+ Nueva idea»; una franja con píldoras con conteo por estado, buscador y selector de fechas; lista a la izquierda con consecutivo, estado, título, fecha relativa e ícono de adjuntos; y detalle a la derecha con Abierta, Propuesta por, Última respuesta, Módulo o Categoría, descripción y adjuntos con vista previa. THE system SHALL NOT mostrar la tarjeta de filtros aparte ni las tres tarjetas grandes de contadores.

#### Scenario: Filtrar por estado
- **GIVEN** 13 ideas, 4 de ellas Planeadas
- **WHEN** el comercio pulsa la píldora «Planeadas (4)»
- **THEN** la lista muestra esas 4 y el buscador y las fechas siguen aplicando

#### Scenario: Pantalla angosta
- **WHEN** la pantalla mide 390 px
- **THEN** la lista y el detalle se apilan, al elegir una idea se muestra el detalle y no hay scroll horizontal

#### Scenario: Sin ideas
- **WHEN** el comercio no tiene ideas o el filtro no encuentra ninguna
- **THEN** ve un estado vacío con ícono, título y texto corto, con «+ Nueva idea»

### Requirement: Conversación como en tickets
THE system SHALL mostrar la sección «Conversación» de la idea con el nombre y avatar de quien escribe, estado vacío y la misma caja de respuesta con adjuntos de Mis Tickets, sin mostrar las notas internas del equipo, y SHALL mostrar las fechas en forma relativa («Hoy», «Hace 2 días»).

#### Scenario: Comentar una idea
- **WHEN** el comercio escribe una respuesta con un adjunto
- **THEN** el comentario aparece con su nombre real (no «Desconocido»), solo se agrega ese comentario y no se alteran los del equipo

### Requirement: A mí también me sirve
WHEN un usuario pulsa «A mí también me sirve» en una idea de su empresa, THE system SHALL registrar un apoyo por usuario, mostrar el contador y permitir quitarlo. THE system SHALL NOT permitir que un cambio genérico del ticket modifique los apoyos.

#### Scenario: Apoyar dos veces
- **GIVEN** un usuario que ya apoyó la idea
- **WHEN** pulsa el botón otra vez
- **THEN** su apoyo se quita y el contador baja en uno, nunca cuenta dos

#### Scenario: Apoyos concurrentes
- **WHEN** dos usuarios apoyan la misma idea al mismo tiempo
- **THEN** el contador suma los dos

#### Scenario: Copia vieja del ticket
- **WHEN** se guarda una copia vieja del ticket tras un apoyo nuevo
- **THEN** el apoyo no se pierde

### Requirement: Respuesta oficial y novedades
THE system SHALL mostrar la respuesta del equipo Katuq destacada arriba de la conversación, y WHEN la idea pasa a Implementada con una versión indicada, SHALL enlazar a las novedades de esa versión cuando esa pantalla exista.

#### Scenario: Implementada con versión
- **GIVEN** una idea Implementada con respuesta del equipo y versión 2026.11.04.1
- **WHEN** el comercio abre el detalle
- **THEN** ve la respuesta destacada con la versión y su enlace a las novedades

## Fuera de alcance
Votación entre comercios o ideas públicas, cambios al set de estados de los tickets normales, borrar datos, campos o colecciones nuevas.
