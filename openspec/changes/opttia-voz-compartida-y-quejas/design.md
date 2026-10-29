# Diseño aprobado — D-569

Preparado el 27-oct-2026. Spec/diseño/contratos/tareas/diff aprobados en sus checkpoints; T-01 a T-13 verificadas. El 29-oct Daniel autorizó Git/despliegue: backend y ADK publicados según `publicacion.md`. T-14 conserva pendiente solo el ensayo del botón con sesión legítima; no se modificaron perfiles o roles reales.

## 1. Recorrido y separación

Conservar Seller → interceptor de sesión → `/agui/basic/v1` → admisión Katuq → MCP autenticado → registro central → empresa en Firestore. Añadir **una herramienta MCP**, `get_company_brand_voice`, al transporte integrado existente; no crear endpoint, colección, versión de API, servicio externo o acceso directo de ADK a Firestore. La lectura devuelve únicamente una proyección cerrada del tono, descrita en `contracts.md`.

La voz común tiene la misma fuente para todos los empleados elegibles. `get_company_brand_profile` sigue protegido por `marca:view`; `search_company_brand_knowledge` y los endpoints de listado/indexación conservan sus permisos y cupos. El perfil libre completo deja de precargarse automáticamente como instrucciones de estilo en el chat básico, incluso para administradores. Puede seguir consultándose explícitamente por un usuario autorizado como datos, sin convertirse en instrucciones ni modificar la voz compartida. Los consumidores nativos de ese perfil conservan su contrato.

## 2. Frontera de contenido compartido y compatibilidad

Los siete campos actuales son texto libre: limitar su longitud o pedir al modelo que quite secretos no acredita confidencialidad. La primera entrega comparte solo **rasgos de tono de un catálogo cerrado**, derivados de `personalidadMarca.tonoMarca`. No envía al ADK ninguna subcadena libre de ese campo; exige que su contenido completo sea una lista de etiquetas reconocidas. No extrae palabras reconocidas de un párrafo con contenido adicional.

ALMARA tiene `Cercano, Profesional, Informal`: se proyecta como `warm`, `professional`, `conversational`. El agente conserva cercanía y profesionalismo para todos sus empleados, pero la frase libre «Bienvenido a Almara; gracias por preferirnos» y la historia del personaje no se transfieren automáticamente por esta lectura común. Puede mencionar el comercio identificado por la sesión, sin inventar su historia, atributos o eslóganes. Este recorte de fidelidad fue presentado expresamente y quedó incluido en la aprobación del diseño.

No se comparten `marcaProyeccion`, `marcaHabla`, `colaboradoresHablan`, `frasesKai`, `manejoQuejas`, `terminosEvitar`, archivos, URLs, fragmentos ni políticas. Una política comercial no entra como estilo. No se generan resúmenes con otro modelo ni se guardan proyecciones, reescriben perfiles o crean configuraciones. Una futura voz libre revisada por el dueño necesitaría su propio alcance, configuración y aprobación; no queda implícita aquí.

## 3. Elegibilidad, autorización y catálogo MCP

En `routers/opttia.js`, separar conceptualmente dos conjuntos: `eligibleTools`, calculado **exactamente con las capacidades vigentes antes de añadir voz** —incluido soporte si hoy corresponde—, y la lista anunciada. `chatEligible = eligibleTools.length > 0`. Los rechazos y cuotas de `/access` y `/admit` usan esa elegibilidad. No contabilizar la nueva lectura para abrir el chat. Conservar los casos que ya pueden entrar solo con Marca o solo con soporte, sin agregarles consultas comerciales.

Solo después de verificar usuario/empresa/rol actuales y elegibilidad se añade `get_company_brand_voice` a la lista integrada. No ponerla como un permiso ficticio en `roles.permissions` ni como una regla general permisiva de `canUseTool`. Su autorización es una excepción **de lectura por nombre exacto**: elegibilidad actual más admisión vinculada y vigente. Las herramientas restantes siguen su matriz y compuertas. `/authorize-tool` y MCP deben concordar, sin intentar resolver el nuevo nombre mediante una entrada inexistente de `TOOL_PERMISSIONS`.

