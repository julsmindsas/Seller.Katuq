> **Estado:** TAREAS. La aprobación del 23-oct llegó por encargo y **aún no consta por escrito** en `specs/CONTRACT.md` (0.2 y 0.3 abiertas). La suite `tests/support/adjuntos/` queda **roja a propósito hasta 5.2** (B2-B8 y el caso F1 del write-set). D-549, ticket 1339. F1 y F2 juntas. Backend en `katuq_admin_back_firebase/functions`; el front solo se toca si el spike pide el plan B. Cada tarea de código cierra con `node --check` de los archivos tocados y sus pruebas en verde; no se avanza con el build roto. Leer los archivos antes de editarlos. Nunca `git add -A`: hay sesiones en paralelo.

## 0. Checkpoints

- [x] 0.1 Propuesta y spec aprobadas por Daniel (23-oct), con las 4 respuestas recomendadas.
- [ ] 0.2 Aprobación de `design.md`.
  - **Hecho cuando:** Daniel aprueba y responde las 2 Open Questions; las respuestas quedan en `design.md`.
  - **Resultado (23-oct):** Daniel aprobó el diseño el 23-oct (encargo). Las 2 Open Questions siguen sin respuesta escrita en `design.md`: se asumen las recomendadas (quién hace el spike: Daniel o Santiago; origen variable: plan B, nunca `*`). Falta que Daniel las confirme. **Revisión (23-oct):** se reabre; las respuestas asumidas quedaron escritas en `design.md` («Respuestas asumidas»), pero siguen sin confirmación escrita.
- [ ] 0.3 Aprobación de este `tasks.md`.
  - **Hecho cuando:** Daniel lo aprueba por escrito.
  - **Resultado (23-oct):** el encargo del 23-oct dice que Daniel aprobó `tasks.md`, pero no hay constancia en el repo (`specs/CONTRACT.md` D-549 solo registra la propuesta). **Pendiente:** registrar la cita y la fecha en `CONTRACT.md` (este cambio no puede editarlo) y cerrar 0.2 y 0.3.

## 1. Spike: ¿la tarjeta puede elegir y subir archivos? (primera tarea, sin código de producto)

- [x] 1.1 Armar el servidor MCP desechable del spike en `functions/scripts/spikes/mcp-adjuntos/`: una herramienta que abre una tarjeta mínima (botón de archivo, zona para soltar, vista previa, `PUT` con avance, botón `ui/open-link`) y un endpoint que recibe el `PUT` y anota el `Origin`. Sin enganche en `index.js` ni en `toolRegistry`.
  - **Depende de:** 0.3.
  - **Hecho cuando:** corre local, `node --check` limpio, y `grep` confirma que nada de producción lo requiere.
  - **Resultado (23-oct):** Servidor MCP desechable en `functions/scripts/spikes/mcp-adjuntos/` (`server.js`, `tarjeta.html`, `README.md` con los pasos exactos). Probado en local: `tools/list`, tarjeta con CSP, OPTIONS/PUT con CORS de un solo origen exacto y registro del `Origin`; `node --check` limpio y sin enganche en `index.js` ni `toolRegistry`. No se abrió ningún túnel.
- [ ] 1.2 Exponerlo con un túnel HTTPS temporal y conectarlo como conector personalizado en Claude web y en Claude escritorio (persona de la Open Question 1).
  - **Depende de:** 1.1.
  - **Hecho cuando:** la tarjeta se ve en los dos clientes.
  - **Estado (23-oct):** PENDIENTE: persona del equipo (Daniel o Santiago). Pasos exactos en `functions/scripts/spikes/mcp-adjuntos/README.md`.
- [ ] 1.3 Correr S1 a S8 de `design.md` D1 en los dos clientes y escribir `spike.md` en este cambio: resultado por pregunta y cliente, `Origin` medido, capturas, y la decisión (plan A, B o ambos).
  - **Depende de:** 1.2.
  - **Hecho cuando:** `spike.md` tiene las 16 casillas (8 × 2) con evidencia y la decisión propuesta.
  - **Estado (23-oct):** PENDIENTE: lo corre la misma persona en Claude web y escritorio; el README dice qué capturar de S1-S8.
