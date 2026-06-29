# Tasks 011 — CRM de Clientes Corporativos (lista propia)

> Estado: **approved**
> Vinculado a `plan.md` (**approved**).
> Última actualización: 2026-06-29

## Convenciones
- `[P]` = paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de la tarea NN.
- **BE** = repo backend `katuq_admin_back_firebase/functions`. **FE** = este repo (`Seller.Katuq`).
- Cada tarea es shippable o bloquea de forma explícita.

---

## Bloque 1 — Backend: fuente de datos corporativa

### T-01 — Constantes + entityType `corporate` **[P]** · BE
- **Input:** `services/crm/crmConstants.js`.
- **Output:** `ENTITY_TYPES.CORPORATE = "corporate"`; export de nombre de colección `CORPORATE_CLIENTS = "corporate_clients"`. `CLIENT_STAGES` se reusa para corporate (sin duplicar).
- **Criterio de éxito:** `require("./crmConstants").ENTITY_TYPES.CORPORATE === "corporate"`; `node -c` ok.
- **Archivos:** `services/crm/crmConstants.js`.
- **Dependencias:** ninguna.

### T-02 — Feature flag en `detectContext` (deps: T-01) · BE
- **Input:** `detectContext(req)` actual (superadmin→company, normal→client).
- **Output:** flag global `CRM_SOURCE_CORPORATE` (env). Cuando ON y NO es superadmin Katuq → `entityType: 'corporate'`, `stages: CLIENT_STAGES`, `tenantId: company`. Superadmin Katuq queda intacto (`company`). OFF → comportamiento actual (`client`).
- **Criterio de éxito:** con flag ON, request de tenant normal devuelve `entityType:'corporate'`; con OFF devuelve `client`; Katuq siempre `company`.
- **Archivos:** `services/crm/crmConstants.js` (o helper de config), lectura de env.
- **Dependencias:** T-01.

### T-03 — Loaders + branches `corporate` en `crmLeadService` (deps: T-01) · BE
- **Input:** `services/crm/crmLeadService.js`.
- **Output:** `_loadCorporateClients(tenantId)` y `_loadCorporateClientsCapped(tenantId, cap)` (filtran `corporate_clients` por `company`). Branch `corporate` en `list`, `getById`, `updatePipeline`, `createLead`, `importLead`, `deleteLead`, `findDuplicates` → colección `corporate_clients`. Mapeo de campos: `name←nombres_completos`, `nit←documento`, `email←correo_electronico_comprador`, `phone←numero_celular_comprador`, `activo←estado!=='bloqueado'`. `getById`/`deleteLead` resuelven colección por entityType (no hardcodear `clients`).
- **Criterio de éxito:** `GET /v1/crm/leads` con entityType corporate lee de `corporate_clients` y NO de `clients`; mover etapa persiste en `crm_pipeline` con `entityType:'corporate'`.
- **Archivos:** `services/crm/crmLeadService.js`.
- **Dependencias:** T-01.

---

## Bloque 2 — Backend: CRUD de la lista corporativa

### T-04 — Controller + service CRUD `corporate_clients` (deps: T-01) · BE
- **Input:** patrón de `controllers/` existentes (clients) + auth middleware.
- **Output:** `controllers/corporateClients.js` con: `getAll` (por `company` del header), `getByDocument` (lookup/dedupe), `create` (201, dedupe por `(company+tipo_documento+documento)` → si existe retorna `action:'existing_found'`), `update`, `remove`. Persistencia en `corporate_clients` con `company`, `date_add`, `user_add`.
- **Criterio de éxito:** CRUD funcional contra Firestore; aislamiento por `company`.
- **Archivos:** `controllers/corporateClients.js` (+ opcional `services/corporateClientsService.js`).
- **Dependencias:** T-01.

### T-05 — Router + montaje `/v1/corporate-clients` (deps: T-04) · BE
- **Input:** `routers/` + index de rutas.
- **Output:** `routers/corporateClients.js` con rutas GET `/all`, POST `/doc`, POST `/`, PUT `/`, DELETE `/:documento`; montado bajo `/v1/corporate-clients` con auth middleware.
- **Criterio de éxito:** endpoints responden 200/201/4xx según contrato §5; pasan por auth.
- **Archivos:** `routers/corporateClients.js`, archivo de montaje de routers/index.
- **Dependencias:** T-04.

### T-06 — Contract tests backend (deps: T-03, T-05) · BE
- **Input:** contratos §5 del plan.
- **Output:** tests: (a) `/v1/corporate-clients` CRUD + dedupe; (b) `GET /v1/crm/stages` → `entityType:'corporate'` con flag ON; (c) `GET /v1/crm/leads` lee de `corporate_clients`; (d) aislamiento multi-tenant; (e) regresión: con flag OFF sigue `client`, Katuq sigue `company`.
- **Criterio de éxito:** suite verde.
- **Archivos:** `scripts/` o carpeta de tests del backend.
- **Dependencias:** T-03, T-05.

---

## Bloque 3 — Frontend: servicio + listado