La herramienta declara explícitamente `requiredPermissions: ['read']`, argumentos vacíos cerrados y uso exclusivo del chat básico. El router aporta un marcador interno `mcpEmbeddedBasic: true` únicamente después de autorizar esta llamada; ni argumentos, cabeceras arbitrarias, `_meta` ni el body lo pueden crear. El ejecutor de la herramienta lo exige además de `mcpCompany` concreto. Todo pasa por `toolRegistry.executeTool`; ningún scope `admin` sustituye ese requisito de canal.

El catálogo genérico `getToolsFor` excluye este nombre exclusivo del chat, también para administradores; el router integrado lo lista por su conjunto explícito. Los dos consumidores genéricos encontrados son `services/mcp/mcpService.js` y `controllers/mcpController.js`. No alterar permisos, discovery o transporte de sus herramientas existentes. Una invocación directa por nombre desde OAuth, API key u otro canal queda rechazada por la comprobación de contexto, aunque no haya pasado por discovery. No introducir un framework de canales para resolver esta única excepción.

La empresa procede exclusivamente del contexto validado, nunca de argumentos del modelo. La consulta de marca conserva resolución única por `nomComercial` y el identificador devuelto debe coincidir con la empresa admitida. No ampliar el cambio a la resolución general de usuarios/empresas ni corregir ambigüedades preexistentes de otros recorridos incidentalmente.

## 4. ADK: precarga acotada y respuesta

Después de la admisión y metering existentes, hacer una única llamada fija a `get_company_brand_voice` usando `tools/katuq_authenticated_mcp.session`, Bearer y admisión actuales. Sustituye la precarga anterior de perfil: no consume un segundo mensaje/crédito y no resta consultas al presupuesto operativo vigente de cuatro. La herramienta de voz se excluye de las herramientas ofrecidas al modelo, por lo que no puede repetirla o usarla para evadir ese presupuesto. La búsqueda documental conserva el límite de la versión que se publique; esta entrega no incorpora el candidato pendiente de dos búsquedas ni su ranking.

Validar la respuesta con schema cerrado, sin claves adicionales, empresa exacta, catálogo y límites. Convertir los enums a instrucciones de estilo escritas en código; no concatenar texto libre del perfil. Un resultado legítimo `unconfigured`/`unsupported` o una indisponibilidad transitoria de esa lectura permite respuesta neutral con una limitación breve. Un rechazo de identidad/permisos/admisión, una empresa distinta o un contrato inválido corta la consulta; no recurre al perfil protegido, otro tenant, caché o clave de servicio. No repetir `/admit` ni el cobro al degradar o fallar. Si el backend aún no anuncia la herramienta, el ADK nuevo usa la misma degradación neutral y no la precarga antigua.

Cada mensaje abre su contexto y runner efímeros y limpia `ContextVar` en `finally`. No guardar voz en historial, almacenamiento del navegador, agente compartido o caché. Una revocación se evalúa en la siguiente admisión y en cada POST MCP como hoy; un rechazo observado durante la respuesta no se disimula con información anterior. No se promete cancelación instantánea de un modelo ya ejecutándose sin una nueva petición al servidor.

## 5. Quejas: conducta del agente, autoridad en código

Separar en las instrucciones del agente: voz común, reglas de conducta, evidencia recuperada y acciones disponibles. Aplicar empatía y respeto siempre; no cargar `manejoQuejas` como instrucción de trato ni convertir otras fuentes en instrucciones. Las búsquedas de documentos siguen sujetas al rol, también cuando se pide un borrador. La selección de hechos y la redacción las hace el agente; no añadir un detector de quejas por regex ni una respuesta prefabricada que reemplace su criterio.

Para un ejemplo explícitamente ficticio o de capacitación, redactar sin consultas de clientes/pedidos ni identificadores personales. Para verificar un caso real, usar solo las consultas necesarias autorizadas; un nombre por sí solo no prueba identidad, pedido o causa. Si faltan hechos, reconocerlos y pedir el dato pertinente, sin culpar al cliente o al comercio. Una mera solicitud de redacción no requiere investigar una persona.

