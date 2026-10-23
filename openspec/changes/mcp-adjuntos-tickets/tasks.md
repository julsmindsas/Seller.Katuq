> **Estado (23-oct, tarde):** TAREAS. **Daniel decidió el 2026-10-23 saltarse el spike humano e ir directo al PLAN B** (enlace de un solo uso a una página de Katuq; nunca CORS con comodín). El backend y el front del plan B están hechos y en verde, **sin commit, sin CORS del bucket y sin desplegar**; el interruptor `config/feature_flags.mcpAdjuntosTickets` sigue ausente (apagado). La aprobación del 23-oct llegó por encargo y **aún no consta por escrito** en `specs/CONTRACT.md` (0.2 y 0.3 abiertas). La suite `tests/support/adjuntos/` está en verde **salvo `montaje.test.js`, que falla a propósito** hasta que se monte el router y se exente el enlace de los registros globales (6.2b, bloqueo de 8.2; `index.js`, `usageTracker.js` e `instrument.js` son de otras sesiones). D-549, ticket 1339. F1 y F2 juntas. Backend en `katuq_admin_back_firebase/functions`; front (plan B) en `Seller.Katuq`. Cada tarea de código cierra con `node --check` de los archivos tocados y sus pruebas en verde; no se avanza con el build roto. Leer los archivos antes de editarlos. Nunca `git add -A`: hay sesiones en paralelo.

## 0. Checkpoints

- [x] 0.1 Propuesta y spec aprobadas por Daniel (23-oct), con las 4 respuestas recomendadas.
- [ ] 0.2 Aprobación de `design.md`.
  - **Hecho cuando:** Daniel aprueba y responde las 2 Open Questions; las respuestas quedan en `design.md`.
  - **Resultado (23-oct):** Daniel aprobó el diseño el 23-oct (encargo). Las 2 Open Questions siguen sin respuesta escrita en `design.md`: se asumen las recomendadas (quién hace el spike: Daniel o Santiago; origen variable: plan B, nunca `*`). Falta que Daniel las confirme. **Revisión (23-oct):** se reabre; las respuestas asumidas quedaron escritas en `design.md` («Respuestas asumidas»), pero siguen sin confirmación escrita. **Cierre parcial (23-oct, tarde):** Daniel decidió plan B directo, que responde la pregunta 1 (no hay quién haga el spike) y aplica la 2 (nunca `*`); sigue faltando la constancia en `CONTRACT.md`.
- [ ] 0.3 Aprobación de este `tasks.md`.
  - **Hecho cuando:** Daniel lo aprueba por escrito.
  - **Resultado (23-oct):** el encargo del 23-oct dice que Daniel aprobó `tasks.md`, pero no hay constancia en el repo (`specs/CONTRACT.md` D-549 solo registra la propuesta). **Pendiente:** registrar la cita y la fecha en `CONTRACT.md` (este cambio no puede editarlo) y cerrar 0.2 y 0.3.

## 1. Spike: ¿la tarjeta puede elegir y subir archivos? — NO APLICA (Daniel, 2026-10-23: plan B directo)

> Daniel decidió no hacer el spike humano: la tarjeta NO sube nada; ofrece un enlace de un solo uso a una página de Katuq (design D7). Por eso S1-S8 no se corren y no hay `spike.md`. Consecuencias: la pantalla nueva conserva `connectDomains: []` (no habla con ningún dominio), `_meta.ui.visibility: ["app"]` de 3.5 y los pasos 7.x del origen de la tarjeta no aplican, y 7.2 solo lleva el origen del Seller.

- [x] 1.1 Armar el servidor MCP desechable del spike (hecha el 23-oct y **retirada**: ver 1.4; el spike ya no aplica).
  - **Depende de:** 0.3.
  - **Hecho cuando:** corre local, `node --check` limpio, y `grep` confirma que nada de producción lo requiere.
  - **Resultado (23-oct):** Servidor MCP desechable en `functions/scripts/spikes/mcp-adjuntos/` (`server.js`, `tarjeta.html`, `README.md` con los pasos exactos). Probado en local: `tools/list`, tarjeta con CSP, OPTIONS/PUT con CORS de un solo origen exacto y registro del `Origin`; `node --check` limpio y sin enganche en `index.js` ni `toolRegistry`. No se abrió ningún túnel.
