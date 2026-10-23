> **Estado:** DISEÑO, **pendiente de aprobación**. Ticket 1339 (ALMARA FELICIDAD). Decisión **D-549**. La propuesta y la spec las aprobó Daniel el 2026-10-23 con las respuestas recomendadas. F1 y F2 salen juntas. La primera tarea es un spike que decide entre el plan A (la tarjeta elige y sube) y el plan B (enlace de un solo uso a Katuq). Solo documento: sin código.

## Context

Verificado en el código el 23-oct, sin leer ni escribir producción. Backend en `backend-aws-security` (`9ab9074d`).

- **Hoy hay tres fuentes de evidencia** (`tools/addSupportTicketEvidence.js:10-17`):
  - `urlArchivo`: el servidor descarga, con defensa contra direcciones internas (`tools/_evidenciaFuentes.js:88-117`);
  - `rutaStorage`: el binario ya está en `tickets/subidas/{ticketId}/` por una URL firmada v4 de 15 minutos (`tools/getSupportEvidenceUploadUrl.js:68-75`);
  - `contenidoBase64`: sin límite propio, solo el tope general (`addSupportTicketEvidence.js:146-157`).
  - Topes: 15 MB, y 50 MB para audio y video (`:30-39`). Tipos: `_evidenciaFuentes.js:19-29`.
  - Registra la URL con `ref.update({ adjuntos })` leyendo el arreglo antes (`:173-174`): dos registros simultáneos pueden pisarse.
- **La subida firmada exige un ticket que ya existe** (`getSupportEvidenceUploadUrl.js:62-66`). Al crear el ticket no sirve.
- **La aprobación.** `create_support_ticket` devuelve una propuesta con comprobante (`tools/createSupportTicket.js:162-180`). La pantalla genérica `ui://katuq/confirmar/cambio.html` (`services/mcp/apps/index.js:18-23`) la muestra y, al aprobar, vuelve a llamar la misma herramienta con el comprobante (`apps/confirmar/src/confirmar.js:72-95`).
  - El comprobante firma la huella de los cambios con el valor de antes y vence a los 10 minutos (`services/mcp/confirmacion.js:34, 59-83`). No guarda estado.
  - El comprobante viaja en el texto del resultado, así que el modelo lo ve. La defensa de hoy es la instrucción y la huella.
- **La tarjeta puede llamar herramientas** del servidor a través del host (`apps/_puente/puente.js:126-129`, método `tools/call`), pero **no puede hablar con nadie más**: toda pantalla declara `connectDomains: []` (`services/mcp/uiResources.js:39-47`). El registro ya admite un `meta` propio por pantalla (`:49-54, 87`).
- **Precedente de subida firmada con candados:** las fotos de producto (D-501) firman `x-goog-content-length-range` y `x-goog-meta-company` (`tools/getProductPhotoUploadUrl.js:14, 35, 101`), con su prueba `tests/productos/productPhotos/urlFirmadaSubida.seguridad.test.js`.
- **La pantalla compilada va versionada** (`services/mcp/apps/build.js:8-10`): producción no compila.
- **Trabajo en paralelo.** D-545 (chat de Opttia) tiene sin commitear `tools/createSupportTicket.js` (`executeIntegrated`, `:59-87`) y `services/soporte/crearTicket.js`, donde agrega un id determinista con `create()` para que un reintento no duplique el ticket (`deps.idempotency`, `validateIntent`).
- **Interruptores globales** viven en `config/feature_flags` (D-505), con precedentes de lectura en `services/orders/priceChange/access.js:136` y `services/orders/historialPedido/constantes.js:27`.

## Decisiones de Daniel (23-oct)

| # | Pregunta | Decisión | Dónde se aplica |
|---|---|---|---|
| 1 | Plan B si Claude no deja elegir archivos | Enlace de un solo uso a una página de Katuq, ligado al ticket o a la propuesta | D1, D7 |
| 2 | Archivos subidos y no aprobados | Se borran al cancelar y, si nadie decide, a las 24 horas | D5 |
| 3 | ¿F2 con la F1? | Sí, en la misma entrega | D6, tareas |
| 4 | ¿Bandera? | Para todos, con un interruptor global en Firestore `config/` | D8 |

## Goals / Non-Goals

**Goals:**

- Adjuntar archivos al crear un ticket desde Claude y a un ticket existente, sin que el archivo pase por el modelo ni por el texto del chat.
- La aprobación cubre los archivos exactos. Un reintento no duplica ticket ni evidencias.
- Lo no aprobado no queda en ningún ticket y se borra.
- Base64 con un límite documentado.
- Los clientes sin tarjetas y el chat de Opttia siguen igual.

