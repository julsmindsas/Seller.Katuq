## Decisiones

**1. Un número solo de soporte (recomendado).** El webhook rutea por `metadata.phone_number_id`. Un número nuevo (`WHATSAPP_SUPPORT_PHONE_NUMBER_ID`) deja el enrutamiento limpio: todo lo que llegue ahí es soporte y se salta el reparto por empresa (D-094/D-116). Usar el número de Julsmind compartido (`KAPSO_PHONE_NUMBER_ID`) obliga a decidir mensaje por mensaje si es soporte o respuesta a una campaña de otra empresa, y un error rompe el reparto. Si Daniel prefiere ese número, el soporte solo se activa para celulares reconocidos como usuarios y sin salida reciente de otra empresa. Requiere trámite en Kapso/Meta para el número nuevo.

**2. Identidad por celular, solo con `empresa`.** Se normaliza el entrante a E.164 y se busca en `users` por `cel` + `indicativoCel`. La empresa sale de `users.empresa`, NUNCA de `users.company`. Casos:
- Un usuario (o varios de la misma empresa): verificado.
- Varios usuarios de empresas distintas con el mismo celular: el bot pregunta cuál (solo entre las suyas).
- Ninguno: "sin verificar". Puede abrir un ticket (empresa `Sin identificar`, con lo que diga en el texto) pero no consultar nada. Tope: 1 ticket por celular cada 24 h.
- Un celular de la empresa operadora (Julsmind) se trata como un comercio más: el bot nunca ve todas las empresas.

**3. Cerebro en ADK, backend decide.** Perfil "soporte" en `channels/whatsapp/` (D-257: conversación → ADK). Sin herramientas de Katuq: el backend arma el contexto (empresa, nombre, últimos 5 tickets de esa empresa) y recibe del agente una acción estructurada (`abrir_ticket`, `comentar_ticket`, `ninguna`). El backend valida y aplica. El modelo no elige la empresa, ni el estado, ni la prioridad.

**4. Mismo ticket, mismo camino.** `crearTicketSoporte` con `canal: "whatsapp"`, `company` = `tienda` = empresa verificada, `status: "Pendiente"`, `nombreUsuarioReporta` y `emailUsuarioReporta` del usuario, y el celular. Entran el aviso a Slack y el correo al equipo sin tocar nada. Asunto ≤200 y descripción ≤4000 caracteres, sin caracteres de control; el texto del comercio es dato, nunca instrucción.

**5. Confirmar antes de abrir.** El bot resume asunto y detalle y espera un "sí". Es el equivalente a la aprobación del MCP. Idempotencia por id de mensaje (Meta reentrega) y, como en el MCP, un ticket con el mismo asunto de la misma empresa en los últimos 30 minutos devuelve el existente.

**6. Aviso de vuelta (fase 2).** `notificarActualizacion` ya deduce el evento (estado, responsable, comentario). Si el ticket trae `canal: "whatsapp"` y su celular, envía por el camino de salida compartido: dentro de la ventana de 24 h texto libre; fuera de ella, plantilla aprobada por Meta (`katuq_ticket_respuesta_v1`, `katuq_ticket_resuelto_v1`, hay que crearlas y esperar aprobación). Solo comentarios públicos (`esNota: false`); las notas internas nunca salen. El "¿quedó resuelto?" reusa la lógica de `confirmarResolucion`, extraída a un servicio.

**7. Sesión.** Subcolección `integration_configs/{Julsmind}/whatsapp_support_sessions/{phoneHash}` (mismo patrón aprobado del bot de pedidos; borrado automático a los 7 días). Guarda el borrador del ticket y el turno.

**8. Costos.** Los mensajes del bot salen por el número de Julsmind; no se le cobra saldo a ningún comercio. Se registran en `whatsapp_usage` con `type` propio para medir el costo real.

## Guardarraíles (en el servidor, en este orden; el modelo no participa)
1. Interruptor general `WHATSAPP_SUPPORT_BOT_ENABLED` (apagado si no es `true`).
2. El mensaje llegó al número de soporte.
3. Fase piloto: celular en `WHATSAPP_SUPPORT_BOT_PILOT_PHONES` (vacío = nadie).
4. Celular no está en la lista de no contactar.
5. La conversación no la tomó una persona del equipo.
6. Es texto (imagen → fase 2; audio, sticker o ubicación → "escríbeme por texto o espera a un asesor").
7. No se atendió ya ese mensaje.
8. Tope de turnos por conversación y de mensajes por celular por hora.

## Pruebas
Contract test de write-set con lista blanca (`support`, colecciones `whatsapp_*`, la subcolección de sesión). Pruebas de identidad: celular con `company` distinto de `empresa`, celular repetido en dos empresas, celular desconocido, celular de Julsmind. Prueba de que un ticket de otra empresa nunca llega al contexto ni a la respuesta.
