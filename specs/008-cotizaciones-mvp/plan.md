# Plan 008 — Cotizaciones (MVP: listado + editor)

> Estado: **draft** (para checkpoint humano antes de `tasks.md`)
> Vinculado a `spec.md` (estado: in-review/approved).
> Última actualización: 2026-06-14

## 1. Resumen técnico
Construimos el módulo **frontend fresco** en la rama actual (`feature/venta-asistida-mejorada`),
reusando la lógica de precios/IVA y el popup de configuración de la venta asistida para
garantizar fidelidad de cálculo. **Adoptamos y ajustamos el backend ya existente**
(`controllers/cotizaciones.js` montado en `/v1/cotizaciones`) en lugar de reescribirlo:
corregimos el consecutivo (transaccional + formato), la fidelidad de totales, los nombres
de estado, añadimos un endpoint de métricas (KPIs) y un documento de configuración de
términos. El HTML/SCSS de la rama `origin/cotizaciones` se usa **solo como referencia
visual**, no se fusiona. La cotización vive en su colección propia y nunca toca inventario
ni pedidos (la conversión a pedido y el portal de aprobación quedan para 008.2 / 008.3).

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | Spec 008 aprobada antes de este plan. |
| II — Spec captura intent | sí | Criterios EARS en spec §4. |
| IV — Idempotencia | sí | Consecutivo transaccional evita duplicados; editar es idempotente por id. |
| V — Eventos crudos antes de procesar | n/a | No hay webhooks/eventos externos en Fase 1. |
| VI — UI no acoplada a proveedor | sí | No hay proveedor externo; UI consume servicio propio. |
| VII — Observabilidad | sí | Creación/edición/consecutivo auditables; sin telemetría por console.log. |
| VIII — Test-first contratos | parcial | Contract tests de endpoints antes del happy path (Fase B). |
| IX — Estilo Angular | sí | Servicio extiende `BaseService`; nada de `HttpClient` directo en componentes; lazy module. |
| X — Seguridad webhooks | n/a | No aplica en Fase 1. |
| XI — Datos sensibles fuera del log | sí | No se loguean datos de cliente; errores sin PII. |
| XIII — Specs/plan acotados | sí | Fase 1 acotada; conversión y portal en sub-specs. |
| XV v2 — Canónica integraciones inglés | n/a | No hay campo de integración aquí. |

> Nota Art IX: el `cotizaciones.service.ts` de la rama `origin/cotizaciones` **no** extiende
> `BaseService` y fija headers manualmente — por eso construimos el servicio nuevo, no lo adoptamos.

## 3. Arquitectura

### 3.1 Componentes involucrados
- **Frontend (Angular, rama actual):** nuevo módulo lazy `src/app/components/cotizaciones/`.
  - `cotizaciones.module.ts` + `cotizaciones-routing.module.ts`.
  - `cotizaciones-lista/` (listado + KPIs + filtros + buscador + export).
  - `cotizacion-editor/` (editor: cliente, fechas, productos, totales, términos, estado, acciones).
  - `cotizaciones.service.ts extends BaseService`.
  - `modelo/cotizacion.ts` (interfaz).
  - **Reuso (no se reescribe):** `MaestroService` (clientes), `VentasService.getProductsByFilterPaginated/quickSearchProducts` (productos), `PaymentService.checkPriceScale/checkIVAPrice` (totales), `ConfProductToCartComponent` (popup config), modelo `Carrito/Configuracion` de ventas.
- **Backend (`Seller.Katuq.Back`):** ajustar `controllers/cotizaciones.js`, `routers/cotizaciones.js`, `services/cotizacionService.js`.
- **Almacenamiento (Firestore):** colección `cotizaciones`, contador `cotizaciones_counters/{company}`, config `cotizaciones_config/{company}`. Índices en `firestore.indexes.json`.
- **Cola/eventos:** ninguno en Fase 1.

