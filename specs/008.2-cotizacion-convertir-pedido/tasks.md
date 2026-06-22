# Tasks 008.2 — Convertir cotización a pedido

> Estado: **T-01..T-09 DONE** · T-10 (E2E navegador del usuario) pendiente · Plan: [[008.2-cotizacion-convertir-pedido]]
> Verificado: `node -c` BE OK · `tsc --noEmit` FE 0 errores · ng serve "Compiled successfully" · rutas BE responden 401 (existen). Backend reiniciado (PID nuevo). **NADA commiteado aún.**

## Backend (BE = Seller.Katuq.Back, rama backend-aws-security)
- **T-01** `controllers/cotizaciones.js`: handler `marcarConvertida` (PATCH /:id/convertida),
  guard company, idempotente, set estado convertida + pedidoGenerado. No toca orders/inventory.
- **T-02** `routers/cotizaciones.js`: registrar `PATCH /:id/convertida` (auth). Ojo: rutas de
  segmento fijo antes de dinámicas (ya hay ese patrón).
- **T-03** `node -c` ambos.

## Frontend (FE = Seller.Katuq, rama feature/venta-asistida-mejorada)
- **T-04** `cotizaciones.service.ts`: `marcarConvertida(id, nroPedido)` → PATCH.
- **T-05** `cotizaciones/cotizacion-convert.service.ts` (nuevo, providedIn root): `iniciar(cot): Promise<boolean>`
  (guard aceptada, confirm si carrito activo, clearCart, addToCart por item, set sessionStorage
  cliente + cotizacionOrigen, navigate a crear-ventas).
- **T-06** `cotizaciones-lista`: botón "Convertir a pedido" en fila (solo `aceptada`, no `convertida`).
- **T-07** `cotizacion-editor`: botón "Convertir a pedido" en cabecera/footer (solo `aceptada`).
- **T-08** `crear-ventas.component.ts`: inyectar CotizacionesService + método
  `marcarCotizacionConvertidaSiAplica(nroPedido)`; llamarlo en los 2 success de `createOrder`.
- **T-09** `tsc --noEmit` 0 errores + build AOT del módulo.

## QA
- **T-10** E2E navegador: cotización aceptada → convertir → venta asistida pre-cargada
  (cliente+productos+precios) → crear pedido → cotización queda `convertida` con nro.
  Verificar AC-06 (abandonar = sigue aceptada) y AC-08 (sin escrituras extra).
