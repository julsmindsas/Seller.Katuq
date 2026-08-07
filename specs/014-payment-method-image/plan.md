# Plan 014 — Imagen visual del método de pago

> Estado: draft | in-review | **approved** | superseded
> Vinculado a `spec.md` (**approved**, D-064). Aprobado en checkpoint 2026-08-06 (D-065).
> Última actualización: 2026-08-06

## 1. Resumen técnico
Se reutiliza el campo **`logo`** (URL) del método de pago. En la pantalla única (spec 012) se agrega un
control para **subir una imagen** a **Firebase Storage** (`AngularFireStorage`, patrón ya usado en
asentar-pago-manual); la URL de descarga se guarda en `logo` del método (config global → se propaga a los docs
del método en ambos canales). La **lista** muestra una miniatura. El **checkout** y el **POS** muestran
`método.logo` como imagen, con **respaldo neutro** (ícono/placeholder actual) cuando falta o falla la carga. La
caché de formas de pago se invalida al guardar (patrón del lote) para reflejar la imagen sin recargar.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec 014 approved (D-064). |
| II — Spec captura intent | sí | la spec no nombra tecnología. |
| IV — Idempotencia | sí | re-subir reemplaza la URL en `logo`; no duplica el método. |
| VI — UI no acoplada a proveedor | sí | imagen genérica por método; sin lógica por proveedor. |
| VII — Observabilidad | sí | subir/cambiar/quitar imagen registrable sin datos sensibles. |
| VIII — Test-first contratos | parcial | la subida a Storage es UI/integración (no unitaria fácil); se cubre la validación de archivo (pura) + E2E. |
| IX — Estilo Angular | sí (con salvedad Angular 14) | `*ngIf/*ngFor`, componente declarado (desviación Art. IX ya registrada). |
| XI — Datos sensibles fuera del log | sí | no se loguean secretos ni rutas de otras empresas. |

> Sin colección nueva ni endpoint v2. El backend NO cambia: `logo` ya viaja en el doc por los endpoints
> existentes (`create`/`edit`/`all` guardan/devuelven el doc completo). No dispara el gate del backend.

## 3. Arquitectura

### 3.1 Modelo (frontend)
- `metodo-pago.util.ts`: `MetodoPagoUnificado` gana `logo?: string` (config global del método). En
  `fusionarMetodosPorCanal`, `logo` se toma de `base` (ecommerce ?? pos). `FormaPagoRaw` ya es abierto (`[k]:any`).

### 3.2 Servicio (frontend)
- `MetodosPagoService`:
  - Inyectar `AngularFireStorage`.
  - `subirImagen(file: File): Observable<string>` → sube a
    `metodosPago/{company}/{timestamp}_{filename}` y resuelve la **URL de descarga**. `company` desde
    `localStorage['user'].company` (multi-tenant).
  - `validarImagen(file): string | null` → **pura**: valida tipo (png/jpg/jpeg/webp/svg) y tamaño (≤ 2 MB);
    devuelve mensaje de error o null.
  - Incluir `logo` en `buildCreatePayload`, `buildCanalPayload` y en `guardarConfigGlobal` (para que la imagen
    se propague a los canales donde el método existe).

### 3.3 Pantalla única (admin)
- **Modal crear/editar:** control `<input type="file" accept="image/*">`; al elegir, validar (`validarImagen`);
  guardar el `File` en memoria y mostrar **previsualización**. Si en edición ya hay `logo`, mostrar la actual y
  permitir **quitarla** (logo = '').
- **Al guardar:** si hay archivo nuevo → `subirImagen()` → obtener URL → setear `logo` → luego `crearMetodo`/
  `guardarConfigGlobal` con `logo`. Si se quitó → `logo=''`. Si no se tocó → conservar el `logo` actual.
- **Lista:** columna con `<img [src]="m.logo" (error)="...">` (miniatura) o respaldo si vacío.

