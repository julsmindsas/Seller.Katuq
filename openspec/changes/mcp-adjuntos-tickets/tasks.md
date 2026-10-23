> **Estado:** TAREAS, **pendientes de aprobación**. D-549, ticket 1339. F1 y F2 juntas. Backend en `katuq_admin_back_firebase/functions`; el front solo se toca si el spike pide el plan B. Cada tarea de código cierra con `node --check` de los archivos tocados y sus pruebas en verde; no se avanza con el build roto. Leer los archivos antes de editarlos. Nunca `git add -A`: hay sesiones en paralelo.

## 0. Checkpoints

- [x] 0.1 Propuesta y spec aprobadas por Daniel (23-oct), con las 4 respuestas recomendadas.
- [ ] 0.2 Aprobación de `design.md`.
  - **Hecho cuando:** Daniel aprueba y responde las 2 Open Questions; las respuestas quedan en `design.md`.
- [ ] 0.3 Aprobación de este `tasks.md`.
  - **Hecho cuando:** Daniel lo aprueba por escrito.

## 1. Spike: ¿la tarjeta puede elegir y subir archivos? (primera tarea, sin código de producto)

- [ ] 1.1 Armar el servidor MCP desechable del spike en `functions/scripts/spikes/mcp-adjuntos/`: una herramienta que abre una tarjeta mínima (botón de archivo, zona para soltar, vista previa, `PUT` con avance, botón `ui/open-link`) y un endpoint que recibe el `PUT` y anota el `Origin`. Sin enganche en `index.js` ni en `toolRegistry`.
  - **Depende de:** 0.3.
  - **Hecho cuando:** corre local, `node --check` limpio, y `grep` confirma que nada de producción lo requiere.
- [ ] 1.2 Exponerlo con un túnel HTTPS temporal y conectarlo como conector personalizado en Claude web y en Claude escritorio (persona de la Open Question 1).
  - **Depende de:** 1.1.
  - **Hecho cuando:** la tarjeta se ve en los dos clientes.
- [ ] 1.3 Correr S1 a S8 de `design.md` D1 en los dos clientes y escribir `spike.md` en este cambio: resultado por pregunta y cliente, `Origin` medido, capturas, y la decisión (plan A, B o ambos).
  - **Depende de:** 1.2.
  - **Hecho cuando:** `spike.md` tiene las 16 casillas (8 × 2) con evidencia y la decisión propuesta.
- [ ] 1.4 Aprobación de la decisión del spike por Daniel; apagar el túnel y borrar el servidor desechable.
  - **Depende de:** 1.3.
  - **Hecho cuando:** la decisión aprobada queda en `spike.md` y en la bitácora de `specs/CONTRACT.md`, y el túnel ya no responde.

## 2. Pruebas primero (Artículo VIII; deben fallar por la razón esperada)

- [ ] 2.1 [P] `tests/support/adjuntos/token.test.js`: permiso firmado (empresa, actor, sesión, ticket, vencimiento de 60 min, etiqueta propia, sin llave = cerrado).
  - **Depende de:** 1.4.
  - **Hecho cuando:** falla con `Cannot find module` del codec.
- [ ] 2.2 [P] `tests/support/adjuntos/prepararSubida.contract.test.js`: esquema cerrado; encabezados firmados `x-goog-content-length-range` con el tope del tipo y `x-goog-meta-company` de la credencial (nunca de los parámetros); cupo de 10; tipo no permitido; permiso de otra empresa; interruptor apagado = «no disponible».
  - **Depende de:** 1.4.
  - **Hecho cuando:** falla porque la herramienta no existe.
- [ ] 2.3 [P] `tests/support/adjuntos/crearConAdjuntos.contract.test.js`: propuesta sin escrituras; una fila por archivo en la huella; lista cambiada = `el_dato_cambio`; tipo y tamaño salen de los metadatos del almacenamiento falso; copia y URL deterministas; doble aprobación = un ticket y un juego de evidencias; ruta fuera de la sesión = rechazo.
  - **Depende de:** 1.4.
  - **Hecho cuando:** falla por la razón esperada (no hay `adjuntos` en la propuesta).
- [ ] 2.4 [P] `tests/support/adjuntos/evidenciaExistente.contract.test.js`: F2 con ticket propio y ajeno (ajeno = mismo mensaje que «no encontrado», sin tarjeta); `arrayUnion`; las tres fuentes de hoy dan exactamente el resultado de hoy.
  - **Depende de:** 1.4.
  - **Hecho cuando:** los casos nuevos fallan y los de las fuentes de hoy pasan.
- [ ] 2.5 [P] `tests/support/adjuntos/base64.test.js`: 50 KB pasa; 50 KB + 1 byte se rechaza con el mensaje que nombra la tarjeta o la subida firmada; con el interruptor apagado, igual que hoy.
  - **Depende de:** 1.4.
  - **Hecho cuando:** el caso de 50 KB + 1 falla porque hoy se acepta.
