# Evidencia y límites — D-569

Actualizado el 29-oct-2026. Spec, diseño/contratos, tareas y diff aprobados; T-01 a T-13 verificadas y Git/despliegue autorizados y realizados. Pendiente únicamente la consulta del botón con sesión legítima. La investigación original y sus fechas se conservan debajo; publicación actual en `publicacion.md`.

## Autoridad y línea base

- Daniel solicitó separar tono de documentos y corregir quejas para todos los empleados de cada comercio. Se interpreta el alcance como empleados activos con acceso vigente al chat integrado, sin conceder acceso inicial al chat o documentos a cuentas hoy denegadas.
- Front en `feature/venta-asistida-mejorada`, árbol compartido y detrás de origin. Se hizo fetch de lectura, sin pull/merge/stash: origin `b3370bc6` ya contiene D-568 (imágenes Shopify). D-569 no aparecía en contrato de trabajo/origin ni artefactos consultados antes de reservarlo. No se toca D-568 ni se renumeran las decisiones D-511 duplicadas del histórico.
- Backend/ADK tienen trabajo local concurrente de pedidos, historial, marca, soporte, cotizaciones e identidad. No se edita ni publica ninguno para preparar esta propuesta.

## Recorrido comprobado

1. Seller `src/app/shared/services/opttia-chat.service.ts`: envía pregunta actual por sesión al chat básico; el interceptor normal conserva autenticación/empresa. El saludo inicial se define estáticamente en el servicio y no prueba personalización de una respuesta generada.
2. Backend `functions/routers/opttia.js`: auth/tenant, usuario activo e identidad firmada, empresa/rol actuales y herramientas según permiso. `/access`/`admit` rechazan si no quedan herramientas; no basta agregar una lectura de estilo para conceder acceso al chat a un rol vacío.
3. `functions/services/opttiaAccessPolicy.js`: perfil y búsqueda documental están juntos en `marca:view`; `canUseTool` exige ese permiso a ambos. Documentos/gestión tienen controles adicionales en el router.
4. `getCompanyBrandProfile` → `brandKnowledge.getProfile` → `brandKnowledgeCore.profile`: siete cadenas acotadas de `personalidadMarca`, sin adjuntos en la respuesta. El campo libre de quejas mezcla trato con recomendaciones operativas; por eso no basta renombrar toda la respuesta como tono compartido.
5. `brandKnowledge.search`: resuelve empresa única, solo archivos enlazados/listos/dentro del plan y verifica `data.company`; no debe abrirse ese recorrido al compartir estilo. El transporte integrado pasa por el registro MCP central.
6. ADK `endpoints/katuq_basic_chat_endpoint.py`: carga el perfil por MCP si fue autorizado, valida empresa y lo da como preferencias al agente. El archivo local incluye el candidato anterior de recuperación y soporte; la versión productiva identificada en la revisión anterior es `4a61ae4`, sin la mejora documental. No basar un deploy en copiar el archivo local completo.

## Síntomas observados en ALMARA

La revisión inmediatamente anterior, documentada en `opttia-marca-consulta-automatica/verificacion.md`, confirmó siete preferencias guardadas y8/79 PDF disponibles. El saludo real incorporó nombre y frase de marca; identidad citó la presentación. En la queja, la respuesta mezcló manual, inferencias de culpa y alternativas comerciales, sin comprobar vigencia. Afirmó buscar a Ana sin que se revisaran trazas; no se toma esa prosa como prueba de llamada. Ese ejemplo no estaba rotulado ficticio en el mensaje: el nuevo criterio de capacitación debe probarlo explícitamente, no atribuir al código una intención no comunicada.

## Fronteras que el diseño deberá resolver y someter a aprobación

- Delimitar qué contenido del perfil puede compartirse con todos y cómo impedir que acompañen texto documental, condiciones operativas, URLs o datos internos. Un prompt no resuelve por sí solo una frontera de acceso.
- Entregar la voz sin volver a clasificar a los empleados como lectores de Marca, ni dejar que la lectura común convierta en elegible un rol sin acceso al chat. Conservar el comportamiento de otros consumidores/canales del perfil.
- Mantener MCP autenticado, admisión/contadores y rechazo por sesión/tenant/rol vigentes. Sin clave compartida de respaldo, acceso directo de ADK a Firestore o rutas nuevas.
- Separar el cambio del ranking anterior y preservar el soporte D-545: aprobación privada fuera del modelo, identidad, caducidad, confirmación y deduplicación.
- Aplicar Art.I/II/VIII/XI/XIV; no introduce UI, inventario o excepciones. D-566 para pruebas nuevas y D-567 para una publicación visible futura. La implementación y cualquier diff sensible de autorización requieren sus checkpoints; publicación es posterior.

## Comprobaciones adicionales para el diseño

- Tras presentarse el checkpoint de requisitos, Daniel respondió «dale»: aprobación de spec. Se prepararon `design.md` y `contracts.md`. El 28-oct respondió nuevamente «dale» después de presentarse el diseño y su límite de frases libres: se registra esa aprobación y se prepara `tasks.md`, sin considerar las tareas aún aprobadas.
- La UI de Empresas usa `textarea` para `tonoMarca`: no existe un enum que garantice que ese campo sea compartible. El diseño propone conversión estricta del valor completo a un catálogo cerrado y nunca pasar el texto original. Reconocer algunas palabras dentro de texto libre no sería una frontera de confidencialidad.
- En la línea base consultada `canUseTool` protege perfil y búsqueda con `marca:view`; `authorizeTool` también consulta `TOOL_PERMISSIONS[name].action`. La futura tool común requiere un caso exacto y no un permiso general o una entrada inventada de Marca. El chequeo de elegibilidad debe conservar el conjunto anterior a añadir esa tool.
- `toolRegistry` declara/exige permisos y centraliza ejecución; sus catálogos genéricos se consumen desde `services/mcp/mcpService.js` y `controllers/mcpController.js`. El diseño oculta/rechaza la nueva lectura exclusiva en esos canales y no cambia el contrato del perfil anterior.
- `opttiaMcpGrant.js` vincula la admisión a sesión, empresa, usuario y correo, con caducidad de cinco minutos. El diseño no cambia ese recibo ni reserva otro para leer voz.
- La precarga actual del endpoint básico es una llamada MCP fija antes de ejecutar el agente. Sustituirla por la proyección conserva presupuesto y metering; los cambios locales pendientes de ranking/recuperación no forman parte de esa sustitución.

## Descomposición preparada el 28-oct

`tasks.md` contiene 14 tareas. T-01 a T-13 verificadas y Git/despliegue de T-14 autorizados y realizados el 29-oct. Solo queda pendiente la comprobación del botón con sesión legítima. Las pruebas nuevas quedan fuera de Git y se preservan los cambios concurrentes de soporte y del contrato.

## Estado real

Backend `62796de7` y ADK `257e62b` publicados por Git el 29-oct, después de la aceptación del 28-oct (83 Node de la copia compartida, 48 Python/ADK, 5 frontend y doce casos finales de modelo con datos ficticios). Checkout limpio de publicación: 82 Node y 48 Python, sin arrastrar la prueba extra o el ranking del candidato documental anterior. Servicios activos, hashes conservados, salud pública HTTP200 y rechazo sin sesión verificados en `publicacion.md`. No se escribieron perfiles/roles/documentos/tickets/avisos reales ni se hicieron nuevas consultas ALMARA. Falta solo comprobar el botón con sesión legítima; no se presentan los ensayos sintéticos o la salud como esa prueba.
