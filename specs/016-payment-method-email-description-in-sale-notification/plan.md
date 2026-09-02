# Plan 016 — Descripción de correo del método de pago en la notificación de venta

> Estado: **approved** | Última actualización: 2026-09-01 (ver D-070)
> Basado en `spec.md` (approved). Front: Angular 14 (`orden-venta`, `html2pdf.js`). Back: Express/Node + Firestore
> (`services/notifications/*`). Rama `feature/pagos-metodos-unificados` (ambos repos).

## 1. Estrategia general
Cambio de **surfacing** (mostrar un dato que ya existe), sin tocar modelos de datos. La orden guarda la forma de
pago **por nombre** (`orderData.formaDePago`); la descripción se **lee** del método (`pagos`/`formaPagosPos`) por
`nombre + company + canal`. Se degrada seguro a "sin descripción" si no se resuelve. Dos superficies
independientes (correo backend, PDF front) que comparten la misma regla de resolución.

## 2. Resolución del método (regla compartida)
- **Colección por canal:** `typeOrder === 'POS'` → `formaPagosPos`; en otro caso → `pagos` (e-commerce).
  (`typeOrder` es el discriminador de canal de la orden.)
- **Query:** `where('company','==',company).where('nombre','==',formaDePago)` → primer doc → leer
  `descripcionCorreoElectronico`. Comparación de nombre tolerante (trim). Si no hay match o falla → `''`.
- Lógica **pura testeable**: `coleccionPorCanal(typeOrder)` (elige colección) aislada de la IO.

## 3. Backend — correo de venta

### `services/notifications/paymentMethodDescription.js` (nuevo)
- `coleccionPorCanal(typeOrder)` → `'formaPagosPos' | 'pagos'` (pura).
- `resolverDescripcionMetodoPago(db, { company, formaDePago, typeOrder })` → `Promise<string>` (IO; degrada a
  `''`). Una sola consulta.

### `services/notifications/notificationHooks.js`
- En `onOrderCreated()` (donde se arma el payload, ~L491–545): antes/junto a `metodoPago`, resolver
  `metodoPagoDescripcion = await resolverDescripcionMetodoPago(db, orderData)` y agregarlo al `data` del template.
- Repetir en el camino de **`PAYMENT_Aprobado`** (confirmación de pago) si arma su propio payload — MISMA
  resolución, para cubrir creación/confirmación (alcance §8).

### `services/notifications/templateHelpers.js`
- Extender el bloque **`filaFormaPago`** (L362–371): cuando `orderData.metodoPagoDescripcion` no esté vacía,
  añadir un renglón con la descripción **sanitizada** (`sanitizeHtml`), debajo de la forma de pago. Sin
  descripción → igual que hoy (sin renglón nuevo).

## 4. Frontend — documento/PDF `orden-venta`

### `orden-venta.component.ts`
- Inyectar servicio de maestros (`MaestroService`, ya existente) para leer la forma de pago por nombre.
- Al recibir `@Input() pedido`, resolver:
  - `formaPagoNombre` = de `pedido.formaDePago` (o el campo equivalente del `Pedido`).
  - `formaPagoDescripcion` = del método (`consultarFormaPago`/`consultarFormaPagoPOS` según canal del pedido),
    match por nombre. Degrada a `''` si no se encuentra.
- Guardar ambos en propiedades del componente para el template. No bloquear el render del PDF si falla.

### `orden-venta.component.html`
- Agregar, cerca de la sección de totales, un bloque **"Forma de pago: {nombre}"** y, si existe,
  **su descripción** debajo. Estilo consistente con el documento; no romper la paginación (`html2pdf`).

## 5. Gates contra la constitución / reglas de proyecto
- **Multi-tenant:** la resolución filtra por `company` (de la orden / del usuario logueado). ✔
- **Sin colección nueva ni endpoint v2:** solo lectura de colecciones existentes. ✔
- **Sin cambio de esquema** de orden ni de método (se lee, no se copia). ✔
- **Seguridad correo:** `sanitizeHtml` sobre la descripción (texto libre del operador). ✔
- **No romper la notificación:** toda la resolución degrada a `''` ante error (Art. resiliencia). ✔
- **Angular 14 / sin signals:** `*ngIf` en el template del documento. ✔

## 6. Riesgos y mitigaciones (del spec)
- **R-01 match por nombre** → comparación tolerante (trim); degradar sin romper.
- **R-02 canal e-com/POS** → discriminar por `typeOrder`; ante duda, e-commerce (`pagos`).
- **R-03 HTML inseguro** → `sanitizeHtml` en el correo; en el PDF el texto va como contenido, no HTML crudo.

## 7. Estrategia de pruebas
- **Backend:** test de contrato de `coleccionPorCanal` (POS→formaPagosPos, e-com→pagos, default) + de la forma en
  que `filaFormaPago` incluye/omite el renglón de descripción (helper de render, si se puede aislar). npm
  `test:pagos-notif-descripcion`.
- **Frontend:** compila `Compiled successfully`.
- **E2E (usuario):** crear una venta con un método que tenga descripción → (a) el correo muestra la descripción
  bajo la forma de pago; (b) el PDF `orden-venta` muestra "Forma de pago: {nombre}" + descripción. Un método sin
  descripción → correo/PDF sin renglón vacío y sin errores.

## 8. Checkpoint
- [x] Plan aprobado (implícito al aprobar spec + clarifications 2026-09-01). Continúa `tasks.md`.
