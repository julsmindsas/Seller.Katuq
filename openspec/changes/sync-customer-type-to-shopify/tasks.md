# Tasks

> **ESTADO (2026-07-23):** carga masiva DONE en prod (137 clientes estampados, verificado).
> **PENDIENTE = toda la sincronización AUTOMÁTICA:** secciones 1 (forward sync desde
> Katuq), 3 (estampado al vuelo por webhook `customers/create`) y 5 (enrolamiento B2B
> automático). Se retoma en una próxima entrega; toca superficies en vivo → un cambio
> a la vez, con dry-run/diff y aprobación explícita.

## 1. Contrato canónico y evento  ⏸ PENDIENTE (automático)
- [ ] 1.1 Agregar `customerType?: string` al `CanonicalCustomer` en `services/flows/contracts/` (leer el archivo antes de editar)
- [ ] 1.2 Emitir `customer.upserted` desde `controllers/clients.js` en create/edit, gateado por company (no emitir si la company no tiene flow de clientes)
- [ ] 1.3 Contract test: `clients.js` emite el evento con `customerType` resuelto por la regla única (`categoria.nombre || tipoCliente`)

## 2. Nodo shopify-customer-upsert
- [x] 2.1 Nodo `shopify-customer-upsert.action.js` creado + servicio compartido `services/shopify/customerTypeService.js` (buscar por email → crear si falta → `metafieldsSet` namespace `katuq`; si tipo vacío → `metafieldsDelete`)
- [x] 2.2 Registrado en `nodes/shopify/index.js` (10 nodos), `contracts/node-catalog.ts` y `nodeCatalog.json`
- [x] 2.3 Contract test del write-set `scripts/test-customer-type-contract.js` — 9/9 PASS, falla si aparece cualquier mutación de products/precios/price-lists/inventario
- [x] 2.4 Decisión: query `customerByEmail` + `customerCreate` (NO `customerSet`), documentado en el header del servicio

## 3. Estampado al vuelo (webhook)  ⏸ PENDIENTE (automático)
- [ ] 3.1 Verificar/registrar la suscripción del pipeline Shopify de OMS al topic `customers/create`
- [ ] 3.2 Trigger que matchea el email del webhook contra `clients` de la company y reusa el nodo del punto 2
- [ ] 3.3 Test: registro con match estampa; registro sin match no crea cliente ni inventa tipo

## 4. Backfill
- [x] 4.1 `scripts/backfill-shopify-customer-types.js` con `--dry-run` default, `--company`, `--max`, `--delay` (throttle) y paginación reanudable
- [x] 4.2 Reporte final (estampados / creados / tipo-borrado / sin email / sin tipo / sin id / errores); sin PII en logs (solo docId)
- [x] 4.3 Dry-run + apply sobre OMS ejecutados en EC2 (árbol aislado, sin tocar el proceso vivo) 2026-07-23: 575 escaneados, **137 estampados (4 customers creados), 438 sin email, 0 errores**. Verificado contra Shopify (tatianaam6→Mayoristas, prueba.modelos→Modelos). Bug encontrado en dry-run y corregido: campo `cd` legacy vacío pisaba el id real (27 falsos sin-id)

## 5. Enrolamiento automático en el Market del perfil  ⏸ PENDIENTE (automático)
- [ ] 5.1 Reusar la lógica de `scripts/sync-b2b-companies.js` como servicio invocable (Company+Location → conditions del Market del perfil; idempotente por cache `clients/{id}.integrations.shopify` → NIT)
- [ ] 5.2 Dispararlo cuando un cliente queda clasificado Mayoristas/Modelos (mismo trigger del punto 1) y al reclasificar
- [ ] 5.3 Test: cliente nuevo Mayoristas → company creada + location en el Market + metafield estampado; cliente Público → solo metafield, sin company

## 6. Verificación y cierre
- [ ] 6.1 Flow OMS instalado, activo solo OMS, default OFF para el resto (probar aislamiento multi-tenant)
- [ ] 6.2 E2E: crear / editar tipo / vaciar tipo / email inexistente sobre clientes de prueba designados
- [ ] 6.3 Validación con CreaCTA (muestreo) + build/compilación sin errores
- [ ] 6.4 Registrar cierre en CONTRACT.md (continúa D-084) + actualizar la tarea ClickUp
