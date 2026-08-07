# Plan 012 — Pantalla única de métodos de pago (disponibilidad por canal)

> Estado: draft | in-review | **approved** | superseded
> Vinculado a `spec.md` (**approved**, D-055). Aprobado en checkpoint 2026-08-06 (D-056).
> Última actualización: 2026-08-06

## 1. Resumen técnico
Consolidamos la gestión de métodos de pago en **una sola pantalla** de Angular que muestra un método por
fila con **toggles de disponibilidad por canal** (e-commerce / POS) y **posición por canal**. El backend
sigue guardando la disponibilidad de cada canal en su colección actual (`pagos` para e-commerce,
`formaPagosPos` para POS); la pantalla **lee ambas y las fusiona por nombre**, y **escribe en la colección
del canal afectado** usando los endpoints ya existentes. "Eliminar" pasa a ser **inhabilitar** (`activo=false`),
no borrado físico. Los ~16 consumidores actuales de `/v1/pagos/all` y `/v1/pagos/pos/all` (checkout, POS,
onboarding, asentarpagomanual…) **no se tocan**: cada canal sigue leyendo su colección. Las dos pantallas
viejas se retiran y sus rutas redirigen a la nueva.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec 012 approved (D-055) antes de este plan. |
| II — Spec captura intent | sí | la spec no nombra tecnología; el "cómo" vive aquí. |
| IV — Idempotencia | sí | escritura por método = upsert por (empresa, nombre, canal); reintentar no duplica. Migración/backfill idempotente (empareja por nombre) y con dry-run. |
| V — Eventos crudos antes de procesar | N/A | no hay webhooks entrantes en esta tarea. |
| VI — UI no acoplada a proveedor | sí | la pantalla lista métodos genéricos; sin `if (provider==='wompi')`. La bandera `integracion` es un dato, no lógica ramificada en UI. |
| VII — Observabilidad | sí | escritura/inhabilitación/migración registran resultado estructurado (colección de auditoría, no `console.log`). |
| VIII — Test-first contratos | sí | contract tests de lectura fusionada + escritura por canal + unicidad de nombre, antes de la UI. |
| IX — Estilo Angular | sí | componente nuevo standalone, signals, OnPush, `@if/@for`, HTTP solo vía servicio. |
| X — Seguridad webhooks | N/A | no aplica. |
| XI — Datos sensibles fuera del log | sí | estos docs no guardan credenciales de pasarela; no se loguean secretos. |

> **Gate del backend (regla dura del repo):** "no colecciones nuevas ni endpoints/módulos v2 sin aprobación
> explícita". El **enfoque recomendado (B) NO crea colección nueva ni endpoint v2** → no dispara el gate.
> El enfoque alternativo (A) SÍ lo dispara y requeriría aprobación + `/opsx:propose` en el backend.

## 3. Arquitectura

### 3.1 Estado actual (lo que hay)
- **Colecciones:** `pagos` (e-commerce) y `formaPagosPos` (POS), ambas filtradas por header `company`.
  Doc = `{ id, online, nombre, posicion, integracion, activo, descripcionCorreoElectronico,
  recordatorioCobro, company, date_edit, user_edit, cd(docId) }`.
- **Endpoints** (`controllers/pagos.js`, `routers/pagos.js`, auth por header):
  `GET /v1/pagos/all` · `GET /v1/pagos/pos/all` · `POST /v1/pagos/create` · `/pos/create` ·
  `/edit` · `/pos/edit` · `/delete` · `/pos/delete` (los delete son **borrado físico**).
- **Frontend:** dos componentes espejo `extras/formas-pago` y `extras/pos/formas-pago` + sus `crear-…`.
  `MaestroService.consultarFormaPago()/consultarFormaPagoPOS()/crearFormaPago()/editFormaPago()/…`.
- **Consumidores de lectura (NO se tocan):** `checkout` (e-com), `card-payment` (POS), `asentarpagomanual`
  (e-com + POS), onboarding step 5, y catálogos/otros — ~16 archivos. Cada uno lee la colección de su canal.

### 3.2 Enfoque recomendado — **B: pantalla única sobre las dos colecciones existentes**
La pantalla única es una **vista fusionada** de las dos colecciones; no cambia el almacenamiento.

```
                 ┌────────────── Pantalla única (extras/metodos-pago) ──────────────┐
   GET /pagos/all ─┐                                                                 │
                   ├─► merge por NOMBRE ─► filas: {nombre, online, integracion, ...  │
 GET /pagos/pos/all┘                         ecommerce:{activo,posicion,cd?},        │
                                             pos:{activo,posicion,cd?}}              │
                 └──────────────────────────────┬──────────────────────────────────┘
   toggle/edición por canal                     ▼
   e-com  → POST /pagos/create | /edit   (activo=false = inhabilitar)
   POS    → POST /pagos/pos/create | /pos/edit
```

