# Spec 010 — Congruencia de IVA en venta asistida

> Estado: **approved** (2026-06-25 — D-057)
> Autor(es): Claude + responsable de producto
> Última actualización: 2026-06-25
> Acompaña: `findings.md` (as-is verificado contra código)

## 1. Contexto / Por qué
El IVA de una línea se calcula de forma independiente en 7+ lugares (carrito, checkout, util de pedidos, editor de cotización, listado, orden-venta/PDF, cálculo de pedido en backend, plantillas de email). Esa replicación ya produjo un bug peligroso que corrompía impuestos (D-046), **corregido solo en frontend**: el backend y el email todavía lo reproducen. Antes de seguir construyendo sobre venta asistida necesitamos que el impuesto sea **uno solo y congruente** en toda la cadena (pantalla → pedido guardado → factura/PDF → correo), sin casos borde que se escapen.

## 2. Objetivo de negocio
Para un mismo carrito, el IVA y el total mostrados en checkout, los persistidos en el pedido, y los reflejados en factura/PDF/correo **coinciden** (diferencia ≤ $1 por redondeo), incluyendo escalas de volumen, precio por categoría de cliente, IVA manual y precio manual — y ningún dato legacy hace colapsar el precio.

## 3. User stories
- Como **vendedor** quiero que el total con IVA que veo al cobrar sea idéntico al del pedido y la factura, para no cuadrar diferencias a mano ni perder credibilidad con el cliente.
- Como **cliente final** quiero que el correo/PDF muestre el mismo precio e IVA que se me cobró.
- Como **contador/admin** quiero que el desglose de IVA por tarifa (0/5/8/19) sea consistente para la factura electrónica.
- Como **comerciante con precios por categoría o por volumen** quiero que el sistema aplique la regla correcta sin que cambiar el IVA reinicie el precio.

## 4. Criterios de aceptación (EARS)

- **AC-01** — THE system SHALL calcular el IVA de una línea con la **misma fórmula y el mismo orden de prioridad** (precio manual → IVA manual → precio por categoría → precio por volumen → precio base) en frontend, backend de pedidos y generación de documentos/notificaciones.
- **AC-02** — WHEN una línea aplica precio por volumen y el tier carece de `valorUnitarioPorVolumenSinIVA` (dato legacy) THE system SHALL derivar el precio sin IVA del tier desde su valor con IVA (`conIVA ÷ (1 + tarifa/100)`) y **NUNCA** colapsar al precio de 1 unidad ni a 0.
- **AC-03** — IF un producto tiene precio por categoría de cliente aplicado THEN THE system SHALL ignorar las escalas de volumen en **todos** los cálculos (frontend y backend), de forma idéntica.
- **AC-04** — WHEN el usuario fija un IVA manual en una línea con volumen THE system SHALL conservar el precio base sin IVA del tier vigente y cambiar **solo** la tarifa.
- **AC-05** — WHEN el backend recalcula totales (`crear`, `editar`, `listar` pedido) THE system SHALL producir un `totalImpuesto` y un total que coincidan (≤ $1) con los del checkout para el mismo carrito.
- **AC-06** — THE system SHALL exponer y persistir el desglose de IVA por tarifa (0/5/8/19) y ese desglose SHALL ser el mismo en checkout, pedido persistido y documentos (factura/PDF/email).
- **AC-07** — WHEN se genera el correo o el PDF de un pedido THE system SHALL mostrar el mismo precio de línea e IVA que el pedido persistido, sin recálculo con lógica distinta.
- **AC-08** — IF cualquier base imponible o tarifa resulta NaN o indefinida THEN THE system SHALL registrarlo (observabilidad) y usar 0 explícito, sin propagar NaN a los totales.
- **AC-09** — THE system SHALL respetar `_precioManualOverride` únicamente cuando `procesoComercial.permitePrecioManual === true`, igual en todas las superficies.
- **AC-10 (orden de prioridad ratificado)** — THE system SHALL resolver el precio de línea en este orden exacto, idéntico en FE/BE/documentos: **(1) precio manual → (2) precio por tipo de cliente (categoría) → (3) precio por volumen → (4) precio base**. WHERE existe precio por categoría aplicable THE system SHALL NO aplicar volumen.
- **AC-11 (ancla única de IVA — cura del fantasma · Ancla A)** — THE system SHALL calcular el IVA de toda línea con **una sola ancla**: `IVA = precioSinIVA_resuelto × (tarifa_vigente/100)`. `precioSinIVA_resuelto` proviene de la fuente de precio de mayor prioridad (manual → categoría → volumen → base). `tarifa_vigente` = `_ivaManualOverride` **si está configurado en el carrito** (prima sobre todo); en su defecto, la tarifa de la fuente de precio vigente. THE system SHALL NO sumar montos de IVA pre-guardados en el producto (`valorUnitarioPorVolumenIva`, `precioCategoria.valorIva`) como verdad sin re-derivarlos — para que FE y BE no puedan divergir por incoherencia de campos almacenados.
- **AC-12 (precio CON IVA derivado)** — THE system SHALL derivar el precio con IVA como `precioSinIVA_resuelto × (1 + tarifa_vigente/100)`; el precio que paga el cliente es **consecuencia** del neto y la tarifa, nunca un campo almacenado independiente.
- **AC-13 (IVA del envío · D-058)** — WHERE el pedido es a domicilio THE system SHALL tratar `totalEnvio` como valor **SIN IVA** y calcular el IVA del envío **una sola vez** como `totalEnvio × (tarifaEnvio/100)`, con `tarifaEnvio` = tarifa de la zona de cobro **persistida en el pedido**. THE system SHALL NO sumar el IVA del envío dos veces ni omitirlo según si se pasa o no el catálogo de zonas. El total = `subtotalProductos − descuento + totalEnvio + totalImpuesto` (con `totalImpuesto` incluyendo el IVA del envío).

