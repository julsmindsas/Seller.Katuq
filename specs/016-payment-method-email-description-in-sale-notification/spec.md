# Spec 016 — Descripción de correo del método de pago en la notificación de venta

> Estado: draft | in-review | **approved** | superseded
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-09-01 (Tarea 5/6 del lote pagos; aprobada en checkpoint; ver D-070)
> Rama: `feature/pagos-metodos-unificados` (ambos repos). **Front (PDF) + Back (correo).**

## 1. Contexto / Por qué
Cada método de pago (colecciones `pagos` e-commerce / `formaPagosPos` POS) tiene un campo
**`descripcionCorreoElectronico`** que el operador llena en la pantalla de métodos de pago. La intención de
negocio de ese campo es dar al cliente **instrucciones o información del método** (ej. datos para transferencia,
pasos de pago, plazos). Hoy ese texto **no se muestra en ningún lado de la venta**:

- **Correo de notificación de venta:** ya muestra el **nombre** de la forma de pago (`formaDePago`) en el bloque
  `filaFormaPago` (`services/notifications/templateHelpers.js`), pero **NO** su descripción.
- **Documento/PDF de venta** (`orden-venta`, generado en el front con `html2pdf.js`): **no muestra nada** de la
  forma de pago.
- El campo solo se referencia en `controllers/diagnostics.js` (seed), nunca en la notificación real.

Resultado: el operador configura una descripción útil para el cliente y esa información **se pierde** — el
cliente nunca la ve al confirmar su compra.

## 2. Objetivo de negocio
Que la **`descripcionCorreoElectronico`** del método de pago elegido en la venta **aparezca en la notificación
de venta** (correo y/o documento PDF de la orden), junto a la forma de pago, para que el cliente reciba las
instrucciones/of información del método al confirmar su pedido.

## 3. User stories
- Como **cliente** quiero **ver en el correo de confirmación las instrucciones del método de pago que elegí**
  (ej. datos de transferencia) para **saber cómo/dónde completar el pago**.
- Como **operador** quiero que **la descripción que configuré en el método de pago llegue al cliente** en la
  notificación de la venta, para **no tener que repetirla manualmente**.
- Como **cliente** quiero **ver esa misma información en el documento/PDF de la orden** para **tenerla a mano
  aunque no abra el correo**.

## 4. Criterios de aceptación (notación EARS)

**Resolución de la descripción**
- WHEN se arma la notificación de una venta cuya orden tiene una forma de pago (`formaDePago`), THE system SHALL
  resolver la **descripción de correo** de ese método buscándolo por **nombre** dentro de la **empresa activa**
  (multi-tenant) en la colección del canal correspondiente (`pagos` para e-commerce, `formaPagosPos` para POS).
- IF no se encuentra el método (nombre no coincide, u orden legacy), THEN THE system SHALL continuar sin
  descripción (cadena vacía), **sin fallar** la notificación (degradación segura).
- WHERE el método existe pero su `descripcionCorreoElectronico` está vacía, THE system SHALL **no** mostrar un
  bloque/renglón de descripción vacío.

**Correo de venta**
- WHERE la orden tiene forma de pago y su método tiene descripción de correo, THE system SHALL mostrar esa
  descripción en el correo de venta, **junto a / debajo de** la forma de pago existente (bloque `filaFormaPago`).
- THE system SHALL **sanitizar** el texto de la descripción antes de inyectarlo en el HTML del correo (sin HTML
  crudo del operador).

**Documento/PDF de venta (`orden-venta`)**
- WHERE la orden tiene forma de pago, THE system SHALL mostrar en el documento de venta la **forma de pago** y,
  cuando exista, su **descripción de correo**.
- THE PDF generado SHALL incluir esa información de forma legible (no romper el layout ni la paginación
  existente del documento).

**Consistencia**
- THE system SHALL usar la **misma** descripción (la del método por nombre+empresa+canal) en el correo y en el
  documento de venta, para que cliente vea lo mismo por ambos medios.

## 5. Requisitos no funcionales

### 5.1 Performance
- Resolver la descripción SHALL costar **como máximo una** consulta por notificación (buscar el método por
  nombre+empresa), sin degradar el envío del correo.