### T-07 — `CorporateClientsService extends BaseService` **[P]** · FE (deps: T-05)
- **Input:** `BaseService` + endpoints `/v1/corporate-clients`.
- **Output:** servicio con `obtenerCorporativos()`, `getByDocument(doc)`, `crear(data)`, `editar(data)`, `eliminar(documento)`. Nunca `HttpClient` directo en componente (Art IX).
- **Criterio de éxito:** compila; métodos retornan Observables tipados.
- **Archivos:** `src/app/components/ventas/clientes/services/corporate-clients.service.ts`.
- **Dependencias:** T-05 (contrato disponible).

### T-08 — Componente listado corporativo (deps: T-07) · FE
- **Input:** `lista/clientes-lista.component.*` como referencia (búsqueda, filtros básicos, estado, etiquetas, crear/editar). **Sin** export/import (OQ-2).
- **Output:** `corporativos/clientes-corporativos.component.{ts,html,scss}` apuntando a `CorporateClientsService`. Estilo plano con `border-left` de acento (no gradientes).
- **Criterio de éxito:** lista carga corporativos del tenant; abrir modal crear/editar.
- **Archivos:** nuevos en `ventas/clientes/corporativos/`; declarar en el módulo correspondiente (`clientes-shared.module.ts` o `VentasModule`).
- **Dependencias:** T-07.

### T-09 — Ruta + entrada de menú (deps: T-08) · FE
- **Input:** `ventas/ventas-routing.module.ts`, `shared/services/nav.service.ts`.
- **Output:** ruta `ventas/clientes-corporativos` (AuthGuard); nueva entrada bajo "Clientes" → "Clientes corporativos".
- **Criterio de éxito:** navegar desde el menú abre el listado.
- **Archivos:** `ventas/ventas-routing.module.ts`, `shared/services/nav.service.ts`.
- **Dependencias:** T-08.

---

## Bloque 4 — Frontend: reúso del formulario

### T-10 — `@Input() target` en `crear-cliente-modal` (deps: T-07) · FE
- **Input:** `crear-cliente-modal.component.ts` (hoy persiste vía `MaestroService.createClient/editClient/getClientByDocument`).
- **Output:** `@Input() target: 'client' | 'corporate' = 'client'`. Branch en `guardarCliente`/`crearCliente`/lookup: si `corporate` usa `CorporateClientsService`, si no, `MaestroService` (comportamiento actual intacto). Etiquetas ya existen — sin cambios.
- **Criterio de éxito:** desde el listado corporativo, el modal crea/edita en `corporate_clients`; desde clientes normales sigue en `clients`.
- **Archivos:** `crear-cliente-modal.component.ts`.
- **Dependencias:** T-07.

---

## Bloque 5 — CRM + cierre

### T-11 — Verificación CRM con `entityType:'corporate'` (deps: T-03) · FE
- **Input:** `crm-list.component.ts` + `crm.models.ts`.
- **Output:** confirmar que kanban/tabla renderizan corporate sin cambios funcionales. Cosmético: `getTitle()` mapea corporate → "Pipeline Corporativos"; `CrmEntityType` agrega `'corporate'`; `getStageSeverity` ya cubre client stages (reusadas).
- **Criterio de éxito:** kanban muestra corporativos; severidades de etapa correctas.
- **Archivos:** `crm/models/crm.models.ts`, `crm/components/crm-list/crm-list.component.ts` (cambios mínimos/cosméticos).
- **Dependencias:** T-03.

### T-12 — E2E + sello CONTRACT (deps: T-06, T-09, T-10, T-11)
- **Input:** flujo completo con flag ON en local.
- **Output:** crear corporativo desde el modal → aparece en lista corporativa **y** como tarjeta en kanban; mover etapa persiste; clientes normales y superadmin intactos. Registrar resultado + sello `D-CRM-CORP-MVP` en `CONTRACT.md`. Actualizar estado roadmap a `done`.
- **Criterio de éxito:** checklist E2E pasa; CONTRACT actualizado.
- **Archivos:** `specs/CONTRACT.md`.
- **Dependencias:** T-06, T-09, T-10, T-11.

---

## Orden de ejecución sugerido
1. **T-01** (base de todo).
2. En paralelo tras T-01: **T-02**, **T-03**, **T-04**.
3. **T-05** tras T-04. **T-06** tras T-03 + T-05.
4. Frontend: **T-07** (cuando el contrato esté arriba), luego **T-08 → T-09** y **T-10** en paralelo con T-08.
5. **T-11** tras T-03. **T-12** al final (cierre).

## Definition of Done
- Contract tests backend verdes (T-06).
- CRM de tenant normal alimentado solo por `corporate_clients`; clientes normales y superadmin Katuq intactos.
- Listado corporativo CRUD operativo bajo menú Clientes; modal reusado con etiquetas.
- Feature flag documentado; rollback = apagar flag.
- `CONTRACT.md` actualizado con sello y cualquier desvío.
- Spec se mantiene `approved` (sin cambios de intent).
