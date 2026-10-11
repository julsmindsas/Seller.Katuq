## Context

El problema está en proposal.md (Why). Estado actual que define el enfoque:

- Las tres rutas de `/v1/dropshipping/*` ya pasan por `auth`, `requireJwtTenant` y `requireSubscriptionFeature('dropshipping')`. `requireJwtTenant` deja `req.tenant` (el `company` del JWT) y rechaza un `company`/`companyId`/`empresa` **distinto** en body o header, pero no impone el filtro. Los controladores leen `req.body.company || req.query.company`, la query no pasa por `tenantHints` y, si no hay valor, no filtran.
- Los documentos de `dropshipping_proveedores` y `dropshipping_ordenes` (confirmado en los controladores) guardan la empresa en el campo `company`, el nombre comercial que manda el front.
- Molde de configuración por empresa: `/v1/companies/pricing-mode` (`controllers/companies.js` `getPricingMode`/`setPricingMode`). Usa `findCompanyDocByName(req.headers.company)` y `update` con rutas de campo. `requireJwtTenant` ya fija `req.headers.company` desde el JWT.
- `services/secretsCrypto.js` ofrece `encrypt`, `decrypt`, `isEncrypted`, `isMasked` y `maskForDisplay`. Falla cerrado si falta `SECRET_TOKEN`.
- Front: `currentCompany` (localStorage y `SecurityService`) es el documento de la empresa. Hay que verificar en la tarea 3.1 que la respuesta que lo llena traiga los campos de primer nivel, y así `dropshipping`.

## Goals / Non-Goals

**Goals:**
- Una sola forma de saber la empresa en dropshipping: `req.tenant`.
- Configuración de empresa en un campo del documento existente, con una única ruta que la escribe.
- Front sin lecturas de `dropshippingConfig_*`.

**Non-Goals:**
- Excepción de plataforma (Julsmind viendo los proveedores de todos). Si hace falta, irá en otra ruta y otra propuesta.
- Indexar o paginar distinto: las consultas filtradas por `company` ya existen hoy cuando llega el parámetro.

## Decisions

1. **Candado en un helper, no en cada controlador a mano.** Se crea `utils/dropshippingTenant.js`:
   - `tenantDe(req)` devuelve `req.tenant` o lanza un 403;
   - `docDeLaEmpresa(coleccion, id, tenant)` lee el documento y devuelve `null` si no existe o si `normalizeTenant(doc.company) !== normalizeTenant(tenant)`.

   Cada handler por id usa `docDeLaEmpresa` y responde 404 ante `null`. Cada lista arranca con `where('company', '==', tenant)`, que deja de ser opcional. Las comparaciones usan `normalizeTenant` porque así lo hace `requireJwtTenant`.

   *Alternativa descartada:* un middleware que reescriba `req.query.company`. Deja los `if (company)` vivos y basta un controlador nuevo que lo olvide para reabrir el hueco.

   Una prueba de contrato (`tests/dropshipping/tenantIsolation.contract.test.js`) recorre todas las rutas del router con una sesión de A y documentos de B (Firestore simulado), y falla si alguna devuelve o modifica datos de B.

2. **`company` del JWT en `create`.**
   - `create` y `crearDesdeVenta` escriben `company: tenant`.
   - Si el body trae una empresa distinta, ya la rechaza `requireJwtTenant`.
   - Si no trae ninguna, se usa el tenant.

3. **Clave de proveedor: cifrada en el mismo documento y enmascarada al salir.**
   - **Al guardar** (`create`, `update`, `updateApiConfig`): si `api_config.api_key` viene con valor y no `isMasked`, se guarda `encrypt(valor)`. Si viene enmascarada o vacía, se conserva la guardada.
   - **Al responder:** un único `presentarProveedor(doc)` reemplaza la clave por `maskForDisplay` (sobre el valor descifrado o, si no se puede descifrar, `****`) y agrega `tiene_api_key`.
   - **Nadie descifra para usarla hoy**, porque la integración es simulada. Cuando se haga la real, el descifrado vivirá en el servidor, que es quien llama al proveedor.

   *Alternativa descartada:* llevarlas a `integration_secrets` con `integrationConfigService`. Ese servicio modela integraciones de plataforma por proveedor (Shopify, WO…), no N proveedores por empresa, y obligaría a crear configs falsas. El cifrado en el campo da la misma protección con `secretsCrypto`, que ya existe para este fin.

