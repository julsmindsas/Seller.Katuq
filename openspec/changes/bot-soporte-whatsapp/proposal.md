## Why

Hoy un comercio que tiene un problema con Katuq solo puede abrir un ticket entrando a la app (formulario de Support o del Seller) o, si tiene su propia IA, conectando el conector MCP. Muchos comercios viven en WhatsApp: ahí le escriben a sus clientes, a sus proveedores y a nosotros. Si el problema les urge, mandan un mensaje suelto a alguien del equipo y el caso no queda en el tablero: se pierde, no tiene número y nadie sabe quién lo atiende.

Este cambio pone un bot de soporte en WhatsApp. El comercio cuenta su problema como lo cuenta a una persona y el bot abre **el mismo ticket** que abre el formulario: mismo tablero, mismo número, mismos avisos al equipo. El MCP sigue siendo el camino para quien prefiera su propia IA; el bot es el camino para quien no quiere instalar nada.

La plomería ya existe y está en producción: el webhook de Kapso, el envío saliente cobrado, el buzón, el canal WhatsApp del ADK que usa el bot de pedidos, y un único camino para crear tickets (`services/soporte/crearTicket.js`, compartido por la app y el MCP).

## What Changes

- **Bot de soporte en un número de WhatsApp de Katuq.** Entiende el problema, pregunta solo lo que falta (qué pasa, desde cuándo, en qué pedido o producto), resume y, cuando el comercio responde que sí, abre el ticket y le da el número.
- **Reconoce al comercio por su celular.** Se busca el teléfono entre los usuarios de Katuq y el ticket queda a nombre de su empresa real. Si el celular no es de ningún usuario, el bot igual recibe el caso, pero el ticket queda marcado "sin verificar" y el bot no le muestra ningún dato.
- **Consulta de estado.** "¿Cómo va mi ticket?" se contesta con los tickets de ESA empresa, con el estado y lo último que escribió el equipo.
- **Aviso de vuelta (fase 2).** Cuando el equipo comenta o resuelve un ticket abierto por WhatsApp, el comercio recibe el aviso en el mismo chat y puede decir si quedó resuelto (mismo "sí / no" que ya existe en la app y que reabre el ticket).
- **Evidencia (fase 2).** La foto o captura que mande el comercio se adjunta al ticket.
- **Traspaso a una persona.** La conversación vive en el buzón de WhatsApp de Julsmind; si alguien del equipo escribe en el hilo, el bot se calla (mismo mecanismo del bot de pedidos).
- **Apagado de fábrica.** Interruptor general en el backend, y al inicio solo contesta a una lista de celulares de prueba.

## Capabilities

### New Capabilities
- `whatsapp-bot-soporte`: qué hace el bot (abrir, consultar, avisar), a quién reconoce y qué límites tiene.

### Modified Capabilities
Ninguna. El ticket que se crea es idéntico al de hoy con `canal: "whatsapp"`.

## Impact

**Backend (`katuq_admin_back_firebase/functions`)**
- `controllers/whatsappWebhook.js` — una rama temprana: si el mensaje llegó al número de soporte, se despacha al bot de soporte y NO se hace el reparto por empresa. Cambio mínimo; el archivo lo tocan otras sesiones.
- Servicios nuevos: despachador del bot de soporte, identificación por celular y sesión de la conversación. Se reusan `whatsappOutboundService`, `whatsappBotClient` y `crearTicketSoporte`.
- Fase 2: `services/notifications/supportTicketNotifier.js` agrega el aviso por WhatsApp (hoy solo correo y Slack).

**KAI ADK (`kai/adk_agent`)**: un perfil "soporte" en `channels/whatsapp/`, sin herramientas de Katuq. El backend le entrega el contexto ya resuelto y aplica las acciones; ADK nunca escribe en Katuq (misma regla del bot de pedidos).

**Frontend**: ninguno en fase 1. Opcional: chip "WhatsApp" en el listado de Support (app `katuq_support`).

**Write-set cerrado**: `support` (crear con `crearTicketSoporte`; agregar un comentario del comercio), `whatsapp_inbound`/`whatsapp_usage` (los que ya escribe el canal) y una subcolección de sesión bajo la config de WhatsApp de Julsmind. Nada de pedidos, productos, inventario, precios ni consecutivos. Un contract test lo verifica.

**No-goals**: el bot no resuelve problemas ni toca datos del comercio; no cambia prioridad, estado ni responsable del ticket (eso lo hace el equipo); no responde sobre pedidos o inventario de nadie; no atiende a clientes finales de los comercios.

**Riesgos**: (1) el número: el de Julsmind (+1 555-941-8011) también lo usan notificaciones y campañas con reparto por empresa, así que mezclar soporte ahí rompería ese reparto (ver design); (2) identidad: `users` tiene dos campos de empresa que no coinciden (`empresa` es el real, `company` miente en 24 de 124): se usa SOLO `empresa`; (3) spam o suplantación desde celulares desconocidos: topes y ticket "sin verificar".
