# Tareas — conocimiento de marca automático en Opttia (D-511)

Fecha: 2026-10-20. Propuesta/spec aprobada («aprobado»); diseño aprobado («aja»). **Tareas aprobadas: Daniel, «sí aprobado, implementa y prueba que Opttia responda automáticamente con la personalidad y los documentos de Almara».** No incluye autorización para commit, push ni despliegue. Ejecución secuencial por defecto; no se solicita delegación.

## 1. Contratos y evidencia inicial

- [x] 1.1 Verificar Git e instrucciones de los tres repositorios y releer únicamente archivos afectados antes de editarlos.
  - Entrada: diseño aprobado y estado actual de Seller, backend y ADK.
  - Salida: inventario de archivos del cambio y cambios ajenos preservados.
  - Éxito: diff inicial registrado; destinos y modelo/proveedor identificados sin imprimir secretos ni cambiarlos.
  - Dependencia: aprobación de estas tareas.
- [x] 1.2 Confirmar fuentes de aceptación de ALMARA en solo lectura y preparar un corpus mínimo de regresión.
  - Entrada: perfil y ocho documentos listos ya asociados al comercio; expectativas del diseño.
  - Salida: expectativas verificadas para identidad, atención, entrega, compra y pago; paráfrasis de aceptación separadas de calibración.
  - Éxito: corpus reducido sin datos personales/credenciales; no se reindexan archivos ni se altera plan, perfil, orden o permisos. Se registra qué reglas no tienen evidencia suficiente.
  - Dependencia: 1.1.
- [x] 1.3 Agregar contract tests de la herramienta documental antes de cambiar el ranking.
  - Entrada: esquema `{query}`, forma actual de la respuesta y recorrido MCP autenticado.
  - Salida: pruebas de entrada inválida, respuesta compatible, lista vacía, rechazo por permiso/tenant, fuentes retiradas/no listas y consulta sin escrituras.
  - Éxito: ninguna ejecución accede a fuentes de otro comercio; el doble de datos falla ante `set`, `update`, `add`, `delete` o `batch`; se mantiene `retrieval: 'lexical'`.
  - Dependencia: 1.2.
- [x] 1.4 Agregar pruebas de regresión de relevancia antes de corregirla.
  - Entrada: corpus de 1.2 y fallos reales: nombre de marca repetido, título ignorado y fuentes irrelevantes.
  - Salida: casos que detectan frecuencia excesiva, ignorar títulos, empates inestables y copar tres resultados con una sola fuente.
  - Éxito: los casos afectados fallan con el código inicial; las preguntas sin coincidencias siguen devolviendo lista vacía.
  - Dependencia: 1.3.
- [x] 1.5 Agregar contract tests del presupuesto documental del chat básico antes de implementarlo.
  - Entrada: `call_tool`, contexto de petición y máximo global de cuatro consultas.
  - Salida: pruebas de tercera búsqueda documental bloqueada antes de abrir conexión, consultas operativas restantes, reinicio por petición y canal sin sublímite.
  - Éxito: fallo reproducido con el código inicial; cuotas/admisión no se duplican por reformular; otros canales mantienen su contrato.
  - Dependencia: 1.1.

## 2. Backend Katuq — recuperación pertinente

- [x] 2.1 Implementar normalización y ranking BM25 en `functions/services/brandKnowledgeCore.js`.
  - Entrada: diseño §2 y regresiones de 1.4.
  - Salida: términos normalizados, palabras vacías, frecuencia inversa por fuente, saturación, longitud y título ponderado; orden estable y hasta tres fragmentos con diversidad.
  - Éxito: pasan contratos y regresiones; no contiene ramas por ALMARA, políticas, frases del banco ni nombres de empresas; `node --check` sin errores.
  - Dependencia: 1.3 y 1.4.
