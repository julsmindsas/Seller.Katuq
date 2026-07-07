# Plan 018 — Sincronización de Tipo de Cliente (Katuq → Shopify)

> Estado: **draft**
> Vinculado a `spec.md` (approved 2026-07-07).
> Última actualización: 2026-07-07

## 1. Resumen técnico

Nuevo nodo de flow `shopify-customer-upsert` en el motor existente (espejo del patrón `siigo-customer-upsert` + `shopify-product-upsert`): busca el customer por email vía GraphQL, lo crea si no existe (identidad mínima) y estampa/borra los metafields `katuq.tipo_cliente` y `katuq.customer_id` con `metafieldsSet` (mismo mecanismo ya usado para metafields de producto). Se alimenta de dos triggers: (a) evento `customer.upserted` emitido al crear/editar cliente en el controller de clientes, y (b) webhook `customers/create` de Shopify para el estampado al vuelo. Backfill por script con `--dry-run` por defecto. Todo multi-tenant vía `$companyConfig` (patrón 002.7), flow instalado y activo solo para OH MY STORE.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec 018 approved antes de este plan |
| II — Spec captura intent | sí | compromiso de correo D-084 → EARS |
| IV — Idempotencia | sí | metafield se sobrescribe; re-ejecutar es benigno |
| V — Eventos crudos antes de procesar | sí | webhook entra por el pipeline existente (raw + queue) |
| VI — UI no acoplada a proveedor | sí | sin UI en MVP; el nodo vive detrás del catálogo de nodos |
| VII — Observabilidad | sí | `flow_runs` existentes + reporte de backfill; sin colecciones nuevas |
| VIII — Test-first contratos | sí | contract test del nodo (params → GraphQL esperado) antes del happy path |
| IX — Estilo Angular | n/a | no hay frontend en MVP |
| X — Seguridad webhooks | sí | HMAC del pipeline Shopify existente, sin endpoints nuevos |
| XI — Datos sensibles fuera del log | sí | emails solo en payload del run, nunca en logs de error |
| XV — Canónica integrations en INGLÉS | sí | campo nuevo del contrato canónico: `customerType` (inglés) |

## 3. Arquitectura

### 3.1 Componentes involucrados (todo en katuq_admin_back_firebase, rama backend-aws-security)

- **Contrato canónico**: `functions/services/flows/contracts/canonical-customer.ts` → agregar campo opcional `customerType?: string` (hoy solo hay `tags`/`metadata`).
- **Emisión del evento**: `functions/controllers/clients.js` (create/edit) → publicar `customer.upserted` en el eventBus del motor (ya existe el tipo de evento en `event-spec.ts:27`; hoy nadie lo emite desde clients).
- **Nodo nuevo**: `functions/services/flows/nodes/shopify/shopify-customer-upsert.action.js` + registro en `nodeCatalog.json`. Lógica: resolver tipo (`categoria.nombre || tipoCliente`) → buscar customer por email → crear si falta → `metafieldsSet` namespace `katuq` (`tipo_cliente`, `customer_id`) → si tipo vacío, `metafieldDelete` de `tipo_cliente`.
- **Estampado al vuelo**: suscribir el flow al webhook `customers/create` del pipeline Shopify existente (topic nuevo en la suscripción de webhooks del tenant); el trigger matchea email contra `clients` de la company y reusa el mismo nodo.
- **Backfill**: `functions/scripts/backfill-shopify-customer-types.js` — `--dry-run` default, `--company "OH MY STORE"`, throttling contra rate limits, reporte final (actualizados / creados / sin email / sin tipo / error) impreso y persistido como run.
- **Frontend**: nada en MVP.

### 3.2 Flujo

```
crear/editar cliente (clients.js) ──► customer.upserted ──► flow OMS ──► shopify-customer-upsert
registro en tienda ──► webhook customers/create ──► pipeline HMAC+queue ──► flow OMS ──► (mismo nodo)
backfill script ──► itera clients de la company ──► (mismo nodo, modo directo) ──► reporte
```

### 3.3 Decisiones técnicas

| Decisión | Requisito que la motiva | Alternativas descartadas |
|---|---|---|
| Nodo de flow (no servicio suelto) | trazabilidad §4 (runs consultables) + multi-tenant default OFF | endpoint ad-hoc (sin trazas ni tenancy); tocar shopifyService legacy (D-069 lo está desplazando) |
| Buscar por email con query GraphQL + crear si falta | EARS "crear con identidad mínima" (#1) | customerSet upsert-by-email (verificar disponibilidad en la API version del tenant; si existe, simplifica a 1 llamada — se decide en Fase B) |
| `metafieldsSet` namespace `katuq` | consistencia con metafields de producto ya en prod | tags de customer (descartado en el correo: acumulan) |
| Campo canónico `customerType` | Artículo XV (inglés) + regla única de resolución | meter el tipo en `metadata` (opaco, sin validación) |

## 4. Modelo de datos

Sin colecciones nuevas. Cambios: campo opcional `customerType` en el contrato canónico. El doc de `clients` NO se modifica (la doble representación `tipoCliente`/`categoria` se resuelve en el mapper, no migrando datos).

## 5. Contratos

- Metafields en customer de Shopify: namespace `katuq`, keys `tipo_cliente` (single_line_text_field, nombre del tipo tal cual maestro Katuq) y `customer_id` (single_line_text_field, docId de `clients`).
- Idempotencia: clave lógica = email del cliente; re-ejecución sobrescribe el mismo valor (sin efectos acumulativos).
- Errores: 429/5xx del proveedor → retry con backoff del motor; cliente individual con error → se cuenta en el run y no bloquea el lote.

## 6. Estrategia de testing

1. **Contract test del nodo**: params → forma exacta de las mutaciones GraphQL (sin red).
2. **Integration**: contra la tienda de OMS con 2-3 clientes de prueba designados (crear, editar tipo, vaciar tipo, email inexistente).
3. **E2E de aceptación**: los 2 emails que CreaCTA citó en su correo (tatianaam6@gmail.com = Mayoristas, viviana.giraldo1990@gmail.com = Público) quedan con metafield correcto y CreaCTA lo valida desde su lado.

## 7. Fases de implementación

1. **Fase A** — `customerType` en contrato canónico + emisión de `customer.upserted` en clients.js (flag interno para no emitir si la company no tiene flow de clientes).
2. **Fase B** — nodo `shopify-customer-upsert` + catálogo + contract tests (decidir aquí customerSet vs query+create).
3. **Fase C** — flow para OMS (trigger evento interno) + suscripción webhook `customers/create` + estampado al vuelo.
4. **Fase D** — script de backfill dry-run → reporte → corrida real sobre OMS.
5. **Fase E** — validación con CreaCTA (muestreo) + sello en CONTRACT.md.

## 8. Plan de rollout

- Sin feature flag global: el "flag" es el flow por tenant (inactivo por defecto; activo solo OMS).
- Rollback: desactivar el flow — los metafields quedan como estén, sin efectos colaterales.

## 9. Riesgos técnicos

- La API version configurada del tenant puede no soportar `customerSet` (upsert directo) → fallback query+`customerCreate` (Fase B lo resuelve).
- Volumen backfill (~900+ clientes Katuq) vs rate limit GraphQL → throttling con budget de costo por lote y reanudación.
- Emails duplicados dentro de `clients` de OMS (colección schemaless) → el backfill reporta duplicados y gana el doc editado más recientemente.

## 10. Open questions (técnicas)

- ¿El pipeline de webhooks Shopify del tenant ya está suscrito al topic `customers/create` o hay que registrar la suscripción? (verificar en Fase C con la config real de OMS).
