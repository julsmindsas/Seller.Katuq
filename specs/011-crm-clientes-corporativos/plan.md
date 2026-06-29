# Plan 011 — CRM de Clientes Corporativos (lista propia)

> Estado: **approved** (2026-06-29)
> Vinculado a `spec.md` (**approved**).
> Última actualización: 2026-06-29
>
> **OQ resueltas:** OQ-1 → flag **global** para MVP (por-tenant si un piloto lo pide). OQ-2 → **sin** export Excel / import en el listado corporativo del MVP (se evalúa en sub-spec posterior).

## 1. Resumen técnico
El CRM ya es un servicio **híbrido por `entityType`**: el backend decide en `detectContext()` si los leads salen de `companies` (superadmin Katuq → `company`) o de `clients` (empresa normal → `client`), y mergea la metadata de pipeline desde `crm_pipeline`. Introducimos un tercer `entityType: 'corporate'` cuya **fuente es una colección nueva `corporate_clients`** (multi-tenant por `company`). Para empresas normales, el CRM pasa a usar `corporate` en vez de `client` (controlado por feature flag), reusando etapas, kanban, servicio y UI tal cual. Aparte, se expone un módulo de **listado/CRUD de clientes corporativos** bajo el menú Clientes, reusando el `crear-cliente-modal` existente (ya trae etiquetas) parametrizado para persistir en `corporate_clients`. El frontend del CRM no requiere cambios funcionales: renderiza lo que el backend devuelva.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec 011 approved antes de este plan. |
| II — Spec captura intent | sí | Fuente del CRM = lista corporativa; clientes normales fuera. |
| IV — Idempotencia | sí | Alta corporativa dedupe por `(company + tipo_documento + documento)`. |
| V — Eventos crudos antes de procesar | n/a | No hay webhooks/eventos en esta feature. |
| VI — UI no acoplada a proveedor | sí | `crm-list` ya es agnóstico: consume `entityType/stages/leads` del backend. |
| VII — Observabilidad | sí | Auditoría de alta/cambio etapa en colección (no `console.log`). |
| VIII — Test-first contratos | sí | Contract tests de `/v1/corporate-clients` + `/v1/crm` con `entityType: corporate` antes de UI. |
| IX — Estilo Angular | sí | Servicio `CorporateClientsService extends BaseService`; nunca `HttpClient` en componente. |
| X — Seguridad webhooks | n/a | Sin webhooks. |
| XI — Datos sensibles fuera del log | sí | No se loguea PII. |
| XV — Canónica inglés | sí | Colección `corporate_clients`, entityType `corporate`, endpoints `/v1/corporate-clients` (inglés). |

Sin "no" que requiera enmienda.

## 3. Arquitectura

### 3.1 Componentes involucrados
- **Frontend (Angular, este repo):**
  - `CorporateClientsService extends BaseService` → `/v1/corporate-clients`.
  - Nuevo componente de listado `ventas/clientes/corporativos/` (espejo de `clientes-lista`, apuntando al servicio corporativo).
  - Reúso de `CrearClienteModalComponent` con nuevo `@Input() target: 'client' | 'corporate'` (branch de guardado).
  - Ruta `ventas/clientes-corporativos` + entrada de menú bajo "Clientes" (`nav.service`).
  - CRM (`crm-list`): sin cambio funcional. Opcional: mapa de título → "Pipeline Corporativos".
- **Backend (`katuq_admin_back_firebase`, repo separado):**
  - `crmConstants.js`: nuevo `ENTITY_TYPES.CORPORATE = 'corporate'`; `detectContext()` retorna `corporate` para tenants normales (tras feature flag), reusando `CLIENT_STAGES`.
  - `crmLeadService.js`: branch `corporate` en `list/getById/updatePipeline/createLead/importLead/deleteLead/findDuplicates` → fuente `corporate_clients`.
  - Nuevo `controllers/corporateClients.js` + `routers/corporateClients.js` montado en `/v1/corporate-clients` (CRUD de la lista).
