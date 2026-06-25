# Plan 007 — Venta asistida, Paso 1 (Cliente) ligero y sin callejones

> Estado: **approved** (aprobado 2026-06-05; OQ-1/2/3 resueltas con las propuestas del §10)
> Vinculado a `spec.md` (**approved**, D-038).
> Última actualización: 2026-06-05

## 1. Resumen técnico
Extraer el Paso 1 del god component `crear-ventas` (4.796 LOC) a un **componente standalone `cliente-step`** con `ChangeDetectionStrategy.OnPush` y una **única fuente de verdad** del cliente activo (un store ligero basado en RxJS `BehaviorSubject`). El buscador deja de trabarse: el flujo "sin coincidencias → crear con lo escrito" se cablea, se elimina `distinctUntilChanged` que bloquea re-buscar, y se unifica el mínimo de caracteres. La búsqueda performante se sirve desde un **índice en colección separada** (`clients_search_index`) consultado por prefijo case-insensitive, sin tocar la colección `clients`. El cálculo de precios y los pasos 2-6 no se tocan; solo se preserva el contrato de datos que el Paso 1 entrega al wizard.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | spec.md approved (D-038) antes de este plan |
| II — Spec captura intent | sí | la spec no nombra tecnología; el detalle técnico vive aquí |
| IV — Idempotencia | sí | creación de cliente idempotente por documento (evita duplicados); escritura del índice idempotente por `cd` |
| V — Eventos crudos antes de procesar | n/a | no hay webhooks entrantes en esta feature |
| VI — UI no acoplada a proveedor | sí | el Paso 1 no contiene lógica por proveedor |
| VII — Observabilidad | sí | errores de búsqueda/creación/índice con log estructurado sin datos personales |
| VIII — Test-first contratos | sí | contract tests del endpoint `/v1/clients/search` antes de implementar |
| IX — Estilo Angular | **parcial — desviación registrada (D-038)** | Angular 14: sin signals (16+) ni `@if`/`@for` (17+). Se usa standalone + OnPush + RxJS + `*ngIf`/`*ngFor`. Se revierte al actualizar Angular |
| X — Seguridad webhooks | n/a | no aplica |
| XI — Datos sensibles fuera del log | sí | documento/teléfono/correo nunca en claro en logs (solo `cd`/hash) |

## 3. Arquitectura

### 3.1 Componentes involucrados
- **Frontend (Angular 14):**
  - `cliente-step` (standalone, OnPush) — UI del Paso 1: buscador, barra de cliente activo, formulario crear/editar, notas, selector de categoría.
  - `cliente-store.service.ts` — estado único del cliente activo (`activeCustomer$`, `searchState$`) con RxJS. Sin estado disperso.
  - `cliente-search.service.ts` — HTTP al endpoint de búsqueda (vía `MaestroService` o servicio dedicado; nunca HttpClient en componente).
  - `crear-ventas` (host) — deja de manejar la lógica del cliente; consume `activeCustomer$` y mapea a `pedidoGral.cliente` (contrato preservado).
- **Backend (Express/EC2):**
  - `controllers/clients.js` → `searchClients` reescrito: consulta `clients_search_index` por prefijo (no full-scan).
  - `services/clientSearchIndexService.js` (nuevo) — normaliza, escribe y consulta el índice. Punto único de mantenimiento.
  - `createClient`/`editClient`/`deleteClient` → invocan el index service tras escribir el cliente.
  - `scripts/build-clients-search-index.js` (nuevo, dry-run por defecto) — construcción inicial del índice.
  - Cron de reconciliación (registrado en `cron_jobs_config`, patrón 002.8) — red de seguridad anti-drift.
- **Almacenamiento:** colección Firestore **`clients_search_index`** (nueva). `clients` **no se modifica**.

