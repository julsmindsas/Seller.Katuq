## ADDED Requirements

### Requirement: Responder con las herramientas antes de remitir
WHEN una persona hace en el chat de Opttia de Katuq una pregunta sobre datos de su negocio (ventas, pedidos, clientes, productos, inventario, despachos o cartera), the system SHALL responderla con las herramientas autorizadas para esa persona, combinando hasta cuatro consultas, y SHALL NOT remitir a opttia.com una pregunta que esas herramientas cubren.

#### Scenario: Pregunta de análisis
- **WHEN** la persona pregunta "¿qué ciudad compra más y con qué forma de pago?"
- **THEN** Opttia responde con cifras de Katuq y no la remite a opttia.com

#### Scenario: Pregunta de varios módulos
- **WHEN** la persona pregunta "¿cómo va el negocio hoy?"
- **THEN** Opttia resume con las herramientas autorizadas (por ejemplo ventas de hoy, pedidos que necesitan atención y despachos) sin pasar de cuatro consultas

#### Scenario: Acción o automatización
- **WHEN** la persona pide algo que no es una consulta (crear una campaña, programar un mensaje o cambiar datos)
- **THEN** Opttia dice que este chat solo consulta y que eso está disponible en opttia.com

### Requirement: Falta de permiso explicada
IF la pregunta corresponde a un módulo que el rol de la persona no puede ver, THEN Opttia SHALL decir qué módulo es y que lo pida a un administrador de su empresa, sin dar cifras de ese módulo y sin decir que no tiene herramientas.

#### Scenario: Rol sin Clientes
- **WHEN** una persona sin permiso de ver clientes pregunta "¿quién es mi mejor cliente?"
- **THEN** Opttia responde que su rol no tiene acceso a Clientes y que lo pida a un administrador

#### Scenario: Permiso recién otorgado
- **WHEN** el administrador le da el permiso y la persona vuelve a preguntar
- **THEN** Opttia ya responde con cifras, sin desplegar nada

### Requirement: Respuesta útil cuando no hay herramienta
IF ninguna herramienta de Katuq cubre la pregunta, THEN Opttia SHALL decir en una frase que esa consulta no está disponible en este chat y mencionar dos o tres cosas que sí puede consultar con los permisos de esa persona, sin inventar datos.

#### Scenario: Dato que Katuq no guarda
- **WHEN** la persona pregunta por un dato que Katuq no guarda (por ejemplo, el margen por costo)
- **THEN** Opttia lo dice y ofrece consultas que sí puede hacer

### Requirement: Banco de preguntas
The system SHALL tener un banco de preguntas reales que cubra todos los módulos del chat, con la herramienta esperada para cada una. Ese banco incluye preguntas de seguimiento, preguntas sin permiso y preguntas fuera de alcance. El cambio SHALL aceptarse solo cuando, con el modelo de producción y la empresa de pruebas FLORECER, se cumplan las dos condiciones:
- al menos el 95 % de las preguntas usa la herramienta esperada;
- ninguna pregunta cubierta recibe una respuesta de "no tengo herramientas" o una remisión a opttia.com.

#### Scenario: Corrida del banco antes de desplegar
- **WHEN** se termina la implementación
- **THEN** se corre el banco completo y se guarda el resultado por pregunta (herramienta usada, respuesta y si pasó)

#### Scenario: Banco no alcanza el umbral
- **WHEN** el banco queda por debajo del umbral
- **THEN** no se despliega el ADK; se ajustan descripciones o instrucción y se vuelve a correr

#### Scenario: Pregunta nueva que falla
- **WHEN** un comercio reporta una pregunta que el chat no respondió
- **THEN** se agrega al banco antes de corregirla
