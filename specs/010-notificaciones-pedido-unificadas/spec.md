# Spec 010 — Notificaciones de pedido unificadas (multicanal, sin duplicados)

> Estado: **draft**
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-06-22

## 1. Contexto / Por qué
Las notificaciones al cliente sobre su pedido (creado, despachado, entregado) dependen hoy del canal por el que entró o cambió el pedido, y la lógica está duplicada y acoplada en distintos puntos del backend. Resultado concreto: **OH MY STORE no recibe notificación de pedido creado (Shopify) ni de entregado (Cereza/Osmosis)**, mientras pedidos creados desde la app sí notifican. Es un pendiente directo del cliente.

## 2. Objetivo de negocio
El cliente recibe **exactamente una** notificación por cada evento relevante de su pedido (creado, despachado, entregado), **sin importar el canal de origen** (venta asistida/POS, Shopify, WooCommerce…) ni la vía del cambio de estado (app, webhook de proveedor, sincronización), respetando las preferencias de la empresa y **sin duplicados**.

## 3. User stories
- Como **cliente**, quiero recibir confirmación cuando mi pedido se crea, despacha y entrega, sin importar dónde lo compré.
- Como **comerciante (empresa)**, quiero notificaciones consistentes y configurables hacia mis clientes, sin mensajes repetidos.
- Como **operador de Katuq**, quiero un único punto de disparo de notificaciones de pedido, para no cablearlas a mano en cada integración.

## 4. Criterios de aceptación (EARS)
- WHEN se crea un pedido por cualquier canal, THE system SHALL emitir exactamente una notificación de "pedido creado" al cliente según las preferencias de la empresa.
- WHEN un pedido transita a "Despachado", THE system SHALL emitir exactamente una notificación de "pedido despachado".
- WHEN un pedido transita a "Entregado", THE system SHALL emitir exactamente una notificación de "pedido entregado".
- WHERE el cambio de estado provenga de un proveedor externo (Cereza/Osmosis, transportadora), THE system SHALL emitir la misma notificación que si el cambio ocurriera dentro de la app.
- WHILE las preferencias de notificación de la empresa tengan ese evento desactivado, THE system SHALL NO enviar esa notificación.
- IF el mismo evento llega por más de una vía (p. ej. webhook + sincronización), THEN THE system SHALL enviar la notificación una sola vez (dedupe idempotente).
- IF el cliente no tiene correo/teléfono válido, THEN THE system SHALL registrar el faltante y continuar sin interrumpir el flujo del pedido.
- THE system SHALL disparar las notificaciones de forma asíncrona, sin bloquear ni hacer fallar la creación/actualización del pedido.

## 5. Requisitos no funcionales
### 5.1 Performance
- El disparo no añade latencia perceptible al flujo de pedido (asíncrono / best-effort).
### 5.2 Seguridad
- Multi-tenant estricto por empresa. No exponer datos personales del cliente en logs.
### 5.3 Observabilidad
- Log estructurado por evento: pedido, empresa, canal de origen y resultado (enviado / omitido-por-preferencia / duplicado-deduplicado / sin-destinatario).
### 5.5 Resiliencia
- Idempotencia por `(pedido, tipo de evento)`. Un fallo de notificación nunca tumba el pedido. Reintentos seguros sin reenviar duplicado.

## 6. Out of scope (explícito)
- Rediseño de plantillas/contenido de los mensajes.
- Canal WhatsApp (Kapso) — ya tiene su propio flujo.
- Notificaciones que no sean de estado de pedido (p. ej. pago aprobado), salvo donde compartan el mismo punto de disparo.
- Cambiar el motor de envío (email/SMS) existente.

## 7. Dependencias
- [[001-osmosis-webhook-inbound]] — cambios de estado entrantes de Cereza.
- Flujo de creación por el motor de /flows (nodo `katuq-order-upsert`) y por `POST /v1/orders/create`.
- Preferencias por empresa (colección `company_notification_preferences`).
- Memoria de contexto del bug: `notif-pedido-shopify-osmosis`.

## 8. [NEEDS CLARIFICATION] — RESUELTO 2026-06-22
- [x] Punto de disparo → **capa de servicio de orden** (creación en el servicio que crea el pedido; estado en un servicio único de transición). NO bus de eventos nuevo.
- [x] Notif legacy del controller → **MIGRAR** al punto único (decisión usuario).
- [x] Contenido/plantilla → **mismo mensaje** para todos los canales, usando las plantillas del sistema (decisión usuario).
- [x] Despachado/entregado → fuente de verdad = **transición de `estadoProceso`**; se notifica en cualquier transición a ese estado (app, webhook, pull), de forma idempotente.

## 9. Riesgos identificados
- R-01: Duplicados al unificar (ya hubo intentos previos que duplicaban; por eso se removió una llamada en el controller). Mitiga: dedupe idempotente por `(pedido, evento)`.
- R-02: La notif de creación está acoplada dentro del controller HTTP; extraerla sin regresiones en venta asistida/POS requiere cuidado.
- R-03: Nombres de estado de pedido inconsistentes entre canales.

## 10. Métricas de éxito post-launch
- 100% de pedidos creados (cualquier canal) generan 1 notificación, 0 duplicados — ventana 1 semana.
- OMS recibe notif de "creado" y "entregado" en pedidos Shopify/Cereza — verificación E2E.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad, resiliencia.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto antes de pasar a plan.
