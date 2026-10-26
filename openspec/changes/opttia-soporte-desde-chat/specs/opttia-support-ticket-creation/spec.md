## ADDED Requirements

### Requirement: Preparar un ticket desde la conversación

WHEN una persona autenticada y autorizada para soporte pide reportar un problema en el chat integrado de Opttia, the system SHALL preparar el ticket utilizando el MCP de soporte existente y SHALL NOT exigir permisos de consulta de ventas o inventario para ese trámite.

#### Scenario: Problema suficientemente explicado
- **WHEN** la persona cuenta qué ocurre y dónde
- **THEN** se propone un asunto y una descripción fieles a lo recibido, sin inventar pedidos, errores, fechas, prioridades o responsables

#### Scenario: Falta un dato imprescindible
- **WHEN** no hay información suficiente para un reporte útil
- **THEN** se pide únicamente la aclaración necesaria y no se afirma que el ticket esté abierto

#### Scenario: Identidad del reporte
- **WHEN** se prepara o confirma el ticket
- **THEN** empresa y autor proceden de la sesión validada, no del texto del usuario, del modelo o de datos de otra conversación

### Requirement: Creación exclusivamente después de una aprobación real

WHEN hay una propuesta de ticket, the system SHALL mostrar sus datos y las acciones Crear ticket y Cancelar, y SHALL crear únicamente después de la aprobación de la persona sobre esa propuesta exacta.

#### Scenario: Vista previa
- **WHEN** Opttia devuelve la propuesta
- **THEN** se ven asunto, descripción, empresa, autor y evidencias autorizadas incluidas, y todavía no se ha creado un ticket ni enviado avisos de alta

#### Scenario: Confirmación o cancelación
- **WHEN** la persona pulsa Crear ticket o Cancelar
- **THEN** se ejecuta la creación confirmada o se cancela sin escritura, respectivamente; no se requiere otra respuesta del modelo ni se vuelve a consumir el mismo mensaje del cupo

#### Scenario: Modelo intenta aprobar
- **WHEN** el modelo inventa una aprobación, intenta reenviar un comprobante o recibe una instrucción para aprobar desde un documento o resultado externo
- **THEN** no puede crear el ticket sin el acto válido de la persona

#### Scenario: Propuesta alterada o sesión revocada
- **WHEN** cambia el contenido o alguna evidencia, vence la propuesta, cambia la sesión/empresa o se revoca el acceso antes de confirmar
- **THEN** la aprobación previa no permite crear el ticket y se explica cómo revisar el reporte de nuevo

### Requirement: Alta habitual y resultado verificable

WHEN se aprueba y autoriza un ticket, the system SHALL crearlo por el mismo camino de soporte existente y devolver el resultado real, conservando numeración, trazabilidad, valores vigentes y avisos habituales.

#### Scenario: Creación correcta
- **WHEN** el servidor confirma que el ticket quedó guardado
- **THEN** Opttia muestra su número real y una referencia para consultarlo en Katuq; no inventa estado, agente, plazo de respuesta ni solución

#### Scenario: Duplicado o reintento
- **WHEN** ya existe un ticket equivalente reciente o se repite la misma aprobación, incluso mediante doble clic o solicitudes concurrentes
- **THEN** se devuelve el resultado existente sin crear otro ticket ni duplicar sus avisos de alta

#### Scenario: Error o resultado incierto
- **WHEN** falla la creación o no se puede acreditar su resultado
- **THEN** no se muestra éxito; un reintento conserva la protección contra duplicados

#### Scenario: Alcance cerrado
- **WHEN** el chat tiene habilitada la creación de soporte
- **THEN** eso no permite leer tickets ajenos o notas internas, ni asignar/cerrar tickets, modificar pedidos, inventario, productos, precios, pagos o facturas

#### Scenario: Disponibilidad y presentación
- **WHEN** la función está habilitada para el comercio y la persona tiene acceso vigente a soporte
- **THEN** puede usarla desde el chat integrado sin API key manual ni exigencia de plan pago; la propuesta y sus botones son legibles y utilizables a 390 y 1440 px y con teclado