- [x] 2.2 Actualizar la descripción de `search_company_brand_knowledge` para preguntas naturales.
  - Entrada: contrato y capacidades aprobadas.
  - Salida: descripción que explica identidad, valores, atención y procedimientos, pertinencia de evidencia y límites de datos actuales, con el mismo nombre y esquema.
  - Éxito: no exige nombres de archivos ni instrucciones del usuario; no amplía permisos, lecturas ni write-set. Ajustar `brandKnowledge.js` únicamente si hace falta para agrupar por fuente sin ampliar el alcance.
  - Dependencia: 2.1.
- [x] 2.3 Verificar integración de búsqueda y regresión de acceso del backend.
  - Entrada: 2.1–2.2 y suites de marca, acceso, admisión y seguridad MCP.
  - Salida: resultados de suites pertinentes y carga/sintaxis de los módulos modificados.
  - Éxito: sin errores nuevos; aislamiento por empresa, retiro de fuente y solo lectura comprobados. Comparación en solo lectura con las preguntas de diagnóstico; no se publica.
  - Dependencia: 2.2.

## 3. ADK — investigación automática y personalidad

- [x] 3.1 Inicializar y hacer cumplir el sublímite documental por petición del chat básico.
  - Entrada: diseño §1 y pruebas de 1.5.
  - Salida: `max_brand_tool_calls: 2` y `brand_tool_calls_used: 0` solo en ese endpoint; controles en `call_tool` antes de conectar, junto al máximo global existente.
  - Éxito: dos búsquedas documentales permitidas dentro de cuatro consultas globales; sin sublímite nuevo en otros canales, sin estado compartido entre empresas y sin cambios de facturación.
  - Dependencia: 1.5.
- [x] 3.2 Ajustar las instrucciones del agente básico.
  - Entrada: diseño §1 y §3, herramienta de 2.2 y sublímite de 3.1.
  - Salida: investigación de preguntas naturales, revisión de pertinencia, una reformulación diferente cuando haga falta y respuesta directa con personalidad y referencias.
  - Éxito: no pide al usuario que identifique archivos; no afirma inexistencia por una búsqueda fallida; distingue recomendaciones, reglas verificadas y datos operativos. No afirma trámites/plazos/reembolsos no comprobados.
  - Dependencia: 2.2 y 3.1.
- [x] 3.3 Verificar integración offline del agente, evidencia y presupuesto.
  - Entrada: instrucciones finales y herramientas instrumentadas sin escrituras.
  - Salida: pruebas de fuentes pertinentes/irrelevantes/vacías, reformulación, documento malicioso, falta de permiso, consulta de stock y reinicio de contexto.
  - Éxito: conserva aislamiento, eventos SSE, modelo/proveedor y trato de contenido externo como datos; compilación/import de Python y suites pertinentes sin errores. Los resultados simulados se etiquetan offline.
  - Dependencia: 3.2.

## 4. Banco de aceptación con preguntas naturales

- [x] 4.1 Crear `adk_agent/tests/fixtures/katuq_brand_question_bank.json` con los 16 casos del diseño.
  - Entrada: expectativas verificadas en 1.2.
  - Salida: preguntas naturales, tipo de caso, evidencia esperada y afirmaciones prohibidas; expectativas internas pueden nombrar fuentes.
  - Éxito: las preguntas no nombran archivos ni dictan búsquedas; cubren las paráfrasis reservadas y ausencia de evidencia, permisos y datos operativos.
  - Dependencia: 1.2.
- [x] 4.2 Preparar un evaluador del banco que use el mismo agente y MCP autenticado.
  - Entrada: fixture, `Runner` y sesión ALMARA legítima cuando esté disponible.
  - Salida: runner local con trazas de herramientas, búsquedas, fuente/sección/versión, respuesta, latencia y resultado por caso; sin nuevos endpoints ni eventos UI.
  - Éxito: no imprime tokens/admisiones ni fragmentos completos; conserva contador de presupuesto y etiqueta modelo real frente a fixtures. Casos de revocación/inyección se ejercitan fuera de producción.
  - Dependencia: 3.3 y 4.1.
