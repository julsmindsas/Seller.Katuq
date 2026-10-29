# Tareas — D-569

Estado: **T-01 a T-14 completadas; publicado y comprobado desde ALMARA**, 29-oct-2026. Spec/diseño/tareas/diff aprobados; Daniel autorizó expresamente subir y desplegar backend/Opttia. Código publicado en `62796de7` y `257e62b`, salud y rechazo sin sesión verificados. T-14 se cierra con dos mensajes ficticios desde el botón en una sesión legítima de ALMARA: saludo y queja con tono compatible, sin culpas, compensaciones o gestiones inventadas. Esa prueba se distingue de los ensayos sintéticos y no cubre todos los roles/planes productivos. Evidencia en `publicacion.md`. Sin cambios de roles/perfiles reales.

Ejecución secuencial, sin delegación. Rutas backend relativas a `katuq_admin_back_firebase/`, rutas ADK a `kai/`; artefactos de esta propuesta y nota de versión en Seller. Cada tarea de código debe compilar y pasar sus checks antes de avanzar. Pruebas nuevas sintéticas locales, ignoradas y fuera de Git (D-566); nunca `git add -f`.

## 1. Línea base y contratos antes del código

- [x] T-01 — Verificar la base del candidato y preservar trabajo concurrente.
  - **Entrada:** diseño/contratos aprobados y estado de los tres repositorios al comenzar implementación.
  - **Salida:** registro de commits, archivos afectados y diferencias respecto a producción; candidato aislado cuando sea necesario, sin copiar archivos sucios completos.
  - **Éxito:** identificar soporte/marca/ranking y cambios ajenos; no modificar, revertir, mover o publicar trabajo de otra sesión. Producción se consulta solo en lectura. No arrastrar el candidato documental anterior.
  - **Archivos:** `findings.md` y futura evidencia `verificacion.md`. **Dependencias:** aprobación de estas tareas.

- [x] T-02 — Preparar contratos locales y capturar el fallo esperado de la función nueva.
  - **Entrada:** matriz y schemas de `contracts.md`, línea base T-01.
  - **Salida:** pruebas locales de proyección, autorización/catálogo, aislamiento y protocolo ADK, con datos sintéticos y centinelas de contenido excluido.
  - **Éxito:** contratos nuevos fallan en la base por ausencia de la función; regresiones pertinentes de admisión/marca/soporte pasan o sus fallos previos quedan separados con reproducción. Pruebas nuevas efectivamente ignoradas por Git, sin secretos ni llamadas a comercios reales.
  - **Archivos:** pruebas nuevas solo locales; `verificacion.md` registra resultados sin copiar fixtures. **Dependencias:** T-01.

## 2. Proyección y autorización backend

- [x] T-03 — Implementar proyección cerrada y herramienta de lectura todavía no anunciada.
  - **Entrada:** catálogo, normalización y estados de `contracts.md`; contratos T-02.
  - **Salida:** helper pequeño de proyección y `functions/tools/getCompanyBrandVoice.js`, usando la resolución existente de marca y contexto autenticado.
  - **Éxito:** enum completo, orden y deduplicación correctos; campo desconocido/hostil, tipo inválido, exceso o conflicto formal/informal no rescatan texto parcial. Cero campos libres/archivos/políticas en la respuesta. Argumentos vacíos cerrados, permiso explícito `read`, marcador interno y empresa concreta obligatorios. Sin registro/anuncio ni ampliación de acceso todavía.
  - **Archivos:** helper nuevo acotado en `functions/services/`, nueva herramienta y, solo si hace falta, acceso de lectura mínimo en `brandKnowledge.js`; no tocar ranking. **Dependencias:** T-02.

- [x] T-04 — Preparar el diff sensible de elegibilidad y registro para revisión humana.
  - **Entrada:** proyección T-03, matriz de roles/planes y base verificada.
  - **Salida:** parche concreto revisable y evidencia de contratos sobre candidato aislado; no aplicado al árbol de entrega antes de aprobarlo.
  - **Éxito:** elegibilidad previa a voz; excepción exacta de lectura, admisión vigente y contexto interno; catálogo genérico excluye la tool y llamada directa en otro canal la rechaza incluso con `admin`. No cambios de middleware, roles almacenados, grants, scopes generales, soporte o documentos. El parche muestra archivos/hunks completos relevantes y no incluye trabajo ajeno.
  - **Archivos:** parche de revisión fuera de los archivos activos; destinos previstos `functions/routers/opttia.js`, `functions/tools/toolRegistry.js` y `opttiaAccessPolicy.js` solo si es necesario. **Dependencias:** T-03. **Gate:** presentar el diff y esperar aprobación explícita de Daniel antes de T-05.

