# Plan 003.1 — WooCommerce: schema + UX en `/integrations`

> Estado: **draft** (2026-05-20)
> Vinculado a `spec.md` (pendiente approved).

## 1. Resumen técnico

Ampliar `PROVIDER_SCHEMAS.woocommerce` con `bodegaCode + syncIntervalMinutes + enabled` + bloque `defaults`. Extender el form Angular existente (sin componente nuevo) agregando un control `bodegaCode` cargado vía `BodegaService.list()`, un info-box con 3 pasos numerados + screenshots placeholders, y una caja "Configurar webhook entrante" con URL interpolada `{companyId}` + botón copy-to-clipboard. Agregar mapeos faltantes (`getDocumentationUrl`, `getSelectedIntegrationName`). Crear endpoint backend `POST /v1/woocommerce/test-connection` que hace `GET /wp-json/wc/{apiVersion}/system_status`.

## 2. Verificación contra la constitución

| Artículo | ¿Cumple? | Notas |
|---|---|---|
| I — Spec primero | sí | Spec 003.1 aprobada antes de plan. |
| II — Spec captura intent | sí | Spec.md no menciona Angular, Firestore, axios. Plan sí. |
| IV — Idempotencia | n/a | Esta sub-spec no toca integraciones externas con estado. |
| V — Eventos crudos antes de procesar | n/a | No hay procesamiento de eventos. |
| VI — UI no acoplada a proveedor | **sí (con cuidado)** | El bloque HTML usa `*ngIf="selectedIntegrationType === 'woocommerce'"` — patrón YA existente para todos los proveedores (Shopify, Cereza, Wompi, Siigo). NO se introduce nuevo acoplamiento. El catálogo de proveedores y la lógica de form siguen siendo dinámicos. |
| VII — Observabilidad | sí | Endpoint test-connection emite log estructurado con `correlationId`. |
| VIII — Test-first contratos | sí | Tests del endpoint test-connection antes de implementación. |
| IX — Estilo Angular | parcial | Reusa form template ya existente (no standalone, no signals — es el patrón legacy de `/integrations`). Mantenemos consistencia con el resto del módulo. Migración a standalone+signals es deuda separada del módulo entero, no de esta spec. |
| X — Seguridad webhooks | n/a | El webhook como tal se aborda en 003.2. |
| XI — Datos sensibles fuera del log | sí | Nunca logear `consumerSecret` ni `webhookSecret`. Endpoint test-connection logea solo `companyId + status code + latencia`. |
| XIII — Spec ≤ 3 páginas | sí | spec.md = 2.5 páginas, plan.md ≈ 2 páginas. |
| XV v2 — Canónica INGLÉS | sí | Todos los nuevos campos del schema en `integrations.woocommerce.*` en inglés. `bodegaCode` es camelCase (derivado/interno). |

## 3. Arquitectura

### 3.1 Componentes involucrados

- **Backend Node.js** (`katuq_admin_back_firebase/functions/`):
  - `services/integrationConfigService.js` (modificar PROVIDER_SCHEMAS.woocommerce).
  - `controllers/woocommerceIntegration.js` (nuevo handler `testConnection(req, res)`).
  - `routers/woocommerce*.js` (registrar `POST /v1/woocommerce/test-connection`).

- **Frontend Angular** (`Seller.Katuq/src/app/components/integrations/`):
  - `integrations.service.ts` (agregar 2 entradas en `getDocumentationUrl` + `getSelectedIntegrationName`).
  - `integrations.component.ts` (extender `createWooCommerceForm`, `buildCredentials`, agregar `loadBodegasForWooForm()`).
  - `integrations.component.html` (extender el bloque `*ngIf` WooCommerce: info-box + caja webhook + picker bodega).
  - `integrations.component.scss` (estilos para info-box + caja webhook + copy button feedback).

- **Frontend assets**:
  - `Seller.Katuq/src/assets/integrations/woocommerce/step-1.png` (placeholder 600×400).
  - `step-2.png`, `step-3.png` (idem).

- **Firestore**: persiste en `integration_configs/{companyId}_woocommerce.credentials` (colección existente). Sin cambios de schema Firestore.

### 3.2 Diagrama