- [ ] 1.4 Aprobación de la decisión del spike por Daniel; apagar el túnel y borrar el servidor desechable.
  - **Depende de:** 1.3.
  - **Hecho cuando:** la decisión aprobada queda en `spike.md` y en la bitácora de `specs/CONTRACT.md`, y el túnel ya no responde.
  - **Estado (23-oct):** PENDIENTE: aprobación de Daniel; luego apagar el túnel y borrar `functions/scripts/spikes/mcp-adjuntos/`.

## 2. Pruebas primero (Artículo VIII; deben fallar por la razón esperada)

> Nota (23-oct): las tareas 2.x y 3.x marcadas se adelantaron sin esperar a 1.4 por encargo de Daniel: no dependen de la respuesta del spike (sesión, subida firmada, aprobación, limpieza, F2, base64). Lo que sí decide el spike (4.x, 6.x, `visibility` de 3.5, `uiResource` de 5.3, 7.x) quedó sin tocar.

- [x] 2.1 [P] `tests/support/adjuntos/token.test.js`: permiso firmado (empresa, actor, sesión, ticket, vencimiento de 60 min, etiqueta propia, sin llave = cerrado).
  - **Depende de:** 1.4.
  - **Hecho cuando:** falla con `Cannot find module` del codec.
  - **Resultado (23-oct):** `token.test.js`: 12 casos; vio rojo por `Cannot find module` y ahora 12/12.
- [x] 2.2 [P] `tests/support/adjuntos/prepararSubida.contract.test.js`: esquema cerrado; encabezados firmados `x-goog-content-length-range` con el tope del tipo y `x-goog-meta-company` de la credencial (nunca de los parámetros); cupo de 10; tipo no permitido; permiso de otra empresa; interruptor apagado = «no disponible».
  - **Depende de:** 1.4.
  - **Hecho cuando:** falla porque la herramienta no existe.
  - **Resultado (23-oct):** `prepararSubida.contract.test.js`: 14 casos, con el firmador real de `@google-cloud/storage` y llave RSA generada (sin red); vio rojo y ahora 14/14.
- [x] 2.3 [P] `tests/support/adjuntos/crearConAdjuntos.contract.test.js`: propuesta sin escrituras; una fila por archivo en la huella; lista cambiada = `el_dato_cambio`; tipo y tamaño salen de los metadatos del almacenamiento falso; copia y URL deterministas; doble aprobación = un ticket y un juego de evidencias; ruta fuera de la sesión = rechazo.
  - **Depende de:** 1.4.
  - **Hecho cuando:** falla por la razón esperada (no hay `adjuntos` en la propuesta).
  - **Resultado (23-oct):** `crearConAdjuntos.contract.test.js`: 8 casos de sesión (A1-A8, en verde con 3.3) y 8 de `create_support_ticket` (B1-B8). B2-B8 siguen en ROJO a propósito hasta 5.2 (esa tarea toca `tools/createSupportTicket.js`, que este encargo no puede tocar). Se deja [x] porque su «Hecho cuando» es «falla por la razón esperada»; la suite no está completa hasta que 5.2 los ponga en verde.
- [x] 2.4 [P] `tests/support/adjuntos/evidenciaExistente.contract.test.js`: F2 con ticket propio y ajeno (ajeno = mismo mensaje que «no encontrado», sin tarjeta); `arrayUnion`; las tres fuentes de hoy dan exactamente el resultado de hoy.
  - **Depende de:** 1.4.
  - **Hecho cuando:** los casos nuevos fallan y los de las fuentes de hoy pasan.
  - **Resultado (23-oct):** `evidenciaExistente.contract.test.js`: 6 casos de las fuentes de hoy (pasaron antes y después) y 11 de F2; ahora 17/17.
- [x] 2.5 [P] `tests/support/adjuntos/base64.test.js`: 50 KB pasa; 50 KB + 1 byte se rechaza con el mensaje que nombra la tarjeta o la subida firmada; con el interruptor apagado, igual que hoy.
  - **Depende de:** 1.4.
  - **Hecho cuando:** el caso de 50 KB + 1 falla porque hoy se acepta.
  - **Resultado (23-oct):** `base64.test.js`: 7 casos; el de 50 KB + 1 vio rojo (hoy se aceptaba) y ahora 7/7.
