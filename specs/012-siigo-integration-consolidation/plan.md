# Plan 012 — Forma de pago + vencimiento de crédito y mapeo de descuento (D-042 / D-043)

> Renumerado de 008 → 012 el 2026-07-01 (colisión con `008-cotizaciones-mvp` — ver D-067 en CONTRACT.md).
> Estado: **draft**
> Vinculado a `spec.md` (criterios §4: forma de pago, vencimiento, descuento; Q-08/Q-09 resueltas).
> Última actualización: 2026-06-23
> Alcance acotado: solo D-042 (modal forma de pago + vencimiento) y D-043 (descuento). El resto de la consolidación (Caminos B/C, Q-03..Q-07) NO entra aquí.

## 1. Resumen técnico
Extender el modal canónico de facturación del listado de pedidos (`list.component.ts`) para capturar **forma de pago** (desde SIIGO) y, si es a crédito, **una** fecha de **vencimiento** vía plazo; propagar `paymentTypeId` (ya existe) + `dueDate` (nuevo) por el endpoint canónico `from-order(-async)` hasta el mapper. En paralelo (solo backend), corregir `siigoDataMapper` para que el **descuento del pedido** (`porceDescuento`) se distribuya por línea de producto y el `payments[].value` cuadre. Sin tocar Camino B/C ni World Office.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | Criterios EARS añadidos; D-042/D-043 registradas antes de codificar. |
| IV — Idempotencia | sí | No cambia la clave de idempotencia por pedido; solo enriquece el payload. |
| VI — UI no acoplada a proveedor | parcial | El modal es SIIGO-specific (detección de crédito por flag SIIGO). Se aísla en el método de facturación SIIGO; WO mantiene su camino. Deuda: generalizar a futuro. Enmienda implícita aceptada por alcance puntual. |
| VII — Observabilidad | sí | Se reusa el log estructurado existente del `accountingManager`; se añade `dueDate`/descuento al contexto. |
| VIII — Test-first contratos | sí | Contract test del payload SIIGO (payments[].due_date, items[].discount, value cuadra) antes de tocar el mapper. |
| IX — Estilo Angular | sí | Modal ng-bootstrap reusando `modalService` ya inyectado; HTTP solo vía `integrationsService`. |
| XI — Datos sensibles fuera del log | sí | No se loguean credenciales; solo IDs/fechas. |

## 3. Arquitectura

### 3.1 Componentes
- **Frontend:** `ventas/list/list.component.ts` + `.html` (modal nuevo); `integrations/integrations.service.ts` (propagar `dueDate`).
- **Backend:** `controllers/accountingController.js` (aceptar `dueDate`); `services/accounting/utils/siigoDataMapper.js` (`buildInvoiceConfig` + `mapOrderToInvoice`: due_date y descuento).
- **Sin cambios:** `accountingManager.js` (las `options` ya fluyen tal cual a `buildInvoiceConfig`), `siigoProvider.js`, router `accounting.js`.

### 3.2 Flujo (texto)
```
[Modal list.component] tipo doc → forma de pago (habilita) → si crédito: plazo → dueDate
  → ejecutarFacturacionSiigo(pedido, documentTypeId, prefijoId, paymentTypeId, dueDate)
  → integrationsService.createAccountingInvoiceAsync(provider, id, options{+dueDate})
  → POST /v1/accounting/:provider/invoices/from-order-async  {…, dueDate}
  → accountingController: options.dueDate
  → accountingManager.createInvoiceFromOrder → DataMapper.buildInvoiceConfig(cfg, options)  // dueDate entra a config
  → siigoDataMapper.mapOrderToInvoice(pedido, config):
       payments[0].due_date = config.dueDate || hoy
       items[].discount = price*qty*(porceDescuento/100)   // D-043
       payments[0].value = Σ (price*qty - discount)*(1+iva) // D-043 (cuadre)
```

### 3.3 Decisiones técnicas (trazabilidad)

| Decisión | Requisito | Alternativas descartadas |
|---|---|---|
| Modal ng-bootstrap (no SweetAlert select) | §4 secuencia dependiente; §5.4 | SweetAlert `html`+`didOpen` (JS-en-string, frágil) |
| Detección de crédito por `paymentType.due_date === true` | §4 crédito | Heurística por nombre "crédito" (frágil, i18n) |
| Plazos definidos en Katuq, calculan `dueDate` | §4 vencimiento (D-042) | Esperar plazos de SIIGO (no existen en su API) |
| Distribuir descuento por línea de producto | §4 descuento (D-043) | Descuento global (SIIGO no lo soporta) |
| Corregir `payments[].value` restando descuento | §4 cuadre / R-07 | Dejar value sin descuento → SIIGO 400 |