### 5.2 Seguridad
- Aislamiento por empresa (nunca leer un método de otra empresa). Sanitizar la descripción en el HTML del
  correo. Sin secretos ni datos sensibles añadidos.

### 5.3 Observabilidad
- Un fallo al resolver la descripción SHALL registrarse de forma no intrusiva y **no** impedir el envío de la
  notificación.

### 5.4 Resiliencia
- La ausencia del método, de la descripción, o un error de lectura SHALL degradar a "sin descripción" sin
  romper la notificación ni el PDF.

## 6. Out of scope (explícito) — confirmado en checkpoint (D-070)
- **`recordatorioCobro`** (el otro campo del método): **fuera de alcance** (solo `descripcionCorreoElectronico`).
- **Adjuntar un PDF generado en el backend al correo**: hoy el correo NO adjunta PDF y `email.js` no soporta
  adjuntos; construir esa infraestructura queda **fuera** de esta tarea. El "PDF de venta" es el documento
  **`orden-venta`** del front (`html2pdf.js`).
- **Notificaciones de despacho/entrega** (`ORDER_Despachado`/`ORDER_Entregado`): fuera; solo la de
  creación/confirmación de venta.
- Cambiar el modelo de datos del método o de la orden. La descripción se **lee**, no se copia a la orden.
- Rediseñar la plantilla del correo o el layout del documento de venta más allá de insertar este dato.

## 7. Dependencias
- Método de pago con `descripcionCorreoElectronico` (pantalla de métodos de pago, spec 012).
- Correo de venta: `services/notifications/notificationHooks.js` (arma payload), `templateHelpers.js`
  (`filaFormaPago`), `notificationQueue.js` (envía). La orden guarda `formaDePago` (nombre).
- Documento de venta: `src/app/components/ventas/orden-venta/orden-venta.component.{ts,html}` (front, `html2pdf`).

## 8. Clarifications (resueltas 2026-09-01 — D-070)
- [x] **Superficies:** **correo Y documento `orden-venta`** (ambas).
- [x] **PDF = `orden-venta` del front** (no se adjunta PDF al correo en backend).
- [x] **En `orden-venta`:** agregar bloque **"Forma de pago: {nombre}" + descripción**.
- [x] **Campos:** solo **`descripcionCorreoElectronico`** (recordatorioCobro fuera).
- [x] **Notificaciones:** solo **creación/confirmación** de venta (`ORDER_CREATED` / `PAYMENT_Aprobado`).

## 9. Riesgos identificados
- **R-01 (match por nombre):** la orden referencia la forma de pago por nombre; si el nombre del método cambió
  o no coincide exactamente, la descripción no se resuelve. Mitigación: normalizar la comparación (trim/…);
  degradar a "sin descripción" sin romper.
- **R-02 (canal e-com vs POS):** hay que elegir la colección correcta según el canal de la orden; un canal mal
  determinado leería la descripción equivocada. Mitigación: determinar el canal de la orden de forma explícita;
  ante duda, preferir el canal de la venta.
- **R-03 (HTML inseguro):** la descripción es texto libre del operador → sanitizar antes de inyectar en el
  correo.

## 10. Métricas de éxito post-launch
- Una venta con método que tiene descripción → el cliente ve esa descripción en el correo (y/o en el PDF).
- Un método sin descripción → la notificación se ve igual que hoy (sin renglón vacío) y no falla.
- 0 fugas entre empresas (la descripción siempre es la del método de la empresa de la orden).

---

**Checklist de revisión humana antes de aprobar:**
- [x] No hay nombres de librerías/frameworks en los criterios (salvo contexto/dependencias).
- [x] Cada criterio EARS es testeable de forma binaria.
- [x] NFRs cubren performance, seguridad, observabilidad, resiliencia.
- [x] Out of scope explícito.
- [x] Clarifications resueltas (§8).
- [x] **Checkpoint humano:** aprobada por el usuario 2026-09-01 (correo+PDF, forma de pago+descripción, solo
      descripcionCorreoElectronico, solo creación/confirmación).