- [x] 1.2 **No aplica (Daniel 2026-10-23: plan B directo).** ~~Exponerlo con un túnel HTTPS temporal y conectarlo como conector personalizado en Claude web y en Claude escritorio (persona de la Open Question 1).
  - **Depende de:** 1.1.
  - **Hecho cuando:** la tarjeta se ve en los dos clientes.~~
  - **Resultado (23-oct):** no aplica (Daniel 2026-10-23: plan B directo). Nunca se abrió un túnel.
- [x] 1.3 **No aplica (Daniel 2026-10-23: plan B directo).** ~~Correr S1 a S8 de `design.md` D1 en los dos clientes y escribir `spike.md` en este cambio: resultado por pregunta y cliente, `Origin` medido, capturas, y la decisión (plan A, B o ambos).
  - **Depende de:** 1.2.
  - **Hecho cuando:** `spike.md` tiene las 16 casillas (8 × 2) con evidencia y la decisión propuesta.~~
  - **Resultado (23-oct):** no aplica (Daniel 2026-10-23: plan B directo). La decisión la tomó Daniel: plan B.
- [x] 1.4 **No aplica (Daniel 2026-10-23: plan B directo)** la aprobación del spike; el servidor desechable se borró.
  - **Depende de:** 1.3.
  - **Hecho cuando:** la decisión aprobada queda en `spike.md` y en la bitácora de `specs/CONTRACT.md`, y el túnel ya no responde.
  - **Resultado (23-oct):** `functions/scripts/spikes/mcp-adjuntos/` borrada del árbol de trabajo (3 archivos; nada la referenciaba, `grep` limpio). Queda como borrado sin commit. La decisión (plan B) consta en este archivo; falta anotarla en la bitácora de `specs/CONTRACT.md` (8.5).

## 2. Pruebas primero (Artículo VIII; deben fallar por la razón esperada)

> Nota (23-oct): las tareas 2.x y 3.x marcadas se adelantaron sin esperar a 1.4 por encargo de Daniel: no dependen de la respuesta del spike (sesión, subida firmada, aprobación, limpieza, F2, base64). Lo que decidía el spike (4.x, 6.x, `uiResource` de 5.3, 7.x) se hizo el 23-oct (tarde) por el plan B que decidió Daniel.

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
  - **Resultado (23-oct):** `crearConAdjuntos.contract.test.js`: 8 casos de sesión (A1-A8, en verde con 3.3) y 8 de `create_support_ticket` (B1-B8). B2-B8 estuvieron en ROJO a propósito hasta 5.2. **Cierre (23-oct, tarde):** 16/16 en verde con 5.2 (apuntan a `tools/createSupportTicketConArchivos`, ver 5.2).
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
  - **Resultado (23-oct):** `writeset.contract.test.js`: 5 casos. Verde: preparar/descartar, F2 y los dos estáticos. El de F1 (create) estuvo en ROJO hasta 5.2. **Cierre (23-oct, tarde):** 5/5 en verde; además el estático cubre `createSupportTicketConArchivos.js`.
- [x] 2.8 Script `test:soporte-adjuntos` en `package.json` que corre 2.1 a 2.7.
  - **Depende de:** 2.1–2.7.
  - **Hecho cuando:** `npm run test:soporte-adjuntos` corre y muestra los rojos esperados.
  - **Resultado (23-oct, tarde):** el script ya está en `package.json` (línea 157, commiteado) y `correrTodas.js` toma todos los `*.test.js` de la carpeta: hoy 14 archivos: 13 en verde y `montaje.test.js` en rojo por diseño (suma `idempotenciaTarjeta`, `enlace`, `subidaPublica.contract`, `planB.flujo`, `privacidadRegistro` y `montaje`). No enganchar a CI hasta cerrar 6.2b.

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
  - **Resultado (23-oct):** `services/soporte/adjuntos/sesion.js` (+ `acceso.js`, `solicitud.js`, `error.js`): A1-A8 de 2.3 en verde. Desvío: el md5 va en `campo` de la fila (la huella lo cubre) y no en `despues`, para que la tarjeta no muestre hashes (regla de errores sin jerga). Revisión (23-oct): `rutaEsDeSesion` ya no rechaza nombres con puntos internos («foto..final.png»); `solicitud.aplicar` ya no borra la sesión (nuevas `cerrarSesion` y `yaAplicada`, y `sesion.copiasYaAplicadas`). **Revisión 2 (23-oct):** el destino en el ticket pasa a `tickets/subidas/{ticketId}/{sesion8}_{n}_{nombre}` y `copiarAlTicket` se niega a escribir encima de un archivo de otra sesión (`destino_ocupado`): antes, dos solicitudes F2 sobre el mismo ticket con un archivo del mismo nombre se pisaban y la URL vieja dejaba de servir. Pruebas: A7, A7b y F2 «dos aprobaciones».