### 3.2 Diagrama (texto)
```
[cotizaciones-lista] --GET /v1/cotizaciones/all|filter--> backend --query Firestore(where company)--> [cotizaciones]
        |  --GET /v1/cotizaciones/metrics--> backend --aggregate--> KPIs
        v (Nueva / abrir)
[cotizacion-editor]
   ├─ cliente:   MaestroService.searchClients / getClientByDocument
   ├─ productos: VentasService.getProductsByFilterPaginated  ──(requiereConfiguracion?)──> ConfProductToCartComponent (aislado)
   │                                                          └─ línea con _precioManualOverride / _ivaManualOverride
   ├─ totales:   PaymentService.checkPriceScale + checkIVAPrice + descuento global  (LOCAL, source of truth)
   ├─ términos:  GET /v1/cotizaciones/config (terminosBase default empresa)
   └─ guardar:   POST /create | PUT /edit  --consecutivo transaccional--> [cotizaciones]
```

### 3.3 Decisiones técnicas (con trazabilidad)

| Decisión | Requisito que la motiva | Alternativas descartadas |
|---|---|---|
| Frontend nuevo reusando `PaymentService` + `conf-product-to-cart` | EARS §4 "editar precio/IVA", "popup config", "totales como venta asistida" | Adoptar módulo de rama `cotizaciones` (no reusa pricing → no cumple fidelidad); fusionar rama (~190 archivos, riesgo alto). |
| **Frontend es source of truth de totales**; backend almacena lo recibido | NFR 5.1 (recálculo local instantáneo) + fidelidad de precios | Recalcular en backend con `calcularTotales` actual (simplista, diverge de venta asistida). |
| Consecutivo transaccional en `cotizaciones_counters/{company}` con `runTransaction` | EARS §4 "consecutivo único transaccional", NFR 5.5 | Mantener `generateCotizacionNumber` actual (lee último +1 → race condition). |
| Formato `COT-AAAA-MMDD-####`, contador continuo por empresa | D-CLAR-02 | Formato `COT-AAAA-NNNNNN` actual; reinicio diario/mensual (números repetidos). |
| Estados canónicos `borrador/enviada/aceptada/rechazada/vencida/convertida` + lectura tolerante de legacy | EARS §4 (estados) + consistencia con mocks | Mantener `Aprobada/Expirada` (inconsistente con UI). |
| Endpoint `/v1/cotizaciones/metrics` dedicado | D-CLAR-01, EARS §4 (KPIs) | Calcular KPIs en frontend sobre página (inexacto); reusar `getEstadisticas` (otra forma). |
| `cotizaciones_config/{company}.terminosBase` vía `GET/PUT /config` | D-CLAR-03, EARS §4 (términos) | Guardar en `CompanyInformation` (invasivo). |
| `ConfProductToCartComponent` en **modo aislado** (no escribir al singleton) | R-01 de la spec (carrito singleton global) | Reusar el carrito tal cual (contamina venta asistida activa). |
| Export Excel/CSV en frontend sobre el filtro vigente | EARS §4 (exportar) | Endpoint backend de export (innecesario para MVP). |

## 4. Modelo de datos

### 4.1 Documento `cotizaciones/{id}` (Firestore)
```
{
  nroCotizacion: "COT-2026-0614-0043",   // generado transaccional
  company: "OH MY STORE",                 // tenant (header company)
  estadoCotizacion: "borrador",           // borrador|enviada|aceptada|rechazada|vencida|convertida
  cliente: { ...Cliente },                // snapshot del cliente (doc, nombre, ciudad, email, tel, categoria?)
  vendedor: { email, nombre },            // usuario en sesión (D-CLAR / spec §3)
  items: [ {                              // forma compatible con Carrito de ventas
     producto: { ...snapshot precio/procesoComercial },
     cantidad, descuento,                 // descuento por línea (%)
     _precioManualOverride?, _ivaManualOverride?,
     configuracion?: { ...adiciones/preferencias }
  } ],
  descGlobal: 0,                          // % descuento global (antes de IVA)
  // Totales calculados en frontend (source of truth):
  subtotal, totalDescuento, baseGravable, totalImpuesto, total,
  terminos: "…",                          // texto por cotización (precargado del default)
  fechaCreacion: ISO, fechaEmision: ISO,
  fechaVencimiento: ISO,  validezDias: 15,
  convertidaAPedido: false, pedidoGenerado?: null,  // para 008.2
  date_edit: ISO, user_edit: email
}
```

### 4.2 `cotizaciones_counters/{company}`
```
{ seq: 43 }   // contador continuo por empresa, incrementado en runTransaction
```

### 4.3 `cotizaciones_config/{company}`
```
{ terminosBase: "• Precios en COP…", updatedAt: ISO, updatedBy: email }
```

