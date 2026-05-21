# Plan 003.5 — WooCommerce: templates plug-and-play en `/flows`

> Estado: **draft** (2026-05-20)
> Vinculado a `spec.md`.

## 1. Resumen técnico

Poblar `flow_templates` collection con 3 docs Woo via script `scripts/seed-woocommerce-templates.js`. Extender componente `flow-templates/` Angular existente con filtro por proveedor (chip Woo) si no lo tiene. Backend agrega endpoint `POST /v1/flows/instantiate-template` (o reusa si existe) que clona template + crea `flow_trigger_binding` en una transacción + invoca `cronService.loadDynamicJobsFromFirestore`. UI usa vocabulario amigable + modal de 2-4 inputs simples.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | |
| II — Spec captura intent | sí | |
| IV — Idempotencia | sí | Instanciar mismo template 2× crea 2 flows (idempotencia NO aplica: es acción explícita del usuario). |
| V — Eventos crudos | n/a | |
| VI — UI no acoplada a proveedor | **sí (crítico)** | Catálogo lee `flow_templates` collection dinámicamente. Agregar template Woo nuevo = solo seed, cero código UI. |
| VII — Observabilidad | sí | Log al instanciar + métricas. |
| VIII — Test-first | sí | Contract test del endpoint instantiate antes de implementación. |
| IX — Angular | parcial | Reusa componente existente (probablemente legacy ngModule). Si el componente es legacy, mantener estilo legacy para no mezclar; migración a standalone separada. |
| X — Seguridad webhooks | n/a | |
| XI — Datos sensibles fuera del log | sí | `inputsConfig` sanitiza si contiene secretos (no debería, son solo intervalo/bodega). |
| XIII — ≤ 3 páginas | sí | |
| XV v2 — Canónica INGLÉS | sí | Templates en `flow_templates` con campos en inglés. UI muestra strings amigables al usuario en español (UI strings ≠ DB fields). |

## 3. Arquitectura

### 3.1 Componentes

```
katuq_admin_back_firebase/functions/
├── scripts/seed-woocommerce-templates.js          (NUEVO — corre 1 vez por env)
├── controllers/flowTemplates.js                   (NUEVO o extender flowsController.js)
└── routers/flows.js                               (registrar POST /v1/flows/instantiate-template)

Seller.Katuq/src/app/components/flows/
├── flow-templates/                                (EXISTENTE — extender)
│   ├── flow-templates.component.ts                (agregar chip filter, modal config, instanciar)
│   ├── flow-templates.component.html              (chip provider + cards + modal)
│   └── flow-templates.component.scss              (estilos)
└── flow-templates/instantiate-template.service.ts (NUEVO — HTTP wrapper)
```

### 3.2 Diagrama de instanciación

```
[Comerciante en /flows]
       │ click "+ Crear desde plantilla"
       ▼
[flow-templates.component.html]
       │ chip "WooCommerce"
       ▼
[filteredTemplates$ = templates$ | filter(provider='woocommerce')]
       │ click card "Sincronizar productos WooCommerce"
       ▼
[modal config con 2 inputs: intervalo + bodega]
       │ click "Activar"
       ▼
[instantiateTemplate.service.ts → POST /v1/flows/instantiate-template]
       │ body: {templateId, inputs: {intervaloMinutos, bodegaDestino}}
       ▼
[controllers/flowTemplates.instantiate(req, res)]
       │
       ├──► [check companyConfig.woocommerce exists] (sino 412 + mensaje friendly)
       │
       ├──► [db.runTransaction]
       │       ├──► leer flow_templates/{templateId}
       │       ├──► generar flowId = `{templateBase}-{companyHash}`
       │       ├──► clonar flowSpec con interpolación de inputs
       │       ├──► escribir flows/{flowId}
       │       └──► escribir flow_trigger_bindings/{bindingId} con kind correcto
       │
       └──► [cronService.loadDynamicJobsFromFirestore()] (hot-reload)
       │
       ▼
[response 200: {success: true, flowId, bindingId}]
       │
       ▼
[UI cierra modal + muestra toast "✅ Sincronización activada"]
```

### 3.3 Decisiones técnicas

| Decisión | Requisito | Alternativas descartadas |
|---|---|---|
| Templates en `flow_templates` collection como docs separados | AC-003.5-01, Q-003.5-01 default | Array en doc único: difícil de versionar y consultar |
| Endpoint dedicado `POST /v1/flows/instantiate-template` | AC-003.5-05, Q-003.5-02 | Reusar `POST /v1/flows` genérico: confunde semánticas, complica auditoría |
| Transacción Firestore para crear flow + binding atómicamente | AC-003.5-05, R-003.5-02 | Sin transacción: estado parcial si falla a mitad |
| UI vocabulario amigable via i18n keys | AC-003.5-07, R-003.5-03 | Strings hardcoded en HTML: difícil de auditar |
| Catálogo lee dinámicamente de Firestore | AC-003.5-10, Art VI | Lista hardcoded en TS: agregar template requiere PR + deploy frontend |

## 4. Modelo de datos

### 4.1 `flow_templates/{templateId}` schema

