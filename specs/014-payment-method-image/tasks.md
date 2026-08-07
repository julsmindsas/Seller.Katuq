# Tasks 014 — Imagen visual del método de pago

> Estado: draft | in-review | approved | in-progress | **done**
> Vinculado a `plan.md` (**approved**, D-065).
> Última actualización: 2026-08-06 (cierre D-066 — E2E OK: imagen se ve en tabla, checkout y POS)
> Rama: `feature/pagos-metodos-unificados` (misma del lote; ambos repos). **Solo frontend** (backend intacto).
>
> **Progreso:** ✅ T-01 (`logo` en `MetodoPagoUnificado`/`FormaPagoRaw` + fusión) · ✅ T-02
> (`MetodosPagoService`: inyecta `AngularFireStorage`; `validarImagen` (delega a util puro `validarImagenMetodoPago`),
> `subirImagen` a `metodosPago/{company}/{ts}_{name}`; `logo` en buildCreate/buildCanal/guardarConfigGlobal) ·
> ✅ T-03 (test autónomo del validador **9/9**). `ng serve` Compiled successfully.
> ✅ T-04 (modal: input file + validación + preview + quitar; sube al guardar vía `resolverLogo`) ·
> ✅ T-05 (miniatura en la lista con respaldo `onLogoError`) · ✅ T-06 (checkout: `<img>` con fallback al
> ícono vía `logoFallido`) · ✅ T-07 (POS `getPaymentIconPath` antepone `metodo.logo`). `ng serve` OK.
> **🔵 T-08 (E2E navegador) — la ejecuta el usuario.** Luego T-09 cierre.
> ⚠️ Vigilar en T-08: que las reglas de Firebase Storage permitan la subida (RT-01).

## Convenciones
- `[P]` = paralelizable. `(deps: T-NN)` = dependencia.
- Campo reutilizado: **`logo`** (URL). Storage: `metodosPago/{company}/{ts}_{filename}`. Subida **al guardar**.

---

### T-01 — Modelo: `logo` en la fila unificada (deps: —) `[P]`
- **Input:** `shared/util/metodo-pago.util.ts`.
- **Output:** `MetodoPagoUnificado` gana `logo: string`; en `fusionarMetodosPorCanal`, `logo` se toma de
  `base` (ecommerce ?? pos). Actualizar el test autónomo/spec si aplica.
- **Criterio de éxito:** la fila fusionada expone `logo`.
- **Archivos:** `metodo-pago.util.ts` (+ `.spec.ts`).

### T-02 — Servicio: subir/validar imagen + `logo` en payloads (deps: T-01)
- **Input:** `shared/services/ventas/metodos-pago.service.ts`.
- **Output:**
  - Inyectar `AngularFireStorage`.
  - `validarImagen(file): string | null` — **pura**: tipo ∈ {png,jpg,jpeg,webp,svg} y ≤ 2 MB; devuelve mensaje
    de error o null.
  - `subirImagen(file): Observable<string>` — sube a `metodosPago/{company}/{ts}_{name}` (company de
    `localStorage['user']`) y resuelve la downloadURL.
  - Incluir `logo` en `buildCreatePayload`, `buildCanalPayload` y en `guardarConfigGlobal`.
- **Criterio de éxito:** crear/editar propagan `logo`; validador rechaza tipo/tamaño inválidos.
- **Archivos:** `metodos-pago.service.ts`.
- **Dependencias:** T-01.

### T-03 — Test del validador (deps: T-02) `[P]`
- **Output:** test autónomo (ts-node) de `validarImagen`: acepta png/jpg/webp/svg ≤2 MB; rechaza otros tipos y
  >2 MB. (Karma inoperante → prueba node, patrón del lote.)
- **Criterio de éxito:** casos verdes.
- **Archivos:** util/spec o script temporal verificado.

### T-04 — Modal: subir/preview/quitar imagen (deps: T-02)
- **Input:** `components/extras/metodos-pago/metodos-pago.component.{ts,html}`.
- **Output:** en el modal crear/editar: `<input type="file" accept="image/*">`; al elegir, validar y guardar
  el `File` + mostrar **previsualización**; en edición mostrar `logo` actual y permitir **quitar** (logo='').
  Al **guardar**: si hay archivo nuevo → `subirImagen()` → URL → `logo`; si se quitó → `logo=''`; si no se tocó
  → conservar. Manejar errores de validación/subida con Swal.
- **Criterio de éxito:** subir en crear/editar guarda la URL en `logo`; quitar la borra; archivo inválido se
  rechaza sin guardar.
- **Archivos:** `metodos-pago.component.ts`, `metodos-pago.component.html`.
- **Dependencias:** T-02.

### T-05 — Lista: miniatura (deps: T-01) `[P]`
- **Input:** `metodos-pago.component.html`.
- **Output:** columna con `<img [src]="m.logo" [alt]="m.nombre" (error)="...">` (miniatura) o respaldo neutro
  cuando `logo` vacío.
- **Criterio de éxito:** la lista muestra la imagen del método (o respaldo).
- **Archivos:** `metodos-pago.component.html` (+ scss).

### T-06 — Checkout e-commerce: mostrar imagen con respaldo (deps: T-01) `[P]`
- **Input:** `ventas/checkout/checkout.component.html` (~731).
- **Output:** si `opcionPago.logo` → `<img [src]="opcionPago.logo" [alt]="opcionPago.nombre" (error)=...>`; si
  no → conservar `<i [class]="getPaymentMethodIcon(opcionPago.nombre)">` como respaldo.
- **Criterio de éxito:** en checkout el método con imagen muestra su imagen; sin imagen, el ícono.
- **Archivos:** `checkout.component.html` (+ ts si hace falta un handler de error).

### T-07 — POS: `getPaymentIconPath` usa `logo` (deps: —) `[P]`
- **Input:** `ventas/pos2/widgets/card-payment/card-payment.ts`.
- **Output:** en `getPaymentIconPath`, anteponer `if (metodo?.logo) return metodo.logo;` antes de `iconPath`/
  slug. `onImgError` ya cae al placeholder.
- **Criterio de éxito:** en POS el método con imagen muestra su imagen; sin imagen, el respaldo actual.
- **Archivos:** `card-payment.ts`.

### T-08 — E2E navegador (usuario) (deps: T-04,T-05,T-06,T-07)
- **Output:** subir imagen a un método → verla como **miniatura** en la lista, y **la misma** en checkout y
  POS; método sin imagen → **respaldo**; **cambiar** y **quitar** imagen; ver el cambio **sin recargar**.
  Recordar Ctrl+Shift+R.
- **Criterio de éxito:** imagen consistente en ambos canales; 0 imágenes rotas.

### T-09 — Cierre (deps: T-08)
- **Output:** bitácora D-066 en `CONTRACT.md` + **`.md` en carpeta `clickup`** con el nombre de la rama +
  commit con OK del usuario.

---

## Orden de ejecución sugerido
1. **T-01** → **T-02** → (**T-03**, **T-04**, **T-05** en paralelo). **T-06** y **T-07** en paralelo (indep.).
2. **T-08** cuando estén T-04..T-07. **T-09** al final.

## Definition of Done
- `logo` en el modelo; subir/validar/quitar imagen desde la pantalla; miniatura en la lista.
- Checkout y POS muestran la **misma** imagen del método, con respaldo neutro si falta.
- Caché invalidada al guardar (ya existente). Sin cambios de backend ni colección nueva.
- `CONTRACT.md` actualizado + `.md` ClickUp con nombre de rama.