- [x] 3.4 `services/soporte/adjuntos/log.js`: lista cerrada de campos de D9, sin nombres de archivo.
  - **Depende de:** 3.1.
  - **Hecho cuando:** una prueba confirma que un nombre con «@» o una cédula no aparecen en el registro.
  - **Resultado (23-oct):** `services/soporte/adjuntos/log.js`: lista cerrada de campos de D9; `log.test.js` 6/6 confirma que un nombre con «@», una cédula, el permiso o la URL firmada no salen.
- [x] 3.5 `tools/prepareSupportAttachmentUpload.js` y `tools/discardSupportAttachments.js`, registrados en `tools/toolRegistry.js` con `ESCRITURA`, módulo `['soporte', 'misTickets']` y, si S8 pasó, `_meta.ui.visibility: ["app"]`.
  - **Depende de:** 3.2, 3.3.
  - **Hecho cuando:** 2.2 en verde y la prueba del registro (`tests/mcp/*`) sigue en verde.
  - **Resultado (23-oct):** `tools/prepareSupportAttachmentUpload.js` y `tools/discardSupportAttachments.js` registradas en `toolRegistry.js` (ESCRITURA, módulo `soporte`/`misTickets`, audiencia `ambas`); 2.2 en verde y el registro carga (65 herramientas). **Cierre (23-oct, tarde):** `_meta.ui.visibility: ["app"]` **no aplica**: dependía de S8 (spike) y con el plan B la tarjeta solo llama a `discard_support_attachments`, y solo desde «Cancelar» (ver 4.2); `prepare_support_attachment_upload` la usa nada más la página, por las rutas de 6.2. Quedan registradas y probadas; **decisión pendiente de Daniel:** retirar `prepare_support_attachment_upload` del registro mientras no se use el plan A (hoy el modelo las ve, con la descripción «uso exclusivo de la tarjeta; NO la llames tú»). La lógica de firma se extrajo a `services/soporte/adjuntos/subida.js` y la usan la herramienta y la página, para que nunca validen distinto.
- [x] 3.6 `services/soporte/adjuntos/limpieza.js` y su programación horaria en `services/cronService.js`, con latido.
  - **Depende de:** 2.6.
  - **Hecho cuando:** 2.6 en verde; el trabajo aparece en el monitor de trabajos programados con su latido.
  - **Resultado (23-oct):** `services/soporte/adjuntos/limpieza.js` y `initAdjuntosSoporteLimpiezaJob` en `services/cronService.js` (cada hora al minuto 17, zona `America/Bogota`, con latido `soporte.adjuntos.limpieza`); 2.6 en verde.

## 4. Backend: la tarjeta de soporte

> Plan B (Daniel, 23-oct): la tarjeta **no elige ni sube archivos**; muestra el ticket, la lista de archivos que quedaron en el servidor y el enlace a la página de Katuq. Por eso no hay vista previa ni «Quitar» en la tarjeta (los tiene la página) y la pantalla conserva `connectDomains: []` como todas.

- [x] 4.1 Extraer a `services/mcp/apps/_comun/propuesta.js` la forma de pintar una propuesta que hoy vive en `confirmar/src/confirmar.js`, sin cambiar el compilado de la genérica. Si D-550 ya lo extrajo, reutilizarlo y saltar esta tarea.
  - **Depende de:** 1.4.
  - **Hecho cuando:** `node services/mcp/apps/build.js --check` pasa sin diferencias en `confirmar/dist/confirmar.html`.
  - **Resultado (23-oct, tarde):** ya lo había extraído D-550 (`_comun/propuesta.js`); se reutiliza. `build.js --check` limpio: la genérica y el tablero no cambiaron. Piezas nuevas: `_comun/adjuntos.js` (funciones puras de los archivos de la propuesta) y `_puente/enlace.js` (`ui/open-link` aparte del puente, para no tocar el compilado de las demás pantallas).
