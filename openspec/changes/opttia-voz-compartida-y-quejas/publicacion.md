# Git y despliegue — D-569

29-oct-2026, America/Bogota. Autorización explícita de Daniel: «sí aprobado, sube los cambios a git y despliega el backend y opttia».

## Publicado

| Servicio | Rama remota/productiva | Antes | Commit publicado |
|---|---|---|---|
| Backend Katuq | `backend-aws-security` | `2dbcf48b` | `62796de77f09260a067057beda626e925a303199` |
| Opttia/ADK | `codex/opttia-support-tickets` | `4a61ae4` | `257e62b98c5f3f42cf679bfd13b8ce534e6a4aac` |

Los dos commits se subieron a Git y se actualizaron en producción por fast-forward al SHA explícito. Checkouts limpios de preparación, sin arrastrar el endpoint ADK local que mezcla el candidato documental anterior. Backend: seis archivos (incluye una prueba ya versionada); ADK: dos archivos. Índices de Git y hashes de archivos exactamente iguales al manifiesto aprobado. Ninguna prueba nueva, arnés, fixture, credencial o cambio ajeno en esos commits.

Seller lleva solo documentación D-569 y su nota de versión en la rama habitual; no cambió su código, assets de versión o environments. No se publicó Firebase Hosting: el frente actual usa el mismo protocolo. La nota se mostrará con la próxima publicación Seller que corresponda.

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

## Aceptación operacional pendiente

La última pestaña Seller observada estaba en `/login`; se pidió una sesión legítima de ALMARA para la comprobación del botón. No se pudo retomar su control después para acreditar una consulta autenticada. No se compartió/extrajo contraseña, token o API key, ni se emitió un JWT suplantando un empleado.

**Git y despliegue completados; queda pendiente únicamente comprobar tono/quejas desde el botón con sesión legítima.** Salud, fuentes/commits y rechazo anónimo no se presentan como esa prueba. La implementación y los contratos de roles se validaron con los ensayos sintéticos descritos en `verificacion.md`.