### 4.4 Índices Firestore (añadir a `firestore.indexes.json`)
```
cotizaciones: (company ASC, fechaCreacion DESC)
cotizaciones: (company ASC, estadoCotizacion ASC, fechaCreacion DESC)
```

## 5. Contratos (API)

> Base: `/v1/cotizaciones`. Auth middleware existente. Tenant vía header `company` (lo agrega el interceptor). Respuesta `{ success, data|message, pagination? }` (patrón actual).

| Método | Endpoint | Estado | Cambio |
|---|---|---|---|
| POST | `/create` | existe | Ajustar: consecutivo transaccional + almacenar totales del frontend (no recalcular), estado canónico, `vendedor`, `terminos`. |
| PUT | `/edit` | existe | Ajustar: no recalcular totales (almacenar los del frontend); mantener bloqueo si `convertidaAPedido`. |
| GET | `/all` | existe | Ajustar: `total` con `.count().get()` (no leer todos); filtros estado/vendedor; map de estado legacy→canónico. |
| POST | `/filter` | existe | Mantener; map estado legacy→canónico; documentar uso para filtros avanzados. |
| GET | `/:id` | existe | Mantener; map estado; check company. |
| GET | `/number/:numero` | existe | Mantener. |
| DELETE | `/delete` | existe | Mantener (rol admin). |
| GET | `/metrics` | **nuevo** | KPIs: `{ cotizadoMes, pipelineActivo, tasaConversion, borradores }` agregando por company. |
| GET | `/config` | **nuevo** | Devuelve `cotizaciones_config/{company}` (terminosBase). |
| PUT | `/config` | **nuevo (opcional Fase 1)** | Actualiza `terminosBase` (rol admin). |
| GET | `/export/pdf/:id` | stub 501 | Fuera de Fase 1 (PDF se genera en frontend con jsPDF). |
| POST | `/enviar-email` | stub 501 | Fuera de Fase 1 (va en 008.3). |
| POST | `/convertir-pedido` | existe | Fuera de Fase 1 (se valida/ajusta en 008.2). |

### 5.1 Idempotencia
- Consecutivo: `runTransaction` sobre `cotizaciones_counters/{company}` → un número por cotización aunque haya concurrencia.
- Edit: idempotente por `id` (sobrescribe estado/campos).

### 5.2 Errores (se mantiene patrón actual)
| Código | Cuándo | Cuerpo |
|---|---|---|
| 201 | create ok | `{success:true, data:{id, nroCotizacion, ...}}` |
| 200 | get/list/edit ok | `{success:true, data, pagination?}` |
| 400 | falta `company`, falta cliente/items, edit de convertida | `{success:false, message}` |
| 403 | cotización de otra empresa | `{success:false, message}` |
| 404 | id/número inexistente | `{success:false, message}` |
| 500 | error interno | `{success:false, message, error}` |

## 6. Estrategia de testing
- **Contract tests (primero):** `/create` asigna consecutivo único con formato correcto; `/all` filtra por company y nunca devuelve de otra empresa; `/metrics` retorna los 4 KPIs; concurrencia: N `/create` en paralelo → N números distintos (valida transacción).
- **Integration:** crear → listar → obtener → editar → cambiar estado, contra Firestore (emulator o tenant de prueba).
- **E2E (manual con `/verify`):** flujo del editor — seleccionar cliente, agregar producto con config (popup), editar precio/IVA, ver totales, guardar borrador, PDF, WhatsApp.
- **Unit:** mapper de estado legacy→canónico; armado del payload de la cotización desde el estado del editor.

