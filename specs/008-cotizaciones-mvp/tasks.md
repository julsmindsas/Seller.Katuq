# Tasks 008 — Cotizaciones (MVP: listado + editor)

> Estado: **in-progress** (Bloques 0, A/B backend, C, D completos · **editor E/F/G COMPLETO: T-18..T-22 ✅** · **compartir H COMPLETO: T-23/T-24 ✅** · **T-25 QA en verificación**)
> Vinculado a `plan.md` (approved).
> Última actualización: 2026-06-17
>
> ⏯️ **RETOMAR AQUÍ (próxima sesión): cerrar T-25** — falta el click-through E2E en navegador por el usuario (stack local quedó levantado: FE :4200 + BE :3300; FE apunta a `localhost:3300`). Ya verificado por code audit: **0 escrituras inventory/orders** (métrica spec §10 ✅). En esta sesión además: listado rediseñado (Bootstrap ref), fix filtro de estado BE (en memoria tras normalizar), búsqueda de productos por nombre (`searchBy=all`). ⚠️ Pendientes transversales: T-10 integración (emulador Firestore=Java) y **commit en 2 repos** (nada commiteado aún — incluye fix preexistente `clientes-lista` chip 'inactivo'→'bloqueado' acordado para desbloquear `ng serve`).
> ✅ **T-23/T-24 HECHO (2026-06-16):** **PDF** con jsPDF + autoTable (import dinámico para no engordar bundle, patrón de `report-view.component`): encabezado con nombre de empresa (`SecurityService.getCompanyInformationLogged`), nro+estado, fechas/vendedor, bloque cliente, tabla de ítems (#/Descripción/Cant/IVA%/V.Unit/Subtotal), totales (subtotal, descuento si >0, base gravable, IVA, TOTAL), términos con `splitTextToSize`; `pdf.save("cotizacion-<nro>.pdf")`; flag `generandoPDF`. **WhatsApp** abre `https://wa.me/<celular>?text=...` (celular del cliente saneado a dígitos; sin celular → `wa.me/?text=`) con mensaje prellenado (saludo, nro, total, validez). Botones en footer (`cot-footer-left` PDF/WhatsApp, `cot-footer-right` Cancelar/Guardar), gateados por `puedeGuardar`. `tsc` + AOT 0 errores en 008 (solo los 2 preexistentes de `clientes-lista`).
> ✅ **T-22 HECHO (2026-06-16):** `guardar()` en `cotizacion-editor`. Validaciones (EARS): cliente obligatorio + ≥1 ítem + ítems libres con descripción. Payload = `{ ...cotizacion, vendedor, descGlobal:%, subtotal/totalDescuento/baseGravable/totalImpuesto/total (getters), fechaEmision/fechaVencimiento→ISO, validezDias }`. `cotizacionId` → `edit({...payload, id})` (backend lee `req.body.id`, borra id/nro/company del update); sin id → `create` (consecutivo + nro en backend). Backend persiste los totales del frontend porque `total` es número (T-04, sin recálculo). On success: toast + navega a `/cotizaciones`. Flag `saving` anti doble-submit; barra de acciones sticky (Cancelar/Guardar) con `[disabled]="saving || !puedeGuardar"`. **Nota TS:** `req$` tipado `any` (la unión de los 2 Observable edit/create no tiene `.subscribe` combinable — TS2349). `tsc` + AOT 0 errores en 008 (solo los 2 preexistentes de `clientes-lista`).
> ✅ **T-21 HECHO (2026-06-16):** panel de totales + descuento global + menú de estado en `cotizacion-editor`. Getters en el componente: `subtotal` (Σ precioSinIva×cant), `ivaSinDescuento` (privado), `descGlobalPct` (saneado 0–100 desde `cotizacion.descGlobal`), `totalDescuento` (=subtotal×desc%), `baseGravable` (=subtotal−desc), `totalImpuesto` (=ivaSinDescuento×(1−desc%) → **IVA sobre base ya descontada**, descuento global ANTES de IVA), `total` (=baseGravable+totalImpuesto). `onDescGlobalChange` clampa 0–100. Estado: `estadosEditables` (excluye `vencida`/`convertida`, derivados del sistema), `estadoLabel`, `cambiarEstado`; header con badge + `<select>`. Template: card "Totales" (subtotal, descuento global con input %, base gravable, IVA, total) + hint "descuento antes de IVA". SCSS `.cot-totales/.cot-tot-*/.estado-wrap`. Nota: descuento global es **%** (no monto), fiel a `porceDescuento` de venta asistida; matemáticamente, %·antes-de-IVA da el mismo gran total que %·después-de-IVA pero reporta bien base gravable/IVA para facturación. `tsc` + AOT 0 errores en 008 (solo los 2 preexistentes de `clientes-lista`).
> ✅ **T-20 HECHO (2026-06-16):** Edición de precio/IVA por línea, réplica fiel del carrito de venta asistida. Métodos en `cotizacion-editor.component.ts`: `permitePrecioManual` (ítem libre o `producto.procesoComercial.permitePrecioManual`), `getIvaActual` (`_ivaManualOverride` ?? `precio.precioUnitarioIva`), `itemPrecio` (con IVA aplicando overrides: `_precioManualOverride`=base sin IVA × (1+iva); o `_ivaManualOverride` recalcula desde `precioUnitarioSinIva`; o `precioUnitarioConIva`), `itemPrecioOriginal`/`getPrecioSinIva`/`getValorIva`/`tieneOverride`, `onPrecioManualInput`/`onPrecioManualConfirm` (temp + restaura si vacío/inválido) / `onIvaManualChange`. Template: input precio base + `<select>` IVA (0/5/8/19%) + desglose "+IVA =total" + precio original tachado; ramas `permitePrecioManual` (precio editable) vs `#soloIvaEditable` (precio fijo, IVA editable). SCSS: grid `1fr 80px 210px 120px 40px`, `.cl-price-edit/.cl-price-row/.cl-price-input/.cl-iva-select/.cl-price-break/.cl-price-orig`. Modelo: `Carrito._precioManualTemp?: any` añadido a `ventas/modelo/pedido.ts` (aditivo, ya usado en runtime por el carrito). **`tsc --noEmit`: 0 errores; build AOT: 0 errores en cotizaciones** (solo los 2 errores preexistentes de `clientes-lista`, ajenos a 008).
> ✅ **T-18 HECHO (2026-06-15):** `cotizacion-editor` con picker de cliente (autocomplete debounce vía `MaestroService.searchClients`), tarjeta de cliente seleccionado, fecha emisión (auto hoy) + validez (días) ↔ válida hasta (recálculo bidireccional), vendedor (usuario en sesión, readonly), términos precargados de `GET /config` (editables). Carga existente vía `getById`.
> ✅ **T-19 HECHO (2026-06-15):** picker de productos (autocomplete debounce vía `VentasService.quickSearchProducts`, nombre/ref), `requiereConfiguracion()` replicado; con config → abre `ConfProductToCartComponent` (`returnOnly=true`, sin contaminar carrito; save/restore de `sessionStorage.cliente` para precio por categoría); sin config → línea directa (réplica `agregarRapido` + precio por categoría desde el cliente de la cotización); ítem libre; tabla de líneas (cant. editable, subtotal, eliminar). **Decisión D-042 (Opción A):** nuevo `CatalogoSharedModule` declara+exporta `ConfProductToCartComponent`; `VentasModule` y `CotizacionesModule` lo importan; `@Input returnOnly` aditivo (venta asistida intacta). **Build AOT (`ng build`): 0 errores en cotizaciones/catálogo** (verificado el wiring entre módulos lazy). ⚠️ El build global falla por **2 errores AOT PREEXISTENTES en `ventas/clientes/lista/clientes-lista.component.html`** (chip "Inactivos" usa `'inactivo'` fuera del tipo `'todos'|'activo'|'bloqueado'`) — ajeno a 008, requiere decisión del dueño de clientes.
> 🔧 **Pendiente transversal:** correr T-10 integración (necesita emulador Firestore = Java) y verificación de templates frontend vía `npm start`/`ng build`. Nada commiteado aún (2 repos).
>
> **Progreso (Bloque 0 + Bloque A/B backend):**
> ✅ T-01 auditoría legacy · ✅ T-02 spike popup · ✅ T-03 consecutivo transaccional · ✅ T-04 totales del frontend (sin recálculo lossy) · ✅ T-05 estados canónicos + `normalizarEstado` · ✅ T-06 `GET /metrics` · ✅ T-07 `GET/PUT /config` + default · ✅ T-08 `getAll` con `count()` · ✅ T-09 índices Firestore.
> 🟡 T-10 contract tests: **9/9 puras PASS**; 6 de integración escritas pero SKIP (requieren emulador Firestore = Java, no instalado; o tenant de prueba con escrituras). Archivo: `functions/scripts/test-cotizaciones-contract.js` (`npm run test:cotizaciones-contract`).
> **Bloque C frontend:** ✅ T-11 scaffolding · ✅ T-12 servicio (`CotizacionesService extends BaseService`) · ✅ T-13 modelo (`cotizacion.ts`, reusa `Carrito`/`Cliente`).
> **Bloque D listado (COMPLETO):** ✅ T-14 tabla server-side (paginación, chips por estado, buscador `q`, orden, badges, alerta validez) · ✅ T-15 KPIs (`/metrics` con `total`+`porEstado` para chips, cards plano border-left) · ✅ T-16 export Excel (`xlsx`, todo el filtro vigente) · ✅ T-17 acciones de fila (abrir + duplicar). Backend `getAll` con búsqueda `q` y `getMetrics` con porEstado (aditivos). `tsc --noEmit`: 0 errores. Pendiente verificación de template vía `ng build`/`npm start`.
> **Bloque E/F/G editor (COMPLETO):** ✅ T-18 scaffold (cliente+fechas+términos+vendedor) · ✅ T-19 (productos+popup config, D-042 módulo compartido) · ✅ T-20 (precio/IVA por línea, patrón carrito) · ✅ T-21 (totales+desc global antes de IVA+menú estado) · ✅ T-22 (guardar create/edit + validaciones). 🔜 Bloque H: T-23 (PDF) · T-24 (WhatsApp) → T-25 QA.

## Convenciones
- `[P]` = paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de la tarea NN.
- **BE** = repo backend `C:\Users\julia\Documents\Seller.Katuq.Back\katuq_admin_back_firebase`.
- **FE** = repo frontend `C:\Users\julia\Documents\Seller.Katuq` (rama `feature/venta-asistida-mejorada`).

---

## Bloque 0 — Pre-flight (resuelve open questions del plan)

### T-01 — Auditar datos legacy de `cotizaciones` (read-only) `[P]` ✅ HECHO
- **Input:** acceso Firestore (tenant de prueba / prod).
- **Output:** reporte: ¿hay docs en `cotizaciones`? ¿con estados `Aprobada/Expirada`? ¿formato de `nroCotizacion`?
- **Criterio de éxito:** sabemos si el map de estados/consecutivo necesita backfill o solo lectura tolerante (open question #2 del plan). **CERO escrituras.**
- **Archivos a tocar:** script de lectura efímero (no commit) o consulta manual.
- **Dependencias:** ninguna.
- **Resultado (2026-06-14):** 3 docs de prueba (1 empresa), estado `Borrador` legacy, consecutivo `COT-2025-00000N` legacy; `cotizaciones_counters`/`cotizaciones_config` no existen. → lectura tolerante, sin backfill; contador nuevo arranca en 1 (formato distinto, sin colisión). Script efímero ejecutado read-only (TLS relajado por proxy del entorno) y eliminado.

### T-02 — Spike: `ConfProductToCartComponent` en modo aislado `[P]` ✅ HECHO
- **Input:** `src/app/components/ventas/catalogo/conf-product-to-cart/conf-product-to-cart.component.ts` + `cart.singleton.service.ts`.
- **Output:** conclusión documentada: ¿el modal puede devolver el `Carrito` configurado sin escribir al singleton (Output/flag), o requiere refactor menor acotado? (open question #1 del plan, riesgo RT-01).
- **Criterio de éxito:** decisión técnica clara registrada en el plan/CONTRACT; si requiere refactor, queda acotado antes de T-18.
- **Archivos a tocar:** ninguno (análisis) — si hay refactor, se define su alcance aquí.
- **Dependencias:** ninguna.
- **Resultado (2026-06-14):** el componente YA devuelve el `Carrito` sin tocar el singleton cuando `isEdit||isRebuy` (`agregar()` → `dismissCurrentModal(ProductoCompra)` → `modalRef.dismiss(ProductoCompra)`, líneas 1649-1692/1532-1539). Plan T-19: abrir vía `NgbModal` con `@Input producto`+`@Input modalRef`+flag de retorno (reusar `isRebuy` o añadir `@Input returnOnly` aditivo, default false); cotizaciones lee el resultado y lo empuja a su array. Venta asistida intacta. **RT-01 → BAJO.**

---

## Bloque A/B — Backend (adoptar y ajustar)

### T-03 — Consecutivo transaccional + formato `COT-AAAA-MMDD-####` (BE) ✅ HECHO
- **Input:** `controllers/cotizaciones.js` (`generateCotizacionNumber`, `create`).
- **Output:** contador `cotizaciones_counters/{company}` con `runTransaction`; número `COT-${year}-${mmdd}-${seq.padStart(4)}`, contador continuo por empresa.
- **Criterio de éxito:** N `create` concurrentes → N números únicos; formato correcto. (EARS consecutivo, D-CLAR-02, NFR 5.5)
- **Archivos a tocar:** `functions/controllers/cotizaciones.js`.
- **Dependencias:** T-01.

### T-04 — Almacenar totales del frontend (quitar recálculo lossy) (BE) (deps: T-03)
- **Input:** `create` y `edit` en `controllers/cotizaciones.js` (`calcularTotales`).
- **Output:** create/edit persisten `subtotal/totalDescuento/baseGravable/totalImpuesto/total` recibidos; NO se recalcula con la fórmula simplista.
- **Criterio de éxito:** un payload con totales del frontend se guarda intacto; `calcularTotales` deja de sobrescribir. (Decisión "frontend source of truth", RT-02)
- **Archivos a tocar:** `functions/controllers/cotizaciones.js`.
- **Dependencias:** T-03.

### T-05 — Estados canónicos + lectura tolerante de legacy (BE) `[P]`
- **Input:** `EstadoCotizacion` + lecturas (`getAll`, `getById`, `getByNumber`, `filter`).
- **Output:** set canónico `borrador/enviada/aceptada/rechazada/vencida/convertida`; mapper de lectura `Aprobada→aceptada`, `Expirada→vencida`; lógica de expiración usa `vencida`.
- **Criterio de éxito:** docs legacy se devuelven con estado canónico; nuevos se guardan canónicos. (EARS estados, RT-03)
- **Archivos a tocar:** `functions/controllers/cotizaciones.js`.
- **Dependencias:** T-01 (define si hay legacy).

### T-06 — Endpoint `GET /v1/cotizaciones/metrics` (4 KPIs) (BE) `[P]`
- **Input:** colección `cotizaciones` por company.
- **Output:** `{ cotizadoMes, pipelineActivo, tasaConversion, borradores }` agregando por empresa (cotizado del mes en curso; pipeline = enviada+aceptada; conversión = convertidas÷no-borrador; borradores = count).
- **Criterio de éxito:** valores coinciden con cálculo manual sobre un set de prueba. (D-CLAR-01, EARS KPIs)
- **Archivos a tocar:** `functions/controllers/cotizaciones.js`, `functions/routers/cotizaciones.js`.
- **Dependencias:** ninguna.

### T-07 — Endpoints `GET/PUT /v1/cotizaciones/config` (términos base) (BE) `[P]`
- **Input:** `cotizaciones_config/{company}`.
- **Output:** `GET` devuelve `{ terminosBase }` (default sembrado si no existe); `PUT` (rol admin) actualiza `terminosBase`.
- **Criterio de éxito:** GET retorna default; PUT persiste y GET refleja el cambio. (D-CLAR-03, EARS términos)
- **Archivos a tocar:** `functions/controllers/cotizaciones.js`, `functions/routers/cotizaciones.js`.
- **Dependencias:** ninguna.

### T-08 — Paginación eficiente en `getAll` (BE) (deps: T-05)
- **Input:** `getAll` (hoy lee todos para contar).
- **Output:** `total` vía `.count().get()` (con fallback si el SDK no lo soporta, RT-04); filtros estado/vendedor mantenidos.
- **Criterio de éxito:** listado paginado correcto sin leer toda la colección. (D-CLAR-04)
- **Archivos a tocar:** `functions/controllers/cotizaciones.js`.
- **Dependencias:** T-05.

### T-09 — Índices Firestore para `cotizaciones` (BE) `[P]`
- **Input:** `firestore.indexes.json`.
- **Output:** `(company ASC, fechaCreacion DESC)` y `(company ASC, estadoCotizacion ASC, fechaCreacion DESC)`.
- **Criterio de éxito:** índices declarados y desplegables; queries del listado/filtro no fallan por índice faltante.
- **Archivos a tocar:** `firestore.indexes.json`.
- **Dependencias:** ninguna.

### T-10 — Contract tests backend (BE) (deps: T-03,T-04,T-05,T-06,T-07,T-08)
- **Input:** endpoints ajustados/nuevos.
- **Output:** tests: create asigna consecutivo único+formato; concurrencia → números distintos; multi-tenant (no fuga entre empresas); `/metrics` 4 KPIs; `/config` GET/PUT.
- **Criterio de éxito:** todos verdes contra emulator/tenant de prueba. (plan §6, Art VIII)
- **Archivos a tocar:** carpeta de tests del backend.
- **Dependencias:** T-03..T-08.

---

## Bloque C — Frontend scaffolding

### T-11 — Módulo lazy + routing + registro (FE) `[P]` ✅ HECHO
- **Input:** patrones de `despachos.module.ts` / `routes.ts` / `nav.service.ts` / `modules-catalog.ts`.
- **Output:** `src/app/components/cotizaciones/{cotizaciones.module.ts, cotizaciones-routing.module.ts}`; ruta lazy `cotizaciones` en `shared/routes/routes.ts` con `AuthGuard`; ítem de menú en "Gestión Comercial" (`nav.service.ts`); entrada en `modules-catalog.ts` (acciones view/create/edit/delete).
- **Criterio de éxito:** navegar a `/cotizaciones` carga el módulo (placeholder); ítem visible por permiso.
- **Archivos a tocar:** módulo nuevo + `routes.ts`, `nav.service.ts`, `modules-catalog.ts`.
- **Dependencias:** ninguna.

### T-12 — `CotizacionesService extends BaseService` (FE) `[P]`
- **Input:** contratos del plan §5; `BaseService`.
- **Output:** métodos: `list(filtro,page,size)`, `getById`, `create`, `edit`, `delete`, `metrics`, `getConfig`, `updateConfig`. Sin `HttpClient` directo (Art IX).
- **Criterio de éxito:** compila; cada método pega al endpoint correcto con prefijo `/v1/cotizaciones`.
- **Archivos a tocar:** `cotizaciones/cotizaciones.service.ts`.
- **Dependencias:** ninguna (contrato conocido).

### T-13 — Modelo `cotizacion.ts` (FE) `[P]`
- **Input:** modelo de datos del plan §4 + `Carrito/Configuracion` de ventas.
- **Output:** interfaz `Cotizacion` (cliente, vendedor, items, descGlobal, totales, terminos, fechas, estado) + enum estados canónicos.
- **Criterio de éxito:** tipado reutilizable en service/componentes.
- **Archivos a tocar:** `cotizaciones/modelo/cotizacion.ts`.
- **Dependencias:** ninguna.

---

## Bloque D — Listado

### T-14 — Componente listado: tabla server-side (FE) (deps: T-11,T-12,T-13) ✅ HECHO
- **Input:** `CotizacionesService.list`, patrón paginado de órdenes.
- **Output:** `cotizaciones-lista` con tabla (número, cliente, vendedor, emisión, válida hasta, total, estado, acciones), paginación/orden server-side, buscador y chips de filtro por estado; marca "vencida" visual.
- **Criterio de éxito:** lista paginada, busca, filtra y ordena correctamente; multi-tenant. (EARS listado)
- **Archivos a tocar:** `cotizaciones/cotizaciones-lista/*`.
- **Dependencias:** T-11,T-12,T-13.

### T-15 — Panel de KPIs (FE) (deps: T-12,T-14) ✅ HECHO
- **Input:** `CotizacionesService.metrics`.
- **Output:** 4 tarjetas (cotizado mes, pipeline activo, tasa conversión, borradores) estilo plano `border-left` (no gradientes).
- **Criterio de éxito:** KPIs muestran valores del endpoint `/metrics`. (EARS KPIs)
- **Archivos a tocar:** `cotizaciones-lista/*`.
- **Dependencias:** T-12,T-14.

### T-16 — Exportar listado (FE) (deps: T-14) ✅ HECHO
- **Input:** filas del filtro vigente; verificar lib `xlsx` en bundle (RT-05).
- **Output:** botón "Exportar" → Excel (o CSV nativo si no hay xlsx).
- **Criterio de éxito:** descarga archivo con las cotizaciones filtradas. (EARS export)
- **Archivos a tocar:** `cotizaciones-lista/*`.
- **Dependencias:** T-14.

### T-17 — Acciones de fila + Nueva (FE) (deps: T-14) ✅ HECHO
- **Input:** navegación al editor.
- **Output:** "Nueva cotización", abrir (clic fila/✎), duplicar.
- **Criterio de éxito:** abren el editor en el estado correcto. (EARS nueva/abrir/duplicar)
- **Archivos a tocar:** `cotizaciones-lista/*`.
- **Dependencias:** T-14.

---

## Bloque E/F/G — Editor

### T-18 — Editor scaffold: cliente + fechas + términos (FE) (deps: T-11,T-12,T-13) ✅ HECHO
- **Input:** `MaestroService.searchClients/getClientByDocument`, `CotizacionesService.getConfig`.
- **Output:** `cotizacion-editor` con picker de cliente existente, datos del cliente, fecha emisión (auto) + válida hasta, vendedor (usuario en sesión), términos precargados del default de empresa (editable por cotización).
- **Criterio de éxito:** seleccionar cliente y fechas; términos precargados. (EARS cliente/fechas/términos, D-CLAR-05 solo seleccionar)
- **Archivos a tocar:** `cotizaciones/cotizacion-editor/*`.
- **Dependencias:** T-11,T-12,T-13.
- **Resultado (2026-06-15):** picker de cliente con autocomplete (debounce 300ms, `searchClients`, mín. 2 chars) → tarjeta de cliente seleccionado con doc/correo/celular y botón "Cambiar". Fecha de emisión auto (hoy) + validez en días ↔ "válida hasta" con recálculo bidireccional. Vendedor = usuario en sesión (`localStorage.user`, readonly). Términos precargados de `GET /config` (solo si vacíos), editables por cotización vía `ngModel`. Modo edición carga vía `getById` y mapea fechas/validez. Badge de estado. Productos = placeholder inline hasta T-19. `tsc --noEmit`: 0 errores.

### T-19 — Editor productos: picker + popup config + líneas (FE) (deps: T-18,T-02) ✅ HECHO
- **Input:** `VentasService.getProductsByFilterPaginated/quickSearchProducts`; `requiereConfiguracion()`; `ConfProductToCartComponent` en modo aislado (según spike T-02).
- **Output:** picker con filtros (nombre/ref/marca/categoría/subcategoría); si requiere config → popup antes de añadir; línea con cantidad/precio/desc/IVA; ítem libre; eliminar línea; precio por categoría de cliente aplicado.
- **Criterio de éxito:** productos con config piden popup; sin config se añaden directo; **no se contamina el carrito de venta asistida** (R-01). (EARS productos)
- **Archivos a tocar:** `cotizacion-editor/*` (+ refactor acotado del modal si el spike lo definió).
- **Dependencias:** T-18, T-02.
- **Resultado (2026-06-15):** picker por nombre/ref vía `quickSearchProducts` (debounce 300ms). `requiereConfiguracion()` replicado de venta asistida → con config abre `ConfProductToCartComponent` vía `NgbModal.open(component)` con `returnOnly=true` (devuelve `Carrito` por `dismiss`, sin tocar el singleton); sin config arma la línea directa (réplica de `agregarRapido`). Precio por categoría: directo desde `cotizacion.cliente`; en el popup vía save/restore de `sessionStorage.cliente`. Ítem libre + tabla de líneas (cantidad editable, subtotal, eliminar). **Refactor (D-042 Opción A):** `CatalogoSharedModule` declara+exporta el popup; `VentasModule`/`CotizacionesModule` lo importan; `@Input returnOnly` aditivo. Build AOT 0 errores en 008. **Nota:** filtros marca/categoría/subcategoría no incluidos (picker por nombre/ref cubre el caso primario) — refinamiento opcional posterior. **Pendiente externo:** 2 errores AOT preexistentes en `clientes-lista` bloquean el build global (ajeno a 008).

### T-20 — Edición de precio/IVA por línea (FE) (deps: T-19) ✅ HECHO
- **Input:** `permitePrecioManual`, `_precioManualOverride`, `_ivaManualOverride`, `getIvaActual` (patrón carrito).
- **Output:** editar precio (si `permitePrecioManual`) e IVA por línea; recálculo de total de línea.
- **Criterio de éxito:** comportamiento idéntico al carrito de venta asistida. (EARS precio/IVA)
- **Archivos a tocar:** `cotizacion-editor/*`.
- **Dependencias:** T-19.
- **Resultado (2026-06-16):** réplica fiel de `checkPriceScale`/`getIvaActual`/`onPrecioManual*`/`onIvaManualChange` del carrito. `_precioManualOverride` se interpreta como precio BASE sin IVA (× (1+iva%)); `_ivaManualOverride` recalcula desde `precioUnitarioSinIva`; sin overrides usa `precioUnitarioConIva`. Ítems libres siempre `permitePrecioManual=true`. UI: input precio base + select IVA (0/5/8/19) + desglose "+IVA =total" + precio original tachado; `itemSubtotal` = `itemPrecio` (con IVA) × cantidad recalcula en vivo. `Carrito._precioManualTemp` añadido al modelo. `tsc` + AOT 0 errores en 008.

### T-21 — Panel de totales + descuento global + estado (FE) (deps: T-19) ✅ HECHO
- **Input:** `PaymentService.checkPriceScale/checkIVAPrice`.
- **Output:** subtotal, descuentos, base gravable, IVA, total; descuento global (antes de IVA); badge de estado con menú; recálculo en tiempo real.
- **Criterio de éxito:** totales coinciden con venta asistida; desc global aplica antes de IVA. (EARS totales/estado, NFR 5.1)
- **Archivos a tocar:** `cotizacion-editor/*`.
- **Dependencias:** T-19.
- **Resultado (2026-06-16):** getters reactivos en el componente (recálculo en vivo, sin round-trip): `subtotal`/`totalDescuento`/`baseGravable`/`totalImpuesto`/`total`. Descuento global = **%** sobre subtotal, aplicado ANTES de IVA → `totalImpuesto = Σ(valorIva×cant)×(1−desc%)`, `baseGravable = subtotal−desc`. Menú de estado (badge + `<select>`) con `estadosEditables` (excluye `vencida`/`convertida`). Card "Totales" con input de descuento %. `tsc` + AOT 0 errores en 008.

### T-22 — Guardar borrador (create/edit) + validaciones (FE) (deps: T-12,T-20,T-21) ✅ HECHO
- **Input:** `CotizacionesService.create/edit`; estado del editor → payload (items con overrides, totales, terminos, vendedor, fechas, estado).
- **Output:** guardar nueva (consecutivo backend) / editar; validar cliente + ≥1 producto.
- **Criterio de éxito:** guarda y vuelve al listado; bloquea sin cliente/productos. (EARS persistencia)
- **Archivos a tocar:** `cotizacion-editor/*`.
- **Dependencias:** T-12,T-20,T-21.
- **Resultado (2026-06-16):** `guardar()` valida cliente + ≥1 ítem + descripción en ítems libres. Payload con totales (getters T-21) y fechas→ISO; `edit({...,id})` vs `create` según `cotizacionId`. Backend persiste totales del frontend (`total` numérico, T-04). Toast + navega al listado; `saving` anti doble-submit; botón `[disabled]` por `puedeGuardar`. `req$` tipado `any` por TS2349 (unión de Observables). `tsc` + AOT 0 errores en 008.

---

## Bloque H — Compartir

### T-23 — Descargar PDF (FE) (deps: T-21) `[P]` ✅ HECHO
- **Input:** estado del editor; patrón `VentasService.generarOrdenVenta` (jsPDF).
- **Output:** PDF con cliente, ítems, totales, términos, validez.
- **Criterio de éxito:** PDF descargable con el detalle correcto. (EARS PDF)
- **Archivos a tocar:** `cotizacion-editor/*` (o util).
- **Dependencias:** T-21.
- **Resultado (2026-06-16):** `descargarPDF()` con jsPDF + autoTable (import dinámico). Encabezado con empresa (`SecurityService`), nro/estado/fechas/vendedor, bloque cliente, tabla de ítems (#/Descripción/Cant/IVA/V.Unit/Subtotal), totales (subtotal, descuento si>0, base gravable, IVA, TOTAL), términos. `pdf.save`. Flag `generandoPDF`. `tsc` + AOT 0 errores.

### T-24 — Enviar por WhatsApp (FE) (deps: T-21) `[P]` ✅ HECHO
- **Input:** teléfono del cliente; resumen.
- **Output:** abre `wa.me` con mensaje prellenado.
- **Criterio de éxito:** abre WhatsApp con el mensaje correcto. (EARS WhatsApp)
- **Archivos a tocar:** `cotizacion-editor/*`.
- **Dependencias:** T-21.
- **Resultado (2026-06-16):** `enviarWhatsApp()` abre `https://wa.me/<celular>?text=...` (celular del cliente saneado a dígitos; sin celular → `wa.me/?text=`). Mensaje: saludo + nro + total + validez. Botón en footer gateado por `puedeGuardar`.

---

## Bloque I — QA

### T-25 — QA + verificación E2E + alineación visual (deps: todo) 🟡 EN VERIFICACIÓN
- **Input:** `/verify`; referencia visual `origin/cotizaciones` (HTML/SCSS).
- **Output:** flujo completo probado (crear → listar → editar → guardar → PDF/WhatsApp); ajustes de UI.
- **Criterio de éxito:** Definition of Done cumplida; sin movimientos en `inventory`/`orders` desde el flujo. (Métrica spec §10)
- **Archivos a tocar:** ajustes menores.
- **Dependencias:** todas.
- **Avance (2026-06-17 — sesión con stack local levantado: FE :4200 + BE :3300):**
  - ✅ **Métrica crítica spec §10 verificada (code audit):** el flujo del editor hace **0 escrituras en `inventory`/`orders`**. `controllers/cotizaciones.js` (create/edit/getAll) no referencia esas colecciones; no hay ninguna escritura a `inventory` en el módulo; la única escritura a `orders` está en `services/cotizacionService.js` (flujo **convertir-a-pedido**, acción deliberada de 008.2, fuera del editor MVP). Editor FE usa array propio + popup `returnOnly` (no toca el carrito singleton).
  - ✅ **Listado rediseñado** al estilo Bootstrap de la referencia `origin/cotizaciones` (breadcrumb + cards + `table table-striped` + badges `getEstadoClass` + btn-group + paginación); KPIs como cards `border-left`; chips con conteo conservados. (a pedido del usuario: "se ve horrible")
  - ✅ **Fix filtro de estado (BE):** `getAll` filtraba con `where("estadoCotizacion","==",estado)` sobre el valor CRUDO → vacío para legacy y para `vencida` (estado derivado). Ahora filtra EN MEMORIA tras `normalizarEstado` (consistente con conteos de `/metrics`). `controllers/cotizaciones.js`.
  - ✅ **Búsqueda de productos por nombre (Opción 2):** `quickSearch` (BE) nueva rama `searchBy=all` (ref O título O marca O cód. barras, con relevancia); `VentasService.quickSearchProducts(term,limit,searchBy?)` param opcional aditivo; editor pasa `'all'`. Venta asistida/POS intactos (no pasan searchBy).
  - 🔜 **Pendiente:** click-through E2E en navegador por el usuario (crear/guardar/duplicar/PDF/WhatsApp con datos reales); T-10 integración (emulador Firestore=Java); **commit en 2 repos**.
  - ℹ️ **Mejora futura registrada:** WhatsApp con PDF adjunto NO es posible vía `wa.me` (solo texto); opción A = subir PDF a Storage y mandar link; opción B = WhatsApp Business Cloud API. Queda como post-MVP.

---

## Orden de ejecución sugerido
1. **T-01, T-02** en paralelo (pre-flight; resuelven open questions).
2. **Backend:** T-03 → T-04; en paralelo T-05, T-06, T-07, T-09; luego T-08; luego T-10 (tests).
3. **Frontend scaffolding** (en paralelo al backend): T-11, T-12, T-13 (`[P]`).
4. **Listado:** T-14 → (T-15, T-16, T-17).
5. **Editor:** T-18 → T-19 → (T-20, T-21) → T-22.
6. **Compartir:** T-23, T-24 (`[P]`).
7. **QA:** T-25.

> Frontend y backend pueden avanzar en paralelo: el FE se construye contra el contrato del plan §5; la integración real requiere backend desplegado (T-03..T-08).

## Definition of Done
- Contract tests backend verdes (T-10).
- Verificación de constitución sin "no" pendientes (plan §2).
- Creación/edición/consecutivo auditables; sin telemetría por console.log.
- 0 escrituras en `inventory`/`orders` desde el flujo de cotización (spec §10).
- `CONTRACT.md` actualizado con cualquier desvío (incluida la resolución del spike T-02).
- Spec se mantiene `approved` salvo cambios.
