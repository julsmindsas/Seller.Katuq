# Tasks 003.1 — WooCommerce: schema + UX en `/integrations`

> Estado: **draft** (2026-05-20)
> Vinculado a `plan.md` (pendiente approved).

## Convenciones

- `[P]` = paralelizable (no toca los mismos archivos que otra `[P]` simultánea).
- `(deps: T-NN)` = depende de la tarea NN.
- Cada tarea es shippable independiente o bloquea de forma explícita.

## Tareas

### T-01 — Ampliar PROVIDER_SCHEMAS.woocommerce con bodegaCode + defaults `[P]`
- **Input:** schema actual en `services/integrationConfigService.js` líneas 41-45.
- **Output:** schema con `optional` extendido + bloque `defaults` + estructura validable.
- **Criterio de éxito:**
  - `required: ['storeUrl', 'consumerKey', 'consumerSecret']`
  - `optional` incluye `bodegaCode, syncIntervalMinutes, enabled` además de los actuales.
  - `defaults: { apiVersion: 'wc/v3', verifySsl: true, syncIntervalMinutes: 15, enabled: true }`.
  - `validateConfig('woocommerce', {})` retorna error apuntando a `storeUrl` (required).
- **Archivos a tocar:** `katuq_admin_back_firebase/functions/services/integrationConfigService.js`.
- **Dependencias:** ninguna.

### T-02 — Crear endpoint `POST /v1/woocommerce/test-connection` (deps: T-01) `[P]`
- **Input:** body con `{storeUrl, consumerKey, consumerSecret, apiVersion?, verifySsl?}`.
- **Output:** handler en `controllers/woocommerceIntegration.js` + ruta en router.
- **Criterio de éxito:**
  - Handler `async function testConnection(req, res)` valida body, construye URL `{storeUrl}/wp-json/wc/{apiVersion||'wc/v3'}/system_status`, hace GET con consumer_key/consumer_secret como query params, retorna `{success, message, details?}`.
  - Timeout 5s con `axios({ timeout: 5000 })`.
  - Try/catch retorna `success: false` con message friendly (no expone stack).
  - Log estructurado: `correlationId` + `companyId` (de req.headers.company) + status code recibido + latencia. NUNCA logear consumerSecret.
  - Ruta registrada como `POST /v1/woocommerce/test-connection` con `authMiddleware` + `companyMiddleware`.
- **Archivos a tocar:**
  - `katuq_admin_back_firebase/functions/controllers/woocommerceIntegration.js` (agregar export `testConnection`).
  - Router de Woo (verificar `routers/woocommerceWebhook.js` o crear `routers/woocommerce.js` si no existe).
  - `index.js` para registrar ruta si aplica.
- **Dependencias:** T-01.

### T-03 — Contract tests del endpoint test-connection (deps: T-02)
- **Input:** endpoint implementado.
- **Output:** 3 tests passing.
- **Criterio de éxito:**
  - Test "WC responde 200" → `{success: true, details.wcVersion}` presente.
  - Test "WC responde 401" → `{success: false, message: 'WooCommerce respondió con 401 — verificá Consumer Key y Secret.'}`.
  - Test "WC timeout 5s" → `{success: false, message: 'WooCommerce no respondió en 5 segundos'}`.
  - Mockear axios con `nock` o `sinon`.
- **Archivos a tocar:**
  - `katuq_admin_back_firebase/functions/tests/woocommerce/test-connection.test.js` (nuevo).
- **Dependencias:** T-02.

### T-04 — Agregar mapeos Woo en `IntegrationsService` (frontend) `[P]`
- **Input:** método `getDocumentationUrl()` línea 1989, `getSelectedIntegrationName()` línea 2008.
- **Output:** ambos retornan valor correcto para `'woocommerce'`.
- **Criterio de éxito:**
  - `getDocumentationUrl('woocommerce')` retorna `'https://woocommerce.github.io/woocommerce-rest-api-docs/'`.
  - `getSelectedIntegrationName('woocommerce')` retorna `'WooCommerce'`.
  - Tests unitarios cubren ambos casos.
