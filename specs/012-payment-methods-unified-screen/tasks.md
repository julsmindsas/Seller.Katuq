# Tasks 012 — Pantalla única de métodos de pago (disponibilidad por canal)

> Estado: draft | in-review | approved | in-progress | **done**
> Vinculado a `plan.md` (**approved**, D-056, enfoque B).
> Última actualización: 2026-08-06 (cierre D-058 — E2E navegador OK + borrado 2 pasos OK)
>
> **Progreso:** ✅ T-01 (rama backend + `npm install` + propuesta OpenSpec `payment-methods-unified-screen`) ·
> ✅ T-05 (util `metodo-pago.util.ts` + spec; test autónomo ts-node 9/9, cazó bug de clave de canal) ·
> ✅ T-02 (unicidad 409 por empresa+canal en `createPagos`/`createPagosPOS` + helper `normalizeNombre`;
> backend reiniciado :3300) · ✅ T-03 (confirmado: `/all` y `/pos/all` devuelven activo/posicion/online/
> integracion/cd sin cambio de firma) · ✅ T-06 (`MetodosPagoService`: fusión + set disponibilidad/posición +
> config global + crear; `tsc --noEmit` 0 errores).
> ✅ T-04 (lógica pura a `services/pagosUnicidad.js` + `scripts/test-pagos-unicidad-contract.js` +
> npm `test:pagos-metodos` → **7/7 verde**; controller refactorizado a usarla; backend reiniciado) ·
> ✅ T-07 (componente `extras/metodos-pago` declarado en `extras.module.ts`: tabla 1 fila/método, toggles
> de disponibilidad por canal, posición por canal editable; usa `MetodosPagoService`; `ng serve` **Compiled
> successfully**. Fix de tipos en el service (`http.get` tipado ArrayBuffer → cast vía `any`)).
> Servidores: back :3300 (rama nueva, T-02+T-04 live) ✅, front :4200 ✅.
> **⚠️ Desviación de constitución (Art. IX):** el proyecto es **Angular 14 + PrimeNG 14**; signals y control
> flow `@if/@for` NO existen en esa versión. El componente sigue el estilo real del código (módulo declarado,
> `*ngIf/*ngFor`, RxJS), igual que las pantallas que reemplaza. Registrado en CONTRACT.
> ✅ T-08 (modal crear/editar config global con `NgbModal` + reactive form; al crear elige canales+posición;
> maneja 409) · ✅ T-09 (inhabilitar = `activo=false` en ambos canales con Swal confirm; rehabilitar; fila
> atenuada; "eliminar"=inhabilitar, sin borrado físico) · ✅ T-10 (ruta `extras/metodos-pago`; las 4 rutas
> viejas `formasPago`/`pos/formasPago`(+crear) **redirigen**; menú NavService consolidado: "Medios de pago" y
> el grupo "Pagos" apuntan a la pantalla única, retiradas las 2 entradas viejas). `ng serve` **Compiled successfully**.
> Servidores: back :3300 ✅, front :4200 ✅. **La pantalla ya es navegable en `/extras/metodos-pago`.**
> ✅ T-11 (`refrescarFormasPago()` en `PedidosUtilService` + `POSPedidosUtilService`; la pantalla admin
> invalida ambas cachés tras cada mutación → checkout/POS sin recargar) · ✅ T-12 (`scripts/reconciliar-
> metodos-pago.js` read-only + npm `reconciliar:metodos-pago`; corrida OH MY STORE: 4 e-com/0 POS sin
> incoherencias, **destapó 29 docs en `pagos` sin `company`** → saneamiento del equipo).
> **⚠️ GOTCHA menú (fix T-10):** el sidebar filtra por permisos — `filterMenuItemsByAuthorization()` solo
> muestra ítems cuyo `path` esté en `localStorage['authorizedMenuItems']`. Apuntar el menú a la ruta NUEVA
> `extras/metodos-pago` la OCULTÓ (no está en los permisos del usuario). Fix: el menú apunta a la ruta vieja
> AUTORIZADA `extras/formasPago`, que **redirige** a `extras/metodos-pago`. (Aplica a futuras rutas nuevas del lote.)
> **➕ SC-012-01 / D-057 (durante T-13):** borrado en 2 pasos. Backend: guardarraíl 409 `metodo_activo` en
> `delete`/`deletePOS` (solo borra si inhabilitado). Front: `MetodosPagoService.eliminarDefinitivo()` + acción
> 🗑 "Eliminar definitivamente" visible solo si el método está inhabilitado (Swal confirm rojo). Back reiniciado,
> front compila. Spec §4/§8 y CONTRACT actualizados.
> **🔵 T-13 (E2E navegador) EN CURSO — la ejecuta el usuario.** Guion de 6 pasos + prueba de borrado en 2 pasos.
> **Falta:** T-14 (cierre: D-057 + `.md` en carpeta `clickup` con nombre de rama + commit con OK del usuario).