**Non-Goals:**

- Subir en partes por base64.
- Tipos o topes nuevos.
- Adjuntar desde el chat integrado de Opttia (D-545).
- Editar o borrar evidencias ya registradas.
- Cambiar la app de Support o los avisos.
- Mover el comprobante fuera del texto del resultado. Si el spike muestra cómo hacerlo, va en un cambio aparte porque toca todas las aprobaciones del MCP.

## Decisions

### D1. Spike primero: ¿la tarjeta puede elegir y subir archivos?

Antes de escribir código de producto se prueba en **Claude web y Claude escritorio**, con un servidor MCP desechable fuera del despliegue:

- carpeta `functions/scripts/spikes/mcp-adjuntos/`, sin enganche en `index.js` ni en `toolRegistry`;
- expuesto con un túnel HTTPS temporal y conectado como conector personalizado por una persona del equipo;
- una herramienta que abre una tarjeta mínima, y un endpoint del mismo túnel que recibe un `PUT` y anota el encabezado `Origin`.

Las preguntas que responde, cada una con evidencia (captura y registro):

| # | Pregunta | Cómo se prueba |
|---|---|---|
| S1 | ¿`<input type="file">` abre el selector dentro de la tarjeta? | Botón «Adjuntar» |
| S2 | ¿Funciona arrastrar y soltar? | Soltar un PDF sobre la zona |
| S3 | ¿El host respeta `connectDomains` declarado? | `PUT` al túnel con el dominio declarado y otro sin declarar |
| S4 | ¿Cuál es el `Origin` exacto de la tarjeta? | Lo anota el endpoint |
| S5 | ¿Sube 15 MB y 50 MB sin cortarse? | Dos archivos de prueba |
| S6 | ¿Se ve una vista previa (`blob:` o `data:`)? | Una imagen |
| S7 | ¿El host soporta `ui/open-link`? | Botón que abre una URL |
| S8 | ¿Una herramienta con `_meta.ui.visibility: ["app"]` queda oculta al modelo y la tarjeta la puede llamar? | Preguntar al modelo por sus herramientas y llamarla desde la tarjeta |

**Decisión según el resultado:**

- **Plan A** si S1, S3 y S5 pasan en los dos clientes: la tarjeta elige y sube directo al almacenamiento (D3).
- **Plan B** si S1 o S3 fallan en alguno: la tarjeta muestra «Subir los archivos en Katuq» con un enlace de un solo uso (D7). Si falla en uno solo de los clientes, salen los dos caminos y el B queda como alternativa visible.
- Si S6 falla, la lista muestra un ícono por tipo en lugar de la vista previa (la spec pide vista previa: queda anotado como desvío para aprobar).
- Si S8 falla, las herramientas de la tarjeta se anuncian al modelo con una descripción que dice que son de la tarjeta. No es un riesgo: sin la persona no hay archivo ni aprobación (D4).

El resultado se escribe en `spike.md` de este cambio y se aprueba antes de la tarea 2.

### D2. La sesión de adjuntos

Una propuesta de ticket con el interruptor encendido trae una **sesión de adjuntos**: un identificador aleatorio de 128 bits y un permiso firmado.

- **Permiso `adjuntosToken`:** se firma con HS256 y una llave derivada de `SECRET_TOKEN` con la etiqueta `mcp-adjuntos-v1`, igual que `confirmacion.js:45-47`. Lleva:
  - `typ: 'mcp-adjuntos'`, `company` (la de la credencial), `actor` (correo de la persona), `sesion`, `ticketId` (nulo al crear), `exp` (60 minutos).
  - Falla cerrado si falta la llave.
- **Sin estado nuevo:** la sesión vive en el almacenamiento, en `tickets/subidas/pendientes/{empresa}/{sesion}/`. `{empresa}` son los primeros 16 caracteres del sha256 del `nomComercial`, para no poner nombres con espacios en rutas.
- **Topes por sesión:** 10 archivos. Tipos y tamaños de hoy, desde `_evidenciaFuentes.js` (una sola fuente de verdad).
- **Herramientas de la tarjeta** (escritura, módulo `soporte` y `misTickets`, como las de evidencia; `visibility: ["app"]` si S8 pasa):
  - `prepare_support_attachment_upload { adjuntosToken, nombreArchivo, contentType, bytes }` → valida permiso, empresa, tipo, tamaño y cupo; devuelve una URL firmada v4 de `PUT` de 15 minutos para `pendientes/{empresa}/{sesion}/{n}_{nombreSaneado}`, con `extensionHeaders`:
    - `x-goog-content-length-range: 0,{tope del tipo}`: el almacenamiento rechaza lo que se pase;
    - `x-goog-meta-company` y `x-goog-meta-sesion`;
  - `discard_support_attachments { adjuntosToken, ruta? }` → borra un archivo o toda la sesión. Lo usan «Quitar» y «Cancelar».

