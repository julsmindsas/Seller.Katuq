# Tareas — instructivos MCP en Integraciones (D-508, ticket 1315)

**Estado:** propuesta/spec y diseño, incluida la adaptación a Angular 14, aprobados por Daniel el 20-oct-2026. **Tareas aprobadas por Daniel el 20-oct-2026: «Apruebo las tareas; implementa y valida ambos». Ejecutadas y verificadas localmente; sin publicación.**

Orden secuencial: D-508 primero y D-509 después por compartir directorio/listado. Ninguna tarea modifica backend, permisos, credenciales o datos de negocio. Cada tarea de código cierra con su prueba y compilación TypeScript sin errores; la entrega conjunta exige build de producción y QA de plantillas en navegador.

## Preparación y catálogo

- [x] **1. Línea base y fuentes.** Entrada: diseño aprobado, `fuentes.md`, listado/directorio/módulo, parcial visual y `config-pagina`. Releer archivos antes de editar, revisar cambios concurrentes y guardar conteos CSS. Contrastar los pasos vigentes de ChatGPT web, Claude y Codex con sus fuentes oficiales. Ejecutar pruebas actuales de navegación y compilación. **Éxito:** evidencia de comandos, fallos previos diferenciados y pasos de cada cliente respaldados. **Dep.:** aprobación de estas tareas.
- [x] **2. Catálogo y regresiones de aislamiento.** Crear `mcp-guides.ts` tipado para las tres guías aprobadas, dirección pública, requisitos, pasos, ejemplo de lectura, fuentes y fecha. Preparar pruebas de comportamiento con los métodos reales del listado y dependencias simuladas: apertura de guía no configura/guarda/navega/llama HTTP; no modifica los tres contadores ni Mis conexiones y se encuentra por nombre/MCP. **Éxito:** catálogo compila y las nuevas regresiones detectan el comportamiento ausente antes de conectarlo. **Dep.:** 1.

## Diálogo e integración

- [x] **3. Diálogo standalone OnPush.** Crear `mcp-guide.component.ts/html/scss` con NgbModal/NgbActiveModal, título, pasos, dirección seleccionable, fuentes y cierre accesible. Implementar copia bajo clic con resultado `aria-live`, alternativa manual si falta/falla Clipboard API y actualización explícita de la vista OnPush. Prueba de copia rechazada con dependencia simulada. **Éxito:** compila, la prueba pasa y el fallo no oculta ni altera la dirección. **Dep.:** 2.
- [x] **4. Tarjetas de guías.** Extender `EntradaDirectorio`/`EstadoTarjeta` con `guia`, añadir el grupo de tres IA e importar el diálogo standalone en `IntegrationsModule`. Interceptar `abrirEntrada` antes de configurar/navegar y adaptar estado/botón. Conservar búsqueda, contadores y filtros. **Éxito:** regresiones de 2 pasan; abrir cualquier guía usa únicamente datos locales y el diálogo. **Dep.:** 3.
- [x] **5. Marco y accesibilidad.** Incorporar `config-pagina` al marco/encabezado correspondiente y al diálogo; reutilizar las tarjetas y el tema, añadir sólo disposición necesaria. Adaptar el tutorial general para distinguir guías externas y conexiones internas. **Éxito:** no aumentan gradientes/primarios prohibidos; no hay clases nuevas con `p-`, texto de spans sin estilo o foco invisible. **Dep.:** 4.

## Validación y entrega

- [x] **6. QA de guías a 1440/390 px.** Abrir las tres, buscar por nombre/MCP, alternar Todas/Mis conexiones, comprobar contadores, copia permitida y rechazada, Tab/Enter/Espacio/Escape, foco restaurado, URLs seleccionables y enlaces oficiales. Usar servidor local y servicios de lectura; no ejecutar un login OAuth externo, modificar configuraciones o crear tickets de demostración. **Éxito:** evidencia visual y resultado por escenario, sin scroll horizontal ni texto oculto. Distinguir QA de UI de compatibilidad OAuth no probada por cliente. **Dep.:** 5.
- [x] **7. Verificación conjunta con D-509.** Tras sus tareas 1–5, ejecutar regresiones de ambos cambios, navegación existente y `npm run build:prod`. Revisar el diff de los dos environments por el incremento de versión y repetir conteos CSS sobre todos los archivos tocados. Reparar sólo fallos propios y repetir lo afectado. **Éxito:** build limpio, regresiones relevantes verdes y QA de ambos cambios registrado. **Dep.:** 6 y D-509/5.
- [x] **8. Bitácora y seguimiento MCP.** Actualizar CONTRACT, estas tareas y nota interna del ticket con archivos, comprobaciones y límites. Preparar texto de resolución y versión verificable. **Éxito:** evidencia registrada; no se presenta como publicado ni se cierra Resuelto antes de entregar. Commit/despliegue quedan sujetos a la autorización vigente y al candado de publicación; no usar `release` ni forzarlo sin esa autorización. **Dep.:** 7.


## Resultado de ejecución (20-oct-2026)

- Las tareas de implementación y validación local están completas. Detalle común en `../instructivos-mcp-en-integraciones/verificacion.md`.
- La revisión de navegador usa datos simulados y plantillas/estilos/métodos reales aislados, sin sesión ni datos reales del comercio. No acredita el shell autenticado completo, un login OAuth en cada IA ni disponibilidad de los canales futuros.
- No se ha publicado ni cerrado el ticket. La revisión editorial de Jairo para 1313 sigue pendiente; no se le enviaron mensajes.