Un manual se identifica como fuente documental, sin asumir que una fecha de indexación prueba vigencia. No hay en este alcance un mecanismo que certifique políticas actuales: si no existe respaldo explícito, señalar al colaborador qué debe validar. Las alternativas de abono/cambio/reembolso quedan fuera del borrador para el cliente mientras no estén autorizadas; si se sugieren al colaborador, se rotulan pendientes de validación. No inventar montos, plazos, escalaciones o gestiones en curso.

Ejemplo esperado sin evidencia adicional: «Hola, Ana. Lamento la situación con tu regalo. Para orientarte con precisión, ¿me compartes el número del pedido y qué diferencia encontraste?». Es una referencia de conducta, no plantilla obligatoria ni prueba ejecutada. No decir «ya lo revisamos», «te abonamos» o «el error fue tuyo». Las garantías de acceso/ejecución siguen en código; el prompt no garantiza por sí solo que una respuesta sea correcta.

## 6. Archivos previstos, write-set y pruebas

Backend: helper pequeño de proyección, herramienta dedicada, registro, `opttiaAccessPolicy.js` solo si hace falta expresar la separación sin relajar su matriz y `routers/opttia.js` para elegibilidad/capacidad. ADK: endpoint básico y, solo si el contrato lo exige, helper tipado de voz; conservar el adaptador autenticado sin añadir otro transporte. No cambiar el login nativo ni modelos, proveedores o credenciales. Seller no requiere lógica/UI nueva; al publicar una mejora visible lleva la nota de D-567.

Write-set de negocio nuevo **vacío**: solo lecturas del perfil autenticado, sin cambios de roles, perfiles, documentos, pedidos, inventario, productos, precios, compensaciones, tickets o avisos. Se conservan los consumos habituales de admisión/créditos y auditoría existentes. No escribir trazas con perfiles, consultas completas, JWT, grants o datos personales.

Orden de verificación: contratos → integración MCP real con datos sintéticos → respuestas del modelo → recorridos de navegador pertinentes → helpers. Pruebas nuevas locales y excluidas de Git según D-566; evidencia sin secretos en contrato/commit. `contracts.md` fija matriz, errores y casos obligatorios. Compilar Node/Python y ejecutar regresiones de admisión/cuotas/marca/soporte; build de producción de Seller si se modifica su código, revisando los environments que incrementa el comando. No ejecutar un build por documentar este diseño.

## 7. Entrega, reversión y gates

La fase posterior de tareas separará proyección, autorización, integración ADK y aceptación. Antes de aplicar autorización se presenta **su diff concreto**, con las pruebas de elegibilidad; aprobar este diseño no sustituye ese gate sensible. No arrastrar los archivos locales completos que mezclan D-545, errores de permisos, ranking o trabajo ajeno. Preparar cada cambio sobre la punta verificada y comparar con lo realmente publicado cuando se autorice publicar.

Publicación futura: backend compatible primero, ADK después; no afirmar activación completa hasta pasar las pruebas por rol/comercio. Sin bandera nueva, backfill, reindexación o activación masiva en Firestore. Reversión por commits de esta entrega, sin borrar datos ni retroceder contadores: si solo se revierte el backend, el ADK nuevo degrada a neutral; si se revierte ADK, vuelve el comportamiento anterior de perfil protegido y termina la garantía de voz común. Comunicar esa limitación. El despliegue y las pruebas con sesiones reales requieren la autorización de la fase correspondiente, no se deducen de «dale» a la spec.

Art.I/II/III/XIII/XIV: requisitos/diseño/tareas y diff sensible aprobados, dos capacidades del mismo alcance, sin excepción constitucional. IV/V/VII/X: sin nueva escritura externa o webhook; conservar idempotencia y auditoría de soporte. VIII: contratos antes del código. VI/IX: sin cambios UI ni acoplamiento nuevo. XI: proyección cerrada y contexto privado. XII/D-505: no introduce flags ni configuración de empresa en `.env`. XV: no escribe integraciones. Implementación y modelo con datos sintéticos verificados según `verificacion.md`; no es despliegue ni prueba operacional de un comercio real.
