# Spec 003.1 — WooCommerce: schema de integración + UX en `/integrations`

> Estado: **draft** (2026-05-20, pendiente review humano)
> Sub-spec hija de [[003-woocommerce-360-marco]]. Bloquea 003.2 y 003.3.

## 1. Contexto / Por qué

Hoy un comerciante NO puede configurar correctamente WooCommerce en Katuq sin intervención técnica: el schema backend está incompleto (falta `bodegaCode`, sin defaults), el form Angular no le dice **cómo** generar las credenciales en su panel de WooCommerce, y no le muestra la URL exacta del webhook que debe pegar en su tienda. Esta sub-spec cierra esos gaps para que el onboarding sea de verdad "plug-and-play" (D-019).

## 2. Objetivo de negocio

Un comerciante completa el onboarding WooCommerce en Katuq en ≤ 5 minutos sin abrir ningún documento técnico ni contactar soporte.

## 3. User stories

- Como **comerciante con tienda WooCommerce**, quiero **encontrar instrucciones paso a paso en la pantalla de configuración**, para no tener que buscar en YouTube cómo generar mis credenciales.
- Como **comerciante**, quiero **copiar de un click la URL exacta del webhook**, para pegarla en mi panel de WooCommerce sin tipearla.
- Como **comerciante con varias bodegas**, quiero **elegir desde un picker en qué bodega Katuq va a registrar el stock proveniente de Woo**, para que mi inventario consolidado no se mezcle.
- Como **operador Katuq**, quiero **que el backend rechace configs WooCommerce incompletas**, para no tener flows que fallan a las 2 a.m. por una credencial vacía.

## 4. Criterios de aceptación (notación EARS)

- **AC-003.1-01.** THE system SHALL aceptar como válida una config WooCommerce solo si están presentes `storeUrl`, `consumerKey`, `consumerSecret` (campos `required` del schema PROVIDER_SCHEMAS).
- **AC-003.1-02.** THE system SHALL aceptar opcionalmente los campos `webhookSecret`, `apiVersion`, `verifySsl`, `bodegaCode`, `syncIntervalMinutes`, `enabled`, aplicando los defaults declarados (`apiVersion='wc/v3'`, `verifySsl=true`, `syncIntervalMinutes=15`, `enabled=true`) cuando se omiten.
- **AC-003.1-03.** THE system SHALL marcar `consumerSecret` y `webhookSecret` como sensitive (cifrados at-rest + nunca devueltos al frontend en plano).
- **AC-003.1-04.** WHEN el comerciante abre `/integrations` y selecciona WooCommerce, THE form SHALL renderizar: (a) un info-box con 3 pasos numerados para generar credenciales, (b) una caja con la URL exacta del webhook entrante y botón "Copiar al portapapeles", (c) un picker `bodegaCode` que lista las bodegas activas del comercio.
- **AC-003.1-05.** WHEN el comerciante hace click en "Copiar al portapapeles" sobre la URL del webhook, THE system SHALL escribir al clipboard el string `https://back.katuq.com/v1/woocommerce/webhook/{companyId}` con `{companyId}` reemplazado por el companyId real del comercio logueado.
- **AC-003.1-06.** WHEN el comerciante intenta guardar sin completar `bodegaCode`, THE form SHALL deshabilitar el botón "Guardar" y mostrar mensaje friendly "Elegí en qué bodega registrar el stock de WooCommerce".
- **AC-003.1-07.** THE service `IntegrationsService.getDocumentationUrl('woocommerce')` SHALL retornar `'https://woocommerce.github.io/woocommerce-rest-api-docs/'`; y `getSelectedIntegrationName('woocommerce')` SHALL retornar `'WooCommerce'`.
- **AC-003.1-08.** WHEN el comerciante hace click en "Probar conexión", THE system SHALL ejecutar contra `GET {storeUrl}/wp-json/wc/{apiVersion}/system_status` y reportar `success: true` con código 200 o `success: false` con mensaje friendly en ≤ 5s.

## 5. Requisitos no funcionales

