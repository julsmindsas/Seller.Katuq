# Tareas — bot fase 2

## 1. Frente A — conversación robusta

- [x] 1.1 Ráfagas: buffer por phoneHash en el webhook (ventana 4 s, máx 10 s),
      turno único con textos concatenados, sellos de idempotencia de todos
      los ids agrupados. Tests: ráfaga de 3 = 1 turno + 3 sellos; mensaje
      suelto = sin latencia extra de reintento; restart en ventana no duplica.
- [x] 1.2 Medios: gate de tipo pasa a aviso cortés una vez por sesión
      (`avisoMediosAt` en la sesión), cobrado; repeticiones mudas. Tests.
- [x] 1.3 `kapsoService.sendImage` (formato Meta tipo image con link+caption,
      credenciales por comercio, mock-mode). Test de forma del payload.
- [x] 1.4 ADK: herramienta local `mostrar_producto(productoId)` que anota en
      el estado del turno; el endpoint devuelve `productoMostrado`. Tests ADK.
- [x] 1.5 Backend: si hay `productoMostrado` con imagen pública (resolver URL
      con el mismo criterio del CDN de Cereza), enviar imagen con caption
      ≤1024; degradar a texto. Un solo cobro. Tests.
- [x] 1.6 Contexto `ultimosPedidos` (hasta 3: número, estado humano, fecha)
      en el despachador + instrucciones de estado de pedido en ADK. Tests de
      que el teléfono crudo sigue sin viajar.
- [x] 1.7 Instrucciones: dirección y ciudad confirmadas antes del cierre,
      resumen de carrito con formato fijo, despedida. Tests de instrucciones.

## 2. Frente B — número propio en autoservicio

- [x] 2.1 `kapsoService.verifyOwnCredentials(company|creds)` → info del
      número; mapeo de errores a causas humanas. Tests.
- [x] 2.2 Endpoint `POST /v1/whatsapp/own-credentials/verify` (auth +
      permisos de config): verifica, persiste `verifiedAt` + número/nombre.
      Nunca devuelve la API key. Tests.
- [x] 2.3 Endpoint de salud: último inbound del comercio (colección
      existente, límite 1). Puede ir en el publicView actual.
- [x] 2.4 Endpoint mensaje de prueba (reusa camino de salida; causa "ventana
      24h" mapeada). Tests.
- [x] 2.5 Frontend: asistente de conexión en la pantalla de WhatsApp — pasos,
      validación de campos, botón Probar conexión, estado visible (número
      verificado, último entrante), mensaje de prueba. Sacar las credenciales
      de "avanzado" al flujo principal.
- [x] 2.6 Frontend: la tarjeta del bot se reordena alrededor del estado de
      conexión (conectar → sombra → abrir). Mensajería de la puerta
      BOT_REQUIERE_NUMERO_PROPIO alineada.
- [ ] 2.7 Conectar el número propio de ALMARA (trámite con credenciales
      reales) y vaciar `WHATSAPP_BOT_PILOT_*`. Verificar bot vivo por el
      camino oficial. — dueño: Daniel + sesión de despliegue.
- [x] 2.8 Plantillas con nombre humano: títulos y descripciones en español
      editables por comercio, guardados en la config existente
      (`plantillasMeta` en el doc de integración, sin colecciones nuevas);
      sugerencia inicial generada por KAI (flujo Genkit puntual: nombre +
      cuerpo → título + para-qué); aplicarlo en los TRES selectores (iniciar
      conversación del buzón, paso "Qué dice" de campañas, mensaje de
      prueba) mostrando título + descripción + vista previa, con el nombre
      técnico como detalle secundario. Tests del merge de config y del
      fallback cuando KAI no responde (mostrar nombre técnico "des-feificado":
      guiones fuera, capitalizado).

## 3. Cierre

- [x] 3.1 Suites del bot en verde + build Angular sin errores.
- [ ] 3.2 Calibrar la ventana de ráfaga con tráfico real del piloto.
- [ ] 3.3 Actualizar CONTRACT.md (decisión de cobro de foto+texto y ventana
      elegida) y la memoria del bot.

## 4. Constructor de plantillas (pedido de Daniel 2026-08-13)

- [x] 4.1 Backend `POST /kapso-templates/crear`: valida título/cuerpo/categoría,
      genera nombre técnico (slug comercio + título + sufijo), convierte "nombre
      del cliente" en {{1}} con ejemplo (Meta lo exige), crea vía Kapso formato
      Meta y guarda el título humano en plantillasMeta. Tests del armador de
      payload y del slug.
- [x] 4.2 Listado con estado humano: PENDING/REJECTED visibles con motivo
      (`?all=1` ya existe; sumar motivoRechazo y estadoHumano).
- [x] 4.3 Frontend campañas: tarjeta "Crear mi propio mensaje" en el paso
      "Qué dice" — formulario simple (título, texto, botón insertar nombre del
      cliente), aviso de revisión de Meta, y las plantillas propias en revisión
      listadas con su estado.
