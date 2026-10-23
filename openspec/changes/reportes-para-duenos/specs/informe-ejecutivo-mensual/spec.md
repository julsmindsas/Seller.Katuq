## ADDED Requirements

<!-- F3 (ticket 1341). Estos requisitos extienden el informe ejecutivo de D-394
     (openspec/changes/informe-ejecutivo-mensual): mismo cálculo y misma regla de cuadre, ahora con
     envíos programados, resumen semanal y más canales. No crean otro informe. -->

### Requirement: Envíos programados
El sistema SHALL permitir programar el envío de cualquier reporte guardado o del tablero:
- diario, a una hora elegida;
- semanal, con día y hora (por ejemplo, lunes a las 7:00 a. m.);
- mensual, el día 1.

Todas las horas SHALL ser de Colombia.

Cada envío SHALL calcularse con el mismo cálculo de la pantalla, en el momento del envío y con el período relativo guardado (por ejemplo, "semana anterior").

#### Scenario: Reporte del lunes
- **WHEN** el dueño programa "Ventas por canal · semana anterior" para los lunes a las 7:00 a. m.
- **THEN** cada lunes a esa hora recibe el reporte de la semana anterior, de lunes a domingo

### Requirement: Canales de envío
Cada envío SHALL poder salir por uno o varios de estos canales:
- **correo:** PDF y Excel adjuntos;
- **WhatsApp:** un resumen corto en texto y una imagen del tablero o del gráfico;
- **notificación en Katuq.**

IF un canal falla, THEN el sistema SHALL registrar la falla, intentar de nuevo una vez y, si vuelve a fallar, avisarlo en Katuq. No SHALL bloquear los demás canales.

#### Scenario: WhatsApp caído
- **WHEN** el envío por WhatsApp falla dos veces
- **THEN** el correo sale igual y en Katuq queda el aviso de que el WhatsApp no salió

### Requirement: Resumen semanal del dueño
WHERE la empresa lo active, el sistema SHALL enviar cada lunes un resumen de la semana anterior en lenguaje de negocio, con:
- las ventas contra la semana anterior y contra la meta;
- los productos más vendidos;
- la cartera vencida;
- las alertas de la semana.

El resumen SHALL usar el cálculo y la regla de cuadre del informe ejecutivo: IF un bloque no suma lo mismo que los totales, THEN el resumen SHALL NOT salir y SHALL registrar la inconsistencia.

#### Scenario: Aceptación del ticket
- **WHEN** es lunes y la empresa tiene el resumen activo
- **THEN** el dueño recibe por WhatsApp, sin entrar a Katuq, el resumen de la semana anterior

#### Scenario: Semana sin ventas
- **WHEN** la semana anterior no tuvo ventas
- **THEN** el resumen sale con ceros y una frase que lo dice, no vacío

### Requirement: Un solo mensaje del lunes
IF la empresa también tiene activo el resumen semanal de inventario, THEN el dueño SHALL recibir un solo mensaje del lunes que incluya la sección de inventario, no dos.

#### Scenario: Dos resúmenes activos
- **WHEN** ALMARA tiene activos el resumen de ventas y el de inventario
- **THEN** el lunes llega un solo mensaje por canal, con las dos secciones

### Requirement: Destinatarios con permisos
Los envíos SHALL poder ir a destinatarios internos, por usuario o por rol. El contenido SHALL calcularse con los permisos y el alcance de cada destinatario.

Los destinatarios externos (socio, contador) SHALL:
- requerir la aprobación de un administrador;
- recibir solo el contenido que el administrador eligió;
- no recibir documentos, teléfonos, correos ni direcciones de clientes finales.

Todo destinatario SHALL poder darse de baja con un clic.

#### Scenario: Vendedor como destinatario
- **WHEN** un envío por rol llega a un vendedor con "solo sus métricas"
- **THEN** su copia trae solo sus cifras

#### Scenario: Contador externo
- **WHEN** el administrador agrega al contador como destinatario del resumen mensual
- **THEN** el contador recibe el PDF aprobado, sin datos personales de clientes, y puede darse de baja

### Requirement: Apagado por omisión
Los envíos programados y el resumen semanal SHALL estar apagados por omisión en cada empresa.

Antes de enviarse a ningún comercio, SHALL pasar un período en sombra en el que se calculan y registran sin enviarse.

#### Scenario: Empresa nueva
- **WHEN** una empresa no ha activado los envíos
- **THEN** no recibe ningún resumen ni reporte programado