- **Disponibilidad por canal** = presencia con `activo=true` en la colección de ese canal. Activar en un
  canal donde el método no existe → `create` en esa colección copiando los campos globales del método.
  Desactivar → `edit` con `activo=false` (inhabilitar; **ya no** `delete` físico).
- **Posición por canal** = campo `posicion` de cada colección (ya existe → se preserva sin migración).
- **Config global** (nombre, online, integracion, descripciones): al editarla, la pantalla la escribe en las
  entradas del método que existan en ambos canales (se mantienen sincronizadas desde un solo formulario).
- **Migración = no-op de datos:** la disponibilidad por canal actual YA está codificada por "en qué colección
  está el método". No se mueve ni borra nada; sólo se necesita un **script read-only de reconciliación**
  (dry-run) que reporte incoherencias (mismo nombre con `online/integracion` distintos entre canales) para
  que el operador las resuelva desde la nueva pantalla.
- **Blast radius:** cero sobre los ~16 consumidores; sólo se agregan/retiran pantallas de configuración.

### 3.3 Alternativa — **A: colección unificada `paymentMethods`** (documentada, NO recomendada ahora)
Un doc por método con `canales:{ ecommerce:{activo,posicion}, pos:{activo,posicion} }` + config global única.
- **Pros:** config verdaderamente en "un solo lugar" (cero duplicación); más fácil sumar canales futuros.
- **Contras:** crea **colección nueva** → dispara el gate del backend (aprobación + `/opsx:propose`); exige
  **migración destructiva** con dry-run; y para no romper a los ~16 consumidores hay que reescribir
  `GET /pagos/all` y `/pos/all` como **vistas filtradas por canal** sobre la colección unificada
  (más superficie, más riesgo). Es la opción correcta a largo plazo pero desproporcionada para la Tarea 1/6.

**Recomendación:** ir con **B** ahora (riesgo bajo, respeta el gate, satisface la spec: gestión desde una
sola pantalla + disponibilidad/posición por canal + inhabilitar). Si el equipo prefiere unificación de
almacenamiento, se aprueba **A** en el checkpoint y se ajustan plan/tasks (incluye migración real). → Ver §10 OQ-1.

## 4. Modelo de datos (enfoque B)
Sin cambios de esquema. La fila unificada es una **proyección en memoria** (frontend):

```ts
interface MetodoPagoUnificado {
  nombre: string;              // clave de fusión (normalizada: trim + lower) — identidad por empresa
  online: string;              // clasificación (global)
  integracion: 'Si' | 'No';    // pasarela asociada (global al método — D-055)
  descripcionCorreoElectronico?: string;
  recordatorioCobro?: string;
  ecommerce: { disponible: boolean; posicion: number|null; cd?: string } | null; // cd = docId en `pagos`
  pos:       { disponible: boolean; posicion: number|null; cd?: string } | null; // cd = docId en `formaPagosPos`
}
```
`disponible` = existe en esa colección **y** `activo===true`. `cd` presente = ya hay doc en ese canal (editar);
ausente = crear al activar.

## 5. Contratos (endpoints/eventos)
**Reutilizados (sin cambios de firma):** `GET /v1/pagos/all`, `GET /v1/pagos/pos/all`,
`POST /v1/pagos/create`, `/pos/create`, `/edit`, `/pos/edit`.

**Cambios de comportamiento mínimos en backend (edición de endpoints existentes, no v2):**
1. **Unicidad de nombre por empresa+canal:** `create`/`pos/create` rechazan (409) si ya existe un método
   con el mismo `nombre` normalizado en esa empresa+colección. (Criterio EARS §4 "nombre ya existente".)
2. **Inhabilitar en vez de borrar:** la pantalla usa `edit`/`pos/edit` con `activo=false`; los endpoints
   `delete`/`pos/delete` físicos **dejan de usarse desde esta pantalla** (se conservan por compat, sin llamarse).

> Ambos son endurecimientos de endpoints existentes. Se documentan como cambio de backend en `/opsx:propose`
> al implementar (ceremonia OpenSpec del backend), pero **no** crean colección ni ruta nueva.

### 5.1 Idempotencia
- Clave lógica: `(company, nombreNormalizado, canal)`. `create` sólo si no existe; si existe, es `edit`.
- Reintentar guardar el mismo estado no duplica ni invierte `activo`.

### 5.2 Errores
| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | create/edit ok | `{ msg: 'added' | 'updated' }` |
| 409 | nombre duplicado por empresa+canal al crear | `{ error: 'nombre_duplicado' }` |
| 401 | sin auth (interceptor) | (estándar) |

