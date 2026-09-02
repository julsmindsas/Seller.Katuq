# Tasks 016 — Descripción de correo del método de pago en la notificación de venta

> Estado: **in-progress** | Basado en `plan.md` (approved). D-070.
> Rama: `feature/pagos-metodos-unificados` (ambos repos).
>
> **Progreso (2026-09-01):** ✅ T-01..T-05 (backend correo) · ✅ T-06..T-08 (front PDF) · ✅ **T-09** (E2E
> navegador probado por el usuario → OK) · ✅ **T-10** (OpenSpec backend + D-070 en CONTRACT.md + `.md` ClickUp).
> **Commit pendiente de OK.** Deploy backend a cargo del equipo. Falta del lote: Tarea 6.

## Backend (correo)
- [ ] **T-01** — `services/notifications/paymentMethodDescription.js` (nuevo): `coleccionPorCanal(typeOrder)`
      (pura) + `resolverDescripcionMetodoPago(db, {company, formaDePago, typeOrder})` (IO, degrada a `''`,
      1 consulta).
- [ ] **T-02** — `notificationHooks.js`: en `onOrderCreated()` resolver `metodoPagoDescripcion` y agregarlo al
      `data` del template (junto a `metodoPago`). Cubrir también el camino `PAYMENT_Aprobado` (misma resolución).
- [ ] **T-03** — `templateHelpers.js` (`filaFormaPago`, L362–371): añadir renglón con la descripción
      **sanitizada** cuando exista; sin descripción → sin renglón nuevo.
- [ ] **T-04** — Test `scripts/test-pagos-notif-descripcion.js` + npm `test:pagos-notif-descripcion`:
      `coleccionPorCanal` (POS/e-com/default) + render de `filaFormaPago` con/sin descripción. Verde.
- [ ] **T-05** — `node --check` de los archivos tocados + reinicio backend `:3300`.

## Frontend (documento/PDF orden-venta)
- [ ] **T-06** — `orden-venta.component.ts`: inyectar `MaestroService`; resolver `formaPagoNombre`
      (de `pedido.formaDePago`) y `formaPagoDescripcion` (método por nombre+canal); degradar a `''` sin romper.
- [ ] **T-07** — `orden-venta.component.html`: bloque "Forma de pago: {nombre}" + descripción (si existe) cerca
      de totales; sin romper la paginación del PDF.
- [ ] **T-08** — Compila `Compiled successfully`.

## Cierre
- [ ] **T-09** — E2E navegador (usuario): venta con método CON descripción → correo y PDF la muestran; método
      SIN descripción → sin renglón vacío ni error, en ambas superficies.
- [ ] **T-10** — Registrar **D-070** + bitácora en `CONTRACT.md`; propuesta OpenSpec backend
      `openspec/changes/sale-notification-payment-method-description/`; `.md` de cierre en `clickup/` con el
      nombre de la rama al inicio; commit con OK del usuario (ambos repos).
