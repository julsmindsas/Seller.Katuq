# Spec 008.3 — Landing pública de aprobación de cotización

> Estado: **in-review** (pendiente checkpoint humano)
> Padre: [[008-cotizaciones-mvp]] · Fase: 008.3
> Fecha: 2026-06-22

## 1. Qué y por qué

El cliente recibe por WhatsApp un **link seguro** a una página **pública** (sin login)
donde ve su cotización y puede **Aceptar** o **Rechazar**. Al aceptar, la cotización
queda `aceptada` automáticamente en el back-office (y entonces es convertible a pedido —
008.2). Elimina el ida y vuelta manual de aprobación.

**Requisito central (seguridad):** la URL **no debe ser enumerable**. Nadie puede cambiar
la URL/consecutivo para ver cotizaciones de otros clientes.

## 2. Decisiones tomadas (checkpoint previo)

- **Token** = aleatorio opaco (cripto), guardado en la cotización; lookup solo por token.
- **Acciones** = Aceptar y Rechazar.
- **Vencida/usada** = mostrar el estado, sin permitir aceptar/rechazar.
- **Aceptar/Rechazar** = el cliente confirma **nombre o cédula** (deja rastro).

## 3. Alcance

**Incluye:**
- Campo `publicToken` (aleatorio ≥128 bits, único) en la cotización + fecha de creación.
- Compartir por WhatsApp (en el editor) genera el token **una vez** (estable) y arma el link
  público con la URL desplegada.
- Ruta **pública** `/c/:token` fuera de `AuthGuard`, con **layout limpio** (sin sidebar ni
  panel autenticado).
- Endpoint **público** (sin auth) que devuelve la cotización por token con **solo campos de
  presentación** (cliente, ítems, totales, validez, términos, estado, empresa) — nada interno.
- Acciones públicas Aceptar/Rechazar por token, con confirmación de **documento del cliente**
  y registro de evidencia (fecha/hora, IP, documento confirmado, motivo opcional al rechazar).

**No incluye (out-of-scope):**
- Pago en la landing.
- Edición de la cotización por el cliente.
- Notificación por correo (el canal es WhatsApp; email queda para después).
- Conversión a pedido (es 008.2; aceptar solo habilita ese botón en el back-office).

## 4. Criterios de aceptación (EARS)

- **AC-01** — CUANDO el vendedor comparte la cotización por WhatsApp, el sistema DEBE
  generar (si no existe) un `publicToken` aleatorio y construir la URL pública con él.
- **AC-02** — CUANDO se abre la URL con un token **válido**, el sistema DEBE mostrar la
  cotización (campos de presentación) y su estado, en un layout público sin login.
- **AC-03** — CUANDO el token es inválido/inexistente, el sistema DEBE responder “no
  encontrada” SIN revelar ninguna información (no enumerable).
- **AC-04** — MIENTRAS la cotización esté **vencida**, la landing DEBE mostrar “vencida” y
  deshabilitar Aceptar/Rechazar.
- **AC-05** — MIENTRAS la cotización ya esté `aceptada`, `rechazada` o `convertida`, la
  landing DEBE mostrar ese estado y NO permitir nueva acción.
- **AC-06** — CUANDO el cliente pulsa Aceptar e ingresa un **documento que coincide** con el
  de la cotización, el sistema DEBE marcarla `aceptada` y registrar evidencia.
- **AC-07** — CUANDO el cliente pulsa Rechazar (documento coincidente, motivo opcional), el
  sistema DEBE marcarla `rechazada` y registrar evidencia.
- **AC-08** — SI el documento ingresado NO coincide con el de la cotización, el sistema NO
  DEBE cambiar el estado (mensaje de validación).
- **AC-09** — La landing NO DEBE exponer el panel autenticado, el consecutivo en la URL, ni
  datos internos de la empresa u otras cotizaciones.

## 5. NFRs / Seguridad

- **N-01** Token impredecible (≥128 bits, `crypto`), único por cotización; lookup exclusivo
  por token (campo indexado). La URL nunca lleva id/consecutivo.
- **N-02** Endpoints públicos SIN auth pero con **rate limiting** (`express-rate-limit` ya
  está en el backend) para evitar fuerza bruta de tokens.
- **N-03** Respuesta pública mínima: solo campos necesarios para mostrar; nunca campos
  internos (costos, márgenes, notas internas, datos de otras entidades).
- **N-04** Acciones idempotentes: aceptar/rechazar solo aplican desde estado `enviada`;
  repetir no crea inconsistencias.
- **N-05** Multi-tenant implícito: el `company` se deriva del documento de la cotización, no
  de headers del cliente.

## 6. Preguntas abiertas (para el plan)

- **Q-01** URL base pública: ¿`/c/:token` corto o `/cotizacion/ver/:token`? (corto = más
  amigable en WhatsApp). Definir cómo se obtiene el host desplegado en el front.
- **Q-02** ¿El “documento que coincide” se valida contra `cliente.documento` exacto? (sí,
  por defecto). ¿Tolerancia a espacios/puntos?
- **Q-03** ¿Se permite re-generar/invalidar el token (revocar un link enviado)? (deseable,
  aditivo).

## 7. Métrica de éxito

Un cliente abre el link de WhatsApp → ve su cotización en una página limpia y segura →
confirma su documento y pulsa Aceptar → la cotización queda `aceptada` con evidencia, y el
vendedor la puede convertir a pedido. Cambiar la URL a otro token/valor nunca revela otra
cotización.
