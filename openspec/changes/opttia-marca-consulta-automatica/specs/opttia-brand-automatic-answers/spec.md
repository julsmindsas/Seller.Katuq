## ADDED Requirements

### Requirement: Consultar conocimiento del comercio sin instrucciones técnicas
WHEN una persona pregunta por identidad, valores, atención, políticas o procedimientos propios de su comercio, THE system SHALL consultar automáticamente el conocimiento autorizado pertinente antes de afirmar hechos propios de la empresa, sin exigir nombres de archivos, formatos, palabras clave ni instrucciones para buscar.

#### Scenario: Identidad con palabras cotidianas
- WHEN la persona pregunta «¿Qué representa Almara?» o «¿Qué nos hace diferentes?»
- THEN el chat obtiene la identidad desde las fuentes pertinentes disponibles y responde directamente con su personalidad.

#### Scenario: Asesoría sobre atención
- WHEN la persona pregunta «¿Cómo atendemos a un cliente molesto?»
- THEN el chat usa las pautas de atención disponibles y no deduce una política de quejas a partir de un catálogo o de medios de pago.

### Requirement: Personalidad y evidencia son complementarias
WHILE exista un perfil autorizado de personalidad, THE system SHALL aplicarlo a la respuesta sin que la persona lo solicite; las afirmaciones de políticas o procedimientos SHALL estar sustentadas en información pertinente, distinguiendo recomendaciones de reglas del comercio.

#### Scenario: Borrador para un cliente
- WHEN se pide redactar una bienvenida o responder a una queja
- THEN el borrador refleja el tono guardado y no promete reembolsos, plazos ni gestiones no confirmadas.

### Requirement: Recuperación pertinente y alternativa automática
IF la primera recuperación es insuficiente o ajena al tema, THEN THE system SHALL intentar una búsqueda alternativa dentro del presupuesto vigente sin pedir a la persona que la dicte, y SHALL NOT afirmar que un archivo o una política no existe por esa sola búsqueda.

#### Scenario: Nombre del comercio repetido en catálogos
- WHEN la consulta trata de identidad y un catálogo repite más veces el nombre de la marca
- THEN esa repetición no desplaza por sí sola la fuente pertinente de identidad.

#### Scenario: Sin evidencia disponible
- WHEN ninguna fuente autorizada consultable respalda la respuesta
- THEN Opttia explica la limitación sin inventar hechos y pide, si corresponde, el dato de negocio necesario; no exige que el usuario conozca los documentos internos.

### Requirement: Mantener aislamiento, límites y datos actuales
THE system SHALL revalidar el comercio y los permisos, mantener cuotas y presupuesto vigentes y usar fuentes actuales autorizadas para stock, precios y métricas; el contenido documental SHALL NOT modificar instrucciones, permisos ni datos de negocio.

#### Scenario: Consulta operativa
- WHEN se pregunta «¿Hay existencias para entregar hoy?»
- THEN se consulta inventario autorizado, no se infiere disponibilidad de un portafolio.

#### Scenario: Revocación o documento retirado
- WHEN cambia el comercio, se revoca el permiso o se retira una fuente
- THEN esa información no se reutiliza para responder a la siguiente consulta.

### Requirement: Aceptación con preguntas naturales
THE system SHALL validarse con un banco versionado de al menos 12 casos sin instrucciones de búsqueda ni nombres de archivos, cubriendo identidad, valores, bienvenida, quejas, procedimientos, ausencia de evidencia, permisos y una consulta operativa.

#### Scenario: Gate antes de publicar
- WHEN se evalúa la implementación con el modelo real y fuentes conocidas
- THEN todos los casos con evidencia esperada recuperan una fuente pertinente y los casos de seguridad/ausencia no inventan datos; se guardan pregunta, herramienta utilizada, fuente, respuesta y resultado, sin credenciales.
- AND si un caso falla se registra y corrige antes de publicar; un resultado que solo aparece al dictar palabras clave no cuenta como aprobado.
