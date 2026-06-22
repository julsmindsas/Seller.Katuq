# Plan 008.3 — Landing pública de aprobación

> Estado: **approved** · Spec: [[008.3-cotizacion-landing-aprobacion]]
> Fecha: 2026-06-22

## Arquitectura (sigue el precedente de "reportes públicos" `/r`)

- **Token**: `publicToken` aleatorio (`crypto.randomBytes(24).toString('hex')` = 192 bits)
  + `publicTokenCreatedAt`. Lookup `where('publicToken','==',token)` (índice de campo único auto).
- **Backend**: rutas públicas dentro de `routers/cotizaciones.js` SIN `auth` (espejo de
  `routers/reports.js` `/public/:id`). Rate limiting con `express-rate-limit`.
- **Frontend**: ruta `c` con `BlankComponent` (sin shell ni AuthGuard) → módulo lazy
  `cotizacion-publica` con `{ path: ':token' }` (espejo de `report-public` bajo `/r`).
- **URL pública**: `https://<host>/c/<token>` (host vía `window.location.origin`).

## Contratos (backend)

### Authed (back-office) — en routers/cotizaciones.js con `auth`
- **`POST /v1/cotizaciones/:id/share-token`** → genera `publicToken` si no existe
  (idempotente) y responde `{ token, url? }`. Solo del `company` dueño.

### Públicos (sin auth, rate-limited) — antes de la dinámica `/:id`
- **`GET /v1/cotizaciones/public/:token`** → busca por token. 404 genérico si no existe.
  Responde **solo vista pública** (ver projection abajo) + `estado` (calcula `vencida`).
- **`POST /v1/cotizaciones/public/:token/responder`** · body
  `{ accion:'aceptar'|'rechazar', documento, motivo? }`:
  - Valida `documento` == `cliente.documento` (normalizado: trim, sin puntos/espacios).
    Si no coincide → 400 sin cambiar estado.
  - Solo desde estado `enviada`. Si vencida o ya resuelta/convertida → 409, sin cambio.
  - aceptar → `estadoCotizacion='aceptada'`; rechazar → `'rechazada'` (+ `motivoRechazo`).
  - Registra evidencia `aprobacionPublica = { accion, fecha, ip, documentoConfirmado, motivo }`.

### Projection pública (campos seguros)
`{ nroCotizacion, estado, vencida, empresaNombre, clienteNombre, items[{titulo,cantidad,
precioUnitarioConIva,porcentajeIva,subtotal}], subtotal, totalDescuento, baseGravable,
totalImpuesto, total, terminos, fechaEmision, fechaVencimiento, validezDias }`.
**NO expone**: `cliente.documento` (es el secreto que el cliente confirma), costos/márgenes,
notas internas, id/consecutivo en la URL, datos de otras entidades.

## Frontend

- `app-routing.module.ts`: nueva ruta `{ path:'c', component: BlankComponent, children:[
  { path:'', loadChildren: () => CotizacionPublicaModule } ] }` (sin AuthGuard).
- `components/cotizacion-publica/`: módulo + routing `{ path:':token' }` + componente +
  servicio `extends BaseService` (`getPublica(token)`, `responder(token,body)`).
- Componente: estados loading / no-encontrada / vista. Render read-only del detalle
  (reusa el look del PDF/preview). Botones **Aceptar** / **Rechazar** → modal/inline que
  pide **documento** (y motivo si rechaza) → llama `responder`. Maneja vencida/ya-resuelta
  (muestra estado, oculta acciones).
- Editor (`cotizacion-editor`): el botón **WhatsApp** primero llama `share-token` (authed),
  arma `\`${location.origin}/c/${token}\`` y abre `wa.me` con el link incluido en el mensaje.

## Gates vs constitución
- **Art IX** (Angular services HTTP): ✅ servicio `extends BaseService`.
- **Seguridad**: token 192 bits, sin auth pero rate-limited, projection mínima, documento
  no expuesto. No toca 360 ni orders/inventory (solo colección `cotizaciones`).
- **Multitenant**: `company` del doc, no de headers (cliente no logueado).

## Riesgos
- **RT-1** Orden de rutas: `/public/:token` debe ir ANTES de `/:id` (ya hay esa convención).
- **RT-2** Interceptor del front agrega headers auth si hay sesión; en la landing (logout)
  no hay → ok. El endpoint público no los exige.
- **RT-3** `BlankComponent` debe existir y no cargar el shell autenticado (confirmado: lo usa
  `registrarse`, `video-agent`, `/r`).