- [x] 4.3 Ejecutar el banco con modelo real y revisar respuestas/evidencia.
  - Entrada: evaluador y fuentes conocidas.
  - Salida: informe de cada caso y comparación de búsquedas/latencia con la línea base equivalente.
  - Éxito: todos los casos aplicables recuperan evidencia pertinente y cero políticas/garantías inventadas; no vale dictar palabras clave. Si falla, ajustar dentro del diseño y repetir solo lo necesario; registrar desvíos de alcance antes de ejecutarlos.
  - Dependencia: 4.2.
- [ ] 4.4 Comprobar el recorrido completo con una sesión real de ALMARA.
  - Entrada: sesión vigente cuya empresa y autorización se puedan verificar sin alterar credenciales ni fabricar tokens.
  - Salida: preguntas cotidianas en el chat y evidencia del comercio, respuesta y fuente.
  - Éxito: funcionamiento automático sin PDF ni palabras clave; no se presenta la sesión de otro comercio como ALMARA. Si no hay sesión válida, se reporta ese gate pendiente sin bloquear las pruebas independientes ni afirmar publicación completa.
  - Dependencia: 4.3 y entorno disponible; candidato accesible por el recorrido autorizado. Su ejecución en producción exige el checkpoint de publicación indicado en §5.

## 5. Cierre local y publicación separada

- [x] 5.1 Revisar diff final, contratos, compilación y registro de resultados.
  - Entrada: código y evidencia de las secciones 2–4.
  - Salida: `verificacion.md` del cambio y actualización D-511 del contrato con resultados reales, límites y archivos afectados.
  - Éxito: compilan Node/Python y pasan checks del cambio; no se incrementa versión Angular sin tocar frontend; no se incluyen modificaciones ajenas. Se diferencia el gate operacional pendiente del resultado local.
  - Dependencia: 2.3, 3.3 y 4.3; 4.4 se registra según disponibilidad.
- [ ] 5.2 Preparar propuesta de publicación y retorno con commits exactos, cuando se autorice publicar.
  - Entrada: validación local y aprobación explícita del checkpoint de publicación; no se obtiene automáticamente al aprobar estas tareas.
  - Salida: commits/diffs delimitados por repositorio, respaldo de archivos productivos y receta de retorno verificada.
  - Éxito: ninguna subida/reinicio/despliegue ocurre sin la autoridad correspondiente; se comprueban ramas y archivos vivos antes de incorporar cambios.
  - Dependencia: 5.1 y autorización de publicación.
- [ ] 5.3 Publicar backend Katuq y después ADK; completar 4.4 y registrar el cierre operacional.
  - Entrada: candidato aprobado, respaldo y controles de despliegue propios de cada repositorio.
  - Salida: salud de ambos servicios, verificación por archivos/commits y pruebas naturales desde ALMARA, con captura y fuente.
  - Éxito: todos los gates pasan antes de dar el cambio por desplegado; ante una regresión se aplica la receta autorizada de retorno y se informa el resultado real. No requiere deploy de Hosting si el frontend no cambió.
  - Dependencia: 5.2.

## Resultado del candidato

Implementación y verificaciones independientes completadas: 30 pruebas Node, 7 ADK, 12 de política de acceso y banco de 16 casos con modelo real/fuentes de ALMARA por transporte simulado. Detalle y límites en `verificacion.md`. Tareas 4.4, 5.2 y 5.3 siguen pendientes: necesitan publicación autorizada y sesión operacional de ALMARA. No se confunde ese gate con las pruebas del candidato.

Revisión27-oct solicitada por Daniel: hay sesión ALMARA legítima y se probaron tres preguntas naturales sobre saludo, identidad y queja en **la versión productiva anterior**, sin publicar el candidato. Saludo/identidad reflejan marca y fuentes; quejas mostró límites de evidencia/vigencia. Perfil cargado por MCP solo con `marca:view`; saludo inicial fijo;8/79 PDF disponibles. Detalle actual en `verificacion.md`. Se mantiene4.4 abierta porque la disponibilidad de sesión y las pruebas de la base no acreditan el candidato;5.2/5.3 siguen sin ejecutar. No se cambió configuración, permisos o código ni se crearon nuevos tests versionados (D-566).