- [x] 2.6 [P] `tests/support/adjuntos/limpieza.test.js`: borra solo objetos de más de 24 h bajo `tickets/subidas/pendientes/`; pagina de a 500; deja latido; una falla no tumba el trabajo.
  - **Depende de:** 1.4.
  - **Hecho cuando:** falla porque el trabajo no existe.
  - **Resultado (23-oct):** `limpieza.test.js`: 8 casos (solo bajo `pendientes/`, 24 h, páginas de 500, falla no tumba, latido, sin leer el interruptor); ahora 8/8.
- [x] 2.7 [P] `tests/support/adjuntos/writeset.contract.test.js`: con base de datos y almacenamiento falsos, las herramientas solo hacen `support.create`, `support.update(arrayUnion adjuntos)` y las operaciones de almacenamiento de D11; ninguna otra colección.
  - **Depende de:** 1.4.
  - **Hecho cuando:** falla porque los módulos no existen.
  - **Resultado (23-oct):** `writeset.contract.test.js`: 5 casos. Verde: preparar/descartar, F2 y los dos estáticos. El de F1 (create) sigue en ROJO hasta 5.2 (falla porque falta el cableado de `create_support_ticket`, no porque falten módulos). 2.7 solo queda cerrada del todo cuando ese caso pase; se verifica en 5.5.
- [ ] 2.8 Script `test:soporte-adjuntos` en `package.json` que corre 2.1 a 2.7.
  - **Depende de:** 2.1–2.7.
  - **Hecho cuando:** `npm run test:soporte-adjuntos` corre y muestra los rojos esperados.
  - **Estado (23-oct):** PARCIAL: no hay script en `package.json` (este encargo no lo puede tocar). Línea a agregar: `"test:soporte-adjuntos": "node tests/support/adjuntos/correrTodas.js"`. Mientras tanto corre con `node tests/support/adjuntos/correrTodas.js` (hoy 6/8 archivos en verde; los 2 rojos esperados son los de F1 que cierra 5.2). Mientras no esté 5.2, `correrTodas.js` sale con código 1 a propósito: no engancharlo a CI hasta entonces.

## 3. Backend: la sesión de adjuntos

- [x] 3.1 `services/soporte/adjuntos/token.js` (codec HS256, etiqueta `mcp-adjuntos-v1`) y `constantes.js` (prefijo, cupo, TTL; tipos y topes importados de `tools/_evidenciaFuentes.js`).
  - **Depende de:** 2.1.
  - **Hecho cuando:** 2.1 en verde.
  - **Resultado (23-oct):** `services/soporte/adjuntos/token.js` y `constantes.js`; 2.1 en verde. Tipos y topes salen de `tools/_evidenciaFuentes.js` (se le agregó `TOPE_MB`, `TOPE_MB_MEDIA` y `topeBytesPara`, sin cambiar lo que ya exportaba).
- [x] 3.2 `services/soporte/adjuntos/interruptor.js`: lee `config/feature_flags.mcpAdjuntosTickets`; solo `true` enciende; error = apagado.
  - **Depende de:** 2.2.
  - **Hecho cuando:** sus casos en 2.2 pasan.
  - **Resultado (23-oct):** `services/soporte/adjuntos/interruptor.js`: solo `config/feature_flags.mcpAdjuntosTickets === true` enciende; ausente, otro valor o error = apagado.
- [x] 3.3 `services/soporte/adjuntos/sesion.js`: rutas de la sesión, verificación de que una ruta es de la sesión, lectura de metadatos y validación con ellos, filas de `cambios` por archivo.
  - **Depende de:** 3.1.
  - **Hecho cuando:** los casos de sesión de 2.3 pasan.
  - **Resultado (23-oct):** `services/soporte/adjuntos/sesion.js` (+ `acceso.js`, `solicitud.js`, `error.js`): A1-A8 de 2.3 en verde. Desvío: el md5 va en `campo` de la fila (la huella lo cubre) y no en `despues`, para que la tarjeta no muestre hashes (regla de errores sin jerga). Revisión (23-oct): `rutaEsDeSesion` ya no rechaza nombres con puntos internos («foto..final.png»); `solicitud.aplicar` ya no borra la sesión (nuevas `cerrarSesion` y `yaAplicada`, y `sesion.copiasYaAplicadas`).
