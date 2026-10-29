# Git y despliegue — D-569

29-oct-2026, America/Bogota. Autorización explícita de Daniel: «sí aprobado, sube los cambios a git y despliega el backend y opttia».

## Publicado

| Servicio | Rama remota/productiva | Antes | Commit publicado |
|---|---|---|---|
| Backend Katuq | `backend-aws-security` | `2dbcf48b` | `62796de77f09260a067057beda626e925a303199` |
| Opttia/ADK | `codex/opttia-support-tickets` | `4a61ae4` | `257e62b98c5f3f42cf679bfd13b8ce534e6a4aac` |

Los dos commits se subieron a Git y se actualizaron en producción por fast-forward al SHA explícito. Checkouts limpios de preparación, sin arrastrar el endpoint ADK local que mezcla el candidato documental anterior. Backend: seis archivos (incluye una prueba ya versionada); ADK: dos archivos. Índices de Git y hashes de archivos exactamente iguales al manifiesto aprobado. Ninguna prueba nueva, arnés, fixture, credencial o cambio ajeno en esos commits.

Seller lleva solo documentación D-569 y su nota de versión en la rama habitual; no cambió su código, assets de versión o environments. No se publicó Firebase Hosting: el frente actual usa el mismo protocolo. Una publicación posterior de otra sesión generó Seller `2026.10.29.1` (`cd09ab77`): su `src/assets/version.json` en Git ya incluye la nota Opttia, y durante esta comprobación se vio el aviso de esa actualización. Esta sesión no publicó Hosting ni atribuye al aviso una comprobación de todos los bundles servidos.

## Comprobación de la entrega

- Checkout limpio backend: **82/82** pruebas Node y compilación correcta. La diferencia con las 83 de la copia compartida es una prueba documental del candidato previo, sin versionar aquí; no se incluyó para publicar otro alcance.
- Checkout limpio ADK: **48 pruebas y 15 subcasos** en verde; compilación Python correcta. Se conserva la aceptación previa de doce escenarios finales del modelo real con datos/MCP ficticios, pues los archivos tienen los mismos hashes.
- Reinicio **solo** de `katuq-api` en PM2 de ubuntu (PID observado `375078`, online) y de `kai-adk` por systemd (PID `375854`, active, NRestarts=0). No se reinició Genkit ni otro proceso.
- Hashes de las fuentes productivas coinciden con `delivery-manifest.json`; entornos privados conservados, sin instalar dependencias porque no cambian package/lock/requirements.
- Opttia público `/adk/health`: **HTTP 200**.
- Backend público `/v1/opttia/access` sin sesión: **HTTP 401**.
- `POST /adk/agui/basic/v1` sin Bearer: SSE **RUN_ERROR** por sesión ausente, antes de admisión/cupo/modelo. No se fabricó una identidad de comercio para hacerlo pasar.

Una comprobación desde Python en el equipo local falló por resolución DNS local. Se verificaron los dominios normales desde el servidor y HTTPS desde el equipo con resolución explícita al origen, conservando validación TLS. No se cambió DNS ni se desactivó TLS.

La compilación inicial de ADK no pudo escribir en un `__pycache__` existente de otro usuario. Se compiló en el respaldo privado y después se reinició systemd; no se cambiaron propietarios/permisos de cachés o fuentes. El servicio levantó con la fuente nueva y salud correcta.

## Respaldo y preservación

- Backend: `/home/ubuntu/opttia-deploy-backups/d569-backend-20261029.q1uiWG`.
- ADK: `/home/ubuntu/opttia-deploy-backups/d569-adk-20261029.5dlcLX`.

Directorios privados con fuentes anteriores, commit previo y copia privada del entorno, únicamente en el servidor; sin valores en Git/logs. El cambio previo de `adk_agent/data/waitlist.json` se conservó y se comprobó su huella después del pull. Se preservaron los archivos no versionados ajenos. Sin migración, reindexación, flags nuevos, cambio de proveedor, perfiles/roles/documentos, pedidos, inventario, tickets o avisos modificados por el despliegue.

## Aceptación operacional desde ALMARA — 29-oct

Daniel dejó disponible una sesión legítima de ALMARA FELICIDAD y autorizó usarla para esta prueba. En Edge se accedió mediante el ingreso normal de Seller, sin leer credenciales, almacenamiento o tokens ni fabricar identidad. La cabecera del comercio y el chat mostraron **ALMARA FELICIDAD**. Desde el botón flotante → **Consulta rápida Opttia** se enviaron exactamente dos mensajes ficticios, sin pedir documentos ni instrucciones de tono:

1. «Redacta un saludo breve para una clienta ficticia llamada Ana que pregunta por un regalo. Solo el saludo.»
   - Respuesta generada: «¡Hola, Ana! Qué gusto saludarte. Con gusto te ayudo a encontrar el regalo ideal. ¿Para quién es y qué tienes en mente?»
2. «Ejemplo ficticio para capacitar al equipo: Ana recibió un regalo distinto al solicitado. No sabemos de quién fue el error, no hemos iniciado ninguna gestión y no hay un abono aprobado. Redacta un mensaje breve para ella.»
   - Mensaje al cliente: «Hola, Ana. Lamentamos que el regalo que recibiste no sea el que pediste. Entendemos lo molesto que puede ser. Para orientarte mejor, ¿nos cuentas qué regalo solicitaste y cuál recibiste? Gracias por escribirnos.»
   - Añadió una nota separada para el equipo, excluida del mensaje al cliente: no ofrecer cambios/abonos/plazos sin validación del responsable.

El saludo y la queja son compatibles con el tono cercano/profesional/informal proyectado por el diseño aprobado. La queja no asigna culpa, promete compensación o afirma una gestión iniciada. No apareció un error de acceso/contrato o aviso de degradación neutral. Se observaron respuestas generadas, distintas del saludo estático inicial de Seller.

**T-14 completada:** publicación y comprobación autenticada desde el botón. Esta observación no inspecciona la traza MCP privada ni prueba todos los roles, planes o conversaciones posibles; los contratos de permisos/MCP y el aislamiento siguen respaldados por los ensayos sintéticos de `verificacion.md`. Tampoco acredita una política comercial vigente: la frase de la nota interna sobre ausencia de política no se presenta como un hecho verificado del comercio. El alcance sigue siendo tono cerrado, sin compartir frases libres, políticas o documentos por ser empleados.

Dos solicitudes reales de chat y su consumo normal; sin crear tickets/avisos, editar roles/perfiles/configuración, reindexar o consultar pedidos/clientes como objetivo de la prueba. No se atribuye ausencia de herramientas operativas al diálogo sin una traza observada. Capturas guardadas fuera de Git en `opttia-almara-production-20261029/chat-publicado.png` y `respuesta-queja.png`, dentro del directorio de visualizaciones de esta conversación; conversación conservada abierta para Daniel. El cierre solo actualiza documentación, sin nuevo despliegue de servicios, build Seller o nota de versión adicional.