### 3.2 Diagrama (texto)
```
[cliente-step UI] --(term)--> cliente-store --> cliente-search.service
        ^                                            |
        | activeCustomer$                            v  POST /v1/clients/search
        |                                   [searchClients]  --prefix queries-->  clients_search_index
        |                                            |
        +-------- selecciona / crea ---------------- + --> getClientByDocument / createClient
                                                              |
                                            createClient/editClient/deleteClient
                                                              |
                                                  clientSearchIndexService.upsert/delete
                                                              v
                                                      clients_search_index   (clients INTACTA)
                              cron reconcile --(periódico, low-cost)--> detecta/corrige drift
```

### 3.3 Decisiones técnicas (con trazabilidad a requisito)

| Decisión | Requisito que la motiva | Alternativas descartadas |
|---|---|---|
| Componente standalone `cliente-step` + OnPush | NFR 5.1 (peso/fluidez), §4 estado único | Seguir en god component (acopla, pesa, change-detection sucia) |
| `cliente-store` con un solo `activeCustomer$` | §4 "única fuente de verdad" | Mantener las ~8 flags actuales (estados contradictorios) |
| Índice en colección `clients_search_index` | NFR 5.1 (p95≤300ms sin full-scan) + D-Q02 (no tocar clients) | Prefijo puro sobre `clients` (case-sensitive, falla nombres); campo normalizado en `clients` (toca datos del usuario) |
| Campos normalizados por campo (doc, nombres, apellidos, correo, celular) + range queries paralelas | §4 "todos los campos + relevancia, case-insensitive, apellido propio" | Un solo `searchText` concatenado (no resuelve apellido a mitad) |
| Mantener índice desde controllers + cron reconcile | R-01 (drift), backend en EC2/PM2 sin triggers Firestore | Trigger Firestore onWrite (no hay Cloud Functions desplegadas) |
| Eliminar `distinctUntilChanged`, unificar minLength, cablear fallback-crear | §4 "re-buscar mismo término", bug del callejón | Mantener autocomplete actual (raíz del bug) |

## 4. Modelo de datos

**Colección `clients_search_index`** (1 doc por cliente, docId = `cd` del cliente):
```
{
  cd: string,                  // = doc.id del cliente (clave de join)
  company: string,             // multi-tenant (filtro obligatorio)
  // --- campos normalizados (lowercase + sin tildes) para prefijo ---
  documentoNorm: string,
  nombresNorm: string,
  apellidosNorm: string,
  correoNorm: string,
  celularNorm: string,         // solo dígitos
  // --- display (evita segundo fetch en el front) ---
  displayLabel: string,        // "documento - Nombres Apellidos"
  documento, nombres_completos, apellidos_completos,
  numero_celular_comprador, tipo_documento_comprador,
  updatedAt: ISO string
}
```
> `clients` NO cambia. El índice es derivado y reconstruible.

Índices Firestore requeridos (compuestos): `(company ASC, <campoNorm> ASC)` para cada campo consultado por rango.

## 5. Contratos (API/eventos)

### `POST /v1/clients/search`  (reescrito, mismo contrato externo)
Request: `{ term: string (≥2), limit?: number=10 }` + headers auth/company.
Response 200: `Array<{ cd, displayLabel, documento, nombres_completos, apellidos_completos, numero_celular_comprador, tipo_documento_comprador }>` ordenado por relevancia (documento exacto → prefijo doc → nombres/apellidos → correo → celular).
- Implementación: N range-queries por prefijo sobre el índice (una por `*Norm`), `limit` c/u, merge + dedup por `cd` + ranking. El `term` se normaliza igual que el índice antes de consultar.

### 5.1 Idempotencia
- **Índice:** `clientSearchIndexService.upsert(cd)` usa `doc(cd).set(payload, {merge:false})` → reejecutar no duplica.
- **Creación de cliente:** antes de crear, lookup por `documento+company`; si existe, asociar en vez de duplicar (criterio §4).

### 5.2 Errores
| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | búsqueda OK (incluye lista vacía) | `[]` o array de matches |
| 400 | `term` < 2 chars | `{ error: '...' }` |
| 401 | sin auth | (middleware) |
| 5xx | fallo Firestore | `{ error }` + log estructurado (sin PII) |