- [x] 4.2 `services/mcp/apps/soporte/src/adjuntar.{html,js,css}`: estados de D6, lista, avance, quitar, rechazo en línea, «Aprobar» deshabilitado mientras sube o si la lista cambió. Agregar la app a `build.js` y compilar.
  - **Depende de:** 4.1, 3.5.
  - **Hecho cuando:** compila, el HTML resultante pesa menos de 60 KB (lección de `puente.js:4-10`) y `build.js --check` pasa.
  - **Resultado (23-oct, tarde):** `soporte/src/adjuntar.{html,js,css}` → `soporte/dist/adjuntar.html` (**20,1 KB**). Pinta la propuesta como la genérica y, si trae `adjuntos`: lista de archivos, «Subir los archivos en Katuq» (`ui/open-link`; si el host no lo soporta muestra el enlace para copiar) y «Ya los subí» (repite la herramienta con el permiso y SIN lista, y pinta la propuesta nueva). Sin comprobante (ticket existente sin archivos) esconde «Aprobar». Si abrió el enlace y aprueba sin tocar «Ya los subí», avisa una vez en la misma tarjeta (sin ventanas del navegador). **Desvío del plan B:** sin vista previa ni «Quitar» en la tarjeta (los tiene la página); registrado en spec y design (enmienda del plan B). **Cancelar (revisión 23-oct):** llama a `discard_support_attachments` con solo el permiso, que borra la sesión y crea el marcador `_cerrada` (el enlace deja de aceptar subidas); si el host no deja llamarla o falla, la tarjeta se cierra igual y dice que se borra sola en 24 horas (cumple decisión 2 y D5). `tests/mcp/tarjetaSoporte.test.js` 14/14; compilado de 20,5 KB.
- [x] 4.3 Registrar `ui://katuq/soporte/adjuntar.html` en `services/mcp/apps/index.js` con `meta.csp.connectDomains: ["https://storage.googleapis.com"]`.
  - **Depende de:** 4.2.
  - **Hecho cuando:** una prueba lee el recurso y confirma ese CSP, y que `ui://katuq/confirmar/cambio.html` sigue con `connectDomains: []`.
  - **Resultado (23-oct, tarde):** registrada como `ADJUNTAR_SOPORTE`. **Desvío del plan B:** la política queda `connectDomains: []` (la tarjeta no sube, no necesita dominio externo); la prueba lo fija y fija que la genérica sigue igual y que `update_product` sigue con la genérica.

## 5. Backend: crear con adjuntos (F1) y ticket existente (F2)

- [x] 5.1 Coordinar con la sesión de D-545 y, ya commiteado su cambio, ampliar `services/soporte/crearTicket.js` para aceptar el id determinista `mcpcard_<64 hex>` por el mismo camino de `create()` de `deps.idempotency`.
  - **Depende de:** D-545 commiteado; 2.3.
  - **Hecho cuando:** las pruebas de D-545 siguen en verde y un caso nuevo prueba que dos creaciones con el mismo id devuelven el mismo ticket.
  - **Resultado (23-oct, tarde):** D-545 ya está commiteado (`aea0ab2d`). `services/soporte/crearTicket.js`: `validateIntent` acepta `^(opttia|mcpcard)_[a-f0-9]{64}$` (una línea y su comentario); mismo `create()` condicional, misma huella de contenido, empresa y autor. `tests/support/adjuntos/idempotenciaTarjeta.test.js` 5/5 (mismo id = mismo ticket, un solo aviso, sin reservar otro número; concurrentes = uno; ids y huellas malos rechazados antes de escribir). Pruebas de D-545 en verde: `opttiaIntent.contract` 12/12, `opttiaSupportMcp` 13/13, `opttiaSupportProposal` 11/11, `opttiaSupportProtocol` 3/3, `opttia-access` 15/15.