- **Archivos a tocar:**
  - `Seller.Katuq/src/app/components/integrations/integrations.service.ts`.
  - Test file correspondiente (si existe).
- **Dependencias:** ninguna.

### T-05 — Agregar `bodegaCode` al `createWooCommerceForm` + `buildCredentials` (deps: T-01)
- **Input:** form actual líneas 821-832 + buildCredentials líneas 1309-1318.
- **Output:** form con control `bodegaCode` + mapeo correcto.
- **Criterio de éxito:**
  - `createWooCommerceForm()` incluye `bodegaCode: ['', Validators.required]`.
  - `buildCredentials()` case `'woocommerce'` mapea `bodegaCode: formData.bodegaCode`.
  - El form es `invalid` mientras `bodegaCode` esté vacío.
- **Archivos a tocar:**
  - `Seller.Katuq/src/app/components/integrations/integrations.component.ts`.
- **Dependencias:** T-01 (para que el backend lo acepte).

### T-06 — `loadBodegasForWooForm()` carga picker desde BodegaService (deps: T-05)
- **Input:** `BodegaService.list()` retorna `Observable<Bodega[]>`.
- **Output:** propiedad `wooBodegas: Bodega[]` poblada filtrando `activa === true`.
- **Criterio de éxito:**
  - Método se invoca en `onSelectIntegrationType('woocommerce')` (línea 524 actual).
  - Suscripción se gestiona en `ngOnDestroy` (takeUntil pattern).
  - Si la lista llega vacía, mostrar mensaje "No hay bodegas activas. Creá una en /inventarios/bodegas" con link.
  - Error handler retry-able.
- **Archivos a tocar:**
  - `Seller.Katuq/src/app/components/integrations/integrations.component.ts`.
- **Dependencias:** T-05.

### T-07 — Extender bloque HTML WooCommerce con info-box + caja webhook + picker `[P con T-08]` (deps: T-06)
- **Input:** bloque `*ngIf="selectedIntegrationType === 'woocommerce'"` actual.
- **Output:** bloque con 3 secciones nuevas + picker bodega.
- **Criterio de éxito:**
  - Info-box con 3 pasos numerados (1: ir a WooCommerce admin → Ajustes → Avanzado → REST API; 2: click "Crear clave" con permiso "Lectura/Escritura"; 3: copiar Consumer Key + Secret acá).
  - Cada paso muestra screenshot placeholder (`<img src="assets/integrations/woocommerce/step-N.png" alt="...">`).
  - Caja "Configurar webhook entrante" con URL interpolada usando `{{ webhookUrlForWooCommerce }}` (getter en TS que combina `https://back.katuq.com/v1/woocommerce/webhook/` + `securityService.getCompanyInformationLogged().company` URL-encoded).
  - Botón "Copiar al portapapeles" llama método `copyWebhookUrl()`.
  - Picker bodega `<select formControlName="bodegaCode">` lista `wooBodegas` con `option [value]="b.idBodega"` y texto "BOD-001 — BOGOTA".
  - Mensaje error `<div *ngIf="integrationForm.get('bodegaCode')?.invalid && integrationForm.get('bodegaCode')?.touched">` con texto friendly.
- **Archivos a tocar:**
  - `Seller.Katuq/src/app/components/integrations/integrations.component.html`.
- **Dependencias:** T-06.

### T-08 — Método `copyWebhookUrl()` + estilos SCSS `[P con T-07]` (deps: T-06)
- **Input:** método en TS + estilos en SCSS.
- **Output:** click copia URL al clipboard + feedback visual (1s).
- **Criterio de éxito:**
  - `copyWebhookUrl()` usa `navigator.clipboard.writeText(this.webhookUrlForWooCommerce)`.
  - On success: cambia ícono del botón a check verde 1s + muestra toast "URL copiada".
  - On error (browser bloquea clipboard): fallback `document.execCommand('copy')` con textarea temporal.
  - Estilos SCSS con prefijo `wc-onboarding-` (info-box, caja webhook, picker bodega).