## 4. Modelo de datos / contrato del payload
- **Nuevo campo de entrada** `dueDate` (string `yyyy-MM-dd`, opcional) en el body de `from-order` y `from-order-async`.
- **SIIGO `payments[]`**: `{ id, value, due_date }`. `due_date` obligatorio solo si el medio "maneja vencimiento". Solo **un** medio con vencimiento por factura (Resolución 165).
- **SIIGO `items[].discount`**: numérico (valor monetario por línea).
- **Plazos (frontend):** 8 / 15 / 30 / 45 / 60 / 90 / 120 días + "fecha exacta" (date-picker). "Contado" = elegir una forma de pago sin vencimiento (no muestra plazo). `dueDate = fechaFactura + plazoDías`.

## 5. Contratos (API)
- `POST /v1/accounting/:provider/invoices/from-order` y `/from-order-async`
  - Body añade: `dueDate?: string (yyyy-MM-dd)`.
  - Retrocompatible: si falta, el mapper usa la fecha de Colombia de hoy (comportamiento actual).

### 5.1 Idempotencia
- Sin cambios: idempotencia por pedido (no se crea factura duplicada si ya tiene número). `dueDate`/descuento no afectan la clave.

### 5.2 Errores
| Código | Cuándo | Cuerpo |
|---|---|---|
| 400 (SIIGO) | `payments[].value` ≠ total recalculado (descuadre por descuento) | error SIIGO propagado | 
| 400 (SIIGO) | >1 medio con vencimiento (no debería ocurrir: UI fuerza 1) | error SIIGO |
| 422 (validación front) | crédito sin fecha de vencimiento | bloqueo de submit en el modal |

## 6. Estrategia de testing
1. **Contract test del mapper (primero):** `mapOrderToInvoice` con pedido + `porceDescuento>0` →
   - cada `items[].discount` = `price*qty*porceDescuento%`; envío `discount:0`;
   - `payments[0].value` == Σ`(price*qty - discount)*(1+iva)`;
   - con `config.dueDate` → `payments[0].due_date` == ese valor; sin él → hoy.
2. **Integration:** factura real contra SIIGO sandbox con cupón + crédito a 30 días → 201, total = `totalPedididoConDescuento`, vencimiento correcto.
3. **E2E (manual primero):** modal → secuencia tipo doc/forma pago/vencimiento → factura emitida; verificar tirilla/PDF.
4. **Validación de base de descuento:** confirmar pre/post IVA de `totalDescuento` contra un pedido real (cierra Q-09 pendiente).

## 7. Fases de implementación
1. **Fase A — Backend descuento (D-043):** contract test → `mapOrderToInvoice` (descuento por línea + cuadre de `value`). Independiente, desplegable solo.
2. **Fase B — Backend dueDate (D-042):** `accountingController` (2 handlers) acepta `dueDate` → `buildInvoiceConfig` (`dueDate`) → `mapOrderToInvoice` (`due_date = config.dueDate || hoy`).
3. **Fase C — Frontend service:** `integrations.service.ts` propaga `dueDate` en `createAccountingInvoiceAsync` (+ `createAccountingInvoiceFromOrder` por paridad).
4. **Fase D — Frontend modal:** template ng-bootstrap + form en `list.component.ts`; cargar document-types + payment-types; secuencia/habilitación; plazos→dueDate; `ejecutarFacturacionSiigo` propaga `paymentTypeId`+`dueDate`.
5. **Fase E — Verificación:** pruebas con pedido con cupón y crédito; ajuste de base IVA si hace falta.

## 8. Plan de rollout
- Sin feature flag dedicado (cambio aditivo y retrocompatible). El modal nuevo reemplaza el `Swal` select solo en la rama SIIGO.
- Rollback: revertir el componente al `Swal` select; backend es retrocompatible (dueDate opcional).

## 9. Riesgos técnicos
- **R-07 (spec):** descuadre 400 si no se corrige `value`. → cubierto en Fase A con contract test.
- Base IVA del descuento (pre/post) puede requerir ajuste fino para cuadrar al centavo. → Fase E.
- `getAccountingPaymentTypes` requiere `document_type` (SIIGO usa "FV"); confirmar que el endpoint del listado ya lo resuelve server-side (el provider usa "FV" en `createInvoice`).

## 10. Open questions (técnicas)
- ¿El payment-types del modal debe filtrarse por el tipo de documento elegido? (SIIGO liga medios a `document_type`). Asumir "FV" por ahora; validar en Fase D.
- ¿Persistir en el pedido la forma de pago/vencimiento elegidos para auditoría/reintento? Propуesta: sí, en el resultado de facturación. A confirmar en Fase B.