- [x] 5.2 `tools/createSupportTicket.js` (solo la rama MCP genérica; no tocar `executeIntegrated`): `adjuntos` en la propuesta, re-propuesta con `adjuntosSubidos`, aprobación con copia determinista, creación idempotente y borrado de la sesión; `uiResource` pasa a la tarjeta de soporte.
  - **Depende de:** 3.3, 4.3, 5.1.
  - **Hecho cuando:** 2.3 en verde y las pruebas existentes de `create_support_ticket` (incluidas las de D-545) siguen en verde.
  - **Resultado (23-oct, tarde):** **Desvío de estructura (por contrato de D-545):** `tests/opttiaSupportMcp.test.js` carga `tools/createSupportTicket.js` en una caja cerrada que solo le deja 5 dependencias (probado: con `crypto` y los módulos de adjuntos fallan sus 13 casos), así que ese archivo **queda intacto** y la lógica nueva vive en `tools/createSupportTicketConArchivos.js`, que lo envuelve (`...base`) y es lo que registra `toolRegistry`. Chat de Opttia (`mcpIntegratedSupport`) y primera propuesta se delegan a la base; con el interruptor encendido la propuesta suma `adjuntos` (permiso, tipos, topes, máximo y el enlace del plan B). Con el permiso: propuesta con una fila por archivo leída del almacenamiento (sin lista = lo que hay en la sesión); aprobar copia a `tickets/subidas/mcpcard_<sha256 del comprobante>/`, crea por `crearTicketSoporte` con `idempotency` y SOLO después cierra la sesión (marcador `_cerrada`); el reintento reconstruye los archivos desde las copias para verificar el mismo comprobante y devuelve `ya_existia`. No busca «ticket igual reciente» en esa rama (el comprobante identifica la aprobación). `uiResource` = tarjeta de soporte. `crearConAdjuntos.contract` 16/16, `writeset.contract` 5/5 (los dos apuntan al nuevo archivo; además `planB.flujo.test.js` 6/6 recorre propuesta → página → «Ya los subí» → aprobar). Las pruebas existentes de `create_support_ticket` (`tests/mcp/createSupportTicket.test.js` 8/8) y las de D-545 siguen en verde.
- [x] 5.3 `tools/addSupportTicketEvidence.js`: sin fuente y con el interruptor encendido devuelve la propuesta de F2; aprobación con copia y `arrayUnion`; las tres fuentes de hoy sin cambios; `uiResource` a la tarjeta de soporte.
  - **Depende de:** 5.2.
  - **Hecho cuando:** 2.4 en verde.
  - **Resultado (23-oct):** `tools/addSupportTicketEvidence.js`: sin fuente y con el interruptor encendido abre la sesión de F2; aprobar copia a `tickets/subidas/{ticketId}/` y agrega con `arrayUnion`; ticket ajeno = «no encontrado» y sin permiso; las tres fuentes de hoy intactas; 2.4 en verde. **Cierre (23-oct, tarde):** `uiResource` = tarjeta de soporte y la propuesta trae el enlace del plan B; sin lista de archivos (`adjuntosSubidos` ausente) toma lo que hay en la sesión y la devuelve en `argumentos` (sin eso la aprobación no cubría la lista exacta: lo cazó `planB.flujo`). Con una fuente de hoy (URL, ruta, base64) el resultado se ve como «Listo» en la misma tarjeta. 2.4 20/20. Revisión (23-oct): el reintento de una aprobación ya aplicada devuelve lo mismo sin escribir, y la sesión se borra después del `update` (hallazgo de revisión, corregido en `services/soporte/adjuntos/solicitud.js` y `tools/addSupportTicketEvidence.js`).
- [x] 5.4 Límite de base64 de 50 KB con el interruptor encendido, y descripciones de `add_support_ticket_evidence` y `get_support_evidence_upload_url` actualizadas.
  - **Depende de:** 3.2.
  - **Hecho cuando:** 2.5 en verde.
  - **Resultado (23-oct):** Límite de 50 KB de base64 con el interruptor encendido y descripciones de `add_support_ticket_evidence` y `get_support_evidence_upload_url` actualizadas; 2.5 en verde. **Aviso de despliegue:** las descripciones nuevas anuncian «abro la tarjeta de adjuntos», que aún no existe (4.2 y 4.3 sin hacer); no desplegarlas antes de que la tarjeta exista.
