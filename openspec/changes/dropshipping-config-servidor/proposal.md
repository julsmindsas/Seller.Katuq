## Why

Daniel (2026-10-10): "sí, arma la propuesta", después de D-402. La pantalla **Configuración de Dropshipping** guarda solo en el `localStorage` del navegador (`dropshippingConfig_<companyId>`). El menú (`nav.service.isDropshippingEnabled`) y la creación de productos (`crear-productos.isDropshippingEnabled`) leen de ahí mismo. Por eso, si el comercio cambia de computador, de navegador o borra los datos, el módulo "se apaga". Además, `crear-productos` trae un botón que lo prende "temporalmente para pruebas".

En la revisión del módulo salió un problema de seguridad más grave, que va primero:

- **Proveedores y órdenes de dropshipping sin candado de empresa.** En `controllers/dropshippingProveedores.js` y `controllers/dropshippingOrdenes.js`, el filtro por empresa es opcional (`req.body.company || req.query.company`, y si falta, `if (company)` no filtra). El front no manda ese parámetro (`proveedores.service.ts`: `GET /v1/dropshipping/proveedores`), así que la lista devuelve los proveedores de **todas** las empresas. `getById`, `update`, `delete`, `activar`, `desactivar`, `api-config`, `summary` y `sincronizar-productos` buscan por id sin comprobar a qué empresa pertenece el documento. `create` toma `company` del body, y si el body no la trae, la guarda vacía. Las rutas sí tienen `auth`, `requireJwtTenant` y `requireSubscriptionFeature('dropshipping')`. Eso evita un tenant ajeno en el body, pero no el que falte. Queda expuesto cualquier comercio con un plan que incluya dropshipping.
- **Claves de proveedor en texto plano.** `dropshipping_proveedores.api_config.api_key` se guarda tal como llega y vuelve completa en `getAll` y en `getById`. Junto con el punto anterior, un comercio puede leer las claves de los proveedores de otro.
- Toda la integración por API es **simulada**: `testApiConnection` y `sincronizarProductos` devuelven resultados fijos, y ningún código usa la clave para llamar a nadie. La sección "Configuración de Integración" de la empresa (tipo, endpoint, clave y URL de webhook) no la consume nadie. La URL de webhook que muestra (`<origin>/api/dropshipping/webhook/<id>`) no existe.

Decisión: **D-403** en `specs/CONTRACT.md`.

## What Changes

**Fase 1 — Seguridad (backend, va primero y sola).**
- Todas las rutas de `/v1/dropshipping/*` toman la empresa **solo del JWT** (`req.tenant`) y filtran siempre por ella. Las rutas por id responden 404 si el documento es de otra empresa, igual que si no existiera. `create` guarda la empresa del JWT e ignora la del body.
- `api_key` de proveedor: se cifra al guardarla con `services/secretsCrypto.js` (AES-256-GCM, ya usado para secretos de integraciones) y **nunca** se devuelve. Las respuestas traen `api_key` enmascarada (`****1234`) y `tiene_api_key: true`. Si la clave que llega viene enmascarada, no pisa la guardada.
- Script `scripts/dropshipping-cifrar-claves.js` con `--dry-run` primero: cuenta proveedores por empresa, los que no tienen empresa y las claves en texto plano, y luego las cifra.

