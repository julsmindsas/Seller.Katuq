# Plan 010 — Integración de descuentos y promociones en la venta asistida

> Estado: draft | in-review | **approved** | superseded
> Vinculado a `spec.md` (**approved**, 2026-07-24).
> Última actualización: 2026-07-24 (checkpoint humano del plan superado — ver D-046)

## 1. Resumen técnico

Feature A (códigos) y Feature B (promociones automáticas) ya están implementados y pusheados en `feature/descuentos-promociones` (backend `720d6aa`/`ce425b2`, frontend `742c4e0a`/`efcef55b`) — son los criterios `[AS-BUILT]` y NO se re-planean. Este plan cubre solo el trabajo `[NEW]`: **cerrar 4 gaps acotados** (1 frontend de display + 1 de envío + 2 backend de reglas) y **correr la verificación end-to-end en navegador** contra `OH MY STORE` en local. Ningún cambio es estructural; todos son ediciones puntuales sobre código existente, con pruebas unitarias del money-path ya establecidas como red de regresión.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | Spec 010 approved antes de este plan. A/B se formalizan retroactivamente (D-044). |
| II — Spec captura intent | sí | La spec no nombra tecnología; este plan sí. |
| IV — Idempotencia | sí | La redención sigue siendo idempotente por pedido (`${ordenId}_${descuentoId}`); no se toca. |
| V — Eventos crudos antes de procesar | n/a | No hay webhooks entrantes en este alcance. |
| VI — UI no acoplada a proveedor | n/a | No es integración de proveedor externo; es flujo interno POS. |
| VII — Observabilidad | sí | Se retira el `console.log` de telemetría en `checkIVAPrice` (anti-pattern del CLAUDE.md) al tocar la función. |
| VIII — Test-first contratos | parcial | No hay contrato externo nuevo. Se extiende la suite unit money-path ANTES de tocar el cálculo (gap 1). |
| IX — Estilo Angular | sí | Ediciones a servicios/componentes existentes (Angular 14, patrón del módulo). No se crean componentes nuevos → no aplica la exigencia de signals/standalone para código nuevo. |
| X — Seguridad webhooks | n/a | — |
| XI — Datos sensibles fuera del log | sí | El `console.log` removido en `checkIVAPrice` logueaba títulos/precios de línea; su retiro mejora este punto. |

Sin "no" que requiera enmienda.

## 3. Arquitectura

### 3.1 Componentes involucrados
- **Frontend (Angular):** `shared/services/ventas/payment.service.ts` (desglose IVA), `components/ventas/carrito/carrito.component.ts` (aplicación de código + envío), checkout.
- **Backend:** `functions/controllers/descuentosPromociones.js` (aplicarCodigo: vigencia; create: tope %), `functions/services/productPromoHelper.js` (vigencia de promociones).
- **Almacenamiento / Cola:** sin cambios.

### 3.2 Diagrama (texto)
```
Catálogo (promo enrich) ─┐
                         ├─> Carrito (precio promo + código) ─> checkIVAPrice (desglose)  [gap 1,2]
Admin crea descuento ────┘                                   └─> POST /orders/create
                                                                   └─> orderCalculationService (autoritativo, ya correcto)
aplicarCodigo (vigencia [gap 3]) · create (tope % [gap 4]) · productPromoHelper (vigencia [gap 3])
```

### 3.3 Decisiones técnicas (con trazabilidad a requisito)

| Decisión | Requisito (EARS §4) | Alternativas descartadas |
|---|---|---|
| **G1** — En `checkIVAPrice`, calcular `factorDesc` por línea = `tienePromoLinea(producto) ? 1 : (1 - porceDescuento)` y usarlo en el descuento del valor con IVA (línea ~421), espejando `orderCalculationService.getTotalImpuesto`. | `[NEW]` "desglose coincide con persistido aun con código% + promo" | Recalcular todo el desglose en backend y devolverlo al front (más viaje/latencia en cada cambio de carrito; el front ya tiene toda la data). |
| **G2** — Cuando el código aplicado es `envio_gratis`, llevar a cero el costo de envío en el total del checkout (front), no solo `montoDescuento=0`. | `[NEW]` "envío gratis → costo de envío a cero" | Modelarlo como descuento de producto (contamina el subtotal e IVA). |
| **G3** — Reemplazar `new Date().toISOString().split('T')[0]` por la fecha local en **America/Bogotá** para comparar vigencia, en `aplicarCodigo` y en `productPromoHelper.obtenerPromocionesVigentes`. Helper puro compartido (`hoyBogota()`), sin dependencia nueva (usar `Intl`/offset fijo -05:00). | `[NEW]` "vigencia en hora local America/Bogotá" | Librería de zonas horarias (dependencia nueva innecesaria; Colombia no tiene DST → offset fijo -05:00 es exacto). |
| **G4** — En `create` (y `edit`), si `tipo==='porcentaje'` y `valor>100` → HTTP 400. Guard defensivo en el cálculo para que el precio de línea nunca baje de 0. | `[NEW]` "porcentaje >100% rechazado o topado, total ≥ 0" | Solo topar en cálculo (permite persistir datos inválidos). Solo validar en front (el backend es la fuente de verdad). |