## Convenciones
- `[P]` = paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de la tarea NN.
- Enfoque **B**: sin colección nueva; la pantalla fusiona `pagos` (e-com) + `formaPagosPos` (POS) por nombre.

---

## Bloque 0 — Backend (rama `feature/pagos-metodos-unificados` desde `backend-aws-security`)

### T-01 — Crear rama backend + `/opsx:propose`
- **Input:** repo `katuq_admin_back_firebase` en `backend-aws-security`.
- **Output:** rama `feature/pagos-metodos-unificados` creada desde `backend-aws-security`; `npm install` en
  `functions/` (dep `@sentry/node` del instrument.js); propuesta OpenSpec abierta para el endurecimiento de
  `pagos` (unicidad + inhabilitar).
- **Criterio de éxito:** `node --check` OK; backend arranca en :3300; propuesta registrada en `openspec/changes/`.
- **Archivos a tocar:** git + `openspec/changes/…`.
- **Dependencias:** ninguna.

### T-02 — Unicidad de nombre por empresa+canal (409) (deps: T-01)
- **Input:** `controllers/pagos.js` (`createPagos`, `createPagosPOS`).
- **Output:** antes de `add`, verificar que no exista en esa colección un método con `nombre` normalizado
  (trim+lower) igual en la misma `company`; si existe → responder **409** `{error:'nombre_duplicado'}`.
- **Criterio de éxito:** crear duplicado por empresa+canal devuelve 409; mismo nombre en el OTRO canal se permite.
- **Archivos a tocar:** `functions/controllers/pagos.js`.
- **Dependencias:** T-01.

### T-03 — Confirmar shape de lectura + no romper consumidores (deps: T-01) `[P]`
- **Input:** `getpagos` / `getPagosPOS`.
- **Output:** verificar que `/all` y `/pos/all` devuelven `activo`, `posicion`, `online`, `integracion`, `cd`
  (ya lo hacen: devuelven doc crudo + `cd`). Documentar en la propuesta que NO cambian su firma.
- **Criterio de éxito:** respuesta de ambos endpoints incluye los campos que la pantalla necesita; contrato intacto.
- **Archivos a tocar:** (solo lectura / doc) `functions/controllers/pagos.js`.
- **Dependencias:** T-01.

### T-04 — Contract tests backend (deps: T-02) 
- **Input:** patrón de tests del repo (ej. `test:zonascobro-*`).
- **Output:** script `scripts/test-pagos-unicidad-contract.js` + npm `test:pagos-metodos`: (a) create rechaza
  duplicado empresa+canal (409); (b) create mismo nombre en el otro canal → OK; (c) edit `activo=false`
  inhabilita; (d) el doc conserva `posicion` por canal.
- **Criterio de éxito:** suite verde (lógica pura, sin depender de Firestore real donde se pueda).
- **Archivos a tocar:** `functions/scripts/test-pagos-unicidad-contract.js`, `functions/package.json`.
- **Dependencias:** T-02.

---

## Bloque 1 — Frontend servicio + fusión (rama front ya creada)

