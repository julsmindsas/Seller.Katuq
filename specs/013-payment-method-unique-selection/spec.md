# Spec 013 — Selección de método de pago sin conflicto por id repetido

> Estado: draft | in-review | **approved** | superseded
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-08-06 (aprobada en checkpoint; backfill = solo reportar → D-060)
> Rama: `feature/pagos-metodos-unificados` (misma del lote pagos). Ver D-059.
>
> Tarea 2 de 6 del lote "módulo pagos".

## 1. Contexto / Por qué
Las formas de pago tienen un campo **`id`** que el operador escribía a mano. Ese `id` **no está garantizado
único**: dos formas pueden compartir el mismo `id`. Varios puntos de la venta usan ese `id` como **identidad
de selección**:
- **Checkout e-commerce:** los radios se enlazan con `[id]/[for]/[value]="opcionPago.id"`. Angular marca como
  seleccionado (`:checked`) **todo** radio cuyo valor coincida con el del control → con `id` repetido **se
  activan/resaltan varias formas a la vez** (el bug reportado). Además, al confirmar, la orden resuelve el
  método con `filter(fp => fp.id === sel)`, que devuelve varios y toma el primero → puede guardar el
  `formaDePago` equivocado. Y el `id` de DOM duplicado rompe la asociación `label/for`.
- **Asentar pago manual (e-commerce y POS):** el `<select>` usa `[value]="formaPago.id"` y luego resuelve el
  método por `id` → con `id` repetido puede registrar el método equivocado.

La causa raíz: se usa `id` (no único) como identidad, en vez del **identificador de documento** de la forma de
pago, que **sí es único**.

## 2. Objetivo de negocio
Al elegir una forma de pago en la venta, **se activa y se registra exactamente esa forma y ninguna otra**,
aunque existan formas con el mismo `id`. Y de aquí en adelante **no se pueden crear formas con `id` repetido**
(el `id` se asigna solo, el operador no lo escribe), para que el conflicto no vuelva a originarse.

## 3. User stories
- Como **vendedor** quiero **seleccionar una forma de pago y que solo esa quede marcada**, para **no confundir
  ni registrar un método distinto al que elegí**.
- Como **vendedor** quiero **que al confirmar la venta se guarde la forma de pago que realmente seleccioné**,
  aunque otra comparta el mismo `id` interno.
- Como **administrador** quiero **que el sistema evite formas de pago con `id` repetido** para **que el
  conflicto no se produzca por un error de captura**.
- Como **administrador** quiero **saber si ya existen formas con `id` repetido** para **poder limpiarlas**.

## 4. Criterios de aceptación (notación EARS)

**Selección correcta (arreglo de raíz)**
- THE system SHALL identificar cada forma de pago en la selección de la venta por su **identidad única de
  documento** (no por el campo `id` que el operador podía repetir).
- WHEN el vendedor selecciona una forma de pago en el checkout, THE system SHALL marcar como seleccionada
  **únicamente esa** forma, aunque exista otra con el mismo `id`.
- WHEN el vendedor confirma la venta, THE system SHALL registrar como `formaDePago` **exactamente** la forma
  seleccionada (resuelta por su identidad única), no otra que comparta `id`.
- WHERE se registra un pago manual (e-commerce o POS), THE system SHALL resolver la forma elegida por su
  identidad única, de modo que un `id` repetido no seleccione ni registre otra forma.
- THE system SHALL corregir el conflicto **sin depender de limpiar los datos primero**: aun con formas de
  `id` repetido ya existentes, la selección y el registro son correctos.

**Prevención de `id` repetido (a futuro)**
- WHEN se crea una forma de pago, THE system SHALL asignarle un **`id` único automáticamente**; el operador
  **no** lo escribe.
- THE system SHALL garantizar que dos formas de pago de la misma empresa **no** compartan el mismo `id` tras
  la creación automática.

**Detección de duplicados existentes**
- THE system SHALL ofrecer un reporte de **solo lectura** que liste las formas de pago existentes que comparten
  `id` (por empresa), para su limpieza manual. (No modifica datos.)