- **Almacenamiento:** colección Firestore `corporate_clients` (nueva) + `crm_pipeline`/`crm_activities`/`crm_tasks` (reusadas, ya soportan cualquier `entityType`).

### 3.2 Diagrama (texto)
```
[Clientes corporativos (lista)]        [CRM /crm kanban]
  CorporateClientsService                CrmService (sin cambios)
        │  /v1/corporate-clients                │  /v1/crm/* (entityType=corporate)
        ▼                                        ▼
  controllers/corporateClients.js        controllers/crm.js → crmLeadService (branch corporate)
        │                                        │
        └──────────────► Firestore: corporate_clients ◄────────┘
                                  +  crm_pipeline (metadata: stage/priority/...)
```

### 3.3 Decisiones técnicas (con trazabilidad)

| Decisión | Requisito (EARS §4) | Alternativas descartadas |
|---|---|---|
| Nuevo `entityType: 'corporate'` reusando el motor CRM | "CRM se comporta igual, solo cambia fuente" | CRM nuevo aparte (duplica kanban/servicio, viola DRY). |
| Colección propia `corporate_clients` | "lista propia separada de clientes habituales" | Flag `tipoCliente=corporativo` sobre `clients` (mezcla datos, contradice spec). |
| Feature flag para el switch en `detectContext` | Rollout seguro / reversible (§8) | Hard-switch global (no reversible, riesgo a tenants con pipeline existente). |
| Reusar `crear-cliente-modal` con `@Input() target` | "mismo formulario + etiquetas" | Form nuevo (duplica 1600 LOC + lógica de etiquetas/indicativos). |
| Reusar `CLIENT_STAGES` | Q-03 | Etapas B2B nuevas (el usuario eligió reusar). |

## 4. Modelo de datos

**Colección `corporate_clients`** (doc por cliente corporativo, multi-tenant):
- Mismos campos que un `client` (el modal ya los produce): `nombres_completos`, `tipo_documento_comprador`, `documento`, `correo_electronico_comprador`, `numero_celular_comprador`, `numero_celular_whatsapp`, `indicativo_*`, `tipoCliente`/`categoria`, `estado` ('activo'|'bloqueado'), `etiquetas[]`, `datosFacturacionElectronica[]`, `datosEntrega[]`, `notas[]`.
- `company` (tenant) — filtro multi-tenant obligatorio.
- `date_add`, `user_add`.
- Merge a lead CRM (`crmLeadService`): `name ← nombres_completos`, `nit ← documento`, `email ← correo_electronico_comprador`, `phone ← numero_celular_comprador`, `activo ← estado !== 'bloqueado'`.

`crm_pipeline` no cambia: documentos con `entityType: 'corporate'`, `tenantId: company`, `entityId: <docId corporate_clients>`.

## 5. Contratos (API)

### Lista corporativa — `/v1/corporate-clients` (auth middleware; filtra por header `company`)
| Método | Ruta | Cuerpo / Query | Respuesta |
|---|---|---|---|
| GET | `/v1/corporate-clients/all` | — | `{ success, data: CorporateClient[] }` |
| POST | `/v1/corporate-clients/doc` | `{ documento }` | lookup por documento (dedupe) |
| POST | `/v1/corporate-clients` | `CorporateClient` | `{ success, data }` (201) |
| PUT | `/v1/corporate-clients` | `CorporateClient` (con `documento`) | `{ success, data }` |
| DELETE | `/v1/corporate-clients/:documento` | — | `{ success }` |

### CRM existente — `/v1/crm/*`
Sin cambios de firma. Solo cambia el `entityType` devuelto/aceptado a `corporate` para tenants normales. `GET /v1/crm/stages` devuelve `CLIENT_STAGES` + `entityType: 'corporate'`.