- [x] T-05 — Aplicar únicamente el diff de autorización aprobado.
  - **Entrada:** aprobación explícita del parche exacto T-04.
  - **Salida:** tool registrada, visible solo en MCP integrado para quien ya era elegible; autorización coherente en `/access`, `/admit`, `/authorize-tool` y `/mcp`.
  - **Éxito:** todas las filas de la matriz pasan, incluidos rol vacío, solo Marca, solo soporte, gratuito, revocación y argumentos/_meta/cabeceras falsificados. Las herramientas existentes conservan su acceso. `node --check` de archivos JS afectados sin errores; no cambios de datos reales.
  - **Archivos:** exclusivamente los del parche aprobado, conservando cambios concurrentes. **Dependencias:** T-04 y aprobación de su diff; si la base cambia materialmente, volver a presentar el parche.

- [x] T-06 — Validar el recorrido MCP y los consumidores existentes.
  - **Entrada:** backend candidato T-05 y arneses locales T-02.
  - **Salida:** pruebas de transporte real con SDK y persistencia sintética, sin sustituir el registro central.
  - **Éxito:** Node/Python negocian y llaman la nueva tool; catálogos genéricos no la anuncian; tenant distinto, grants caducados y acceso revocado fallan. Perfil/documentos mantienen permisos. Instrumentación sintética acredita cero escrituras de negocio, cero consultas de documentos para precargar voz y ningún grant/centinela en logs/modelo.
  - **Archivos:** solo pruebas locales y `verificacion.md`; correcciones de autorización vuelven al gate T-04. **Dependencias:** T-05.

## 3. Integración del chat y quejas

- [x] T-07 — Validar el contrato de voz en ADK y convertir enums a pautas constantes.
  - **Entrada:** contrato backend validado T-06.
  - **Salida:** parser/schema cerrado y mapeo de tono en helper pequeño o sección acotada del endpoint básico.
  - **Éxito:** rechazar extras, empresa distinta, enums/estados/listas inválidos; nunca concatenar texto del perfil. `unconfigured`/`unsupported` producen tono neutral y limitación breve. Compilación Python y contratos locales pasan.
  - **Archivos:** helper ADK tipado si es necesario y sus pruebas nuevas locales. **Dependencias:** T-06.

- [x] T-08 — Sustituir la precarga del perfil por una lectura fija de voz.
  - **Entrada:** parser T-07, MCP existente y presupuesto actual del chat básico.
  - **Salida:** precarga única por MCP autenticado después de admisión/metering; voz excluida de herramientas del modelo. El perfil completo deja de precargarse como instrucciones, conservando su consulta explícita autorizada como datos.
  - **Éxito:** cuatro consultas operativas y consumo habitual intactos; no segundo `/admit`, crédito o modelo para derivar tono. Backend no compatible/indisponibilidad transitoria degradan a neutral; denegación, tenant o schema inválidos detienen sin fallback. Limpieza de contexto en éxito/error/cancelación y concurrencia entre comercios sin cruces. Compilación/checks ADK en verde.
  - **Archivos:** `adk_agent/endpoints/katuq_basic_chat_endpoint.py`; adaptador existente solo si el contrato lo exige, sin otro transporte. **Dependencias:** T-07.

- [x] T-09 — Ajustar las instrucciones de quejas y distinguir borrador de verificación.
  - **Entrada:** voz común T-08 y requisitos de `opttia-brand-complaint-responses`.
  - **Salida:** instrucciones acotadas del agente, separando tono, evidencia, vigencia y autoridad.
  - **Éxito:** no cargar `manejoQuejas` como instrucción ni culpar/promover compensaciones sin respaldo; no afirmar gestión iniciada. Ejemplo ficticio o mera redacción sin investigar personas; caso real usa solo lo pertinente autorizado. Sin detector por regex, respuesta fija, ranking nuevo, reescritura de perfil o cambio de modelo/proveedor. Compilación/checks pasan.
  - **Archivos:** instrucciones del endpoint básico o helper específico pequeño; no políticas globales de otros canales. **Dependencias:** T-08.

## 4. Aceptación y regresiones

- [x] T-10 — Ejecutar integración completa sintética y regresiones sensibles.
  - **Entrada:** candidato backend/ADK T-06 a T-09.
  - **Salida:** evidencia de aislamiento, revocación, errores, contadores y soporte D-545.
  - **Éxito:** matriz completa y contratos pasan; extracción indirecta sin Marca no carga ni revela documentos. Contexto concurrente/cancelado limpio; credenciales privadas nunca llegan al modelo. Soporte conserva propuesta, confirmación humana, caducidad y deduplicación; un «sí» no crea ticket. Persistencia/avisos se prueban con dobles locales, sin efectos reales. Fallos previos separados de regresiones nuevas.
  - **Archivos:** pruebas locales, actualizaciones pertinentes de pruebas ya versionadas sin secretos y `verificacion.md`. **Dependencias:** T-09; cualquier corrección de autorización requiere el gate sensible.