## 7. Fases de implementación
1. **Fase A — Backend: consecutivo + estados + totales.** `runTransaction` en `cotizaciones_counters`, formato `COT-AAAA-MMDD-####`; estados canónicos + lectura tolerante; create/edit almacenan totales del frontend (quitar recálculo lossy). Índices.
2. **Fase B — Backend: métricas + config términos.** `GET /metrics` (4 KPIs), `GET/PUT /config`. Contract tests de A+B.
3. **Fase C — Frontend scaffolding.** Módulo lazy + routing + `CotizacionesService extends BaseService` + modelo + registro en `routes.ts`, `nav.service.ts` (Gestión Comercial) y `modules-catalog.ts`.
4. **Fase D — Listado.** Tabla server-side (paginación/filtros/buscador/orden) + KPIs (`/metrics`) + export + acciones (nueva/abrir/duplicar).
5. **Fase E — Editor: cliente + fechas + términos.** Picker de cliente (MaestroService), fechas, términos precargados de `/config`.
6. **Fase F — Editor: productos (núcleo).** Picker con `getProductsByFilterPaginated`; `requiereConfiguracion` → `ConfProductToCartComponent` **aislado**; línea con `_precioManualOverride`/`_ivaManualOverride`; ítem libre. **Spike previo:** validar integración del modal sin tocar el singleton (R-01).
7. **Fase G — Editor: totales + estado + guardar.** Panel con `PaymentService` (subtotal/desc/base/IVA/total + desc global); badge de estado; guardar borrador (create/edit); validaciones.
8. **Fase H — Acciones de compartir.** PDF (jsPDF, patrón `generarOrdenVenta`) + WhatsApp (`wa.me`).
9. **Fase I — QA + verificación** con `/verify` y ajustes de UI contra la referencia visual de la rama.

## 8. Plan de rollout
- **Feature flag / visibilidad:** el ítem de menú "Cotizaciones" se controla por el catálogo de permisos (`modules-catalog.ts`) — se habilita por rol. Sin flag adicional.
- **Rollout:** dark-launch (ruta accesible, ítem de menú solo para roles autorizados) → habilitar a piloto → 100%.
- **Rollback:** quitar el ítem de menú/permiso; los endpoints backend nuevos son aditivos (no rompen lo existente).

## 9. Riesgos técnicos
- **RT-01 (R-01 spec):** integrar `ConfProductToCartComponent` sin contaminar `CartSingletonService`. Mitigación: spike en Fase F (modo aislado: leer salida del modal hacia el array de la cotización; si requiere refactor del modal, acotarlo y registrarlo).
- **RT-02:** el backend recalculaba totales con fórmula simplista; si no se desactiva, sobrescribiría los totales correctos del frontend. Mitigación: Fase A quita el recálculo en create/edit.
- **RT-03:** colección `cotizaciones` puede tener docs legacy con estados `Aprobada/Expirada` y consecutivos viejos. Mitigación: lectura tolerante (map a canónico) sin migración destructiva.
- **RT-04:** `.count().get()` requiere versión de SDK admin compatible; si no, fallback a conteo por query acotada. Verificar en Fase A.
- **RT-05:** export Excel necesita confirmar que la lib (xlsx) ya está en el bundle; si no, usar CSV nativo.

## 10. Open questions (técnicas)
- [x] **RESUELTA (T-02 spike, 2026-06-14):** `ConfProductToCartComponent` ya soporta devolver el `Carrito` configurado sin tocar el singleton. En su método "agregar", si `isEdit || isRebuy` NO llama `carsingleton.addToCart` sino `dismissCurrentModal(ProductoCompra)` → `modalRef.dismiss(ProductoCompra)`, devolviendo el `Carrito` como resultado del modal (`conf-product-to-cart.component.ts:1649-1692, 1532-1539`). **Integración cotizaciones:** abrir el componente vía `NgbModal` pasando `@Input producto` + `@Input modalRef` (la `NgbModalRef`) + un flag que enrute al camino de retorno (reusar semántica `isRebuy`, o añadir un `@Input` aditivo p.ej. `returnOnly` que retorne sin preload de edición). Cotizaciones lee el resultado del modal y lo empuja a SU propio array `items`. Venta asistida queda intacta (flag aditivo, default false). **RT-01 → BAJO.**
- [x] **RESUELTA (T-01 auditoría, 2026-06-14):** la colección `cotizaciones` tiene solo **3 docs de prueba** (1 empresa), todos estado `Borrador` (legacy capitalizado) y consecutivo legacy `COT-2025-000001..3`. `cotizaciones_counters` y `cotizaciones_config` no existen. **Decisión:** lectura tolerante (map `Borrador→borrador`, etc.); **NO backfill destructivo**. El formato nuevo `COT-AAAA-MMDD-####` no colisiona con el legacy, así que el contador nuevo arranca en 1 por empresa.
- [x] **RESUELTA:** `PUT /config` entra en Fase 1 (es de bajo costo y deja la gestión de términos base completa). `GET /config` siembra un default si el doc no existe.
