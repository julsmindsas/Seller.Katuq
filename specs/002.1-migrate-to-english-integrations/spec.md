# Spec 002.1 — Migración a canónica `integrations` (inglés)

> Estado: **draft — in-review**
> Fecha: 2026-05-13
> Padre: [[002-flows-osmosis-shopify-marco]]
> Bloquea: 002.4, 002.5, 002.6 (todo lo que toque integraciones depende de esto)
> Decisión-fuente: CONTRACT.md D-009.

## 1. Contexto / Por qué

Tres hallazgos verificados (ver `findings.md` §1, §5):

1. **Productos OH MY STORE**: 8,219 / 8,311 con AMBOS campos `integraciones.X` y `integrations.X` con **schemas distintos** (no son copias).
   - ES tiene `{id: number, syncSource, lastSync: Timestamp}`.
   - EN tiene `{id: string, nodeSlug, syncedAt: ISO string}`.
2. **83 productos Aliaddo + 8 propios** existen SOLO en `integrations` (inglés). Si frontend lee español, no aparecen.
3. **Doble escritura intencional** en `nodes/osmosis/osmosis-order-create.action.js:346-370` con comentario falso "frontend lee inglés".

Decisión D-009: canónica oficial = inglés (`integrations.<provider>.*`).

## 2. Objetivo de negocio

El sistema escribe y lee `integrations.<provider>.*` (inglés) consistentemente. Datos legacy en español se migran sin pérdida. Nuevas integraciones futuras siguen la canónica desde el día 1.

## 3. User stories

- **US-1.** Como **agente IA en sesión futura**, quiero ver UN solo lugar canónico de integraciones para no equivocarme entre es y en.
- **US-2.** Como **dev**, quiero escribir código nuevo sin tener que recordar si toca duplicar el campo en español.
- **US-3.** Como **operador**, quiero que el frontend muestre datos coherentes (no que los Aliaddo se "esfumen" porque están solo en EN).

## 4. Schema unificado por proveedor

Cada proveedor tiene UN schema oficial. Se acuerda en esta sub-spec antes del backfill.

### `integrations.osmosis` (orders)
```typescript
{
  orderId: string;          // siempre string (para coherencia con Shopify)
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  isPushed: boolean;
  pushedAt?: Timestamp;
  lastSyncedAt?: Timestamp;
  lastStatusSync?: Timestamp;
  error?: string;            // solo si último intento falló
  lastErrorAt?: Timestamp;
  lastNote?: string;
  statusHistory?: Array<{    // del webhook entrante (spec 001)
    fecha: ISOString;
    statusOsmosis: string;
    statusKatuq: string;
    previousStatus: string | null;
    notes: string | null;
    source: 'webhook' | 'pull';
  }>;
  evidenciasEntrega?: Array<{ // del webhook entrante (spec 001)
    fecha: ISOString;
    statusOsmosis: string;
    statusKatuq: string;
    url: string | null;
    base64: string | null;
    contentType: string | null;
    filename: string | null;
    nota: string | null;
  }>;
}
```

### `integrations.osmosis` (products)
```typescript
{
  id: number;                // Osmosis usa numérico, lo respetamos
  reference: string;         // SKU
  nodeSlug: string;          // 'cereza' para OH MY STORE
  syncedAt: Timestamp;       // último sync
  syncSource?: 'cron' | 'webhook' | 'manual';
  active?: number;           // 0 | 1 (formato Osmosis)
}
```

### `integrations.shopify` (orders)
```typescript
{
  orderId: string;
  orderNumber: number;
  orderName: string;
  currency: string;
  financialStatus: string;
  taxesIncluded: boolean;
  createdAt: ISOString;
  cancelledAt?: ISOString;
  cancelReason?: string;
  lastSyncedAt: Timestamp;
}
```

### `integrations.shopify` (products)
```typescript
{
  productId: string;
  variantIds: string[];
  inventoryItem?: { id: string; tracked: boolean };
  publishedAt?: ISOString;
  syncedAt: Timestamp;
}
```

### `integrations.fulfillment` (Aliaddo, products)
Ya existe en producción para 82 productos. NO tocar:
```typescript
{
  id: string;                // UUID externo Aliaddo
  provider: 'aliaddo_fulfillment';
  lastSyncStatus: 'success' | 'error';
  lastSyncAt: Timestamp;
}
```

## 5. Criterios de aceptación EARS