- [x] 3.4 `services/soporte/adjuntos/log.js`: lista cerrada de campos de D9, sin nombres de archivo.
  - **Depende de:** 3.1.
  - **Hecho cuando:** una prueba confirma que un nombre con «@» o una cédula no aparecen en el registro.
  - **Resultado (23-oct):** `services/soporte/adjuntos/log.js`: lista cerrada de campos de D9; `log.test.js` 6/6 confirma que un nombre con «@», una cédula, el permiso o la URL firmada no salen.
- [ ] 3.5 `tools/prepareSupportAttachmentUpload.js` y `tools/discardSupportAttachments.js`, registrados en `tools/toolRegistry.js` con `ESCRITURA`, módulo `['soporte', 'misTickets']` y, si S8 pasó, `_meta.ui.visibility: ["app"]`.
  - **Depende de:** 3.2, 3.3.
  - **Hecho cuando:** 2.2 en verde y la prueba del registro (`tests/mcp/*`) sigue en verde.
  - **Resultado (23-oct):** `tools/prepareSupportAttachmentUpload.js` y `tools/discardSupportAttachments.js` registradas en `toolRegistry.js` (ESCRITURA, módulo `soporte`/`misTickets`, audiencia `ambas`); 2.2 en verde y el registro carga (65 herramientas). **Parcial, se deja abierta:** falta SOLO `_meta.ui.visibility: ["app"]`, que depende de S8 (hoy `mcpService.js` solo emite `_meta` si la herramienta tiene pantalla).
- [x] 3.6 `services/soporte/adjuntos/limpieza.js` y su programación horaria en `services/cronService.js`, con latido.
  - **Depende de:** 2.6.
  - **Hecho cuando:** 2.6 en verde; el trabajo aparece en el monitor de trabajos programados con su latido.
  - **Resultado (23-oct):** `services/soporte/adjuntos/limpieza.js` y `initAdjuntosSoporteLimpiezaJob` en `services/cronService.js` (cada hora al minuto 17, zona `America/Bogota`, con latido `soporte.adjuntos.limpieza`); 2.6 en verde.

## 4. Backend: la tarjeta de soporte

- [ ] 4.1 Extraer a `services/mcp/apps/_comun/propuesta.js` la forma de pintar una propuesta que hoy vive en `confirmar/src/confirmar.js`, sin cambiar el compilado de la genérica. Si D-550 ya lo extrajo, reutilizarlo y saltar esta tarea.
  - **Depende de:** 1.4.
  - **Hecho cuando:** `node services/mcp/apps/build.js --check` pasa sin diferencias en `confirmar/dist/confirmar.html`.
- [ ] 4.2 `services/mcp/apps/soporte/src/adjuntar.{html,js,css}`: estados de D6, lista, avance, quitar, rechazo en línea, «Aprobar» deshabilitado mientras sube o si la lista cambió. Agregar la app a `build.js` y compilar.
  - **Depende de:** 4.1, 3.5.
  - **Hecho cuando:** compila, el HTML resultante pesa menos de 60 KB (lección de `puente.js:4-10`) y `build.js --check` pasa.
- [ ] 4.3 Registrar `ui://katuq/soporte/adjuntar.html` en `services/mcp/apps/index.js` con `meta.csp.connectDomains: ["https://storage.googleapis.com"]`.
  - **Depende de:** 4.2.
  - **Hecho cuando:** una prueba lee el recurso y confirma ese CSP, y que `ui://katuq/confirmar/cambio.html` sigue con `connectDomains: []`.

## 5. Backend: crear con adjuntos (F1) y ticket existente (F2)

- [ ] 5.1 Coordinar con la sesión de D-545 y, ya commiteado su cambio, ampliar `services/soporte/crearTicket.js` para aceptar el id determinista `mcpcard_<64 hex>` por el mismo camino de `create()` de `deps.idempotency`.
  - **Depende de:** D-545 commiteado; 2.3.
  - **Hecho cuando:** las pruebas de D-545 siguen en verde y un caso nuevo prueba que dos creaciones con el mismo id devuelven el mismo ticket.
  - **Estado (23-oct):** BLOQUEADA en este encargo: toca `services/soporte/crearTicket.js` (prohibido). D-545 ya está commiteado (`aea0ab2d`), así que puede hacerse ahora por quien tenga permiso.