- [ ] 5.5 Contrato del write-set y suite completa.
  - **Depende de:** 5.2, 5.3, 5.4, 3.6.
  - **Hecho cuando:** 2.7 en verde y `npm run test:soporte-adjuntos` da 0 fallas (exige también 2.8).
  - **Resultado (23-oct, tarde):** `node tests/support/adjuntos/correrTodas.js` → 12/12 archivos en verde en esa fecha (hoy 13 de 14: ver 6.2b); 2.7 5/5. El estático del write-set recorre todos los módulos nuevos (solo `support` y `config`); las rutas públicas no tocan Firestore (solo leen el interruptor). **Reabierta (23-oct, revisión):** el criterio exige 0 fallas y `montaje.test.js` falla a propósito hasta que se cierre 6.2b; las otras 13 pruebas están en verde.

## 6. Plan B (decidido por Daniel el 2026-10-23: es el camino)

- [x] 6.1 Pruebas de contrato de las rutas `/v1/soporte/adjuntos/:token…` (token vencido, usado, de otra empresa; límite por IP; mismas validaciones que 3.5).
  - **Depende de:** 1.4.
  - **Hecho cuando:** fallan porque las rutas no existen.
  - **Resultado (23-oct, tarde):** `tests/support/adjuntos/subidaPublica.contract.test.js` (13 casos, router real en un express efímero con Firestore y almacenamiento falsos) y `enlace.test.js` (10): enlace inválido 404, vencido 410, usado 410, interruptor apagado 404, permiso de la tarjeta no abre el enlace, empresa y sesión salen del enlace (nunca del cuerpo), tipo/tamaño/cupo, quitar solo lo propio, `listo` revisa con metadatos y cierra, dos empresas aisladas, 429 por visitante, nunca 401/403 y registros sin nombres de archivo ni enlace.
- [x] 6.2a Router y controlador de las rutas, con el marcador `_cerrada` como un solo uso.
  - **Depende de:** 6.1, 3.3.
  - **Hecho cuando:** 6.1 en verde.
  - **Resultado (23-oct, tarde):** `services/soporte/adjuntos/enlace.js` (token HS256 `mcp-adjuntos-enlace-v1`, 30 min, sin la persona dentro), `subidaPublica.js` (ver / pedirPermiso / quitar / terminar), `controllers/soporteAdjuntos.js` y `routers/soporteAdjuntos.js` (público: ni `auth` ni el guardia de solo lectura, que vive dentro de `auth`). Un solo uso = marcador `pendientes/{empresa}/{sesion}/_cerrada` (lo crea «Listo», aprobar y descartar la sesión entera). `utils/soporteAdjuntosPrivacy.js` define «petición de adjuntos» para los registros globales (`privacidadRegistro.test.js` 4/4).
- [ ] 6.2b **BLOQUEADA: archivos de otras sesiones.** Montar el router y exentar el enlace de los registros globales.
  - **Depende de:** 6.2a.
  - **Hecho cuando:** `node tests/support/adjuntos/montaje.test.js` pasa (5/5) y, ya montado, una prueba de integración confirma que `GET/POST /v1/soporte/adjuntos/:token…` responde sin pasar por `auth` ni por el guardia de solo lectura y que ningún registro (`apiUsage`, logger legacy, Sentry) guarda el enlace ni el cuerpo.
  - **Pendiente (lo hace quien tenga esos archivos; este cambio no puede editarlos):**
    1. `index.js`, junto a `/v1/nps`: `app.use("/v1/soporte/adjuntos", require("./routers/soporteAdjuntos")); // Subida pública de adjuntos de tickets desde Claude (D-549, plan B)`. Sin esta línea, la página `/adjuntar/:token` recibe 404 en las tres rutas.
    2. `middleware/usageTracker.js`: `const { isAdjuntosPublicRequest } = require('../utils/soporteAdjuntosPrivacy');` y, junto a `isOrderPriceReadOnlyRequest`, `if (isAdjuntosPublicRequest(req)) return next();` (hoy guarda `req.originalUrl` con el enlace en `apiUsage`/SQS).
    3. `index.js`, `skip` de `morganBody`: agregar `|| require("./utils/soporteAdjuntosPrivacy").isAdjuntosPublicRequest(req)` (hoy cualquier 5xx copia URL y cuerpo, con el nombre del archivo, al Slack logger).
    4. `instrument.js`, `beforeSend`: `event = require('./utils/soporteAdjuntosPrivacy').sanitizeAdjuntosEvent(event);` antes del `return` (hoy el evento lleva la URL con el enlace).