```
[Comerciante] ─► /integrations
                    │
                    ├─► (click "WooCommerce" card)
                    │
                    └─► integrations.component
                          │
                          ├─► createWooCommerceForm()       ← form con campos
                          ├─► loadBodegasForWooForm()       ← BodegaService.list()
                          ├─► renderInfoBox + webhookURL   ← SecurityService.getCompanyInformationLogged().company
                          │
                          └─► click "Probar conexión"
                                 │
                                 └─► POST /v1/woocommerce/test-connection
                                        │
                                        └─► axios GET {storeUrl}/wp-json/wc/{apiVersion}/system_status
                                              │
                                              └─► 200 OK → {success: true, ...}
                                                  4xx/5xx/timeout → {success: false, message}
```

### 3.3 Decisiones técnicas

| Decisión | Requisito que la motiva | Alternativas descartadas |
|---|---|---|
| Reusar form existente (no wizard nuevo) | AC-003.1-04, D-019 | Wizard guiado: 3-5 días extra + rompe consistencia con Shopify/Cereza/Wompi. |
| Picker bodega lee de `BodegaService.list()` con filtro `activa === true` | AC-003.1-04, Q-003.1-01 default | Free-text input: usuario tipea code mal → flow falla silencioso. |
| URL del webhook interpolada con `companyId` literal URL-encoded | AC-003.1-05, Q-003.1-02 default | Slug estable: requiere mapeo extra + spec separada. |
| Test conexión via endpoint backend (no fetch directo desde Angular) | NFR 5.2 | Fetch directo desde Angular: CORS + expone storeUrl pero también auth backend ya monta la llamada autenticada. |
| Sin tabla de migración de schema Firestore | — | No es necesario: configs Woo existentes tienen `consumerKey/consumerSecret/storeUrl` y el frontend al editar limpia validators de campos vacíos (línea 670 actual). Configs viejas funcionan; nuevas requieren `bodegaCode`. |

## 4. Modelo de datos

### 4.1 Cambio en PROVIDER_SCHEMAS.woocommerce (backend)

```js
woocommerce: {
  required: ['storeUrl', 'consumerKey', 'consumerSecret'],
  optional: ['webhookSecret', 'apiVersion', 'verifySsl', 'bodegaCode', 'syncIntervalMinutes', 'enabled'],
  sensitive: ['consumerSecret', 'webhookSecret'],
  defaults: { apiVersion: 'wc/v3', verifySsl: true, syncIntervalMinutes: 15, enabled: true }
}
```

### 4.2 Doc Firestore esperado post-onboarding

`integration_configs/{COMPANY}_woocommerce`:
```json
{
  "provider": "woocommerce",
  "name": "WooCommerce",
  "enabled": true,
  "credentials": {
    "storeUrl": "https://mitienda.com",
    "consumerKey": "ck_xxxxxxxxxxxx",
    "consumerSecret": "<cifrado>",
    "webhookSecret": "<cifrado>",
    "apiVersion": "wc/v3",
    "verifySsl": true,
    "bodegaCode": "BOD-WOO-1",
    "syncIntervalMinutes": 15
  },
  "createdAt": "ISO",
  "updatedAt": "ISO",
  "createdBy": "user@email"
}
```

## 5. Contratos

### 5.1 POST `/v1/woocommerce/test-connection`

Headers requeridos: `Authorization: Bearer <jwt>`, `company: <companyId>`.

Request body:
```json
{
  "storeUrl": "https://mitienda.com",
  "consumerKey": "ck_xxx",
  "consumerSecret": "cs_xxx",
  "apiVersion": "wc/v3",
  "verifySsl": true
}
```

Response 200:
```json
{
  "success": true,
  "message": "Conexión exitosa con WooCommerce.",
  "details": {
    "wcVersion": "8.5.1",
    "permissions": "read_write"
  }
}
```

Response 200 (con `success: false` si Woo respondió con error):
```json
{
  "success": false,
  "message": "WooCommerce respondió con 401 — verificá Consumer Key y Secret."
}
```

Response 5xx solo si el endpoint Katuq falla internamente.

### 5.2 Idempotencia
- Test conexión NO modifica nada. Read-only contra WooCommerce.

### 5.3 Errores