- [ ] 5.2 `tools/createSupportTicket.js` (solo la rama MCP genérica; no tocar `executeIntegrated`): `adjuntos` en la propuesta, re-propuesta con `adjuntosSubidos`, aprobación con copia determinista, creación idempotente y borrado de la sesión; `uiResource` pasa a la tarjeta de soporte.
  - **Depende de:** 3.3, 4.3, 5.1.
  - **Hecho cuando:** 2.3 en verde y las pruebas existentes de `create_support_ticket` (incluidas las de D-545) siguen en verde.
  - **Estado (23-oct):** BLOQUEADA en este encargo: toca `tools/createSupportTicket.js` (prohibido). La lógica ya está lista en `services/soporte/adjuntos/solicitud.js` y `sesion.js`; queda el cableado, en este orden (design D4): `solicitud.aplicar` (copia), crear el ticket con `create()` de id `mcpcard_<sha256 del comprobante>` y SOLO DESPUÉS `solicitud.cerrarSesion`; en un reintento con la sesión ya borrada, `solicitud.yaAplicada` → `ya_existia`. Cableado (propuesta con `adjuntos`, re-propuesta, aprobación con copia, `create()` con id `mcpcard_<sha256 del comprobante>`). Las pruebas B2-B8 y el caso F1 de 2.7 lo esperan.
- [ ] 5.3 `tools/addSupportTicketEvidence.js`: sin fuente y con el interruptor encendido devuelve la propuesta de F2; aprobación con copia y `arrayUnion`; las tres fuentes de hoy sin cambios; `uiResource` a la tarjeta de soporte.
  - **Depende de:** 5.2.
  - **Hecho cuando:** 2.4 en verde.
  - **Resultado (23-oct):** `tools/addSupportTicketEvidence.js`: sin fuente y con el interruptor encendido abre la sesión de F2; aprobar copia a `tickets/subidas/{ticketId}/` y agrega con `arrayUnion`; ticket ajeno = «no encontrado» y sin permiso; las tres fuentes de hoy intactas; 2.4 en verde. **Parcial, se deja abierta:** falta cambiar `uiResource` a la tarjeta de soporte (depende de 4.3 y de 5.2, que sigue sin hacer). Mientras tanto, con el interruptor encendido la propuesta de F2 se vería en la tarjeta genérica `confirmar/cambio.html`, sin selector de archivos ni `connectDomains`: un camino sin salida. **No encender `mcpAdjuntosTickets` hasta que existan 4.3 y 5.3 completa.** Revisión (23-oct): el reintento de una aprobación ya aplicada devuelve lo mismo sin escribir, y la sesión se borra después del `update` (hallazgo de revisión, corregido en `services/soporte/adjuntos/solicitud.js` y `tools/addSupportTicketEvidence.js`).
- [x] 5.4 Límite de base64 de 50 KB con el interruptor encendido, y descripciones de `add_support_ticket_evidence` y `get_support_evidence_upload_url` actualizadas.
  - **Depende de:** 3.2.
  - **Hecho cuando:** 2.5 en verde.
  - **Resultado (23-oct):** Límite de 50 KB de base64 con el interruptor encendido y descripciones de `add_support_ticket_evidence` y `get_support_evidence_upload_url` actualizadas; 2.5 en verde. **Aviso de despliegue:** las descripciones nuevas anuncian «abro la tarjeta de adjuntos», que aún no existe (4.2 y 4.3 sin hacer); no desplegarlas antes de que la tarjeta exista.
- [ ] 5.5 Contrato del write-set y suite completa.
  - **Depende de:** 5.2, 5.3, 5.4, 3.6.
  - **Hecho cuando:** 2.7 en verde y `npm run test:soporte-adjuntos` da 0 fallas (exige también 2.8).

## 6. Plan B (solo si la decisión 1.4 lo pide; si no, se marcan «no aplica»)