## 6. Estrategia de testing
- **Contract tests (primero, Art. VIII):**
  (a) fusión por nombre e-com∪POS produce una fila por método con banderas por canal correctas;
  (b) `create` rechaza nombre duplicado (409);
  (c) `edit activo=false` inhabilita y desaparece de la lectura del canal;
  (d) activar en un canal inexistente crea el doc con los campos globales.
- **Integration:** contra Firestore emulator (o script read-only contra prod para el dry-run de reconciliación).
- **E2E navegador (OH MY STORE):** crear método, activarlo sólo en POS (no aparece en checkout e-com, sí en POS),
  activarlo también en e-com, cambiar posición por canal, inhabilitar (desaparece de ambos), rehabilitar,
  nombre duplicado → 409, y verificar que checkout y POS siguen mostrando lo esperado sin recargar.
- **Unit:** util de normalización/fusión por nombre (frontend).

## 7. Fases de implementación
1. **Fase A — Backend (mínimo):** unicidad de nombre (409) en `create`/`pos/create`; confirmar que `/all`
   y `/pos/all` devuelven `activo`+`posicion`. `/opsx:propose` del backend. Reiniciar :3300.
2. **Fase B — Contract tests** de fusión + escritura por canal + unicidad (rojo→verde).
3. **Fase C — Servicio frontend:** en `MaestroService` (o util nuevo) método que llama a ambos `/all`,
   fusiona por nombre y expone `MetodoPagoUnificado[]`; helpers de guardar por canal (create/edit) e inhabilitar.
4. **Fase D — Pantalla única** `extras/metodos-pago/` (standalone, OnPush, signals): tabla 1 fila/método,
   toggles de disponibilidad por canal, posición por canal, formulario crear/editar (config global),
   acción inhabilitar/rehabilitar, buscador. Reemplaza las dos viejas.
5. **Fase E — Routing + menú:** nueva ruta; `extras/formasPago` y `extras/pos/formasPago` **redirigen** a la
   nueva; actualizar `NavService`. Invalidar caché de formas de pago (checkout/POS) al guardar.
6. **Fase F — Reconciliación (dry-run):** script read-only que reporta métodos con mismo nombre y config
   divergente entre canales, o huérfanos, para saneamiento manual desde la pantalla. Sin escrituras.
7. **Fase G — E2E navegador** + verificación de que los ~16 consumidores siguen funcionando.

## 8. Plan de rollout
- **Sin feature flag** (cambio de UI de configuración, reversible por rama). Las pantallas viejas quedan como
  redirect, no se borran los componentes hasta validar (retiro en tasks de cierre).
- **Rollback:** revertir la rama; los datos no cambiaron (enfoque B no migra), así que no hay estado que deshacer.
- Deploy: front por Firebase Hosting; backend por EC2/PM2 (equipo), tras `/opsx` aprobado.

## 9. Riesgos técnicos
- **RT-01 (fusión por nombre):** nombres casi iguales ("Efectivo" vs "efectivo ") aparecerían como filas
  separadas. Mitigación: normalizar (trim+lower) para la clave de fusión; el dry-run de Fase F reporta casi-duplicados.
- **RT-02 (config divergente entre canales):** un método en ambos canales con `online`/`integracion` distinto.
  Mitigación: la pantalla muestra el conflicto y, al guardar config global, sincroniza ambos docs; dry-run lo reporta.
- **RT-03 (caché stale):** checkout/POS cachean formas de pago (patrón que mordió en zonas). Mitigación:
  invalidar la caché del canal al guardar y validar refresco sin recargar en E2E.
- **RT-04 (redirects/menú):** dejar enlaces muertos a las pantallas viejas. Mitigación: redirect + grep de rutas.
- **RT-05 (unicidad server-side):** hoy `create` no valida duplicados; agregarla podría chocar con datos que
  ya tengan nombres repetidos. Mitigación: el dry-run detecta duplicados preexistentes antes de activar el 409.

## 10. Open questions (técnicas) — RESUELTAS 2026-08-06 (D-056)
- [x] **OQ-1 (arquitectura):** **enfoque B** (pantalla única sobre las dos colecciones; sin colección nueva,
  sin migración destructiva). El enfoque A queda descartado para esta tarea.
- [x] **OQ-2:** la pantalla vive en **`extras/metodos-pago`** (reemplaza ambas); ese es el label/ruta del menú.
- [x] **OQ-3:** unicidad de nombre por **empresa+canal** (permite el mismo nombre en e-com y POS para poder
  fusionarlos en una fila). El 409 aplica dentro de la colección del canal.
