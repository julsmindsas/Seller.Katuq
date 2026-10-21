## Contrato de `/v1/onboarding/import-store/*`

Lo fija la prueba `importStore.routes.contract.test.js` (tarea 1.1) antes de implementar.

### Reglas comunes

- **Cadena:** `auth, requireJwtTenant, requireFeature(FEATURE_FLAGS.storeMigrationImport), ONLY_ADMIN`. La empresa sale del JWT. Si el cuerpo o el encabezado traen otra, `requireJwtTenant` responde 403 antes de llegar a la ruta; el cuerpo nunca elige la empresa.
- **Éxito:** `{ "success": true, … }`.
- **Error:** `{ "success": false, "code", "message" }`, con `message` en español y sin jerga.
- **Contenido de respuestas y auditoría:** fila, clave del producto y código. Nunca correos, teléfonos ni direcciones.
- **`migrationId`:** un uuid del front que acompaña toda la migración.
- **`lot`:** un entero desde 1, por paso.

| Código | HTTP | Cuándo |
|---|---|---|
| `INVALID_PAYLOAD` | 400 | El cuerpo no cumple el esquema, o `source` o `mode` son desconocidos |
| `FEATURE_DISABLED` | 403 | Bandera apagada; lo responde `requireFeature`, antes del rol |
| (el de `ONLY_ADMIN`) | 403 | Rol sin permiso; se mantiene tal como está |
| `SITE_NOT_FOUND` | 404 | El sitio no es de la empresa |
| `BATCH_NOT_FOUND` | 404 | El lote de clientes no es de la empresa |
| `FLOW_PUBLISHES_PRODUCTS` | 409 | La guarda de flows (`products`) |
| `CATEGORY_TREE_UNREADABLE` | 409 | El árbol de categorías es ilegible |
| `WAREHOUSE_INVALID` | 409 | La bodega elegida no existe o está inactiva, o no se eligió ninguna y hay existencias por cargar (el mensaje pide elegirla) |
| `IMPORT_IN_PROGRESS` | 409 | El candado de la empresa está tomado (`products`, `customers`) |
| `TOO_MANY` | 413 | Se pasa el límite de la ruta (tabla de abajo) |

Mientras no entren las escrituras (tareas 6.1 y 7.1), `products` y `redirects` validan, revisan la guarda y el sitio, y responden 501 `NOT_AVAILABLE_YET`.

Ante `IMPORT_IN_PROGRESS`, el front espera y reenvía el mismo lote. Si ese lote ya había terminado, recibe su resultado con `replayed: true`.

| Ruta | Límite |
|---|---|
| `dry-run` | 2.000 grupos |
| `products` | 25 grupos |
| `redirects` | 2.000 productos y 1.000 colecciones |
| `customers` | 500 filas |

### `POST dry-run` y `POST products`

```json
{ "migrationId": "uuid", "source": "shopify", "mode": "create", "lot": 3, "siteId": "opcional",
  "options": { "ivaPercent": 19, "warehouse": "BOD-001", "replaceExistingStock": false },
  "groups": [{ "key": "camiseta-basica", "rows": [{ "…": "columnas conocidas" }], "inventoryRows": [] }] }
```

- `source`: `shopify` (y `woocommerce` en la fase 1c).
- `mode`: `create` (por defecto) o `upsert`.
- `lot` es obligatorio en `products` y no va en `dry-run`.
- `siteId` solo sirve en `dry-run`, para contar redirecciones. Sin él, `redirects` llega en `null`.
- Cada fila de `rows` puede traer `_row`, su número en el archivo, para que el reporte diga la fila.

**`dry-run` → 200:**

```json
{ "success": true, "migrationId": "…",
  "products": { "total": 500, "toCreate": 480, "toUpdate": 0, "skipped": 20, "variants": 1430, "splitByPrice": 6,
    "tooManyAxes": 2, "withoutSku": 35, "duplicatedInFile": 1, "ambiguousInKatuq": 0, "archived": 3, "giftCards": 1 },
  "photos": { "valid": 2100, "rejected": 12, "overLimit": 40 }, "categories": { "new": ["Camisetas"] },
  "inventory": { "warehouse": "BOD-001", "units": 8200, "replacesExisting": 0 },
  "redirects": { "generated": 520, "probable": 20, "conflictsWithManual": 3, "overCapacity": 23, "capacity": 500 },
  "guards": [{ "code": "FLOW_PUBLISHES_PRODUCTS", "message": "…" }],
  "issues": [{ "row": 14, "key": "camiseta-basica", "code": "PRICE_PER_VARIANT", "message": "…" }], "issuesTotal": 61 }
```