### D3. Subida directa (plan A)

1. La persona elige o arrastra. La tarjeta valida tipo y tamaño antes de pedir permiso, para avisar rápido. **El servidor vuelve a validar todo** (D4).
2. Por cada archivo: `prepare_support_attachment_upload` → `PUT` con los encabezados exactos → avance por archivo con `XMLHttpRequest.upload.onprogress`.
3. «Aprobar» queda deshabilitado mientras algo sube o la lista cambió desde la última propuesta.
4. La pantalla nueva declara solo `connectDomains: ["https://storage.googleapis.com"]` (D9).
5. **CORS del almacenamiento:** el bucket necesita aceptar `PUT` y `OPTIONS` desde el `Origin` que mida S4, con los encabezados `Content-Type`, `x-goog-content-length-range` y `x-goog-meta-*`.
   - CORS es de todo el bucket y `setMetadata({ cors })` **reemplaza** la lista completa. Primero se lee la configuración viva (solo lectura), se versiona en `docs/storage/cors-julsmind-katuq.json` y se publica la unión, con aprobación.
   - Nunca `origin: ["*"]`. Si el host usa subdominios variables y no hay forma de listarlos, se para y se decide con Daniel antes de abrir más (ver Open Questions).

### D4. La aprobación cubre los archivos exactos

**Crear (F1):**

1. Primera llamada `create_support_ticket { asunto, descripcion }` → propuesta como hoy, más `adjuntos: { token, tipos, topes, maximo }`.
2. Cada vez que la lista cambia y no hay subidas en curso, la tarjeta vuelve a llamar `create_support_ticket { asunto, descripcion, adjuntosToken, adjuntosSubidos: [rutas] }` sin comprobante. El servidor:
   - verifica el permiso y que cada ruta esté dentro de la sesión;
   - lee de cada objeto `size`, `contentType` y `md5Hash`, y valida tipo y tamaño **con lo que dice el almacenamiento**, no la tarjeta;
   - devuelve una propuesta nueva cuyos `cambios` tienen una fila por archivo: `{ campo: "adjunto:{ruta}", etiqueta: "Archivo", antes: null, despues: "{nombre} · {tamaño} · {md5}" }`.
   - La huella cubre la lista exacta. Si un archivo se cambia, se quita o se agrega, la aprobación anterior no sirve.
3. «Aprobar» manda los mismos argumentos más el comprobante. El servidor vuelve a hacer el paso 2 y verifica la huella. Si cuadra:
   1. **copia** cada archivo a `tickets/subidas/{ticketId}/{n}_{nombre}`, con `firebaseStorageDownloadTokens` derivado de forma determinista (HMAC de sesión y ruta). Así la URL es la misma en un reintento y el formato es el de la app de Support (`addSupportTicketEvidence.js:47-49`);
   2. **crea el ticket** con id determinista `mcpcard_{sha256(comprobante)}` y `create()` por `servicioTickets.crearTicketSoporte`. Un segundo intento encuentra el ticket y lo devuelve (`ya_existia`). Se reutiliza el mecanismo de D-545 (`deps.idempotency`), ampliado para este origen (tarea 5.1, coordinada con D-545);
   3. borra la sesión pendiente (mejor esfuerzo; D5 recoge lo que quede).
4. El `ticketId` se decide antes de copiar (es determinista), así que copiar va primero: si la creación falla, el reintento copia lo mismo encima y crea el ticket.

**Ticket existente (F2):** igual, con `add_support_ticket_evidence { id }` sin fuente.

- Si el ticket no es de la empresa de la sesión, la respuesta es la misma de «no encontrado» y no hay tarjeta (`hasFullAccess` / `ticketBelongsToCompany`, como hoy).
- El permiso lleva el `ticketId`. Al aprobar se copia a `tickets/subidas/{ticketId}/` y las URLs se agregan con `FieldValue.arrayUnion`: el reintento no duplica y dos registros simultáneos no se pisan.
- Las tres fuentes de hoy (`urlArchivo`, `rutaStorage`, `contenidoBase64`) siguen idénticas.

