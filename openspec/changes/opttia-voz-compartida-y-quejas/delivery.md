# Entrega local lista para publicar — D-569

Preparada el 28-oct-2026 (America/Bogota). Daniel autorizó Git/despliegue el **29-oct**: backend `62796de7` y ADK `257e62b` subidos y publicados; salud y rechazo anónimo verificados en `publicacion.md`. Solo queda pendiente la comprobación del botón con sesión legítima. Los apartados siguientes conservan la preparación de la entrega.

## Archivos y bases

| Grupo | Archivos del cambio | Base de preparación |
|---|---|---|
| Backend Katuq | `services/brandVoice.js`, `services/brandKnowledge.js`, `tools/getCompanyBrandVoice.js`, `tools/toolRegistry.js`, `routers/opttia.js`, una expectativa de la prueba ya versionada `tests/opttia-access.test.js`, todos en `functions/` | `2dbcf48bb6d5c59651f42733aea20bd1c574fc97` |
| Opttia/ADK | `adk_agent/services/katuq_brand_voice.py`, `adk_agent/endpoints/katuq_basic_chat_endpoint.py` | versión publicada `4a61ae4a441d1053b139532761d5bd57d6a87c38` |
| Seller/documentación | Nota nueva de Opttia en `notas-version.json`, artefactos D-569 y únicamente su entrada del contrato | árbol compartido; preservar las entradas/cambios ajenos |

`backend-release.patch` y `adk-release.patch` contienen solo esos cambios de código, sin pruebas nuevas o la mejora anterior de ranking/recuperación. `delivery-manifest.json` guarda bases y hashes de archivos/parches. Los parches incluyen las altas de archivos nuevas y pasaron `git apply --check` contra ambos checkouts productivos, **sin aplicarlos allí**. La primera verificación detectó metadata incompleta en las altas del parche generado; se corrigió el formato del artefacto antes de repetir el check, sin cambio de producto.

El árbol ADK local conserva un candidato previo en el mismo endpoint y adaptador MCP. **No copiar ni commitear el archivo local completo para publicar D-569.** El parche ADK y el candidato aislado derivan de la versión publicada e incorporan únicamente la carga de voz/quejas. El helper nuevo coincide por hash entre copia local, candidato probado y proceso de evaluación. El backend también tiene cambios ajenos fuera de la lista; no usar `git add -A` ni publicar el árbol completo.

## Resultado comprobado

- **136 pruebas automáticas**: 83 backend Node, 48 Python/ADK y 5 frontend de chat/Markdown; 15 subcasos adicionales de unittest, sin sumarlos de nuevo. Node y Python compilan sin errores. Las pruebas nuevas quedan ignoradas/locales; el parche solo actualiza una prueba que ya estaba en Git.
- SDK Node y Python reales por HTTP local con JWT/datos sintéticos y registro central; autorización y metering con dobles. Cuatro herramientas operativas por mensaje, precarga fija aparte y sin consumo doble. Roles vacíos/solo edición no entran; retirada de Marca conserva voz solo si sigue existiendo acceso previo al chat. Documentos y soporte mantienen sus permisos/confirmación.
- **12 casos finales con modelo real**, `anthropic/claude-sonnet-5-5`, datos y transporte MCP ficticios. Se ejecutaron 24 mensajes de evaluación entre primera ronda y repeticiones. Tres respuestas iniciales inventaban una gestión en curso; se reforzaron las instrucciones y se repitieron todos los casos afectados y los controles. En la versión final, las seis quejas/casos documentales y los seis controles de tono/permisos pasaron revisión de texto y trazas.
- Modelo: saludo igual para ventas e inventario de un comercio, trato formal en otro, ejemplos ficticios sin consultas operativas, abono sin aprobar sin ofrecerlo, manual antiguo sin presumir vigencia, inyección ignorada, perfil hostil no precargado, perfil/documentos denegados sin permiso y consulta de pedido solo al solicitar verificación. Sin autorizaciones privadas en solicitudes del modelo.
- Navegador local con los componentes reales Angular de chat, Markdown y tarjeta de soporte; servicio sustituido por fixture sin conexión a comercios. Se presentan respuestas reales del banco sintético. Anchos CSS verificados 390 y 1440, sin scroll horizontal; avatar cargado, Markdown renderizado, error bloquea la entrada y tono ausente comunica la limitación. Soporte simulado conserva la tarjeta tras escribir «sí» y permite cancelarla. Cero errores de consola. No es prueba operacional de ALMARA ni del transporte SSE completo del Seller contra producción.

No se modificó código de Seller ni environments; no se ejecutó un build Angular de producción ni se incrementó la versión. La fixture Angular se compiló aparte y el servidor de prueba se cerró al terminar. Evidencia visual local fuera de Git en `opttia-d569-20261028/chat-390.png` y `chat-1440.png` dentro del directorio de visualizaciones de esta conversación.

## Evaluación del modelo sin publicar

No hay credenciales del modelo disponibles en la copia local. Para no exportarlas, se ejecutó el candidato en un proceso Python temporal del servidor, usando el entorno/modelo ya configurados. Solo se enviaron el endpoint candidato, helper y banco sintético a un directorio propio de `/tmp`. No se importó `main`, billing o Firestore, no se modificaron fuentes productivas y no hubo restart/systemd/PM2 o cambios de proveedor. Las credenciales permanecieron en ese proceso. Las respuestas fueron sintéticas; no se consultaron comercios, clientes, roles o tickets reales. Esta adaptación del lugar del ensayo no acredita un despliegue.

## Plan de publicación ejecutado el 29-oct

Se integraron los cambios aislados desde la punta actual, verificaron hashes y compilaron; backend primero y ADK después. Salud verificada; consulta del botón pendiente de sesión legítima. La nota de versión se integra con la publicación Seller que corresponda. Sin flag nuevo, migración o edición de roles/perfiles/documentos. Los checks del 28-oct en `/tmp` no fueron un despliegue; la actualización por Git y reinicios del 29-oct sí están acreditados en `publicacion.md`.

Git se preparó en grupos separados backend, ADK y documentación/nota, con archivos explícitos y sin pruebas nuevas, usando sello D-569. Commits de código en `publicacion.md`. La reversión sigue el diseño: ADK nuevo con backend anterior degrada a neutral; volver ADK anterior termina la garantía de tono común. No borrar datos o retroceder contadores.