- [ ] 6.1 Pruebas de contrato de las rutas `/v1/soporte/adjuntos/:token…` (token vencido, usado, de otra empresa; límite por IP; mismas validaciones que 3.5).
  - **Depende de:** 1.4.
  - **Hecho cuando:** fallan porque las rutas no existen.
- [ ] 6.2 Router y controlador de las rutas, con el marcador `_cerrada` como un solo uso.
  - **Depende de:** 6.1, 3.3.
  - **Hecho cuando:** 6.1 en verde.
- [ ] 6.3 En la tarjeta, «Subir los archivos en Katuq» (con `ui/open-link` o enlace para copiar) y «Ya los subí».
  - **Depende de:** 6.2, 4.2.
  - **Hecho cuando:** compila y `build.js --check` pasa.
- [ ] 6.4 Front: ruta pública `adjuntar/:token`, componente standalone OnPush con `<app-publica-marco>` y servicio que extiende `BaseService`; estados vacío, subiendo, listo, usado y vencido.
  - **Depende de:** 6.2.
  - **Hecho cuando:** `npm run build` sin errores, revisión a 1440 y 390 px sin scroll horizontal y sin texto invisible, y el conteo de gradientes y primarios prohibidos no sube.

## 7. Infraestructura (con aprobación antes de cada escritura)

- [ ] 7.1 Leer el CORS vivo del bucket (solo lectura) y guardarlo en `docs/storage/cors-julsmind-katuq.json`.
  - **Depende de:** 1.4.
  - **Hecho cuando:** el archivo está versionado y coincide con lo leído.
- [ ] 7.2 Preparar la unión: el `Origin` medido en S4 (y el del Seller si hay plan B), solo `PUT` y `OPTIONS`, encabezados de D3. Mostrar el diff y pedir aprobación.
  - **Depende de:** 7.1.
  - **Hecho cuando:** Daniel aprueba el diff.
- [ ] 7.3 Publicar el CORS aprobado y verificar con una subida real desde la tarjeta a una sesión de prueba.
  - **Depende de:** 7.2, 5.5.
  - **Hecho cuando:** el `PUT` responde 200 y la configuración leída coincide con la aprobada.

## 8. Documentación, despliegue y verificación

- [ ] 8.1 `docs/MCP/COMO_CONECTARSE.md`: adjuntar en la tarjeta, el límite de base64 y la alternativa de habilitar el dominio del almacenamiento en Claude.
  - **Depende de:** 5.4.
  - **Hecho cuando:** el texto está y no menciona nombres internos de campos.
- [ ] 8.2 Diff completo revisado (solo los archivos de este cambio), commit y push del backend (y del front si hubo plan B); desplegar con el interruptor ausente.
  - **Depende de:** 4.3, 5.5, 7.3, 8.1 (y 6.x si aplica).
  - **Hecho cuando:** producción corre la versión y una propuesta de ticket sale sin `adjuntos`.
- [ ] 8.3 Prueba en Claude web y escritorio con un ticket de prueba de FLORECER, con `config/feature_flags.mcpAdjuntosTickets = true` solo durante la prueba: crear con 3 archivos (PDF y dos imágenes), quitar uno, cancelar otra tarjeta, agregar 2 a un ticket existente y repetir la aprobación.
  - **Depende de:** 8.2.
  - **Hecho cuando:** el ticket tiene exactamente los archivos aprobados y se ven en la app de Support; la tarjeta cancelada no dejó evidencia; no hay ticket doble.
- [ ] 8.4 Encender el interruptor para todos y observar 5 días hábiles.
  - **Depende de:** 8.3 y OK de Daniel.
  - **Hecho cuando:** 0 tickets duplicados, 0 archivos pendientes de más de 48 h y ninguna subida fallida sin explicar en los registros.
- [ ] 8.5 Bitácora en `specs/CONTRACT.md` (D-549: spike, despliegue, encendido) y nota en el ticket 1339 cuando corresponda.
  - **Depende de:** 8.4.
  - **Hecho cuando:** la entrada está con commits y fechas.
- [ ] 8.6 Retiro del interruptor (Artículo XII, 2027-04-30): encendido sin vuelta atrás o eliminado, con su rama apagada.
  - **Depende de:** 8.4.
  - **Hecho cuando:** no queda lectura de `mcpAdjuntosTickets` en el código.
