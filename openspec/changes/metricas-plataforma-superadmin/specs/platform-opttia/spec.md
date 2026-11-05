## ADDED Requirements

### Requirement: Solo personas autorizadas, verificadas en cada llamada
El sistema SHALL permitir las consultas de plataforma en lenguaje natural únicamente a personas que figuren en una lista explícita de autorizados guardada en la configuración de Firestore (D-505). La persona SHALL identificarse por un identificador inmutable de su sesión firmada, no por correo ni nombre. En **cada** llamada a una herramienta (no solo al abrir la sesión), el servidor SHALL exigir las tres condiciones: rol Super Administrador de la empresa operadora, presencia en la lista e interruptor encendido. IF cualquiera falla o no puede leerse, THEN SHALL rechazar (fallo cerrado). Al retirar a alguien de la lista, su acceso SHALL cesar en un plazo máximo de [60 segundos], aunque su sesión siga abierta. La lista inicial SHALL contener solo al dueño.

#### Scenario: Super Administrador no listado
- **WHEN** un Super Administrador de Julsmind que no está en la lista consulta
- **THEN** el servidor rechaza y no devuelve cifras

#### Scenario: Retirado a media sesión
- **WHEN** se retira a una persona de la lista con la sesión abierta
- **THEN** su siguiente llamada, pasado el plazo, es rechazada

#### Scenario: Lista ilegible
- **WHEN** la configuración de autorizados no puede leerse
- **THEN** todas las consultas se rechazan

#### Scenario: Dueño autorizado
- **WHEN** el dueño pregunta cuántos comercios pagaron este mes
- **THEN** recibe la cifra con universo, fecha del dato y versión de regla

### Requirement: Gestión de la lista
Solo Daniel SHALL poder modificar la lista y el interruptor, mediante la configuración y no desde pantallas de comercio. Cada cambio SHALL quedar registrado (quién, cuándo, valor anterior y nuevo). El identificador de las personas autorizadas SHALL vivir solo en Firestore.

#### Scenario: Cambio de lista
- **WHEN** Daniel agrega a una persona
- **THEN** queda registrado el cambio con su valor anterior y nuevo

### Requirement: Nace apagada y cierra sin auditoría
La capacidad SHALL nacer apagada con un interruptor global en la configuración de Firestore, con dueño y fecha de retiro (Artículo XII). WHILE esté apagada, o mientras no exista la auditoría, el sistema SHALL comportarse como si no existiera.

#### Scenario: Interruptor apagado
- **WHEN** el dueño pregunta con el interruptor apagado
- **THEN** la consulta se rechaza con un mensaje claro

### Requirement: Identidad de persona, nunca de servicio
Las consultas SHALL ejecutarse con la identidad de la persona autorizada. El sistema SHALL NOT aceptar identidades de servicio, de comercio ni de integración para estas consultas, ni permitir que un permiso de administrador de comercio las herede.

#### Scenario: Token de comercio
- **WHEN** un token de un comercio intenta una consulta de plataforma
- **THEN** el servidor la rechaza

### Requirement: Comercio objetivo solo por parámetros declarados
El comercio objetivo de una consulta SHALL poder indicarse únicamente mediante parámetros declarados de la herramienta y SHALL validarse contra el universo de plataforma. El sistema SHALL rechazar todo intento de cambiar, por un argumento, la identidad o el contexto de la sesión.

#### Scenario: Comercio válido
- **WHEN** el dueño pregunta por un comercio de la plataforma
- **THEN** se consulta ese comercio por el parámetro declarado

#### Scenario: Cambio de contexto
- **WHEN** un argumento intenta suplantar la empresa o el usuario de la sesión
- **THEN** el servidor rechaza y no consulta

### Requirement: Solo lectura y solo cálculos existentes
La capacidad SHALL ser de solo lectura: el agente SHALL NOT disponer de ninguna herramienta de escritura. Las respuestas SHALL salir de las mismas cifras del tablero y el modelo SHALL limitarse a explicarlas. El sistema SHALL NOT ejecutar SQL libre ni texto-a-SQL (restricción del dueño) y SHALL NOT escribir en ninguna colección distinta de la auditoría.

#### Scenario: Pregunta fuera de las cifras
- **WHEN** el dueño pregunta algo que las cifras no responden
- **THEN** Opttia lo dice y no inventa un número

#### Scenario: Petición de cambio
- **WHEN** el dueño pide «marca esta cuenta como demo»
- **THEN** Opttia explica que solo consulta y remite a la pantalla

### Requirement: Cada cifra con su procedencia
WHEN Opttia responde con una cifra, la respuesta SHALL incluir universo, fecha del dato, versión de regla y si el dato está desactualizado, y SHALL NOT mezclar versiones de regla sin decirlo. IF el último cálculo supera [36 horas, por confirmar] de antigüedad, THEN la respuesta SHALL advertirlo con la fecha.

#### Scenario: Dato antiguo
- **WHEN** el último cálculo tiene 3 días
- **THEN** la respuesta lo advierte con la fecha

### Requirement: Pregunta de plataforma de «Katuq en vivo»
La pregunta de nivel plataforma que ya existe en «Katuq en vivo» SHALL quedar bajo la misma lista de autorizados (pendiente de confirmación de Daniel, propuesta pregunta 8). Las preguntas de «Katuq en vivo» a nivel de un comercio no cambian.

#### Scenario: Pregunta de plataforma sin autorización
- **WHEN** un Super Administrador no listado hace la pregunta de plataforma de «En vivo»
- **THEN** el servidor la rechaza

### Requirement: Resumen narrativo mensual
WHEN el dueño pide el resumen del mes, el sistema SHALL calcular primero los agregados con el cálculo oficial y pedir al modelo solo la redacción, citando cifras con fecha y versión.

#### Scenario: Cifra editada por el modelo
- **WHEN** el modelo propone una cifra distinta a la calculada
- **THEN** el sistema muestra la calculada o descarta el resumen

### Requirement: Ámbito exclusivo de plataforma
Las capacidades de plataforma SHALL ofrecerse solo a sesiones autorizadas y SHALL NOT aparecer para comercios, empleados ni integraciones. Un comercio SHALL NOT ver ni inferir datos de otros comercios a través de Opttia.

#### Scenario: Empleado de comercio
- **WHEN** un empleado de un comercio pide a Opttia sus capacidades
- **THEN** no aparece nada de plataforma

### Requirement: Opttia de los comercios no cambia
La capacidad de plataforma SHALL ser independiente del Opttia que usan los comercios. Encenderla, apagarla, cambiar la lista de autorizados o que esa lista falle o esté vacía SHALL NOT cambiar el acceso, las herramientas, los permisos, los topes ni el aislamiento por empresa del Opttia de ningún comercio. La lista de autorizados SHALL consultarse solo en el camino de plataforma, nunca en el de los comercios.

#### Scenario: Comercio antes y después de encender la plataforma
- **WHEN** un comercio usa Opttia con la capacidad de plataforma apagada y luego con ella encendida
- **THEN** recibe las mismas herramientas y el mismo comportamiento en ambos casos

#### Scenario: Falla la lista de autorizados
- **WHEN** la lista de autorizados no se puede leer o está vacía
- **THEN** solo se cierra la consulta de plataforma; el Opttia de todos los comercios sigue funcionando igual

#### Scenario: Usuario de Julsmind fuera de la lista
- **WHEN** un usuario de Julsmind que no está en la lista usa Opttia para su propia empresa
- **THEN** conserva su Opttia normal de comercio y solo se le niegan las capacidades de plataforma