## 6. Estrategia de testing
- **Contract tests (primero):** `/v1/clients/search` — schema de respuesta, 400 con term<2, 200 con `[]`, ranking documento-exacto-primero. Sobre Firestore Emulator.
- **Integration:** `clientSearchIndexService` upsert/delete + búsqueda case-insensitive ("juan" encuentra "Juan", "perez" encuentra apellido); build script idempotente; cron reconcile corrige un desfase inducido.
- **E2E (frontend):** Paso 1 — escribir sin seleccionar y poder re-buscar el mismo término; sin match → crear con lo escrito; seleccionar cliente → avanzar; cambiar cliente no contamina envío/facturación.
- **Unit:** normalizador (lowercase/sin tildes/dígitos), ranking, mapeo store→`pedidoGral.cliente`.

## 7. Fases de implementación
1. **Fase A — Backend índice (prerequisito):** `clientSearchIndexService` (normalizador + upsert/delete/query) + índices Firestore. Sin tocar `clients`.
2. **Fase B — Contract tests + `searchClients` reescrito** contra el índice (TDD: test rojo → verde).
3. **Fase C — Construcción inicial:** `scripts/build-clients-search-index.js --dry-run` → revisar conteos (esperado ~10.267) → `--apply`. Verificar paridad por empresa.
4. **Fase D — Sync en escritura:** enganchar upsert/delete en `createClient`/`editClient`/`deleteClient` + otros escritores (onboarding import-customers). Cron de reconciliación en `cron_jobs_config`.
5. **Fase E — Observabilidad:** logs estructurados de búsqueda/índice (sin PII), métrica de latencia.
6. **Fase F — Frontend `cliente-step`:** `cliente-store` + componente standalone OnPush + búsqueda arreglada (sin `distinctUntilChanged`, minLength unificado, fallback-crear, una sola fuente de verdad, categoría). Integrar en `crear-ventas` preservando contrato `pedidoGral.cliente`. Adelgazar SCSS del Paso 1.
7. **Fase G — Rollout:** feature flag `ventasStep1V2` (default off) → validar en `feature/venta-asistida-mejorada` → on. Borrar código muerto del Paso 1 (`buscar()`, `data[]` mock) tras validar.

## 8. Plan de rollout
- **Feature flag:** `ventasStep1V2` — dueño: equipo Katuq — retiro: al validar en producción + 14 días (Art. XII).
- Backend del índice puede ir primero (no afecta nada hasta que `searchClients` lo consuma); `searchClients` mantiene fallback al comportamiento actual hasta que el índice esté construido y verificado.
- **Rollback:** apagar flag (frontend vuelve al Paso 1 actual); `searchClients` puede revertir a full-scan; borrar `clients_search_index` no afecta `clients`.

## 9. Riesgos técnicos
- Drift del índice si un escritor de clientes no lo actualiza → cron de reconciliación + índice nunca como fuente de verdad (R-01 de la spec).
- Múltiples escritores de cliente hoy (onboarding, gemini, order-tools) → auditar todos en Fase D antes de confiar solo en el chokepoint.
- Extraer el Paso 1 puede romper el contrato con pasos 2-6 → preservar exactamente la forma de `pedidoGral.cliente` y datos derivados; cubrir con E2E.
- Costo Firestore de N range-queries por término → acotado por `limit` y por filtro `company`; muy inferior al full-scan actual.

## 10. Open questions (técnicas)
- OQ-1: ¿El cron de reconciliación compara conteos por empresa (barato) o hace verificación campo a campo (más caro)? Propuesta: conteo + muestreo, escalando solo si detecta desfase.
- OQ-2: ¿La construcción inicial del índice corre por empresa o global? Propuesta: por empresa, empezando por las pequeñas, para validar antes de ALMARA (7.212).
- OQ-3: ¿`cliente-store` se limita al Paso 1 o se prevé reutilizar en POS/pos2 (que ya tienen su propio patrón)? Propuesta: limitar a venta asistida ahora; no acoplar POS en esta spec.