**El modelo no aprueba ni agrega archivos.** Puede ver el permiso y el comprobante en el texto, como hoy, pero no puede subir un archivo (no tiene red hacia el almacenamiento) y la lista que se aprueba es la que la persona ve en la tarjeta.

### D5. Lo no aprobado se borra

- **Al cancelar** o quitar: `discard_support_attachments` al momento.
- **A las 24 horas:** un trabajo cada hora en el planificador existente (`services/cronService.js`, zona `America/Bogota`) lista `tickets/subidas/pendientes/` por páginas de 500 y borra lo creado hace más de 24 horas.
  - Lleva latido en `services/monitoring/jobHeartbeat.js` y un registro `soporte.adjuntos.limpieza { borrados, duracionMs }`.
  - Se eligió el trabajo y no una regla de ciclo de vida del bucket porque la regla cuenta en días (borraría entre 24 y 48 h) y porque cambiarla reemplaza todas las reglas del bucket.
- **Enlace vencido (plan B):** la misma limpieza.

### D6. La tarjeta de soporte

- **Pantalla nueva** `ui://katuq/soporte/adjuntar.html` en `services/mcp/apps/soporte/`, compilada por `build.js` como las demás. Se registra con `meta: { csp: { connectDomains: ["https://storage.googleapis.com"], resourceDomains: [] } }`.
- **Por qué no la genérica:** el permiso de red solo lo necesita esta. `update_product` y las demás aprobaciones siguen con `connectDomains: []`.
- Reutiliza el puente y la forma de pintar la propuesta de `confirmar/src/confirmar.js`. Si D-550 extrae esas funciones a un módulo común antes, se usa ese; si no, esta tarea lo extrae sin cambiar el compilado de la genérica (la prueba `build.js --check` lo vigila).
- `create_support_ticket` y `add_support_ticket_evidence` declaran esta pantalla. Con el interruptor apagado la propuesta no trae `adjuntos` y la tarjeta se ve como la de hoy.
- **Estados:** propuesta (con o sin adjuntos), subiendo, lista lista para aprobar, aplicado («Listo, quedó el ticket 1339 con 3 archivos»), cancelado y error.
  - Un resultado que no es propuesta (por ejemplo, la evidencia por URL ya registrada) se muestra como «Listo», no como error. La genérica de hoy lo trataría como error (`confirmar.js:105-110`).
- **Lista:** nombre, tamaño en KB o MB, vista previa de las imágenes (o ícono, ver S6), avance y «Quitar». Archivo rechazado: mensaje en línea («Este tipo de archivo no se puede adjuntar» / «Pesa 22 MB; el máximo es 15 MB»), sin subirlo, y los demás siguen.
- **Lenguaje y estilo:** español de negocio; colores del sistema de diseño (acento `#5F3FE0`, sin gradientes), claro y oscuro como la genérica.

### D7. Plan B: enlace de un solo uso (solo si el spike lo exige)

- **Enlace:** `https://<Seller>/adjuntar/{enlaceToken}`. Token HS256 con etiqueta `mcp-adjuntos-enlace-v1`: `{ company, actor, sesion, ticketId, exp: 30 min }`.
- **Un solo uso sin colección:** al tocar «Listo» en la página se crea el objeto marcador `pendientes/{empresa}/{sesion}/_cerrada`. Con el marcador, el enlace responde «Este enlace ya se usó». Aprobar el ticket también consume la sesión.
- **Backend:** rutas nuevas, normales v1 y sin sesión (el token es la llave), con límite de peticiones por IP:
  - `GET /v1/soporte/adjuntos/:token`: empresa, topes y archivos de la sesión;
  - `POST /v1/soporte/adjuntos/:token/permiso`: misma validación que `prepare_support_attachment_upload`;
  - `DELETE /v1/soporte/adjuntos/:token/:n`;
  - `POST /v1/soporte/adjuntos/:token/listo`.
- **Front:** ruta pública `adjuntar/:token` como `encuesta/:ref` (`app-routing.module.ts`), componente standalone OnPush con `<app-publica-marco>` y `@include publica-piezas` (D-398). Servicio `shared/services/soporte/adjuntos-publicos.service.ts extends BaseService`.
- **CORS:** el bucket acepta además el origen del Seller.
- En la tarjeta, el botón usa `ui/open-link` si S7 pasa; si no, muestra el enlace para copiar. Después de subir, «Ya los subí» vuelve a pedir la propuesta con la lista.