```json
{
  "templateId": "woo-sync-products-to-katuq",
  "provider": "woocommerce",
  "category": "ecommerce",
  "displayNameAmigable": "Sincronizar productos de WooCommerce a Katuq",
  "descripcionAmigable": "Trae automáticamente todos tus productos de WooCommerce a Katuq cada vez que los actualizás.",
  "iconLogo": "assets/images/logos/woocommerce.svg",
  "color": "#7f54b3",
  "estado": "active",
  "inputs": [
    {
      "name": "intervaloMinutos",
      "labelAmigable": "Cada cuántos minutos sincronizar",
      "tipo": "slider",
      "opciones": [5, 15, 30, 60],
      "default": 15,
      "required": true
    },
    {
      "name": "bodegaDestino",
      "labelAmigable": "Bodega destino del stock",
      "tipo": "picker-bodega",
      "filter": "activa",
      "required": true
    }
  ],
  "flowSpec": {
    "nodes": [
      { "id": "cron", "type": "schedule-cron", "params": { "cronExpression": "*/{{intervaloMinutos}} * * * *" } },
      { "id": "fetch", "type": "woocommerce-fetch-products", "params": { "batchSize": 100 } },
      { "id": "upsert", "type": "katuq-product-upsert" },
      { "id": "adjust", "type": "katuq-inventory-adjust", "params": { "idBodega": "{{bodegaDestino}}" } }
    ],
    "edges": [
      { "from": "cron", "to": "fetch" },
      { "from": "fetch", "to": "upsert" },
      { "from": "upsert", "to": "adjust" }
    ]
  },
  "createdAt": "ISO",
  "createdBy": "system-seed"
}
```

### 4.2 Flow doc generado (post-instanciación)

```json
{
  "flowId": "woo-sync-products-to-katuq-{hash}",
  "companyId": "OH MY STORE",
  "status": "active",
  "templateId": "woo-sync-products-to-katuq",
  "templateInputsSnapshot": { "intervaloMinutos": 15, "bodegaDestino": "BOD-WOO-1" },
  "nodes": [...interpolados con inputs...],
  "edges": [...],
  "version": 1,
  "createdAt": "ISO"
}
```

### 4.3 `flow_trigger_bindings/{bindingId}` generado

```json
{
  "companyId": "OH MY STORE",
  "flowId": "woo-sync-products-to-katuq-{hash}",
  "nodeId": "cron",
  "kind": "cron",
  "cronExpression": "*/15 * * * *",
  "status": "active",
  "createdAt": "ISO"
}
```

## 5. Contratos

### 5.1 GET `/v1/flow-templates?provider=woocommerce`
- Response: `{templates: [{templateId, displayNameAmigable, descripcionAmigable, iconLogo, inputs, ...}]}`.
- Filtros: `provider`, `category`, `estado` (default `active`).

### 5.2 POST `/v1/flows/instantiate-template`
- Headers: `Authorization`, `company`.
- Body: `{templateId, inputs: {...}}`.
- Response 200: `{success: true, flowId, bindingId, message}`.
- Response 412 (precondition failed): `{success: false, error: 'integration_not_configured', message: 'Conectá tu tienda WooCommerce en /integrations primero', redirectTo: '/integrations'}`.
- Response 400: `{success: false, error: 'invalid_inputs', missing: ['bodegaDestino']}`.

### 5.3 POST `/v1/flow-trigger-bindings/:id/pause`
- Setea `status: 'inactive'`, invoca `cronService.stopJob(bindingId)`.
- Response 200: `{success: true, status: 'inactive'}`.

### 5.4 POST `/v1/flow-trigger-bindings/:id/resume`
- Setea `status: 'active'`, invoca `cronService.reloadJob(bindingId)`.

## 6. Estrategia de testing

- **Contract tests** (primero): endpoint instantiate-template con fixture template → respuesta esperada.
- **Integration**: contra Firestore Emulator, instanciar template → verificar 2 docs creados atómicamente + cronService.getCronsHealth incrementa.
- **E2E** (Cypress): comerciante logueado → /flows → click "Crear desde plantilla" → seleccionar Woo sync → completar → activar → verificar toast + flow visible en lista.
- **Unit**: interpolador de `{{variable}}` en `flowSpec` con inputs.

## 7. Fases de implementación

1. **Fase A — Schema + seed script** `[P]`. Crear `flow_templates` docs.
2. **Fase B — Endpoint instantiate-template** (deps: A). Controller + router + transacción.
3. **Fase C — Frontend: extender flow-templates con filtro provider** `[P con D]`.
4. **Fase D — Frontend: modal de configuración inputs** (deps: A, schema disponible).
5. **Fase E — Frontend: instanciate-template.service.ts + integración con backend** (deps: B, D).
6. **Fase F — Endpoints pause/resume** + UI toggle.
7. **Fase G — Tests E2E + validación vocabulario amigable** (script grep que detecta strings prohibidos en UI).

## 8. Plan de rollout

- **Feature flag**: NO necesario (no rompe nada existente; es UX additive).
- **Seed por env**: dev → staging → prod. Script idempotente (upsert por `templateId`).
- **Rollback**: borrar docs de `flow_templates` con `provider: 'woocommerce'` + revertir UI. Flows ya instanciados quedan funcionales (no dependen del template).

## 9. Riesgos técnicos

- **R-Plan-01**: componente `flow-templates/` puede tener arquitectura legacy difícil de extender. Mitigación: leer código antes del plan; si bloquea, abrir spec separada 003.5.1 para refactor.
- **R-Plan-02**: hot-reload de `cronService.loadDynamicJobsFromFirestore` puede no funcionar inmediatamente post-write si Firestore tiene latencia de propagación. Mitigación: esperar 500ms entre escritura y invocación del reload.
- **R-Plan-03**: vocabulario amigable inconsistente entre templates si seed script lo permite. Mitigación: validación en schema (regex prohibida `trigger|nodo|binding|expression` en `displayNameAmigable`/`descripcionAmigable`).

## 10. Open questions técnicas

- Decidir nombre exacto del endpoint y verificar conflicto con `flowsController.js` actual.
- Confirmar API del componente `flow-templates/` antes de extender (puede requerir refactor o reescritura parcial).