4. **Configuración de empresa: campo `dropshipping` en `companies`.**
   - **Forma:** `{ habilitado, fechaActivacion, configuracion: { margenMinimoPermitido, tiempoLimiteOrden, automatizacionActivada, notificacionesActivadas, proveedoresPermitidos }, updatedAt, updatedBy }`. Es la de la interfaz `DropshippingModule` del front, sin `api_config`.
   - **Rutas:** `GET /v1/companies/dropshipping-settings` y `POST /v1/companies/dropshipping-settings`, declaradas antes de `/:id`.
   - **El POST:**
     - valida los rangos en el servidor (margen 0–100, días 1–30 enteros, booleanos reales);
     - pone `fechaActivacion` solo al pasar de apagado a prendido;
     - escribe con `update({ dropshipping: … })`.
   - **Sin colección nueva:** se respeta la regla de `openspec/config.yaml`.
   - **El campo está en español** (`dropshipping.habilitado`) porque es un módulo de la empresa, no una integración, y coincide con el modelo del front. El Artículo XV aplica solo a `integrations.*`.

5. **`editCompany` y `updateCompanyById` borran `dropshipping` del payload antes del `update`.** Así una copia vieja de "Mi Empresa" no la pisa. Con una prueba unitaria.

6. **Front.**
   - **Servicio:** `DropshippingSettingsService extends BaseService`, con `obtener()` y `guardar()`.
   - **El componente:**
     - carga del servicio y quita el `setTimeout` de 500 ms que simulaba la carga;
     - al guardar, actualiza `currentCompany.dropshipping` en `localStorage` y en `SecurityService` (`companyInformation$`), y llama a `navService` para recalcular el menú.
   - **`isDropshippingEnabled()`** queda en un solo lugar, `nav.service`, y lee `currentCompany.dropshipping?.habilitado === true`. `crear-productos` usa el del servicio y pierde su copia y la función de habilitar para pruebas.
   - **Migración:** al cargar, si el servidor no tiene `dropshipping` y existe `dropshippingConfig_*` (o `allDropshippingConfigs`), un `Swal` ofrece subirla. Con o sin aceptación, se borran las llaves locales de dropshipping.
   - **Pantalla:** se quitan la sección de integración, la URL de webhook, la clave y "Herramientas de desarrollo", y se agrega un aviso con enlace a Proveedores ("La conexión por API se configura en cada proveedor"). Sigue la base `cfg-*` (D-400).

## Resultados de la implementación (10-oct)

