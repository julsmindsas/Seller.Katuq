## ADDED Requirements

### Requirement: Las respuestas pertenecen a la empresa que recibe la opinión
Cada respuesta SHALL pertenecer a la empresa sobre la que se opina:
- a Julsmind, cuando opina un comercio sobre Katuq;
- al comercio, cuando opina uno de sus compradores.

La respuesta SHALL guardar aparte quién respondió.

Ninguna empresa SHALL poder leer respuestas que no le pertenecen. La empresa SHALL tomarse de la sesión verificada en el servidor, nunca de datos que manda el navegador.

#### Scenario: Comercio intenta leer otra empresa
- **WHEN** un usuario de un comercio pide los datos de satisfacción cambiando la empresa que manda su navegador
- **THEN** el servidor responde que no tiene acceso y no entrega datos

#### Scenario: Julsmind ve a los comercios
- **WHEN** un administrador de Julsmind abre "Satisfacción de clientes"
- **THEN** ve las respuestas de los comercios sobre Katuq, con el comercio que respondió

### Requirement: Cálculo del NPS
El sistema SHALL calcular el NPS como el porcentaje de promotores (9 y 10) menos el porcentaje de detractores (0 a 6), redondeado a entero, sobre las respuestas del periodo. Las notas 7 y 8 son pasivos.

Con menos de 30 respuestas, SHALL mostrar el número junto al aviso "Pocas respuestas: la nota todavía se mueve mucho". Sin respuestas, SHALL mostrar "Sin respuestas todavía" y nunca un valor por defecto.

Las respuestas de usuarios internos (Julsmind y FLORECER) SHALL NOT contar en el NPS de comercios.

#### Scenario: Cálculo con datos
- **WHEN** en el periodo hay 50 respuestas: 25 promotores, 15 pasivos y 10 detractores
- **THEN** el NPS es 30

#### Scenario: Sin respuestas
- **WHEN** el periodo no tiene respuestas
- **THEN** la pantalla muestra "Sin respuestas todavía"

### Requirement: Pantalla "Satisfacción de clientes"
El sistema SHALL ofrecer una sola pantalla, en el CRM, para la empresa que recibe las opiniones, con:
- el NPS de los últimos 90 días y el número de respuestas;
- la tendencia mensual de 6 meses;
- el reparto de promotores, pasivos y detractores;
- la tasa de respuesta, solo en la fase 1: respuestas sobre usuarios a los que se les mostró la pregunta;
- la lista de respuestas con nota, comentario, quién respondió, fecha y el enlace al ticket o al pedido, con filtro por tipo de respuesta y fechas.

Por defecto SHALL verla la familia de roles Administrador de la empresa. Los demás roles, según los menús que la empresa les asigne.

#### Scenario: Abrir la pantalla
- **WHEN** un administrador abre "Satisfacción de clientes"
- **THEN** ve el NPS de 90 días con su número de respuestas, la tendencia, el reparto y la lista

#### Scenario: Ver solo detractores
- **WHEN** filtra por detractores del último mes
- **THEN** la lista muestra solo esas respuestas, cada una con su ticket o pedido

### Requirement: Explicación y temas con KAI
La pantalla SHALL ofrecer, a pedido y sin gastar nada mientras no se pida, un panel de KAI que:
- explique en lenguaje de negocio qué muestran las cifras;
- agrupe los comentarios del periodo en los temas que más se repiten, con cuántos comentarios y hasta tres frases tomadas literalmente de ellos.

El texto que se envía a KAI SHALL NOT incluir nombres de personas, correos, teléfonos ni el nombre de la empresa. Una frase que no aparezca literalmente en los comentarios SHALL descartarse.

#### Scenario: Pedir temas
- **WHEN** el administrador toca el panel de KAI sobre los últimos 90 días
- **THEN** recibe la explicación y los temas ordenados por cantidad, con frases reales

#### Scenario: KAI no responde
- **WHEN** KAI falla
- **THEN** la pantalla sigue funcionando con las cifras y avisa que la explicación no se pudo generar, sin inventarla

### Requirement: Satisfacción consultable como reporte
Las respuestas SHALL poder consultarse con el motor de reportes de Katuq (NPS, respuestas y reparto por mes, nota, tipo de respuesta y quien respondió), limitadas a la empresa de la sesión.

La fuente de satisfacción SHALL NOT aparecer en el constructor de reportes mientras la consulta de reportes acepte la empresa desde el navegador.

#### Scenario: Consulta de reportes todavía insegura
- **WHEN** la consulta de reportes todavía toma la empresa del header
- **THEN** la fuente de satisfacción no aparece en el constructor ni responde por esa vía, y la pantalla "Satisfacción de clientes" sigue funcionando

#### Scenario: Preguntar por el MCP
- **WHEN** un comercio pregunta a su asistente por el NPS del último trimestre
- **THEN** el reporte devuelve el NPS de sus compradores, calculado igual que en la pantalla