## 4. Modelo de datos
Sin cambios de esquema. `descuentosPromociones` y `redencioneDescuentos` intactas. Los campos `fechaInicio`/`fechaFin` siguen siendo `YYYY-MM-DD` (string); G3 solo cambia con qué "hoy" se comparan.

## 5. Contratos (API/eventos)
Sin endpoints nuevos. Cambios de comportamiento (no de forma) en:
- `POST /v1/descuentos-promociones/aplicar-codigo` — G3 (vigencia Bogotá). Respuesta sin cambios de shape.
- `POST /v1/descuentos-promociones/create` y `/edit` — G4: nuevo 400 `{ message: 'El porcentaje no puede exceder 100%' }`.

### 5.2 Errores
| Código | Cuándo | Cuerpo |
|---|---|---|
| 400 | crear/editar descuento porcentaje con `valor>100` (G4) | `{ message: 'El porcentaje no puede exceder 100%' }` |
| 400 | código fuera de vigencia (G3, ya existía; ahora con fecha Bogotá) | `{ message: 'Este código está fuera de su período de vigencia' }` |

## 6. Estrategia de testing
- **Unit (primero, gap 1):** extender la suite money-path del backend con el caso "código% + línea en promo" y replicar el aserto en el front (`checkIVAPrice`) para congelar el número esperado ANTES de tocar el cálculo. Regresión: los 45 casos existentes deben seguir en verde.
- **Unit (G3, G4):** casos de vigencia en bordes de medianoche (23:30 Bogotá = día siguiente en UTC) y rechazo de porcentaje >100%.
- **E2E (local, Q-03):** checklist en navegador contra `OH MY STORE`:
  1. Crear promoción (categoría y producto) → catálogo muestra precio tachado + badge.
  2. Agregar a carrito → precio promo en línea/subtotal/IVA coincide.
  3. Aplicar código dirigido → descuenta solo elegibles; rechaza si no hay elegibles.
  4. Código% + producto en promo → el código NO acumula sobre la línea en promo; desglose = total persistido (valida G1).
  5. Código `envio_gratis` → envío en cero (valida G2).
  6. Checkout → crea pedido; redención registrada 1:1.

## 7. Fases de implementación
1. **Fase A — Red de regresión:** congelar el caso código%+promo en unit (back + front). Sin esto, G1 es a ciegas.
2. **Fase B — G1 (display checkIVAPrice):** `factorDesc` por línea + remover `console.log` de telemetría. Verificar unit.
3. **Fase C — G2 (envío gratis):** cero del costo de envío en checkout cuando el código es `envio_gratis`.
4. **Fase D — G3 (vigencia Bogotá):** helper `hoyBogota()` + usarlo en `aplicarCodigo` y `productPromoHelper`. Unit de bordes.
5. **Fase E — G4 (tope 100%):** validación en `create`/`edit` + guard en cálculo. Unit.
6. **Fase F — E2E local:** correr el checklist §6 en navegador (apuntar `environment.ts` a `localhost:3300`, revertir al terminar).
7. **Fase G — Cierre:** actualizar bitácora del módulo + CONTRACT.md; commits sellados. (Deploy EC2 y PRs siguen bloqueados/aparte.)

## 8. Plan de rollout
- **Sin feature flag nuevo:** son correcciones a un feature ya en la rama, no un feature nuevo conmutalble. Rollback = revertir los commits de los gaps (aislados por fase).
- **Dark launch:** N/A (solo POS/venta asistida en la rama feature, aún no en prod).
- **Rollback plan:** cada gap es un commit independiente; revertir el de G1 no afecta G3/G4.

## 9. Riesgos técnicos
- **RT-01:** `checkIVAPrice` se invoca en varios puntos del resumen/factura; G1 podría alterar totales en casos no combinados. Mitigación: Fase A congela la regresión antes de tocar.
- **RT-02:** El costo de envío (G2) puede vivir en más de un cálculo (resumen vs orden); hay que ubicarlo antes de tocar para no dejar un punto sin cero.
- **RT-03:** E2E requiere login local ya desbloqueado + backend con `.env` (SECRET_TOKEN) o el login falla con "Require key".

## 10. Open questions (técnicas)
- **OT-01:** ¿el costo de envío en la venta asistida se calcula en `PaymentService`, en `carrito.component`, o en el backend de órdenes? Resolver en Fase C (localizar antes de editar). No bloquea aprobar el plan.
