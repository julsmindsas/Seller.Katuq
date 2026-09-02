# Spec 011.1 — Borrado múltiple de zonas de cobro (una por una y en lote)

> Estado: draft | in-review | **approved** | superseded
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-09-01 (sub-spec de [011] modelo paquete; aprobada en checkpoint; ver D-054)
>
> Sub-spec del módulo de zonas de cobro (spec 011 v2). NO cambia el modelo de datos ni el
> consumo de envío: solo agrega la capacidad de **eliminar varias zonas a la vez** desde la lista.

## 1. Contexto / Por qué
El módulo quedó con **borrado de a una** (un clic → un `delete` → una confirmación por fila). Los
clientes que aún tienen datos del modelo v1 (una fila por municipio; el tester de ALMARA tiene **1088
filas** de "FLOTA UNIADES GRANDES") deben **borrar fila por fila**, lo cual es inviable. Aunque la vía
recomendada para colapsar esos datos es la **migración** (spec 011 v2), el operador necesita igualmente
poder **limpiar zonas que ya no quiere** sin repetir la acción cientos de veces.

> ⚠️ **Nota de alcance:** esta spec NO reemplaza a la migración. La migración *consolida* preservando
> datos; este borrado múltiple *elimina*. Son herramientas distintas para necesidades distintas.

## 2. Objetivo de negocio
Un operador puede **seleccionar varias zonas de cobro** (o todas) desde la lista y **eliminarlas en una
sola acción**, con una confirmación que le diga con claridad cuánto va a borrar, sin dejar de poder
borrar una sola cuando lo prefiera.

## 3. User stories
- Como **operador** quiero **marcar varias zonas y eliminarlas de una sola vez** para **no borrar fila
  por fila cientos de registros**.
- Como **operador** quiero **seleccionar todas las zonas de la empresa y borrarlas** para **limpiar por
  completo una configuración que quedó mal**.
- Como **operador** quiero **seguir pudiendo borrar una sola zona** para los ajustes puntuales.
- Como **operador** quiero **ver cuántas zonas (y cuántos municipios en total) voy a eliminar antes de
  confirmar** para **no borrar por error**.

## 4. Criterios de aceptación (notación EARS)

**Selección en la lista**
- THE system SHALL permitir seleccionar zonas individualmente mediante una casilla por fila.
- THE system SHALL ofrecer una casilla de "seleccionar todo" que marca/desmarca todas las zonas visibles
  de la consulta actual.
- WHILE haya al menos una zona seleccionada, THE system SHALL mostrar cuántas zonas están seleccionadas y
  habilitar la acción de eliminar en lote.
- WHILE no haya ninguna zona seleccionada, THE system SHALL mantener deshabilitada la acción de eliminar
  en lote.

**Borrado de a una (se conserva)**
- THE system SHALL conservar la acción de eliminar una sola zona desde su fila, con su confirmación
  actual (nombre + nº de municipios).

**Borrado en lote (seleccionadas)**
- WHEN el operador confirma eliminar las zonas seleccionadas, THE system SHALL eliminar exactamente esas
  zonas y ninguna otra.
- THE system SHALL pedir confirmación mostrando **cuántas zonas** y **cuántos municipios en total** se van
  a eliminar antes de aplicar.
- WHEN el borrado en lote termina, THE system SHALL refrescar la lista y comunicar el resultado (cuántas
  se eliminaron).

**Borrar todo**
- THE system SHALL ofrecer una acción de "eliminar todas" las zonas de la empresa activa.
- WHEN el operador confirma "eliminar todas", THE system SHALL eliminar todas las zonas de **esa empresa**
  y de ninguna otra.
- WHERE la acción es "eliminar todas", THE system SHALL exigir una confirmación reforzada (dado que es
  destructiva y total) antes de aplicar.

**Multi-tenant / seguridad**
- THE system SHALL eliminar únicamente zonas pertenecientes a la **empresa activa**, sin confiar en la
  lista de identificadores enviada por el cliente para saltarse ese filtro (una zona de otra empresa
  NUNCA se elimina aunque su identificador venga en la petición).
- THE system SHALL requerir autenticación para cualquier borrado (individual, en lote o total).

**Resiliencia**
- WHERE se envían identificadores que no existen o no son de la empresa, THE system SHALL ignorarlos sin
  fallar el resto del borrado.
- THE system SHALL soportar el borrado de un volumen grande de zonas (orden de miles) sin exceder los
  límites de una escritura por lote de la base de datos (troceado interno).

## 5. Requisitos no funcionales

### 5.1 Performance
- Eliminar N zonas SHALL resolverse en **una sola petición** al backend (no N peticiones), con troceado
  interno en lotes para no exceder límites de la base de datos.

### 5.2 Seguridad
- Autenticación obligatoria + aislamiento por empresa (ver criterios multi-tenant). El borrado total exige
  confirmación reforzada.

### 5.3 Observabilidad
- El resultado del borrado en lote (cuántas eliminadas, cuántas ignoradas) queda disponible de forma
  estructurada para diagnóstico, sin datos sensibles en claro.

### 5.4 Accesibilidad (UI)
- Las casillas de selección y las acciones de borrado son operables por teclado; el estado de selección no
  se comunica solo por color; los diálogos de confirmación son legibles por lector de pantalla.

## 6. Out of scope (explícito)
- **Deshacer / papelera:** el borrado es definitivo (igual que hoy el borrado de a una). No hay undo.
- Migración/consolidación de datos v1 (eso es spec 011 v2; se ejecuta aparte).
- Borrado por filtro (ej. "borrar todas las de Antioquia") — solo selección explícita y "todas".
- Exportar antes de borrar / respaldo automático.
- Control de acceso por rol para quién puede borrar (posible spec aparte).

## 7. Dependencias
- Lista de zonas de cobro (spec 011 v2) y su tabla.
- Endpoint de borrado del backend (hoy solo individual) — se amplía con borrado en lote.

## 8. Clarifications (resueltas 2026-09-01 — D-054)
- [x] **"Seleccionar todo" = solo la página visible.** El check del encabezado marca únicamente las zonas
      de la página actual (10/20/50). Para el total de la empresa existe una acción aparte "Eliminar TODAS".
- [x] **Confirmación de "Eliminar todas" = escribir la palabra `ELIMINAR`.** El botón de confirmación
      permanece deshabilitado hasta que el operador escribe exactamente `ELIMINAR` en el diálogo.

## 9. Riesgos identificados
- **R-01 (borrado accidental masivo):** "borrar todas" es irreversible. Mitigación: confirmación reforzada
  + mostrar conteo exacto antes de aplicar.
- **R-02 (fuga entre empresas):** un id de otra empresa en la petición. Mitigación: el backend valida
  pertenencia a la empresa activa (intersección server-side), nunca borra a ciegas por id recibido.
- **R-03 (límite de lote de la base):** miles de borrados. Mitigación: troceado en lotes por debajo del
  límite.

## 10. Métricas de éxito post-launch
- Eliminar 1088 filas es **1 acción** del operador (antes: 1088).
- **0 zonas de otra empresa** eliminadas por un borrado en lote.
- El borrado de a una sigue funcionando igual.

---

**Checklist de revisión humana antes de aprobar:**
- [x] No hay nombres de librerías/frameworks en la spec.
- [x] Cada criterio EARS es testeable de forma binaria.
- [x] NFRs cubren performance, seguridad, observabilidad, accesibilidad.
- [x] Out of scope explícito.
- [x] Clarifications resueltas (sección 8).
- [x] **Checkpoint humano:** aprobada por el usuario 2026-09-01 (página visible + escribir `ELIMINAR`).