- [x] T-11 — Evaluar respuestas con modelo real usando únicamente comercios/datos sintéticos.
  - **Entrada:** candidato T-10, banco local de casos y configuración vigente del modelo, sin cambiar proveedor/credenciales.
  - **Salida:** respuestas y trazas revisadas de los casos de `contracts.md`, separadas de mocks y resultados históricos de ALMARA.
  - **Éxito:** dos roles del mismo comercio mantienen el mismo tono y distintos datos autorizados; otro comercio no hereda voz; sin promesas/culpas/gestiones inventadas ante queja, abono no autorizado o manual sin vigencia. Ejemplo ficticio sin consultas operativas; caso real pertinente. Cero centinelas, pruebas con hechos inventados o escrituras de negocio. Si falla un caso, corregir y repetir lo afectado antes de aprobar aceptación.
  - **Archivos:** banco y trazas sintéticas nuevos solo locales; `verificacion.md` registra modelo/versión, casos, resultado y límites, sin secretos. **Dependencias:** T-10. La aprobación de estas tareas incluye este ensayo local con el modelo real, sin datos de clientes ni tickets/avisos reales.

- [x] T-12 — Revisar el chat candidato y cerrar compilación/regresiones.
  - **Entrada:** candidato validado T-11 y entorno local de prueba con identidades sintéticas, sin alterar login/empresa reales.
  - **Salida:** recorrido de bienvenida/pregunta/queja/error y soporte en navegador, más checks finales de archivos modificados.
  - **Éxito:** el botón/chat conservan funcionamiento, Markdown y tarjeta de soporte; voz ausente/denegación se comunican correctamente. Compilación Node/Python sin errores y regresiones pertinentes en verde. Si se toca código de Seller, build de producción y revisión a 1440/390 px, revisando cambios de versión de environments; si no se toca, registrar esa no aplicabilidad sin afirmar un build no ejecutado.
  - **Archivos:** evidencia sin datos reales; código solo para defectos del alcance, con sus gates correspondientes. **Dependencias:** T-11.

## 5. Entrega revisable y publicación posterior

- [x] T-13 — Preparar cierre técnico y nota para el comercio.
  - **Entrada:** resultados T-01 a T-12 y diff final limitado a D-569.
  - **Salida:** `verificacion.md`, contrato actualizado y nota sencilla `MEJORA`/`CORRIGE` en `notas-version.json`, con fecha real de preparación de la entrega.
  - **Éxito:** describir tono compartido, límites de fidelidad y permisos conservados; registrar pruebas, cobertura y limitaciones reales. Ninguna prueba nueva o dato privado en archivos a subir; no incluir cambios ajenos o conflictos previos del contrato. Lista explícita de commits/archivos y secuencia backend→ADK/reversión lista para revisión. No commit/push/deploy incidental.
  - **Archivos:** artefactos D-569, su sección de `specs/CONTRACT.md` y `notas-version.json`. **Dependencias:** T-12.

- [x] T-14 — Publicar y verificar operativamente solo después de la autorización correspondiente.
  - **Estado 29-oct:** autorización recibida; commits/push/despliegue/salud completados. Sesión legítima ALMARA acreditada y dos respuestas reales desde el botón revisadas: saludo cercano/profesional y queja prudente. Evidencia y límites en `publicacion.md`; sin cambios de roles/perfiles/documentos ni creación de tickets.
  - **Entrada:** entrega T-13 revisada y autorización explícita de Git/despliegue; sesión legítima de comercio para la comprobación final cuando esté disponible.
  - **Salida:** backend compatible primero y ADK después, versiones/commits realmente servidos y prueba desde el botón con datos no sensibles.
  - **Éxito:** punta y árboles verificados, salud y compatibilidad correctas; no copiar archivos sucios completos. Confirmar tono y quejas por el carril publicado, distinguirlo de las pruebas locales. Sin activar flags, editar roles/perfiles, reindexar, crear tickets o mandar avisos por efecto lateral. Ante fallo, reversión acotada según diseño, comunicando pérdida de voz común o degradación neutral.
  - **Archivos:** bitácora de publicación al ejecutarse; sin escrituras de negocio nuevas. **Dependencias:** T-13 y autorización de esta fase. Bloqueada mientras falte esa autorización; aprobar tareas no la concede.

## Criterio de cierre

Implementación local aceptada al completar T-01 a T-13, con todos los checks aplicables en verde y gates sensibles acreditados. Publicación/aceptación operacional solo al completar T-14; no marcarla hecha con fixtures o con la versión productiva anterior. Un resultado no ejecutado queda pendiente de forma explícita. Desvíos de alcance vuelven al artefacto y checkpoint que corresponda.
