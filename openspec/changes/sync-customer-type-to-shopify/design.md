# Diseño: shopify-customer-type-sync

## Contexto y restricciones

- Rama backend: `backend-aws-security`. Sin colecciones nuevas ni endpoints/módulos "v2".
- Canónica de integraciones en INGLÉS (Artículo XV v2): el campo del contrato canónico es `customerType`.
- El mecanismo exacto (buscar por email → `customerCreate` si falta → `metafieldsSet` namespace `katuq`) ya quedó **validado en prod** el 2026-07-08 (D-084): tatianaam6@gmail.com → "Mayoristas" (customer existente 7314412798158) y prueba.modelos@katuq.com → "Modelos" (customer creado 7359209308366).
- Credenciales Shopify: `accessToken` de `integration_configs` vencido; el runtime usa auto-refresh OAuth (`clientId`+`clientSecret` → `integration_secrets`). Los scripts de datos corren en EC2 con `shopifyService.executeGraphQL(companyId, query)` porque la `INTEGRATION_ENCRYPTION_KEY` solo vive en `functions/.env` de prod.

## Decisiones técnicas

| Decisión | Requisito que la motiva | Alternativas descartadas |
|---|---|---|
| Nodo de flow `shopify-customer-upsert`, no servicio suelto | trazabilidad (runs consultables) + multi-tenant default OFF | endpoint ad-hoc (sin trazas ni tenancy); tocar `shopifyService` legacy (D-069 lo desplaza) |
| Buscar por email (query GraphQL) + `customerCreate` si falta | EARS "crear con identidad mínima" | `customerSet` upsert-by-email: verificar disponibilidad en la API version del tenant; si existe, simplifica a 1 llamada (se decide al implementar) |
| `metafieldsSet` namespace `katuq` (`tipo_cliente`, `customer_id`) | consistencia con los metafields de producto ya en prod | tags de customer (acumulan; descartado en el correo) |
| Campo canónico `customerType` en `CanonicalCustomer` | Artículo XV (inglés) + regla única de resolución | meter el tipo en `metadata` (opaco, sin validación) |
| Reusar evento `customer.upserted` ya modelado en el motor | forward sync sin acoplar clients al proveedor | nuevo bus de eventos (duplica infraestructura) |

## Arquitectura

```
crear/editar cliente (clients.js) ─► customer.upserted ─► flow OMS ─► shopify-customer-upsert
registro en tienda ─► webhook customers/create ─► pipeline HMAC+queue ─► flow OMS ─► (mismo nodo)
backfill script ─► itera clients de la company ─► (mismo nodo, modo directo) ─► reporte
```

Componentes (todo en `katuq_admin_back_firebase`):
- `services/flows/contracts/` — agregar `customerType?: string` al `CanonicalCustomer` (hoy solo `tags`/`metadata`).
- `controllers/clients.js` — publicar `customer.upserted` en create/edit (el tipo de evento ya existe; hoy nadie lo emite desde clients).
- `services/flows/nodes/shopify/shopify-customer-upsert.action.js` — nodo nuevo + registro en el catálogo. Resolver tipo → buscar por email → crear si falta → `metafieldsSet`; si tipo vacío, `metafieldDelete` de `tipo_cliente`.
- Suscripción del pipeline Shopify existente al topic `customers/create` (estampado al vuelo; el trigger matchea email contra `clients` de la company).
- `scripts/backfill-shopify-customer-types.js` — `--dry-run` default, `--company "OH MY STORE"`, throttling, reporte final persistido como run.

## Write-set declarado

- Escribe **solo** en Shopify: metafields `katuq.tipo_cliente` / `katuq.customer_id` del customer, y `customerCreate` con identidad mínima.
- NO escribe `products`, catálogo, precios, price lists ni la base de clientes de Katuq. El estampado al vuelo es unidireccional (Shopify ← Katuq).

## Testing

1. Contract test del nodo: params → forma exacta de las mutaciones GraphQL (sin red).
2. Integration contra la tienda de OMS: crear, editar tipo, vaciar tipo, email inexistente.
3. E2E de aceptación: los emails que CreaCTA validó quedan con el metafield correcto y CreaCTA lo confirma desde su lado.

## Fases

1. `customerType` en el contrato canónico + emisión de `customer.upserted` en clients.js (flag por company).
2. Nodo `shopify-customer-upsert` + catálogo + contract tests (decidir aquí `customerSet` vs query+create).
3. Flow OMS (trigger evento interno) + suscripción webhook `customers/create` + estampado al vuelo.
4. Backfill dry-run → reporte → corrida real sobre OMS.
5. Validación con CreaCTA (muestreo) + sello en CONTRACT.md.

## Open questions

- ¿El pipeline de webhooks Shopify del tenant ya está suscrito al topic `customers/create` o hay que registrar la suscripción? (verificar en Fase 3 con la config real de OMS).
- ¿La API version del tenant soporta `customerSet` (upsert directo)? Si sí, simplifica a 1 llamada; si no, fallback query + `customerCreate`.
- Lista definitiva de perfiles a confirmar con CreaCTA: hoy el maestro real de OMS tiene Público / Mayoristas / Modelos; confirmar que no habrá más tiers antes del backfill.
