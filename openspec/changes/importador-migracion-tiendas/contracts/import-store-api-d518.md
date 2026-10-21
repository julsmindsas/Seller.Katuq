# Contrato de `/v1/onboarding/import-store/*`: ampliación D-518

> **Estado: NUEVO, pendiente de aprobación de Daniel.** Se suma a `import-store-api.md`, que sigue vigente: reglas comunes, cadena, formato de error y rutas aprobadas. La prueba `importStore.routes.contract.test.js` se amplía con esto **antes** de implementar (Artículo VIII).

## Códigos nuevos

| Código | HTTP | Cuándo |
|---|---|---|
| `RATE_LIMITED` | 429 | La empresa hizo más de 20 simulaciones en 15 minutos (`dry-run`). Lo responde el limitador, después de la cadena y antes del controlador |
| `WOO_INTEGRATION_ACTIVE` | 409 | La empresa tiene la integración WooCommerce activa (`products`, `photos`, `redirects`, `customers`). En `dry-run` aparece en `guards` |
| `NOT_MIGRATED` | 200, en `issues` | `photos`: el `cd` no es de la empresa o no es de esa migración |

`IMPORT_IN_PROGRESS` (409) también aplica a `photos`: comparte el candado de `products` y `customers`.

## Cambios en `dry-run` y `products`

- **`source`:** `shopify` o `woocommerce`. `payload.js` deja de responder «Por ahora: Shopify» cuando entra el lector de Woo (W2).
- **`options.ivaPercent`:** ahora es la tarifa **de los gravados**. Los exentos se leen del archivo (A2).
- **`options.pricesIncludeTax`** (pregunta 17): `true` o `false`. Obligatorio en `products` cuando el lote trae productos gravados; sin él, 400 `INVALID_PAYLOAD`. En `dry-run` es opcional: sin él, la simulación calcula como `true` y avisa `PRICES_TAX_UNKNOWN`.
- **`options.taxClassMap`** (pregunta 4, solo Woo): `{ "<clase>": 0 | 5 | 19 }`. `zero-rate` es 0 sin asignarla.
- **Las filas pueden traer los encabezados actuales o los anteriores** (A1). El front manda las columnas conocidas de los dos formatos.

**`dry-run` → 200, campos nuevos:**

```json
{ "format": "current",
  "products": { "taxExempt": 12, "withOffer": 40, "unpublishedOnline": 3, "typeNotSupported": 0,
                "notTracked": 7, "priceShadowed": 0 },
  "taxClasses": [{ "class": "reduced-rate", "products": 9, "mapped": null }],
  "plan": { "name": "free", "visibleLimit": 50, "visibleToday": 38, "hiddenAfterImport": 488, "currentDisplaced": 0, "ownDomain": false },
  "offers": { "publicList": "found", "count": 40, "scheduled": 1, "expired": 2 },
  "photos": { "toCopy": 2100 },
  "seo": { "withSeo": 410, "withAlt": 900 },
  "guards": [{ "code": "WOO_INTEGRATION_ACTIVE", "message": "…" }] }
```

- **`format`:** `current`, `legacy` o `mixed`; `null` cuando el archivo no trae las columnas mínimas (handle, nombre y precio) en ningún formato conocido, siempre con `UNKNOWN_FORMAT` en `issues`.
- **`products.unpublishedOnline`** y **`products.notTracked`** ya los devuelve la simulación (revisión de A1 y E2). Un producto fuera de la tienda web no entra en el plan de redirecciones: la 301 llevaría a una ficha que la tienda no muestra.
- **`offers.publicList`:** `found`, `missing` o `ambiguous`. Con `missing` o `ambiguous`, las ofertas no se cargan, y la pantalla ofrece crear el tipo de cliente (pregunta 1).
- **`plan`:** solo con un plan que limita los productos visibles (E1); si no, `null`.
- **`taxClasses`:** solo Woo, las clases distintas de vacía, `standard` y `zero-rate`.

**`products` → 200, campos nuevos:**
- `products[].offer`: `loaded`, `kept`, `none` o `skipped`.
- `offers` (en la respuesta del lote): `{ publicList, loaded, kept, skipped }`; con `missing` o `ambiguous` no se escribe ninguna oferta y sale un aviso global.
- `products[].taxExempt`: booleano.
- `photosPending`: cuántas fotos de los creados quedan por copiar.

**Códigos nuevos en `issues`** (con `row`, `key`, `code`, `message`; nunca datos personales):