**Fase 2 — Configuración de la empresa en el servidor.**
- `GET /v1/companies/dropshipping-settings` (`auth`, `requireJwtTenant`) y `POST /v1/companies/dropshipping-settings` (más `ONLY_ADMIN` y `requireSubscriptionFeature('dropshipping')`), siguiendo el molde de `/companies/pricing-mode`. Guardan el campo `dropshipping` en el documento existente de `companies`: `habilitado`, `fechaActivacion` y `configuracion` (margen mínimo, tiempo límite, automatización, notificaciones y proveedores permitidos). No se crea ninguna colección.
- Front: `DropshippingConfigComponent` lee y guarda por el servicio nuevo (`BaseService`). Al guardar, actualiza `currentCompany.dropshipping` para que el menú y la creación de productos cambien sin volver a entrar.
- `nav.service` y `crear-productos` leen `currentCompany.dropshipping.habilitado`, que llega con la empresa, en vez de `localStorage['dropshippingConfig_*']`.
- **Migración de una sola vez en el navegador:** si existe `dropshippingConfig_*` local y el servidor no tiene configuración, la pantalla propone subirla ("Encontramos una configuración guardada en este navegador. ¿Quieres guardarla para toda la empresa?"). Después borra la copia local.
- **Se quita:**
  - la sección "Configuración de Integración" de la empresa (tipo, endpoint, clave y webhook), porque la conexión por API vive en cada proveedor y no hay nada que la use;
  - el bloque "Herramientas de desarrollo";
  - el "habilitar temporalmente para pruebas" de `crear-productos`.

  **BREAKING** solo para quien tuviera la configuración en un navegador y no la suba: el módulo le aparecerá apagado hasta que un administrador lo prenda.

## Capabilities

### New Capabilities
- `dropshipping-config`: configuración del módulo dropshipping por empresa, guardada en el servidor, y cómo la consumen el menú y la creación de productos.
- `dropshipping-tenant-isolation`: aislamiento por empresa de proveedores y órdenes de dropshipping, y manejo de las claves de proveedor.

### Modified Capabilities
<!-- Ninguna: no hay spec previa de dropshipping. -->

## Impact

- **Backend:**
  - `routers/dropshipping*.js` y `controllers/dropshippingProveedores.js`, `controllers/dropshippingOrdenes.js`;
  - `routers/companies.js` y `controllers/companies.js`, con dos rutas nuevas antes de `/:id`;
  - uso de `services/secretsCrypto.js`;
  - script de cifrado;
  - pruebas de contrato en `tests/dropshipping/`.
- **Front:** `dropshipping-config.component.*`, `nav.service.ts` (`isDropshippingEnabled`), `crear-productos.component.ts` (`isDropshippingEnabled` y el habilitado de pruebas), un servicio nuevo `DropshippingSettingsService extends BaseService` y `proveedores.service.ts` (deja de esperar `api_key` en claro).
- **Datos:** campo nuevo `dropshipping` en `companies`; las claves de `dropshipping_proveedores` pasan de texto plano a cifradas.
- Sin cambios en `orders`, inventario, consecutivos, productos ni precios. `crear-productos` solo cambia de dónde lee si el módulo está prendido.

## No-goals

- Construir la integración real por API con proveedores. Sigue simulada; si se hace, irá en otra propuesta, con su spec de webhooks según la constitución (Artículos IV, V y X).
- Cambiar el flujo de órdenes dropshipping desde una venta (`crear-desde-venta`), los estados ni el dashboard, salvo que filtren por empresa.
- Rediseñar las pantallas de proveedores u órdenes.
- Mover proveedores a `integrations.<provider>`: un proveedor de dropshipping no es una integración de plataforma.

## Riesgos

- **Algún flujo dependía de ver datos de otras empresas** (por ejemplo, una vista de plataforma para Julsmind). → La medición de la fase 1 cuenta proveedores y órdenes por empresa antes de cambiar nada. Si Julsmind los necesita, se hace una ruta aparte con candado de plataforma, no un hueco.
- **Proveedores o órdenes guardados sin empresa** (por el `create` viejo) quedarían invisibles. → El dry-run los lista. Asignarles empresa necesita la aprobación de Daniel, caso por caso.
- **`PUT /companies/:id` y `/companies/edit` escriben con `update(req.body)`:** si "Mi Empresa" manda una copia vieja de la empresa con `dropshipping`, podría pisar el valor. → En el design: esos controladores ignoran el campo `dropshipping`, que solo se escribe por su ruta.
- **Comercios con el módulo prendido solo en su navegador** lo verán apagado hasta subirlo o prenderlo. → El aviso de migración y la nota en la bitácora; con la medición se sabe cuáles empresas tienen proveedores.
- **Módulos sensibles:** ninguno. `crear-productos` solo cambia de dónde lee la bandera; el producto se guarda igual.
