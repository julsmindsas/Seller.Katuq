# Tasks 008.3 — Landing pública de aprobación

> Estado: **T-01..T-10 DONE** · T-11 (E2E navegador del usuario) pendiente · Plan: [[008.3-cotizacion-landing-aprobacion]]
> Verificado: `node -c` BE OK · `tsc` FE 0 err · ng serve OK (chunk lazy nuevo) · GET público token inválido → 404 "No encontrada" (sin auth, no enumerable). Backend reiniciado. **NADA commiteado aún.**

## Backend (BE = Seller.Katuq.Back, rama backend-aws-security)
- **T-01** `controllers/cotizaciones.js`: `generarShareToken` (genera/devuelve publicToken,
  idempotente, guard company).
- **T-02** `controllers/cotizaciones.js`: `getPublica(token)` → projection segura + estado/vencida.
- **T-03** `controllers/cotizaciones.js`: `responderPublica(token)` → valida documento, transición
  enviada→aceptada/rechazada, evidencia, bloqueos (vencida/ya resuelta).
- **T-04** `routers/cotizaciones.js`: registrar `/public/:token` (GET) y `/public/:token/responder`
  (POST) SIN auth + rate-limit, ANTES de `/:id`; y `POST /:id/share-token` con auth.
- **T-05** `node -c` ambos.

## Frontend (FE = Seller.Katuq, rama feature/venta-asistida-mejorada)
- **T-06** `app-routing.module.ts`: ruta `c` con BlankComponent → lazy CotizacionPublicaModule.
- **T-07** `components/cotizacion-publica/`: module + routing (`:token`) + service (extends BaseService).
- **T-08** `cotizacion-publica.component`: fetch por token, render read-only, Aceptar/Rechazar con
  confirmación de documento (+motivo), manejo vencida/ya-resuelta/no-encontrada.
- **T-09** `cotizacion-editor`: WhatsApp llama share-token y arma el link público `/c/:token`.
- **T-10** `tsc --noEmit` 0 errores + ng serve OK.

## QA
- **T-11** E2E: compartir genera link → abrir `/c/:token` (sin login) muestra la cotización →
  aceptar con documento correcto → queda `aceptada`; documento incorrecto → no cambia; token
  inválido → no encontrada; vencida → sin acciones. Verificar que no se expone documento ni datos internos.