### 3.4 Canales
- **Checkout e-commerce** (`checkout.component.html`, ~731): si `opcionPago.logo` → `<img [src]="opcionPago.logo"
  [alt]="opcionPago.nombre" (error)="...ocultar/placeholder">`; si no → conservar el `<i getPaymentMethodIcon>`
  como respaldo.
- **POS** (`card-payment.ts` `getPaymentIconPath`): anteponer `if (metodo?.logo) return metodo.logo;` antes de
  `iconPath`/slug. `onImgError` ya cae al placeholder. (El HTML del POS ya usa `<img (error)="onImgError">`.)

### 3.5 Diagrama (texto)
```
Pantalla métodos → [subir archivo] → AngularFireStorage (metodosPago/{company}/...) → downloadURL
   → guardar `logo` en el/los doc(s) del método (create/edit)   → invalidar caché (checkout+POS)
Checkout / POS → leen `método.logo` → <img> con respaldo (icono/placeholder) si falta/falla
```

## 4. Modelo de datos
Sin cambios de esquema. Se usa el campo **`logo`** (string URL) que el doc ya admite. Ruta en Storage:
`metodosPago/{company}/{timestamp}_{filename}`.

## 5. Contratos
- **Sin cambios de API.** `create`/`edit`/`pos/*` ya persisten el doc completo (incluye `logo`); `/all` y
  `/pos/all` ya lo devuelven. La subida va directo a Storage vía SDK (no pasa por el backend Node).

### 5.1 Errores (UI)
| Situación | Comportamiento |
|---|---|
| Archivo no imagen / > 2 MB | Aviso (Swal), no sube ni guarda. |
| Falla la subida a Storage | Aviso; no se guarda `logo`. |
| Imagen rota al mostrar | `(error)` → respaldo neutro. |

## 6. Estrategia de testing
- **Unit (pura):** `validarImagen` (tipos/tamaño ok y rechazos). En front, si karma sigue inoperante, test
  autónomo ts-node del validador.
- **E2E navegador:** subir imagen a un método → verla como miniatura en la lista, en checkout y en POS
  (misma imagen); método sin imagen → respaldo; cambiar/quitar imagen; ver reflejo sin recargar.

## 7. Fases de implementación
1. **Fase A — Modelo+servicio:** `logo` en el modelo; `MetodosPagoService.subirImagen`/`validarImagen` + `logo`
   en payloads y `guardarConfigGlobal`.
2. **Fase B — Modal:** input file + validación + preview + quitar; subir al guardar.
3. **Fase C — Lista:** miniatura.
4. **Fase D — Canales:** checkout (img + respaldo) y POS (`getPaymentIconPath` usa `logo`).
5. **Fase E — E2E navegador.**

## 8. Plan de rollout
- Sin feature flag. Reversible por rama. Backend intacto → no requiere deploy backend para esta tarea (solo front).
- Rollback: revertir commits del front; los métodos sin `logo` siguen mostrando el respaldo.

## 9. Riesgos técnicos
- **RT-01 (multi-tenant Storage):** ruta con `{company}`; reglas de Storage deben permitir la escritura por
  empresa (asumimos reglas actuales lo permiten, igual que comprobantes de pago). Verificar en E2E.
- **RT-02 (propagación a 2 canales):** `guardarConfigGlobal` ya escribe `logo` en los docs donde el método
  existe; un método presente solo en un canal guarda el logo en ese canal (correcto).
- **RT-03 (caché stale):** invalidar caché al guardar (ya implementado en la pantalla, `trasMutacion`).
- **RT-04 (svg):** aceptar svg implica confiar en el contenido; como es subida por el admin (interno), riesgo
  bajo. Si se quiere endurecer, se restringe a raster; queda como nota.

## 10. Open questions (técnicas) — RESUELTA 2026-08-06 (D-065)
- [x] **OQ-1:** la subida a Storage ocurre **al guardar** el modal (una sola confirmación); el archivo elegido
  se retiene en memoria y solo se sube cuando el operador confirma crear/guardar.