### Escrituras
- **AC-01.** WHEN un servicio backend o nodo /flow escribe campos de integración, THE system SHALL escribir SOLO en `integrations.<provider>.*` post-fase 4.
- **AC-02.** WHILE estamos en fase 1-3 (compat), THE system SHALL escribir en AMBOS campos (`integrations.<provider>` y `integraciones.<provider>`) usando un helper único `writeIntegrationField()`.

### Lecturas
- **AC-03.** WHEN un componente frontend o servicio backend lee campos de integración, THE system SHALL leer primero de `integrations.<provider>` y, si está ausente, fallback a `integraciones.<provider>`.
- **AC-04.** Post-fase 4, THE system SHALL fallar (warning + log) si encuentra solo `integraciones.<provider>` — indica un doc no migrado.

### Backfill
- **AC-05.** Post-fase 2, THE system SHALL tener TODOS los docs de `products` y `orders` de OH MY STORE con `integrations.<provider>` poblado correctamente según schema unificado de §4.
- **AC-06.** El backfill SHALL preservar 100% de los datos: ningún campo del schema unificado puede quedar `undefined` si el dato existía en `integraciones.X`.
- **AC-07.** El backfill SHALL convertir tipos según schema: `id: number → string` para Shopify (no para Osmosis), `Timestamp → Timestamp` (preservar), etc.

### Cleanup
- **AC-08.** Post-fase 4, THE system SHALL haber eliminado el campo `integraciones` de TODOS los docs `orders` y `products`.
- **AC-09.** WHEN se ejecuta el script de cleanup, THE system SHALL hacer dry run primero y reportar diff antes de borrar.

## 6. Plan de fases

### Fase 0 — Audit exhaustivo
**Entregable**: tabla completa con cada lugar a tocar.

```bash
# Backend
grep -rn "integraciones\." functions/services functions/controllers functions/routers --include="*.js"
grep -rn "integrations\." functions/services functions/controllers functions/routers --include="*.js"
grep -rn "integraciones\." functions/services/flows/nodes --include="*.js"
grep -rn "integrations\." functions/services/flows/nodes --include="*.js"

# Frontend
grep -rn "integraciones\." Seller.Katuq/src --include="*.ts"
grep -rn "integrations\." Seller.Katuq/src --include="*.ts"
grep -rn "integraciones\." Seller.Katuq/src --include="*.html"
grep -rn "integrations\." Seller.Katuq/src --include="*.html"
```

Output esperado: archivo `audit-results.md` con cada línea clasificada (write/read/query, provider, archivo).

### Fase 1 — Compat layer (escribir en ambos)
- Crear `functions/services/integrations/integrationFieldHelper.js` con función:
  ```js
  function writeIntegrationField(updatePayload, provider, payload) {
    updatePayload[`integrations.${provider}`] = payload;
    updatePayload[`integraciones.${provider}`] = payload;  // compat temporal
    return updatePayload;
  }
  ```
- Migrar TODOS los servicios oficiales para usar este helper:
  - `osmosisOrderService.js:79-86, 100-103, 139-141, 187-193`.
  - `osmosisWebhookService.js:226-270`.
  - `osmosisProductSyncService.js:148, 294`.
- Validar con un test que cada doc nuevo tiene ambos campos coherentes.

### Fase 2 — Backfill consciente
- Script `scripts/backfill-integrations-to-english.js`:
  - Recorre `products` y `orders` de TODOS los tenants (no solo OH MY STORE) o el tenant indicado.
  - Para cada doc:
    1. Si tiene solo `integraciones.<provider>` → mapear según schema y escribir `integrations.<provider>`.
    2. Si tiene solo `integrations.<provider>` → no tocar.
    3. Si tiene ambos:
       - Validar coherencia. Si schemas iguales → ok.
       - Si schemas distintos → resolver con prioridad: campos del **más reciente** (`syncedAt` o `lastSyncedAt` más nuevo).
       - Loguear conflicto si no se puede resolver determinísticamente.
    4. Resultado escrito en `integrations.<provider>` SIEMPRE, en `integraciones.<provider>` se mantiene como copia exacta del nuevo.
  - Dry run primero (flag `--dry-run`). Reporte: docs procesados, conflictos, casos edge.
- Validar con queries post-backfill que TODOS los docs tienen `integrations.<provider>` poblado.

### Fase 3 — Migrar lectores
- Crear helper inverso:
  ```js
  function readIntegrationField(doc, provider) {
    return doc.integrations?.[provider] || doc.integraciones?.[provider] || null;
  }
  ```
