# Plan 011.1 — Borrado múltiple de zonas de cobro

> Estado: **approved** | Última actualización: 2026-09-01 (ver D-054)
> Basado en `spec.md` (approved). Stack: Angular 14 + PrimeNG 14 (front) · Express/Node + Firestore (back).

## 1. Estrategia general
Cambio contenido y de bajo riesgo: NO toca el modelo de datos (`zonacobro` sigue siendo el paquete de
spec 011 v2) ni el consumo de envío. Solo suma **un endpoint de borrado en lote** en el backend y
**selección + acciones de borrado** en la lista del frontend. El borrado individual actual se conserva.

## 2. Contrato de API (backend)

### Nuevo: `POST /v1/zonascobro/delete-batch` (auth)
Cuerpo (uno de los dos modos):
```jsonc
{ "cds": ["<docId>", "..."] }   // borrar esas zonas (modo selección)
{ "all": true }                  // borrar TODAS las zonas de la empresa activa
```
Respuesta `200`:
```jsonc
{ "msg": "deleted", "deleted": <n>, "ignored": <m> }
```
Reglas:
- **Multi-tenant autoritativo:** la empresa sale del header `company` (nunca del body). El controller
  lee las zonas de esa empresa (una query `where company ==`), arma el set de `cd` válidos y **solo borra
  la intersección** con los `cds` recibidos. Un `cd` de otra empresa o inexistente cae en `ignored`, no se
  borra. En modo `all`, borra todos los `cd` de esa query.
- **Troceado:** los borrados se agrupan en `writeBatch` de **≤ 400** ops por commit (límite Firestore 500,
  margen de seguridad), en bucle hasta agotar.
- **Auth:** middleware `auth` como el resto de rutas del router.
- Sin `all` ni `cds` (o `cds` vacío) → `400`.

### Lógica pura extraíble (testeable sin Firestore)
`planDeleteBatch({ ownedCds: Set<string>, cds?: string[], all?: boolean })
  → { toDelete: string[], ignored: number, error?: string }`
- Aísla la decisión de "qué borrar" de la E/S Firestore → test de contrato sin emulador.
- Vive junto a la lógica del módulo (`services/zonasCobroPackage.js`) o un helper nuevo pequeño.

## 3. Frontend

### Servicio (`maestro.service.ts`)
- `deleteBillingZonesBatch(payload: { cds?: string[]; all?: boolean })`
  → `POST /v1/zonascobro/delete-batch`.

### Componente (`zonas-cobro.component.ts`)
- Estado: `seleccionadas: ZonaCobro[] = []` (ligado a la selección de la tabla).
- `borrarSeleccionadas()`:
  - Guard: si `seleccionadas.length === 0`, no hace nada (el botón ya va deshabilitado).
  - Confirmación Swal: "Vas a eliminar **N** zonas con **M** municipios en total." (M = suma de
    `municipios.length`). Botón confirmar/cancelar.
  - Llama `deleteBillingZonesBatch({ cds: seleccionadas.map(z => z.cd) })`.
  - Al terminar: `seleccionadas = []`, `cargarDatos()`, toast/Swal con `deleted`.
- `borrarTodas()`:
  - Confirmación **reforzada** Swal con `input: 'text'`: el operador debe escribir `ELIMINAR`
    (validación `inputValidator`; botón confirmar deshabilitado/rechaza si no coincide). Muestra el total
    de zonas de la empresa.
  - Llama `deleteBillingZonesBatch({ all: true })`.
  - Al terminar: recarga + resultado.
- `deleteBillingZone(row)` (individual) **se conserva** tal cual.

### Tabla (`zonas-cobro.component.html`)
- Añadir `[(selection)]="seleccionadas"` a `p-table` (ya tiene `dataKey="cd"`).
- Nueva **columna de selección** al inicio: header con `p-tableHeaderCheckbox` (marca **la página
  visible**, coherente con la decisión), body con `p-tableCheckbox [value]="row"`.
- **Toolbar** sobre la tabla:
  - Botón "Eliminar seleccionadas (N)" → `borrarSeleccionadas()`, `[disabled]="!seleccionadas.length"`.
  - Botón "Eliminar TODAS" (estilo peligro) → `borrarTodas()`.
- El botón de basura por fila (individual) se mantiene.

## 4. Gates contra la constitución / reglas de proyecto
- **Multi-tenancy (Art. / regla dura):** el borrado se filtra por `company` server-side. ✔
- **No `console.log` de telemetría:** el resultado se devuelve en la respuesta; sin logs de telemetría. ✔
- **Sin colección nueva ni endpoint v2 de modelo:** es una ruta de utilidad sobre la colección existente,
  no un modelo nuevo. ✔ (No requiere aprobación de "v2" — es borrado, no nuevo esquema.)
- **PrimeNG 14 / Angular 14:** usar `*ngIf/*ngFor` y componentes de módulo (sin signals ni `@if`). ✔
- **Borrado definitivo:** consistente con el borrado individual ya existente (no había papelera). ✔

## 5. Riesgos y mitigaciones (del spec)
- **R-01 borrado masivo accidental** → confirmación reforzada escribiendo `ELIMINAR` + conteo exacto.
- **R-02 fuga entre empresas** → intersección server-side con las zonas de la empresa; test de contrato.
- **R-03 límite de lote** → troceado ≤ 400 por commit; test con volumen simulado en la lógica pura.

## 6. Estrategia de pruebas
- **Backend:** test de contrato de `planDeleteBatch` (npm script `test:zonascobro-delete-batch`):
  - `all: true` → borra todos los `ownedCds`.
  - `cds` con ids ajenos/inexistentes → solo borra los propios; `ignored` correcto.
  - `cds` vacío y sin `all` → error.
  - Volumen > 400 → el troceado produce múltiples lotes (se valida el particionado).
- **Frontend:** compila (`Compiled successfully`). Unit de karma queda como en el módulo (harness inoperante,
  no bloqueante).
- **E2E navegador (lo valida el usuario):** seleccionar varias en una página y borrar; "Eliminar TODAS"
  escribiendo `ELIMINAR`; verificar con `scripts/verify-zonascobro-readonly.js` (read-only) el conteo.

## 7. Checkpoint
- [x] Plan aprobado (implícito al aprobar spec + decisiones 2026-09-01). Continúa `tasks.md`.