| Código | Paso | Qué dice |
|---|---|---|
| `LEGACY_FORMAT`, `MIXED_FORMAT` | dry-run | Formato del archivo (informativo) |
| `INVENTORY_FORMAT_UNSUPPORTED` | dry-run | CSV de inventario con las ubicaciones como columnas: pide el export por estados |
| `OFFER_NO_PUBLIC_LIST`, `OFFER_AMBIGUOUS_LIST` | dry-run, products | No hay un único tipo de cliente Público: la oferta no se carga |
| `OFFER_SCHEDULED`, `OFFER_EXPIRED` | dry-run, products | Oferta de Woo con inicio futuro o ya vencida: no se carga |
| `OFFER_INVALID` | dry-run, products | La oferta del producto no se puede calcular (IVA fuera de {0, tarifa elegida} o precios no válidos): no se carga |
| `OFFER_KEPT` | products (`upsert`) | El producto ya tenía su fila Público: no se toca |
| `TAX_CLASS_UNMAPPED` | dry-run, products | Woo trae una clase de impuesto sin tarifa asignada: esos productos no se importan |
| `PRICES_TAX_UNKNOWN` | dry-run | Falta decir si los precios del archivo incluyen IVA |
| `NOT_TRACKED`, `TRACKING_MIXED` | dry-run, products | Producto sin control de existencias (entra no inventariable, sin existencias) o grupo con variantes mezcladas (entra con control) (E2) |
| `PRICE_SHADOWED_BY_PUBLIC_LIST` | dry-run, products (`upsert`) | El producto ya tiene fila Público con precio: el precio actualizado no se ve en la tienda en línea |
| `PLAN_LIMIT` | dry-run | El plan gratis no muestra todo lo importado; las redirecciones necesitan dominio propio (E1) |
| `TARGET_HIDDEN_BY_PLAN` | redirects | No se generó la 301: el producto queda fuera del cupo del plan |
| `UNKNOWN_FORMAT` | dry-run | El archivo no trae las columnas mínimas en ningún formato conocido |
| `BASE_ASSUMED` | redirects | Woo: la base de las direcciones se supuso (W3) |
| `TYPE_NOT_SUPPORTED`, `ORPHAN_VARIATION`, `VARIATION_ANY_VALUE`, `STOCK_UNKNOWN` | dry-run, products | Reglas del lector de Woo (W2) |
| `ATTRIBUTES_NOT_IMPORTED` | dry-run, products | Atributos que no definen variantes (pregunta 12) |
| `SLUG_PROBABLE` | dry-run, redirects | La dirección vieja de Woo se armó con el nombre |

`reason` de los omitidos suma `TYPE_NOT_SUPPORTED` y `WRITE_FAILED` (el producto no se pudo guardar; reenviar el lote lo reintenta). `products` acepta `runId` opcional (formato de `migrationId`): otro recorrido del mismo lote tiene su propio resultado guardado.

## `POST photos` (nueva; requiere aprobación, pregunta 8)

```json
{ "migrationId": "uuid", "runId": "uuid", "lot": 1, "products": [{ "cd": "…" }] }
```

- **Tope:** 10 productos por lote (413 `TOO_MANY`). `lot` es un entero desde 1 dentro de cada `runId`. `runId` cumple el formato de `migrationId`. Cada `cd` cumple `^[A-Za-z0-9_-]{1,128}$`.
- **Lote repetido:** el mismo `runId` y `lot` devuelve el resultado guardado con `replayed: true`. El id lleva la empresa (M1). Un `runId` nuevo copia lo que siga pendiente (`design-fotos.md` P2).
- El cuerpo no acepta enlaces ni otros campos: **ver revisión privada**.

**→ 200:**

```json
{ "success": true, "migrationId": "…", "lot": 1, "replayed": false,
  "copied": 61, "alreadyOwn": 3, "changedMeanwhile": 0,
  "failed": [{ "cd": "…", "index": 2, "code": "download_failed" }],
  "issues": [{ "cd": "…", "code": "NOT_MIGRATED" }], "durationMs": 21000 }
```

- `failed[].code` sale de la pieza `photoCopy`: `download_failed`, `not_image`, `too_large` o `unreadable`.
- Nunca se devuelve ni se registra la URL de origen.

## `GET photos/pending` (nueva; requiere aprobación, pregunta 8)

Sin cuerpo. Misma cadena; no toma el candado.

**→ 200:** `{ "success": true, "migrations": [{ "migrationId": "…", "startedAt": "ISO", "products": 480, "photosPending": 37 }] }`, como mucho 5, la más reciente primero. Sin enlaces, nombres ni referencias.

## `POST redirects`: campos nuevos

- **Productos:** `products[]` acepta `probable: true`, para el slug de Woo armado con el nombre (W3).
- **Dirección pegada:** acepta `urls[]: [{ "desde": "/product/mi-producto/", "cd": "…" }]`, la lista de direcciones reales que pega el comercio. Manda sobre la probable del mismo `cd`. `desde` pasa por `normalizarRutaRedireccion`.
- **Fuente:** `source` acepta `woocommerce`.
- **Base de Woo:** `productBase` y `categoryBase` (por ejemplo `/producto/` y `/categoria-producto/`), cada una una ruta interna que pasa por `normalizarRutaRedireccion`. Sin ellas, la del idioma del archivo y el aviso `BASE_ASSUMED` (W3).
- **Plan gratis:** no se genera la 301 hacia un producto fuera del cupo (`TARGET_HIDDEN_BY_PLAN`).

## `POST customers`: campo nuevo (si la pregunta 19 dice que sí)

- `source` acepta `woocommerce` (CSV del informe de clientes de Analytics). Con esa fuente, `subscriptions.created` es siempre 0: el archivo no trae consentimiento (W5).

## Rastro (`migration_audit`)

- `step` suma `photos`; el registro del lote de fotos lleva `runId`.
- `counts` suma `copied`, `failed`, `offers`, `taxExempt` y `withSeo`.
- Sigue con solo números: sin enlaces, nombres ni datos personales (`auditoria.js`, `soloNumeros`).
- Excepción (F530-B05): el registro de un lote de `products` terminado guarda además el campo `respuesta` (el resultado que se devuelve con `replayed: true`: clave del producto, referencia, `cd`, códigos; sin enlaces ni datos personales). `counts` sigue siendo solo números, y suma `failedByCode` (conteo por código de causa de `WRITE_FAILED`). `user_add`/`user_edit` guardan el correo del token, igual que `importProducts` (`autorDe`); el rastro guarda el `sub`. `TYPE_NOT_SUPPORTED` llega con el lector de WooCommerce (W2).