### T-05 — Util de fusión por nombre `[P]`
- **Input:** modelo `MetodoPagoUnificado` del plan §4.
- **Output:** `shared/util/metodo-pago.util.ts` con `normalizeNombre()` y
  `fusionarMetodosPorCanal(ecom[], pos[]): MetodoPagoUnificado[]` (1 fila/método, banderas `disponible`
  por canal = existe && `activo===true`, guarda `cd` y `posicion` por canal).
- **Criterio de éxito:** unit test: e-com∪POS con solapamiento y con exclusivos produce filas correctas.
- **Archivos a tocar:** `src/app/shared/util/metodo-pago.util.ts` (+ `.spec.ts`).
- **Dependencias:** ninguna.

### T-06 — Métodos de servicio unificados (deps: T-05)
- **Input:** `MaestroService` (ya tiene `consultarFormaPago/POS`, `crear/edit` por canal).
- **Output:** en `MaestroService` (o servicio nuevo `MetodosPagoService extends BaseService`):
  `getMetodosUnificados()` (llama ambos `/all` con `forkJoin` y fusiona vía T-05);
  `guardarDisponibilidadCanal(metodo, canal, disponible)` (create si no existe `cd`, si existe `edit activo`);
  `guardarConfigGlobal(metodo)` (edita ambos canales donde exista); `inhabilitar(metodo, canal)` = `edit activo=false`.
- **Criterio de éxito:** activar un canal donde el método no existe → `create` con campos globales; desactivar
  → `edit activo=false`; editar config global → escribe en los canales presentes.
- **Archivos a tocar:** `src/app/shared/services/maestros/maestro.service.ts` (o servicio nuevo).
- **Dependencias:** T-05.

---

## Bloque 2 — Frontend pantalla única

### T-07 — Componente pantalla única `extras/metodos-pago` (deps: T-06)
- **Input:** servicio de T-06.
- **Output:** componente standalone (OnPush, signals, `@if/@for`) en `src/app/components/extras/metodos-pago/`:
  tabla 1 fila/método con columnas nombre, clasificación (`online`), integración, **toggle e-commerce**,
  **toggle POS**, **posición por canal**, y acciones (editar config, inhabilitar/rehabilitar). Buscador.
- **Criterio de éxito:** la tabla muestra los métodos fusionados; los toggles reflejan disponibilidad por canal;
  el estado no se comunica solo por color (texto/ícono).
- **Archivos a tocar:** `src/app/components/extras/metodos-pago/*` (ts/html/scss).
- **Dependencias:** T-06.

### T-08 — Formulario crear/editar método (config global) (deps: T-07)
- **Input:** campos actuales (`id, online, nombre, posicion, integracion, activo,
  descripcionCorreoElectronico, recordatorioCobro`).
- **Output:** modal/form para crear un método (config global + en qué canales queda disponible + posición por
  canal) y editar su config global; maneja 409 nombre duplicado con mensaje claro.
- **Criterio de éxito:** crear un método disponible solo en POS lo crea en `formaPagosPos`; duplicado → aviso 409.
- **Archivos a tocar:** `src/app/components/extras/metodos-pago/…`.
- **Dependencias:** T-07.

### T-09 — Inhabilitar / rehabilitar (deps: T-07)
- **Input:** acción de la tabla.
- **Output:** "Eliminar" = inhabilitar (`activo=false`) con confirmación Swal; un método inhabilitado se puede
  rehabilitar. **No** usa `delete` físico.
- **Criterio de éxito:** inhabilitar quita el método de la lectura de ambos canales; rehabilitar lo restaura.
- **Archivos a tocar:** `src/app/components/extras/metodos-pago/…`.
- **Dependencias:** T-07.

---

## Bloque 3 — Routing, menú, caché, retiro de las viejas

### T-10 — Routing + redirect + menú (deps: T-07)
- **Input:** `extras-routing.module.ts`, `extras.module.ts`, `NavService`.
- **Output:** ruta `extras/metodos-pago` → nuevo componente; `extras/formasPago` y `extras/pos/formasPago`
  **redirigen** a `extras/metodos-pago`; entrada de menú unificada en `NavService` (retira las dos viejas).
