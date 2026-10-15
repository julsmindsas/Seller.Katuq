## 0. Antes de empezar (Daniel)
- [ ] 0.1 Aprobar esta propuesta (proposal, design, spec)
- [ ] 0.2 Decidir el número: nuevo solo de soporte (recomendado) o el de Julsmind (+1 555-941-8011)
- [ ] 0.3 Confirmar: confirmar con "sí" antes de abrir (recomendado) o abrir directo
- [ ] 0.4 Celulares de prueba del piloto

## 1. Identidad (backend, sin tocar el webhook)
- [ ] 1.1 `whatsappSupportIdentity`: celular → usuario(s) → empresa por `empresa`; casos verificado / ambiguo / desconocido
- [ ] 1.2 Pruebas: `company` ≠ `empresa`, celular en dos empresas, desconocido, Julsmind

## 2. Sesión y despachador
- [ ] 2.1 Sesión en subcolección `whatsapp_support_sessions` (7 días)
- [ ] 2.2 `whatsappSupportDispatcher` con las 8 compuertas del design
- [ ] 2.3 Aplicar acciones `abrir_ticket` / `comentar_ticket` con `crearTicketSoporte` (`canal: "whatsapp"`), idempotencia y dedupe de 30 min
- [ ] 2.4 Contexto de tickets de la empresa (últimos 5, solo comentarios públicos)
- [ ] 2.5 Contract test de write-set (lista blanca)

## 3. ADK
- [ ] 3.1 Perfil "soporte" en `channels/whatsapp/` (sin herramientas de Katuq) + pruebas
- [ ] 3.2 Prompt: pedir solo lo que falta, resumir, tono de comercio, sin jerga, ante duda pasar a una persona

## 4. Webhook (un cambio a la vez, con diff y aprobación)
- [ ] 4.1 Rama temprana por `phone_number_id` de soporte → despachador; sin reparto por empresa
- [ ] 4.2 Coordinar con las sesiones que tocan `whatsappWebhook.js`

## 5. Piloto
- [ ] 5.1 Variables en prod (`WHATSAPP_SUPPORT_BOT_ENABLED`, `..._PILOT_PHONES`, `..._PHONE_NUMBER_ID`); despliegue lo hace Daniel o se le deja listo
- [ ] 5.2 Prueba real con 2 celulares: abrir, confirmar, consultar, traspaso a persona

## 6. Fase 2
- [ ] 6.1 Plantillas de Meta `katuq_ticket_respuesta_v1` y `katuq_ticket_resuelto_v1`
- [ ] 6.2 Aviso en `supportTicketNotifier` + "¿quedó resuelto?" (extraer `confirmarResolucion` a servicio)
- [ ] 6.3 Evidencia: foto entrante → adjunto del ticket
- [ ] 6.4 Chip "WhatsApp" en el listado de Support (`katuq_support`)