### 5.1 Idempotencia
- Clave: `(company + tipo_documento_comprador + documento)`.
- Comportamiento ante duplicado: POST detecta existente (vía `/doc`) → retorna el existente con `action: 'existing_found'` (mismo patrón que el modal hoy), no crea otro.

### 5.2 Errores
| Código | Cuándo | Cuerpo |
|---|---|---|
| 201 | alta ok | `{ success:true, data }` |
| 200 | listado/edición/lookup ok | `{ success:true, data }` |
| 400 | falta `documento`/`nombres_completos` | `{ success:false, error }` |
| 404 | doc no encontrado (edición/delete) | `{ success:false, error }` |
| 500 | error interno | `{ success:false, error }` |

## 6. Estrategia de testing
- **Contract tests (primero):** `/v1/corporate-clients` CRUD + `GET /v1/crm/stages` retorna `entityType: corporate` + `GET /v1/crm/leads` lee de `corporate_clients` (no de `clients`).
- **Integration:** crear corporativo desde el modal → aparece en lista corporativa **y** como tarjeta en kanban; mover de etapa persiste en `crm_pipeline`.
- **Aislamiento multi-tenant:** tenant A no ve corporativos de tenant B.
- **Regresión:** clientes normales (`/v1/clients`, `ventas/clienteslista`) intactos; superadmin Katuq sigue viendo `company`.

## 7. Fases de implementación
1. **Fase A — Backend datos/constantes:** `ENTITY_TYPES.CORPORATE`, loaders `_loadCorporateClients(tenantId)`, branches `corporate` en `crmLeadService`. Feature flag `CRM_SOURCE_CORPORATE` en `detectContext`.
2. **Fase B — Backend CRUD lista:** `controllers/corporateClients.js` + `routers/corporateClients.js` + montaje en index. Contract tests.
3. **Fase C — Frontend servicio + lista:** `CorporateClientsService`, componente listado (espejo de `clientes-lista`), ruta `ventas/clientes-corporativos`, entrada de menú.
4. **Fase D — Frontend form reuse:** `@Input() target` en `crear-cliente-modal`, branch de guardado a servicio corporativo; etiquetas ya incluidas.
5. **Fase E — CRM:** verificar kanban con `entityType: corporate`; ajustar mapa de título a "Pipeline Corporativos" (cosmético).
6. **Fase F — Observabilidad + verificación E2E** y sello en CONTRACT.

## 8. Plan de rollout
- **Feature flag:** `CRM_SOURCE_CORPORATE` (backend). ON = CRM de tenants normales usa `corporate`; OFF = comportamiento actual (`client`). Dueño: jnavarrog. Retiro tras validación con ≥1 tenant.
- **Rollback:** apagar el flag → CRM vuelve a alimentarse de `clients` sin pérdida de datos (las dos colecciones coexisten).
- Datos: no hay migración; `corporate_clients` arranca vacío y se llena por uso.

## 9. Riesgos técnicos
- **R-T1:** confundir `corporate` con `company` (tenants Katuq) en `detectContext`. Mitigación: superadmin Katuq sigue intacto en `company`; el switch solo afecta la rama de tenants normales.
- **R-T2:** tenants que ya usaban el CRM con leads de `clients` verán el kanban vacío al activar el flag (es el comportamiento deseado, pero hay que comunicarlo). Mitigación: flag + nota de release.
- **R-T3:** coordinación cross-repo (backend separado). Mitigación: contract tests primero; el frontend se mergea cuando el endpoint esté arriba.
- **R-T4:** `crm-list` mini-dialog de creación escribe vía `entityType` activo → al ser `corporate` crea en `corporate_clients` (deseado); validar que no escriba en `clients`.

## 10. Open questions (técnicas)
- OQ-1: ¿El flag `CRM_SOURCE_CORPORATE` debe ser global o por-tenant (config en Firestore)? Propuesta: global para MVP, por-tenant si un piloto lo pide.
- OQ-2: ¿El listado corporativo necesita export Excel / import en MVP? Spec lo deja fuera; confirmar que no bloquea.
