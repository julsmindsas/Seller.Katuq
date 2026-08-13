# Tareas — bot fase 2

## 1. Frente A — conversación robusta

- [ ] 1.1 Ráfagas: buffer por phoneHash en el webhook (ventana 4 s, máx 10 s),
      turno único con textos concatenados, sellos de idempotencia de todos
      los ids agrupados. Tests: ráfaga de 3 = 1 turno + 3 sellos; mensaje
      suelto = sin latencia extra de reintento; restart en ventana no duplica.
- [ ] 1.2 Medios: gate de tipo pasa a aviso cortés una vez por sesión
      (`avisoMediosAt` en la sesión), cobrado; repeticiones mudas. Tests.
- [ ] 1.3 `kapsoService.sendImage` (formato Meta tipo image con link+caption,
      credenciales por comercio, mock-mode). Test de forma del payload.
- [ ] 1.4 ADK: herramienta local `mostrar_producto(productoId)` que anota en
      el estado del turno; el endpoint devuelve `productoMostrado`. Tests ADK.
- [ ] 1.5 Backend: si hay `productoMostrado` con imagen pública (resolver URL
      con el mismo criterio del CDN de Cereza), enviar imagen con caption
      ≤1024; degradar a texto. Un solo cobro. Tests.
- [ ] 1.6 Contexto `ultimosPedidos` (hasta 3: número, estado humano, fecha)
      en el despachador + instrucciones de estado de pedido en ADK. Tests de
      que el teléfono crudo sigue sin viajar.
- [ ] 1.7 Instrucciones: dirección y ciudad confirmadas antes del cierre,
      resumen de carrito con formato fijo, despedida. Tests de instrucciones.

## 2. Frente B — número propio en autoservicio

- [ ] 2.1 `kapsoService.verifyOwnCredentials(company|creds)` → info del
      número; mapeo de errores a causas humanas. Tests.
- [ ] 2.2 Endpoint `POST /v1/whatsapp/own-credentials/verify` (auth +
      permisos de config): verifica, persiste `verifiedAt` + número/nombre.
      Nunca devuelve la API key. Tests.
- [ ] 2.3 Endpoint de salud: último inbound del comercio (colección
      existente, límite 1). Puede ir en el publicView actual.
- [ ] 2.4 Endpoint mensaje de prueba (reusa camino de salida; causa "ventana
      24h" mapeada). Tests.
- [ ] 2.5 Frontend: asistente de conexión en la pantalla de WhatsApp — pasos,
      validación de campos, botón Probar conexión, estado visible (número
      verificado, último entrante), mensaje de prueba. Sacar las credenciales
      de "avanzado" al flujo principal.
- [ ] 2.6 Frontend: la tarjeta del bot se reordena alrededor del estado de
      conexión (conectar → sombra → abrir). Mensajería de la puerta
      BOT_REQUIERE_NUMERO_PROPIO alineada.
- [ ] 2.7 Conectar el número propio de ALMARA (trámite con credenciales
      reales) y vaciar `WHATSAPP_BOT_PILOT_*`. Verificar bot vivo por el
      camino oficial. — dueño: Daniel + sesión de despliegue.

## 3. Cierre

- [ ] 3.1 Suites del bot en verde + build Angular sin errores.
- [ ] 3.2 Calibrar la ventana de ráfaga con tráfico real del piloto.
- [ ] 3.3 Actualizar CONTRACT.md (decisión de cobro de foto+texto y ventana
      elegida) y la memoria del bot.