## 5. Requisitos no funcionales

### 5.1 Performance
- El cambio de identidad de selección no añade llamadas ni recalcula nada pesado; es de la misma complejidad
  que hoy.

### 5.2 Seguridad
- Sin cambios de autenticación ni de aislamiento por empresa. El `id` es un campo **interno** (confirmado):
  no lo consumen contabilidad, reportes ni integraciones externas, por lo que auto-generarlo es seguro.

### 5.3 Observabilidad
- La generación de `id` y la detección de duplicados quedan registradas de forma estructurada, sin datos
  sensibles.

### 5.4 Accesibilidad (UI)
- Los controles de selección de forma de pago mantienen `label/for` correctos (identidad única → sin `id` de
  DOM duplicado), operables por teclado.

## 6. Out of scope (explícito)
- Cambiar **qué** se guarda como `formaDePago` en la orden (sigue siendo el **nombre** de la forma) ni tocar
  pedidos históricos.
- Reasignar el `id` de las formas **ya existentes** (backfill): se evalúa en el plan como opción con dry-run;
  no es necesario para corregir el bug (la selección ya usa la identidad única).
- El valor del `id` como dato de negocio (es interno; no se expone a terceros).
- Otros campos o comportamientos de la pantalla de métodos de pago (spec 012).

## 7. Dependencias
- Consumidores de selección de forma de pago: `checkout` (e-commerce), `asentarpagomanual` (e-commerce) y
  `pos-asentarpagomanual` (POS). Todos reciben las formas desde `/v1/pagos/all` y `/v1/pagos/pos/all`, cuyo
  payload **ya incluye `cd`** (identidad de documento única).
- Creación de formas de pago: pantalla única de métodos de pago (spec 012) + endpoints `create`/`pos/create`.
- Script de reconciliación `reconciliar:metodos-pago` (spec 012) para el reporte de duplicados.

## 8. [NEEDS CLARIFICATION]
> Resueltas con el negocio antes de este borrador:
- [x] **Manejo del `id`:** **auto-generar** un `id` único al crear (el operador no lo escribe).
- [x] **Uso del `id`:** es **solo interno** (no contabilidad/reportes/externos) → seguro basar la selección en
      la identidad de documento y auto-generar el `id`.
- [x] **Backfill de ids existentes:** **solo reportar** (D-060). No se reasignan ids existentes; la selección
      deja de depender del `id`, así que los duplicados actuales quedan inertes. El reporte (script de
      reconciliación) permite limpiarlos a mano si se quiere.

## 9. Riesgos identificados
- **R-01 (regresión de selección):** tocar la identidad de los radios/opciones podría romper la selección por
  defecto o la resolución del método. Mitigación: cubrir los 3 consumidores + verificación en navegador.
- **R-02 (valor por defecto):** el checkout preselecciona la primera forma con `setValue(id)`; al cambiar a la
  identidad única hay que actualizar también ese valor por defecto.
- **R-03 (id como número vs string):** al auto-generar el `id` podría dejar de ser numérico. Como es interno,
  es aceptable; verificar que nada del front asuma `id` numérico en las formas de pago.

## 10. Métricas de éxito post-launch
- Seleccionar una forma de pago marca **exactamente una** (0 casos de selección múltiple), aunque existan ids
  repetidos.
- La orden guarda el `formaDePago` correcto en el 100% de los casos de prueba con ids repetidos.
- **0 formas de pago nuevas** con `id` repetido (id auto-generado único).

---

**Checklist de revisión humana antes de aprobar:**
- [x] No hay nombres de librerías/frameworks en la spec.
- [x] Cada criterio EARS es testeable de forma binaria.
- [x] NFRs cubren al menos performance, seguridad, observabilidad.
- [x] Out of scope explícito.
- [x] `[NEEDS CLARIFICATION]` resuelto (backfill = solo reportar, D-060).
- [x] **Checkpoint humano:** spec **aprobada** 2026-08-06 → habilitada la redacción de `plan.md`.