**`products` → 200:**

```json
{ "success": true, "migrationId": "…", "lot": 3, "replayed": false,
  "products": [{ "key": "camiseta-basica", "row": 2, "action": "created", "cd": "…", "referencia": "CAM-01" },
               { "key": "gorra", "row": 9, "action": "skipped", "reason": "ALREADY_MIGRATED", "cd": "…" }],
  "inventory": { "warehouse": "BOD-001", "loaded": 22, "notLoaded": 3, "failed": [{ "key": "…", "referencia": "CAM-01", "code": "INVENTORY_FAILED" }] },
  "photos": { "valid": 61, "rejected": 2, "overLimit": 4 }, "categories": { "created": ["Camisetas"] },
  "issues": [{ "row": 14, "key": "…", "code": "PHOTO_REJECTED", "message": "…" }], "durationMs": 9100 }
```

- **`action`:** `created`, `updated` o `skipped`.
- **`reason`:** `EXISTS`, `ALREADY_MIGRATED` (devuelve `cd`), `AMBIGUOUS_REFERENCE`, `TOO_MANY_AXES`, `ARCHIVED`, `GIFT_CARD`, `DUPLICATED_IN_FILE` o `INVALID`.
- **`inventory`:** solo cuenta los productos creados (o, en `upsert`, los existentes con `replaceExistingStock`). `notLoaded` = sin control de existencias (`NOT_TRACKED`) o sin unidades. Un conteo fallido no tumba el lote: el producto queda creado y sale `INVENTORY_FAILED` (también en `issues`); sus existencias se cargan con el importador de existencias.
- **Producto separado por precio:** lleva `splitFrom` con la clave original.
- **`replayed: true`:** el lote ya había terminado y se devuelve el resultado guardado.

### `POST redirects`

```json
{ "migrationId": "uuid", "source": "shopify", "siteId": "…",
  "products": [{ "handle": "camiseta-basica", "cd": "…" }],
  "collections": [{ "handle": "camisetas", "categoria": "Camisetas", "probable": true }] }
```

**→ 200:**

```json
{ "success": true, "generated": 480, "replaced": 12, "unchanged": 30, "probable": 20, "conflictsWithManual": 3,
  "overCapacity": 23, "capacity": 500, "issues": [{ "desde": "/products/gorra", "code": "MANUAL_CONFLICT" }] }
```

`issues[].code` puede ser:

- `MANUAL_CONFLICT`: la entrada es manual y se conservó.
- `TARGET_MISSING`: apunta a un producto que ya no existe.
- `OVER_CAPACITY`: no cupo en el tope.
- `NOT_MIGRATED`: el `cd` no corresponde a un producto migrado de la empresa con ese `handle`.

### `POST customers` (fase 1b)

```json
{ "migrationId": "uuid", "source": "shopify", "siteId": "…", "lot": 1, "declaration": true,
  "rows": [{ "row": 2, "data": { "…": "columnas conocidas" } }] }
```

**→ 200:**

```json
{ "success": true, "importBatchId": "<migrationId>_c1", "created": 410, "completed": 70, "skipped": 20,
  "subscriptions": { "created": 300, "noConsent": 150, "existing": 25, "suppressed": 5 },
  "issues": [{ "row": 31, "code": "NO_CONTACT" }] }
```

Sin `declaration: true`, el lote entra sin crear ninguna suscripción.

### `DELETE customers/:batchId` (fase 1b)

**→ 200:** `{ "success": true, "clientsDeleted": 410, "subscribersDeleted": 290, "subscribersKept": 10 }`.

Si el lote no es de la empresa, responde 404 `BATCH_NOT_FOUND`.