### D8. Interruptor global

- `config/feature_flags.mcpAdjuntosTickets === true` enciende la sesión de adjuntos en las propuestas, las herramientas de la tarjeta, el límite nuevo de base64 y el plan B. Ausente o `false`: todo como hoy. Es para todos, sin bandera por empresa (decisión 4).
- 1 lectura por llamada de herramienta, sin caché (regla del proyecto).
- **Corte:** ponerlo en `false` desde la consola o con un script con simulación. Las sesiones a medio camino reciben «Adjuntar archivos no está disponible en este momento» y la limpieza sigue corriendo.
- **Dueño:** Daniel. **Retiro:** 2027-04-30, encendido sin vuelta atrás o eliminado (Artículo XII).

### D9. Seguridad y datos personales

- El permiso de subida dura 15 minutos, sirve para un archivo y queda atado a la empresa y a la sesión, con el tope de tamaño firmado.
- Al registrar, el servidor revisa tipo, tamaño y ubicación con los metadatos del almacenamiento.
- Una ruta fuera de la sesión, o una sesión de otra empresa, se rechaza: «Ese archivo no es de esta solicitud».
- **Logs** (lista cerrada, patrón de `services/orders/historialPedido/log.js`): `soporte.adjuntos.{permiso, subido, propuesta, aprobado, descartado, limpieza}` con `{ company, sesion, ticketId, extension, bytes, resultado, codigoError, duracionMs }`. Nunca el nombre del archivo (puede traer un nombre o una cédula), ni el contenido, ni los tokens.

### D10. Base64 con límite

- **Límite: 50 KB decodificados** (lo que sugiere el ticket). Cubre un ícono o un recorte pequeño; todo lo demás va por la tarjeta o por la subida firmada.
- Con el interruptor encendido, más de 50 KB se rechaza sin escribir nada:
  - con tarjeta: «El archivo pesa 300 KB y por este camino el máximo es 50 KB. Pídele a la persona que lo adjunte en la tarjeta.»;
  - sin tarjeta (Codex): el mensaje recomienda `get_support_evidence_upload_url`.
- La descripción de la herramienta y `docs/MCP/COMO_CONECTARSE.md` dicen el límite y documentan la alternativa de que el administrador de Claude habilite el dominio del almacenamiento, sin depender de ella.

### D11. Write-set

- **Almacenamiento:** `tickets/subidas/pendientes/**` (crear con URL firmada, borrar) y `tickets/subidas/{ticketId}/**` (copiar).
- **Firestore:** `support/{id}` con `create()` (F1) o `arrayUnion` en `adjuntos` (F2). Nada más.
- Sin colecciones nuevas, sin endpoints «v2», sin tocar el chat de Opttia (`executeIntegrated`) ni los avisos.
- Una prueba de contrato con base de datos y almacenamiento falsos lo fija (tarea 2.7).

## Contratos

| Herramienta / ruta | Entrada | Salida | Errores (en español de negocio) |
|---|---|---|---|
| `create_support_ticket` (sin comprobante) | `asunto`, `descripcion`, opcional `adjuntosToken` + `adjuntosSubidos[]` | `status: aprobacion_requerida`, `cambios` (con una fila por archivo), `comprobante`, `argumentos`, `adjuntos { token, tipos, topes, maximo }` | archivo fuera de la sesión, tipo o tamaño no permitidos, sesión vencida |
| `create_support_ticket` (con comprobante) | lo mismo + `comprobante` | `status: abierto` o `ya_existia`, `ticket { id, nroTicket }`, `adjuntos: n` | `el_dato_cambio` si la lista cambió |
| `add_support_ticket_evidence` (sin fuente, F2) | `id` | propuesta con `adjuntos` | ticket ajeno = «no encontrado» |
| `add_support_ticket_evidence` (con comprobante, F2) | `id`, `adjuntosToken`, `adjuntosSubidos[]`, `comprobante` | `status: agregado`, `totalAdjuntos` | igual |
| `prepare_support_attachment_upload` | `adjuntosToken`, `nombreArchivo`, `contentType`, `bytes` | `{ uploadUrl, ruta, encabezados, expiraEn }` | cupo de 10, tipo, tamaño, permiso vencido o de otra empresa |
| `discard_support_attachments` | `adjuntosToken`, `ruta?` | `{ borrados }` | permiso inválido |
| Plan B: `GET/POST/DELETE /v1/soporte/adjuntos/:token…` | token en la ruta | ver D7 | 404 si el token no vale; 410 si ya se usó o venció |