- Frontend (Angular):
  - `ventas/list/list.component.ts:518` → cambiar `integraciones.osmosis.id` por helper que lea `integrations.osmosis.orderId`.
  - `tracking-details-modal.component.ts:298-305` → ya usa fallback dual, ajustar para preferir `integrations`.
  - `osmosis-order-extras.component.ts` (creado en sesión 2026-05-13) → cambiar `integraciones.osmosis.evidenciasEntrega` → `integrations.osmosis.evidenciasEntrega`.
  - Componente `provider-dashboard` y otros lectores listados en findings.
- Backend services: cambiar lecturas a usar helper.
- Queries: cambiar `where('integraciones.X.Y', '==', ...)` → `where('integrations.X.Y', '==', ...)` PERO mantener compat query temporal o agregar índice nuevo en `integrations.X.Y`.
- Tests visuales + manuales: verificar que UI sigue mostrando todo (la data está en ambos lados gracias a fase 2).

### Fase 4 — Cleanup
- Eliminar duplicación de escritura del helper:
  ```js
  // antes (compat)
  function writeIntegrationField(updatePayload, provider, payload) {
    updatePayload[`integrations.${provider}`] = payload;
    updatePayload[`integraciones.${provider}`] = payload;
  }
  // después (post-fase 4)
  function writeIntegrationField(updatePayload, provider, payload) {
    updatePayload[`integrations.${provider}`] = payload;
  }
  ```
- Script `scripts/cleanup-integraciones-spanish.js`:
  - Recorre `products` y `orders`.
  - Para cada doc, hace `update({ integraciones: FieldValue.delete() })`.
  - Dry run primero.
- Frontend: eliminar fallback `integraciones` del helper de lectura.
- Constitución: marcar Artículo XV v2 como `vigente — fase 4 cumplida`.
- Eliminar índices Firestore sobre `integraciones.X.Y` que ya no se usen.

## 7. Out of scope

- Migración del campo `notasPedido.notasOsmosis[]` (este NO es campo de integraciones, es notas del pedido). Se queda en español.
- Renombrar variables internas de TypeScript (`pedido.integraciones` en interfaces TS) — eso es estilo de código, no afecta datos.
- Tenants distintos a OH MY STORE — el backfill aplica a todos por seguridad de coherencia.

## 8. Riesgos

- **R-01.** Backfill genera doc demasiado grande (>1MB Firestore límite) por arrays largos. Mitigación: medir antes de update.
- **R-02.** Schema unificado de Osmosis en products tiene `id: number`, pero algunos docs viejos tienen `id: string`. Decisión: forzar `Number()`. Si conversión falla (no parseable), preservar string original con flag `_idTypeMismatch: true` para revisar manual.
- **R-03.** Componente nuevo `osmosis-order-extras` (creado y mergeado a feature branch en sesión 2026-05-13) lee español. Dejar fallback dual durante fase 1-3. Migrar en fase 3.
- **R-04.** El sync de productos del cron usa `osmosisProductSyncService` cada 6h. Durante migración, mientras tanto el cron sigue escribiendo doble por compat layer. Cero impacto.
- **R-05.** Queries con índices compuestos sobre `integraciones.X.Y` en producción pueden romperse cuando el dato no existe. Verificar `firestore.indexes.json` y `firestore-indexes-MERGED-2026-04-26.json`.

## 9. Dependencias

- **002.2** (captura errores) — necesario para detectar fallos del backfill claramente.
- Acceso a Firestore admin (✅).
- Conocimiento del schema actual de cada proveedor (✅, en findings).

## 10. Métricas de éxito

- **M-01.** Post-fase 2: 0 docs `products` con `integraciones.X` que no tengan también `integrations.X` poblado.
- **M-02.** Post-fase 3: 0 errores de "campo undefined" en frontend logs durante 7 días.
- **M-03.** Post-fase 4: 0 docs con campo `integraciones` en `products` y `orders`.
- **M-04.** Cero pérdida de datos en backfill (count de campos antes vs después coincide para cada provider).
- **M-05.** Cero secrets filtrados en error.message del backfill (depende de 002.2).

## 11. Rollback plan

- **Fase 1** rollback: revertir helper a escritura solo española.
- **Fase 2** rollback: borrar campo `integrations` (script inverso).
- **Fase 3** rollback: revertir lectores.
- **Fase 4** rollback: re-ejecutar fase 2 (backfill) — los datos están en `integrations` aún.

Cada fase es independiente, NO se hacen sin probar la anterior.