### 5.1 Performance
- Render del form Woo: ≤ 200ms desde el click en la card "WooCommerce" del catálogo.
- Carga del picker de bodegas: ≤ 500ms con hasta 50 bodegas.

### 5.2 Seguridad
- `consumerSecret` y `webhookSecret` cifrados at-rest con `INTEGRATION_ENCRYPTION_KEY` (heredado de `integrationConfigService`).
- Endpoint de test conexión requiere auth de Katuq (`authMiddleware` + `companyMiddleware`).
- Nunca enviar `consumerSecret` ni `webhookSecret` en plano al frontend (Artículo XI).

### 5.3 Observabilidad
- Endpoint de test conexión emite log estructurado con `correlationId`, `companyId`, latencia, status code recibido de WooCommerce.

### 5.4 Accesibilidad
- Form WooCommerce: WCAG AA, navegación por teclado completa, mensajes de error con `role="alert"`, labels asociadas a inputs vía `for=id`.
- Info-box con 3 pasos: cada paso navegable por teclado, screenshots con `alt` descriptivo.

### 5.5 Resiliencia
- Si `BodegaService.list()` falla, el picker muestra mensaje "No se pudieron cargar las bodegas, intentá de nuevo" + botón retry, sin romper el form.
- Si el endpoint de test conexión falla por timeout, retornar `success: false` con `message: 'WooCommerce no respondió en 5 segundos'`.

## 6. Out of scope (explícito)

- Cambios en el wizard 4 pasos genérico de `integration-modal.component.html` (D-019: NO crear UI nueva).
- Implementación del HMAC del webhook entrante (003.2).
- Implementación del cron de sync productos (003.3).
- Crear screenshots reales de WooCommerce admin (los placeholders se entregan; los reales los provee diseño / piloto).
- OAuth via `/wc-auth/v1/authorize` (D-019).

## 7. Dependencias

- **003 marco** aprobado.
- `services/integrationConfigService.js` existente (lo extendemos, no lo reemplazamos).
- `BodegaService` en frontend (`shared/services/bodegas/bodega.service.ts`).
- `SecurityService.getCompanyInformationLogged()` (frontend) para interpolar `{companyId}` en la URL del webhook.
- Diseño: assets `assets/integrations/woocommerce/step-{1,2,3}.png` (placeholders en MVP).

## 8. [NEEDS CLARIFICATION]

- [ ] **Q-003.1-01** (heredada Q-WOO-01 del marco): ¿el picker `bodegaCode` muestra TODAS las bodegas o solo las activas (`bodega.activa === true`)? Default propuesto: **solo activas**. Si el comerciante quiere usar una bodega inactiva debe activarla primero (es lo seguro).
- [ ] **Q-003.1-02**: la URL del webhook usa `companyId` literal (ej. `"OH MY STORE"` URL-encoded). ¿Es correcto o queremos slug estable (`oh-my-store`)? Default propuesto: literal (consistente con spec 001 + endpoint Cereza ya en producción). Si causa problemas en WC, abrir spec separada para slug.

## 9. Riesgos identificados

- **R-003.1-01** (Medio): si una empresa tiene 0 bodegas activas al momento del onboarding, el picker queda vacío y bloquea el guardado. Mitigación: mostrar mensaje "Creá primero una bodega en /inventarios/bodegas" con link directo.
- **R-003.1-02** (Bajo): endpoint de test conexión expone CORS si el comerciante prueba contra un Woo en localhost. Mitigación: el endpoint vive en backend Katuq, no en frontend — sin CORS issue.

## 10. Métricas de éxito post-launch

- **M-003.1-01**: tasa de onboardings WooCommerce que llegan al "Guardar" sin errores ≥ 90% (medido en 30 días).
- **M-003.1-02**: tickets de soporte sobre "no entiendo cómo generar mis credenciales" ≤ 1/mes después del MVP.
- **M-003.1-03**: 0 configs WooCommerce persistidas en producción sin `bodegaCode` (verificable con auditoría Firestore).

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren al menos performance, seguridad, observabilidad.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto antes de plan.md.