## 5. Requisitos no funcionales
### 5.1 Performance
- El cálculo no añade latencia perceptible al checkout ni al `POST /orders/create` (cálculo en memoria, O(líneas)).
### 5.2 Seguridad / Integridad
- El total cobrable no puede ser manipulable a un valor inferior por datos faltantes; los fallbacks nunca reducen el precio a 0 ni a 1-unidad por ausencia de un campo.
### 5.3 Observabilidad
- Log estructurado (con `correlationId` del pedido) cuando se use una ruta de fallback/derivación de tier o cuando FE y BE difieran al recalcular, indicando qué fuente de precio se usó.
### 5.4 Resiliencia
- El recálculo es idempotente: recalcular un pedido ya calculado no cambia los totales.

## 6. Out of scope (explícito)
- Cambiar tarifas legales de IVA o reglas tributarias.
- Rediseñar la UI de edición de precio/IVA (solo se corrige la congruencia del dato).
- Mapeo específico de cada proveedor de factura electrónica (SIIGO/WO) — aquí solo garantizamos que el dato/desglose sea congruente.
- Migración/limpieza de datos legacy de `preciosVolumen` (se referencia como dependencia, no se ejecuta aquí).
- POS: se evalúa en clarificación (Q-04) si entra o queda para sub-spec.

## 7. Dependencias
- D-046 (fix frontend previo) — esta spec lo extiende a backend + email.
- Helper de stock/inventario NO se toca; solo cálculo de impuesto/precio de línea.
- Eventual `LineaPricingService` único (recomendación pendiente de D-046).

## 8. [NEEDS CLARIFICATION] — resueltas 2026-06-25 (ver D-055)
- [x] **Q-01 — Fuente única de verdad:** el responsable reformuló: el modelo de prioridad (AC-10) es lo correcto y "más o menos funciona"; el problema real es el **fantasma de IVA** (F-08). Se ratifica **ancla única `sinIVA × tarifa`** (AC-11) como cálculo canónico, consumido por FE y BE. (Política FE-manda vs BE-manda se decide en `plan.md`; el cálculo en sí debe ser idéntico de cualquier forma.)
- [x] **Q-02 — Tarifas soportadas:** set fijo **{0, 5, 8, 19}** (default asumido, no objetado).
- [x] **Q-03 — Servicio único:** **SÍ** — extraer un `LineaPricingService`/módulo de cálculo único (FE) + su espejo canónico (BE) + adopción en email. Es la cura estable del fantasma.
- [x] **Q-04 — Alcance:** la spec cubre **toda la cadena venta asistida → cotizaciones → pedido persistido → email/PDF**, porque el error nace en venta asistida y se replica hasta el módulo de pedidos. POS entra **en la medida que consume el cálculo compartido del backend** (no se rediseña su UI).

## 9. Riesgos identificados
- **R-01:** unificar la lógica de 7+ lugares es alto riesgo de regresión sin tests de contrato FE↔BE. Mitigación: suite de casos (volumen legacy, categoría+volumen, IVA manual, precio manual, mixto) antes de tocar código.
- **R-02:** `orderCalculationService` es de alto impacto (create/edit/list/POS/fulfillment). Mitigación: cambios mínimos + pruebas con pedidos reales.
- **R-03:** datos legacy con `conIVA` también inconsistente → la derivación necesita guardas y log.

## 10. Métricas de éxito post-launch
- 0 discrepancias > $1 entre checkout y pedido persistido en una muestra de N pedidos nuevos (ventana 2 semanas).
- 0 pedidos con línea de volumen colapsada a precio de 1-unidad/0 por dato legacy.
- Email/PDF cuadran con el pedido en 100% de la muestra auditada.

---
**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec. ✅
- [ ] Cada criterio EARS es testeable binariamente.
- [ ] NFRs cubren performance, integridad, observabilidad, resiliencia. ✅
- [ ] Out of scope explícito. ✅
- [ ] Bloque [NEEDS CLARIFICATION] resuelto (Q-01..Q-04 pendientes).