## Pruebas

| Repo | Archivo | Qué fija |
|---|---|---|
| Back | `tests/support/adjuntos/token.test.js` | Firma y verificación del permiso: empresa, actor, sesión, vencimiento, otra etiqueta, sin llave = cerrado |
| Back | `tests/support/adjuntos/prepararSubida.contract.test.js` | Esquema; encabezados firmados (`x-goog-content-length-range`, `x-goog-meta-company` de la credencial, nunca de los parámetros); cupo; tipos; interruptor apagado |
| Back | `tests/support/adjuntos/crearConAdjuntos.contract.test.js` | Propuesta sin escrituras; huella con la lista; lista cambiada = rechazo; metadatos del almacenamiento mandan; copia y URL deterministas; doble aprobación = un ticket y un juego de evidencias |
| Back | `tests/support/adjuntos/evidenciaExistente.contract.test.js` | F2: ticket ajeno = no encontrado sin tarjeta; `arrayUnion`; las tres fuentes de hoy idénticas |
| Back | `tests/support/adjuntos/base64.test.js` | 50 KB pasa, 50 KB + 1 se rechaza con el mensaje; apagado = como hoy |
| Back | `tests/support/adjuntos/limpieza.test.js` | Borra solo lo de más de 24 h y solo bajo `pendientes/` |
| Back | `tests/support/adjuntos/writeset.contract.test.js` | Solo `support` (create o arrayUnion) y las rutas de almacenamiento de D11 |
| Back | `tests/mcp/puentePantallas.test.js` (existente) y `build.js --check` | La pantalla nueva compila y la genérica no cambia |
| Front (solo plan B) | `tests/soporte/adjuntos-publicos.util.test.js` | Validación local de tipo y tamaño, formato de tamaño |

## Risks / Trade-offs

- **El host cambia su comportamiento** (selector, CSP, origen). Mitigación: el spike deja la evidencia, el plan B queda diseñado y el interruptor apaga todo sin desplegar.
- **CORS de todo el bucket.** Abrir un origen permite que una página de ese origen haga `PUT` solo con una URL firmada válida; la firma sigue siendo la llave. Se publica la unión exacta, nunca `*`.
- **El comprobante y el permiso los ve el modelo** (contrato de hoy). No puede subir archivos ni aprobar en la tarjeta; queda como riesgo aceptado y documentado.
- **D-545 en curso** sobre los mismos archivos. Las tareas 5.x esperan a que D-545 esté commiteado y se coordinan con esa sesión.
- **Huérfanos** si la limpieza se cae: el latido avisa y lo pendiente se puede borrar a mano por prefijo.
- **Costo:** una lectura de `config/feature_flags` por llamada y una lectura de metadatos por archivo al proponer. Bajo.
- **Base64:** un cliente sin tarjetas que hoy manda 1 MB en base64 recibe el mensaje y debe usar la subida firmada. Es un camino que ya existe.

## Migration Plan

1. Spike (tarea 1) y su aprobación.
2. Backend con el interruptor ausente (= apagado): herramientas, tarjeta compilada, limpieza. Commit y push antes de desplegar; `git pull` y reinicio según el manual. Sin efecto visible.
3. CORS del bucket: lectura, unión, aprobación y publicación.
4. Prueba en Claude web y escritorio con una cuenta de Julsmind sobre un ticket de prueba de FLORECER (crear con 3 archivos, cancelar, dejar vencer, agregar a uno existente).
5. Encender `config/feature_flags.mcpAdjuntosTickets = true`. Observar 5 días hábiles: subidas fallidas, huérfanos limpiados, ningún ticket duplicado.
6. **Revertir:** el interruptor en `false`. Si hace falta, revertir los commits. Las evidencias ya registradas quedan como cualquier otra.
7. **Retiro (2027-04-30):** se quita el interruptor y su rama apagada.

## Open Questions

1. **¿Quién hace el spike en Claude web y escritorio?** Hace falta una persona que conecte el conector de prueba (túnel) en las dos versiones y tome las capturas. Recomendado: Daniel o Santiago, 30 minutos.
2. **Si el origen de la tarjeta en Claude cambia por conversación** (subdominio aleatorio) y el bucket no puede listarlo, ¿se pasa al plan B en vez de abrir el CORS con comodín? Recomendado: sí, plan B. Nunca `*`.