- **Medición (1.2):** en `julsmind-katuq` hay 0 documentos en `dropshipping_proveedores` y 0 en `dropshipping_ordenes`. El hueco nunca expuso datos; no hay claves que cifrar ni registros sin empresa.
- **Resultado de 3.1:** `currentCompany` es la empresa completa que devuelve `POST /v1/companies/byName` (`servicios.getEmpresaByName` → `SecurityService.setCompanyInformationLogged`), el mismo camino por el que ya llegan las `featureFlags` (`CompanyFeaturesService`). Trae los campos de primer nivel, así que `nav.service` lee `currentCompany.dropshipping` sin pedir `GET dropshipping-settings`. La pantalla de configuración sí lee del servidor y, al leer o guardar, refresca `currentCompany` y emite `companyInformation$`, que `nav.service` escucha para recalcular el menú. La lectura está en una función compartida (`dropshippingHabilitadoEnLaSesion`), que solo le cree a la empresa guardada si es la de la sesión (misma regla que `CompanyFeaturesService`); `crear-productos` usa la misma función.
- **Desvíos menores:**
  - Helpers separados por responsabilidad: `utils/dropshippingClaves.js` (`presentarProveedor`, `apiConfigParaGuardar`) y `utils/dropshippingConsultas.js` (paginación).
  - Máscara `****` + últimos 4: `maskForDisplay` deja también los 3 primeros y la spec pide a lo sumo los últimos 4.
  - Las listas filtran por empresa en Firestore y ordenan/paginan en memoria: antes leían todo para contar y luego volvían a leer. No hace falta ningún índice compuesto con `fecha_creacion` (no existía en `firestore.indexes.json`). `pageSize` máximo 100.
  - Email de proveedor único **por empresa**: antes era global y revelaba si otra empresa tenía ese proveedor.
  - `crear-desde-venta` solo acepta pedidos (`orders`) de la empresa de la sesión.
  - Las órdenes guardan `proveedor_id`: el helper lo tomaba de `proveedor._id` y el controlador pasaba `doc.data()` sin id.
  - Un texto ya cifrado (`enc:v1:…`) que llegue del cliente no se acepta como clave nueva.
  - `dropshipping` se protege en `services/companies/sanitizeCompanyUpdate.js` (lista de campos de otro dueño y `quitarBanderas`), que ya usan `updateCompanyById`, `editCompany` y `createCompany`.
  - Front de proveedores: `getProveedores` desempaca `{ proveedores }` (la lista recibía el objeto), el servidor devuelve también `id` (las pantallas navegan con `id`) y `validate-email` acepta el `?exclude=` que manda el front.

## Risks / Trade-offs

- [Julsmind o una pantalla de plataforma dependía de la lista global] → Primero la medición: el script en ensayo cuenta proveedores y órdenes por empresa y los que no tienen empresa. Si aparece un consumidor de plataforma, se para y se le pregunta a Daniel.
- [Documentos con `company` vacío o escrito distinto, con mayúsculas] → `normalizeTenant` resuelve las mayúsculas. Los vacíos los lista el ensayo y no se reasignan sin la aprobación de Daniel.
- [`SECRET_TOKEN` cambia algún día] → Las claves cifradas no se podrían descifrar y la respuesta mostraría `****`. Es el mismo riesgo que ya tienen las integraciones con `secretsCrypto`, y queda documentado.
- [`currentCompany` no trae `dropshipping` en algún camino de login] → La tarea 3.1 lo verifica. Si falta, `nav.service` pide `GET dropshipping-settings` una vez por sesión: es una lectura de 1 documento.
- [Comercios que lo tenían prendido solo en su navegador] → El aviso de migración. Se avisa a Daniel con la lista de empresas que tienen proveedores.

## Migration Plan

1. **Backend, fase 1.**
   - Script en `--dry-run` en producción, y su resultado al contrato.
   - Candado de empresa, clave enmascarada y cifrado al guardar.
   - Despliegue con `pm2 restart katuq-api` y suites `tests/dropshipping/*` en el servidor.
   - Luego el script real, que cifra las claves viejas.
2. **Backend, fase 2:** rutas `dropshipping-settings` y protección en `editCompany`/`updateCompanyById`. Se despliegan antes que el front; el front viejo no las llama, así que no rompe nada.
3. **Front:** servicio, pantalla, `nav.service` y `crear-productos`. Se publica con `git pull` previo y se prueba con la sesión de Daniel en FLORECER (habilitar, ver el menú, otro navegador ve lo mismo).
4. **Rollback:**
   - **Fase 1:** revertir el commit. Las claves cifradas no se descifran solas, pero hoy nada las usa.
   - **Fase 2:** revertir el commit. El campo `dropshipping` queda en la empresa sin que nadie lo lea, y el front viejo vuelve a `localStorage`.