| Código | Cuándo | Cuerpo |
|---|---|---|
| 200 | WC responde 2xx | `{success: true, ...}` |
| 200 | WC responde 4xx/5xx O timeout | `{success: false, message: '...'}` |
| 401 | Sin auth de Katuq | `{error: 'unauthorized'}` |
| 400 | Falta `storeUrl` o credenciales en el body | `{error: 'invalid_input', field: 'storeUrl'}` |
| 500 | Crash interno | `{error: 'internal'}` (sin stack) |

## 6. Estrategia de testing

- **Contract tests** (primero): POST `/v1/woocommerce/test-connection` con body mock + nock al endpoint `system_status` (success 200, error 401, timeout). Verifica forma de la respuesta.
- **Integration**: PROVIDER_SCHEMAS validate retorna error si falta `bodegaCode` (cuando se requiere) — usar Firestore Emulator.
- **E2E Angular** (Cypress o equivalente): abrir `/integrations` → seleccionar Woo → completar form sin bodegaCode → verificar botón "Guardar" deshabilitado + mensaje friendly.
- **Snapshot test** (Jest + Angular Testing): renderizar bloque WooCommerce del HTML con todos los nuevos elementos visibles.
- **Unit**: `loadBodegasForWooForm()` setea correctamente las opciones del picker dado un mock de BodegaService; error handler muestra retry.

## 7. Fases de implementación

1. **Fase A — Backend schema + endpoint test-connection** `[P]`
   - Ampliar PROVIDER_SCHEMAS.woocommerce.
   - Crear `controllers/woocommerceIntegration.testConnection`.
   - Registrar ruta en router.
   - Contract tests.

2. **Fase B — Frontend service mapeos** `[P]`
   - Agregar entradas en `getDocumentationUrl()` línea 1989 y `getSelectedIntegrationName()` línea 2008.
   - Unit tests del service.

3. **Fase C — Frontend form WooCommerce** (deps: Fase A para que el backend acepte `bodegaCode`)
   - Extender `createWooCommerceForm()` con `bodegaCode` (Validators.required).
   - Extender `buildCredentials()` para incluir `bodegaCode`.
   - Agregar `loadBodegasForWooForm()` (suscripción a `BodegaService.list()` filtrando `activa === true`).
   - Snapshot tests del HTML.

4. **Fase D — HTML extender bloque WooCommerce**
   - Info-box con 3 pasos numerados + screenshots placeholders.
   - Caja "Configurar webhook entrante" con URL interpolada + botón copy.
   - Picker `bodegaCode` (PrimeNG `<p-dropdown>` o estándar `<select>`, alineado con resto del módulo).
   - Mensajes de error friendly.

5. **Fase E — SCSS estilos y accesibilidad**
   - Estilos del info-box, caja webhook, feedback del copy button (toast + ícono cambia a check 1s).
   - Verificación A11y: navegación teclado + screen reader.

6. **Fase F — Validación E2E**
   - Cypress test del flujo completo.

## 8. Plan de rollout

- **Feature flag**: NO necesario (es UX additive, no rompe configs existentes).
- **Dark launch**: el nuevo schema acepta configs sin `bodegaCode` (es `optional` en PROVIDER_SCHEMAS). Las configs Woo existentes (si hay) siguen funcionando. Solo cuando 003.3 requiera `bodegaCode` para el sync, se activa la validación operativa.
- **Rollback**: revertir merge — el frontend vuelve al form previo sin `bodegaCode`, info-box y URL webhook. Backend schema no rompe nada (todos los campos extra son `optional`).

## 9. Riesgos técnicos

- **R-Plan-01**: el bloque HTML WooCommerce está dentro de un archivo grande (`integrations.component.html`, >2000 LOC). Riesgo de conflictos de merge si otro desarrollador toca otro proveedor. Mitigación: PR pequeño + comunicación interna antes de mergear.
- **R-Plan-02**: estilos del info-box pueden colisionar con clases existentes. Mitigación: prefijo `wc-onboarding-` en clases nuevas.

## 10. Open questions técnicas

- Decidir entre PrimeNG `<p-dropdown>` y `<select>` HTML estándar para el picker bodega — depende de qué use el resto del form Woo. Default propuesto: usar lo que ya use el form (probablemente `<select>` estándar).
- Confirmar si el endpoint `system_status` de WC es público sin auth o requiere consumer key. Default propuesto: pasar consumer key como query string igual que el resto de llamadas (auth WC OAuth 1.0a).