- [ ] 2.6 [P] `tests/support/adjuntos/limpieza.test.js`: borra solo objetos de más de 24 h bajo `tickets/subidas/pendientes/`; pagina de a 500; deja latido; una falla no tumba el trabajo.
  - **Depende de:** 1.4.
  - **Hecho cuando:** falla porque el trabajo no existe.
- [ ] 2.7 [P] `tests/support/adjuntos/writeset.contract.test.js`: con base de datos y almacenamiento falsos, las herramientas solo hacen `support.create`, `support.update(arrayUnion adjuntos)` y las operaciones de almacenamiento de D11; ninguna otra colección.
  - **Depende de:** 1.4.
  - **Hecho cuando:** falla porque los módulos no existen.
- [ ] 2.8 Script `test:soporte-adjuntos` en `package.json` que corre 2.1 a 2.7.
  - **Depende de:** 2.1–2.7.
  - **Hecho cuando:** `npm run test:soporte-adjuntos` corre y muestra los rojos esperados.

## 3. Backend: la sesión de adjuntos

- [ ] 3.1 `services/soporte/adjuntos/token.js` (codec HS256, etiqueta `mcp-adjuntos-v1`) y `constantes.js` (prefijo, cupo, TTL; tipos y topes importados de `tools/_evidenciaFuentes.js`).
  - **Depende de:** 2.1.
  - **Hecho cuando:** 2.1 en verde.
- [ ] 3.2 `services/soporte/adjuntos/interruptor.js`: lee `config/feature_flags.mcpAdjuntosTickets`; solo `true` enciende; error = apagado.
  - **Depende de:** 2.2.
  - **Hecho cuando:** sus casos en 2.2 pasan.
- [ ] 3.3 `services/soporte/adjuntos/sesion.js`: rutas de la sesión, verificación de que una ruta es de la sesión, lectura de metadatos y validación con ellos, filas de `cambios` por archivo.
  - **Depende de:** 3.1.
  - **Hecho cuando:** los casos de sesión de 2.3 pasan.
- [ ] 3.4 `services/soporte/adjuntos/log.js`: lista cerrada de campos de D9, sin nombres de archivo.
  - **Depende de:** 3.1.
  - **Hecho cuando:** una prueba confirma que un nombre con «@» o una cédula no aparecen en el registro.
- [ ] 3.5 `tools/prepareSupportAttachmentUpload.js` y `tools/discardSupportAttachments.js`, registrados en `tools/toolRegistry.js` con `ESCRITURA`, módulo `['soporte', 'misTickets']` y, si S8 pasó, `_meta.ui.visibility: ["app"]`.
  - **Depende de:** 3.2, 3.3.
  - **Hecho cuando:** 2.2 en verde y la prueba del registro (`tests/mcp/*`) sigue en verde.
- [ ] 3.6 `services/soporte/adjuntos/limpieza.js` y su programación horaria en `services/cronService.js`, con latido.
  - **Depende de:** 2.6.
  - **Hecho cuando:** 2.6 en verde; el trabajo aparece en el monitor de trabajos programados con su latido.

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
- [ ] 5.2 `tools/createSupportTicket.js` (solo la rama MCP genérica; no tocar `executeIntegrated`): `adjuntos` en la propuesta, re-propuesta con `adjuntosSubidos`, aprobación con copia determinista, creación idempotente y borrado de la sesión; `uiResource` pasa a la tarjeta de soporte.
  - **Depende de:** 3.3, 4.3, 5.1.
  - **Hecho cuando:** 2.3 en verde y las pruebas existentes de `create_support_ticket` (incluidas las de D-545) siguen en verde.
- [ ] 5.3 `tools/addSupportTicketEvidence.js`: sin fuente y con el interruptor encendido devuelve la propuesta de F2; aprobación con copia y `arrayUnion`; las tres fuentes de hoy sin cambios; `uiResource` a la tarjeta de soporte.
  - **Depende de:** 5.2.
  - **Hecho cuando:** 2.4 en verde.
- [ ] 5.4 Límite de base64 de 50 KB con el interruptor encendido, y descripciones de `add_support_ticket_evidence` y `get_support_evidence_upload_url` actualizadas.
  - **Depende de:** 3.2.
  - **Hecho cuando:** 2.5 en verde.
- [ ] 5.5 Contrato del write-set y suite completa.
  - **Depende de:** 5.2, 5.3, 5.4, 3.6.
  - **Hecho cuando:** 2.7 en verde y `npm run test:soporte-adjuntos` da 0 fallas.

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
  - **Depende de:** 5.5, 7.3, 8.1 (y 6.x si aplica).
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