- **Archivos a tocar:**
  - `Seller.Katuq/src/app/components/integrations/integrations.component.ts`.
  - `Seller.Katuq/src/app/components/integrations/integrations.component.scss`.
- **Dependencias:** T-06.

### T-09 — Crear assets placeholder de screenshots (deps: ninguna) `[P]`
- **Input:** 3 imágenes placeholder 600×400 con texto explicativo del paso.
- **Output:** archivos en `Seller.Katuq/src/assets/integrations/woocommerce/`.
- **Criterio de éxito:**
  - `step-1.png` (con texto "Paso 1: WooCommerce admin → Ajustes → Avanzado → REST API"), `step-2.png`, `step-3.png` existen.
  - Cada uno < 100KB.
- **Archivos a tocar:**
  - `Seller.Katuq/src/assets/integrations/woocommerce/{step-1,step-2,step-3}.png` (nuevos).
- **Dependencias:** ninguna. Placeholders generados por script o ImageMagick.

### T-10 — Snapshot test del bloque WooCommerce (deps: T-07, T-08)
- **Input:** componente con form Woo renderizado.
- **Output:** snapshot test passing.
- **Criterio de éxito:**
  - Snapshot test verifica que el bloque contiene: info-box (3 pasos), caja webhook (URL + botón copy), picker bodega, mensajes friendly.
  - Re-correr suite reproduce snapshot exacto.
- **Archivos a tocar:**
  - `Seller.Katuq/src/app/components/integrations/integrations.component.spec.ts` (extender).
- **Dependencias:** T-07, T-08.

### T-11 — E2E Cypress flujo completo onboarding Woo (deps: T-02, T-10) `[opcional MVP]`
- **Input:** entorno con frontend + backend + Firestore Emulator.
- **Output:** test E2E passing.
- **Criterio de éxito:**
  - Login → /integrations → click WooCommerce → form renderiza con todos los elementos nuevos → completar sin bodegaCode → botón Guardar deshabilitado → completar bodegaCode → click "Probar conexión" (mockeado a success) → click Guardar → verificar doc en `integration_configs/{COMPANY}_woocommerce`.
- **Archivos a tocar:**
  - `Seller.Katuq/cypress/e2e/integrations/woocommerce-onboarding.cy.ts` (nuevo).
- **Dependencias:** T-02, T-10. Opcional para MVP (skip si Cypress no está activo en CI).

## Orden de ejecución sugerido

```
Fase A (backend): T-01 → T-02 → T-03      (sequential)
Fase B (front service): T-04              (parallel con T-01..T-03)
Fase C (front form): T-05 → T-06          (deps T-01)
Fase D (front HTML): T-07 + T-08          (paralelo, ambos deps T-06)
Fase E (assets): T-09                     (paralelo con todo)
Fase F (tests): T-10 → T-11 (opcional)    (deps T-07, T-08, T-02)
```

Paralelización óptima:
- Día 1 mañana: T-01 + T-04 + T-09 en paralelo (3 personas o agentes).
- Día 1 tarde: T-02 + T-05 (deps T-01).
- Día 2 mañana: T-03 + T-06 + T-07 + T-08 (4 en paralelo, deps T-05).
- Día 2 tarde: T-10 + opcional T-11.

## Definition of Done

- T-01 a T-10 completadas.
- Todos los contract tests verdes (T-03).
- Snapshot test verde (T-10).
- Verificación constitución (plan.md §2) sin "no" pendientes.
- Endpoint test-connection emite logs estructurados en staging.
- CONTRACT.md actualizado: si hubo desvíos, registrar como sub-decisión D-XXX. Si no, marcar `003.1 done` en roadmap.
- Spec 003.1 marcada `approved` (de `draft`) tras review humana.
- Cero hits de `siteUrl` en `integrations.component.{ts,html}` (verificado en Fase 0d).
- README de specs actualizado: cambiar `003.1` de "en redacción" a "done" cuando tasks completas.