- [x] 6.3 En la tarjeta, «Subir los archivos en Katuq» (con `ui/open-link` o enlace para copiar) y «Ya los subí».
  - **Depende de:** 6.2a, 4.2.
  - **Hecho cuando:** compila y `build.js --check` pasa.
  - **Resultado (23-oct, tarde):** hecho dentro de 4.2 (botones, `ui/open-link` con respaldo de enlace para copiar, «Ya los subí»); `build.js --check` limpio.
- [x] 6.4 Front: ruta pública `adjuntar/:token`, componente standalone OnPush con `<app-publica-marco>` y servicio que extiende `BaseService`; estados vacío, subiendo, listo, usado y vencido.
  - **Depende de:** 6.2a.
  - **Hecho cuando:** `npm run build` sin errores, revisión a 1440 y 390 px sin scroll horizontal y sin texto invisible, y el conteo de gradientes y primarios prohibidos no sube.
  - **Resultado (23-oct, tarde):** `src/app/components/adjuntar-publico/` (standalone, OnPush, `<app-publica-marco>` + `@include publica-piezas`), `shared/services/soporte/adjuntos-publicos.{service,models,util}.ts` (el servicio extiende `BaseService`; la subida al almacenamiento va por `XMLHttpRequest`, no por el interceptor, que agregaría encabezados no firmados; de a un archivo porque el servidor numera al dar el permiso). Ruta pública `adjuntar/:token` en `app-routing.module.ts`, y `/adjuntar` agregado a `rutas-publicas.ts` (+ su spec) y a `PUBLIC_ROUTES` de `app.component.ts` (sin loader global ni asistente). Build de producción (`ng build`, salida en el scratchpad, ya borrada) sin errores; `tests/soporte/adjuntos-publicos.util.test.js` 13/13 (util, cableado, 0 gradientes, 0 primarios prohibidos, ninguna clase con «p-»). Revisión en Chrome headless contra la build real con API simulada (nada de producción): 1440 y 390 px, `scrollWidth == clientWidth` en los 4 estados (enlace vencido, enlace usado, vacío/con archivos, terminado); recorrido completo elegir → subir → rechazo del `.exe` → «Listo» sin texto invisible. **Falta** (solo con el back desplegado y el CORS del bucket): probar la subida real al almacenamiento.

## 7. Infraestructura (con aprobación antes de cada escritura)

- [ ] 7.1 Leer el CORS vivo del bucket (solo lectura) y guardarlo en `docs/storage/cors-julsmind-katuq.json`.
  - **Depende de:** 1.4.
  - **Hecho cuando:** el archivo está versionado y coincide con lo leído.
- [ ] 7.2 Preparar la unión (plan B: SOLO el origen del Seller, `https://sellercenter.katuq.com`, más el de pruebas si Daniel lo pide; ya no hay `Origin` de la tarjeta que medir), solo `PUT` y `OPTIONS`, encabezados de D3. Mostrar el diff y pedir aprobación.
  - **Depende de:** 7.1.
  - **Hecho cuando:** Daniel aprueba el diff.
- [ ] 7.3 Publicar el CORS aprobado y verificar con una subida real desde la tarjeta a una sesión de prueba.
  - **Depende de:** 7.2, 5.5.
  - **Hecho cuando:** el `PUT` responde 200 y la configuración leída coincide con la aprobada.

## 8. Documentación, despliegue y verificación

- [x] 8.1 `docs/MCP/COMO_CONECTARSE.md`: adjuntar en la tarjeta, el límite de base64 y la alternativa de habilitar el dominio del almacenamiento en Claude.
  - **Depende de:** 5.4.
  - **Hecho cuando:** el texto está y no menciona nombres internos de campos.
  - **Resultado (23-oct, tarde):** sección «Adjuntar desde la tarjeta» (enlace de un solo uso, «Ya los subí», límite de 50 KB del base64, alternativa de habilitar el dominio del almacenamiento). Sin commit.
- [ ] 8.2 Diff completo revisado (solo los archivos de este cambio), commit y push del backend (y del front si hubo plan B); desplegar con el interruptor ausente.
  - **Depende de:** 4.3, 5.5, 6.2b (montaje y privacidad: sin ellas la página recibe 404 y el enlace queda en los registros), 7.3, 8.1 (y 6.x si aplica).
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