- **Criterio de éxito:** no quedan enlaces muertos; navegar a las rutas viejas cae en la nueva.
- **Archivos a tocar:** `extras-routing.module.ts`, `extras.module.ts`, `shared/services/nav.service` (o equivalente).
- **Dependencias:** T-07.

### T-11 — Invalidar caché de formas de pago al guardar (deps: T-06) `[P]`
- **Input:** caché de formas de pago que usan checkout (e-com) y POS (`card-payment`).
- **Output:** al guardar/inhabilitar, invalidar la caché del canal afectado (mismo patrón que se usó con
  `sessionStorage['allBillingZone']` en zonas) para que checkout/POS reflejen el cambio sin recargar.
- **Criterio de éxito:** tras un cambio, el checkout del canal muestra el estado nuevo sin refrescar la página.
- **Archivos a tocar:** el servicio/caché de formas de pago del canal.
- **Dependencias:** T-06.

---

## Bloque 4 — Reconciliación + verificación

### T-12 — Script read-only de reconciliación (dry-run) (deps: T-01) `[P]`
- **Input:** colecciones `pagos` y `formaPagosPos` por empresa.
- **Output:** `functions/scripts/reconciliar-metodos-pago.js` (read-only, dry-run por defecto): reporta métodos
  con mismo nombre y `online`/`integracion` divergentes entre canales, casi-duplicados (normalización), y
  nombres duplicados preexistentes dentro de un canal (que chocarían con el 409). **Cero escrituras.**
- **Criterio de éxito:** corre contra una empresa de prueba y lista incoherencias sin modificar datos.
- **Archivos a tocar:** `functions/scripts/reconciliar-metodos-pago.js`, `functions/package.json`.
- **Dependencias:** T-01.

### T-13 — E2E navegador (OH MY STORE) (deps: T-08, T-09, T-10, T-11)
- **Input:** front :4200 + back :3300, empresa de prueba.
- **Output:** verificación manual: (1) crear método disponible solo en POS → aparece en POS, NO en checkout
  e-com; (2) activarlo también en e-com → aparece en ambos; (3) cambiar posición por canal → orden correcto
  por canal; (4) inhabilitar → desaparece de ambos; rehabilitar → vuelve; (5) nombre duplicado por canal → 409;
  (6) checkout e-com y POS siguen mostrando lo esperado **sin recargar**. Recordar Ctrl+Shift+R al iniciar.
- **Criterio de éxito:** 6/6 pasos PASS; datos de prueba borrados al final.
- **Archivos a tocar:** ninguno (verificación).
- **Dependencias:** T-08, T-09, T-10, T-11.

### T-14 — Cierre (deps: T-13)
- **Output:** bitácora en `CONTRACT.md` (D-057 de cierre); **`.md` de entrega en la carpeta `clickup`** con el
  nombre de la rama al inicio (convención del usuario); commit con autorización explícita.
- **Criterio de éxito:** contrato actualizado, entregable ClickUp guardado, código commiteado.
- **Dependencias:** T-13.

---

## Orden de ejecución sugerido
1. **T-01** (backend rama+propose) y **T-05** (util fusión, front) en paralelo `[P]`.
2. **T-02**, **T-03** `[P]` tras T-01; **T-04** tras T-02. **T-06** tras T-05.
3. **T-07** tras T-06; luego **T-08**, **T-09** (sobre el mismo componente, secuenciales).
4. **T-10** tras T-07; **T-11** tras T-06 `[P]`; **T-12** tras T-01 `[P]`.
5. **T-13** cuando T-08/T-09/T-10/T-11 estén; **T-14** al final.

## Definition of Done
- Contract tests backend verdes (T-04); unit de fusión verde (T-05).
- E2E navegador 6/6 (T-13).
- Las dos pantallas viejas retiradas/redirigidas; 0 enlaces muertos; ~16 consumidores intactos.
- Caché de formas de pago se invalida al guardar (sin recargar).
- `CONTRACT.md` actualizado (desvíos + cierre) y `.md` de ClickUp guardado con el nombre de la rama.
- Sin colección nueva ni endpoint v2 (enfoque B respetado).
