# CODEX_SYSTEM_ANALYSIS.md

Documento operativo para Codex al trabajar en `Seller.Katuq`.

Ultima lectura local: 2026-05-11.

## Estado del repo observado

- Rama local: `feature/venta-asistida-mejorada`, 5 commits detras de `origin/feature/venta-asistida-mejorada`.
- `AGENTS.md` existe localmente y aparece como archivo sin trackear.
- Proyecto principal: Angular 14 con TypeScript y SCSS.
- Backend principal esperado: Express/Node en `localhost:3300`.
- Backends AI esperados: KAI Genkit en `3890/3892` y ADK Flask/AG-UI en `8080`.
- Service Worker esta desactivado en `src/app/app.module.ts`.

## Comandos utiles

```bash
npm start
npm run start:8gb
npm run build
npm run build:prod
npm run lint
npm run update-version
```

Nota: `build:prod` ejecuta `prebuild:prod`, que corre `update-version.js` y modifica version en environments. No ejecutar build de produccion si no se quiere cambiar version.

## Mapa mental de arquitectura

La app tiene tres zonas superpuestas:

- Core Angular legacy: `src/app/components/*`, `src/app/shared/*`, rutas lazy-loaded y servicios HTTP.
- Venta/POS/inventario: el bloque mas sensible, con estado en `localStorage`, carrito, bodegas, calculos de precio/IVA y ordenes.
- AI/agentes/flujos: `src/app/modules/agent-builder`, `src/app/modules/video-agent`, `src/app/components/flows`, `src/app/shared/services/tools`.

Los puntos de entrada principales son:

- `src/app/app.module.ts`: providers globales, interceptores, Firebase, tool adapter y registrars.
- `src/app/app-routing.module.ts`: rutas top-level, layouts `ContentComponent`/`BlankComponent`, guards premium/admin.
- `src/app/shared/routes/routes.ts`: menu/rutas protegidas dentro del layout principal.
- `src/app/shared/services/interceptor/http.interceptor.ts`: headers multi-tenant hacia backend Katuq.
- `src/environments/environment.ts` y `src/environments/environment.prod.ts`: URLs de backend, KAI, ADK y Firebase.

## Autenticacion y multi-tenant

El estado de sesion vive principalmente en `localStorage`:

- `user`: token JWT, `company`, `nit`, `email`, `authorizationCode`, `rol`, menu autorizado.
- `currentCompany`: empresa activa usada por vistas y servicios.
- `authorizedMenuItems`: paths permitidos para filtrar sidebar.
- `warehouse` y `carrito`: usados por ventas/POS.

`HttpInterceptor2` solo agrega headers a URLs conocidas del backend Katuq (`api.katuq.com`, `back.katuq.com`, `localhost:3300`, etc.). Si un servicio apunta a otra URL, no recibe automaticamente `Authorization`, `company`, `user`, `usage-code` ni `email`.

Ojo: el interceptor actual no hace logout automatico en 401/403. Muestra un warning de suscripcion salvo rutas publicas. No asumir el comportamiento documentado antiguo sin revisar este archivo.

## Servicios base y HTTP

El servicio correcto para nuevos servicios de dominio es:

- `src/app/shared/services/base.service.ts`

Este usa `environment.urlApi`.

Existe tambien:

- `src/app/shared/services/BaseService.ts`

Este usa `environment.apiUrl`. Es una duplicacion peligrosa por nombre/capitalizacion. Antes de importar `BaseService`, verificar que sea `../base.service` o la ruta esperada. Evitar extender el archivo con mayuscula salvo que el modulo existente ya lo haga.

`ServiciosService` sigue siendo legacy y contiene muchas operaciones viejas. No extenderlo para codigo nuevo si se puede usar `BaseService`.

## Rutas y guards

Rutas publicas/top-level relevantes:

- `/login`
- `/nuevo-registro`
- `/payment-callback`
- `/terms-conditions`
- `/privacy-policy`
- `/subscription-callback`
- `/video-agent`
- `/servicios/agendamiento`

Rutas protegidas principales:

- Layout principal: `ContentComponent` con `AdminGuard`, y luego cada ruta hija normalmente con `AuthGuard`.
- Premium: `SubscriptionGuard` + `data: { requiresPremium: true }` en produccion, live-audio y agent-builder.
- Superadmin: `AdminGuard`.

Revisar siempre los guards en `src/app/shared/guards` y `src/app/shared/guard`, porque existen carpetas con nombres casi iguales.

## Modulos de alto impacto

### Ventas

Archivos calientes:

- `src/app/components/ventas/crear-ventas/crear-ventas.component.ts` (~4.8k lineas)
- `src/app/components/ventas/list/list.component.ts` (~9.5k lineas)
- `src/app/shared/services/ventas/ventas.service.ts`
- `src/app/shared/services/ventas/payment.service.ts`
- `src/app/components/ventas/service/pedidos.util.service.ts`
- `src/app/components/ventas/modelo/pedido.ts`

Flujo mental:

1. Catalogo: `catalogo/ecomerce-products`.
2. Carrito: `carrito`.
3. Checkout: `checkout`.
4. Entrega/facturacion: `entrega`, `facturacion`.
5. Creacion: `VentasService.createOrder({ order, emailHtml })` -> `/v1/orders/create`.
6. Post-creacion: notificaciones, uso de suscripcion, posible facturacion electronica.

No tocar calculos de precio sin revisar:

- `_calculadoEnBackend`
- `_precioManualOverride`
- `precioUnitarioIva`, que es porcentaje como string en varios flujos.
- `payment.service.ts`, `checkout.component.ts`, `pedidos.util.service.ts` y vistas de lista.

Regla practica: si el backend ya marco `_calculadoEnBackend`, la UI debe evitar recalcular totales salvo que el flujo explicitamente lo pida.

### POS

Hay al menos tres zonas:

- `src/app/components/pos`
- `src/app/components/pos-v2`
- `src/app/components/ventas/pos2`

No asumir que un fix en una cubre las otras. Buscar por endpoint, modelo o metodo antes de editar.

Para POS, `bodegaId` debe ser el business code (`idBodega`), no el doc ID de Firestore.

### Inventario

Archivos/frentes:

- `src/app/shared/services/inventarios/inventario.service.ts`
- `src/app/components/inventarios/*`
- Documentacion de fulfillment: `docs/documentacion/FULFILLMENT_SALES_FLOW.md`

Invariantes criticas:

- `inventory.idBodega` e `inventoryMovement.idBodega` usan business code (`BOD-001`), nunca Firestore doc ID.
- En lecturas agregadas de inventory puede haber doble registro legacy para el mismo producto+bodega: uno por doc ID y otro por referencia. Normalizar `productoId` con mapa referencia -> docId y deduplicar por `${normalizedId}_${idBodega}`.
- No cambiar `inventoryService.js` del backend sin trazar POS, ventas, fulfillment y Shopify. Este repo frontend solo expone llamadas, pero los nombres de parametros pueden romper backend.

### Integraciones y facturacion

Archivo caliente:

- `src/app/components/integrations/integrations.service.ts` (~1.5k lineas)

Integra SIIGO, World Office, Osmosis/fulfillment, validaciones, webhooks y master data. Antes de cambiar endpoints, buscar todos los usos en componentes de integraciones y ventas.

### Despachos y fulfillment

Katuq es el sistema maestro. Aliaddo/fulfillment es proveedor fisico de stock, no dueño de ordenes, estados ni despacho. Venta, produccion, empaque, transportadora, tracking y notificaciones siguen en Katuq.

`formaEntrega` en despachos debe salir de:

```ts
carrito[0].configuracion.datosEntrega.formaEntrega
```

Mantener sincronizado `pedido.formaEntrega` solo como campo derivado/compatibilidad cuando el flujo existente lo haga.

### AI, tools y agentes

Archivos clave:

- `src/app/shared/services/tools/tool-registry.service.ts`
- `src/app/shared/services/tools/default-tool-adapter.service.ts`
- `src/app/shared/services/tools/tool-registrars-initializer.ts`
- `src/app/shared/services/tools/order-tools-registrar.service.ts`
- `src/app/shared/services/voice-agent.service.ts`
- `src/app/modules/agent-builder/*`
- `src/app/modules/video-agent/*`
- `src/app/components/flows/*`

`AppModule` registra `TOOL_ADAPTER` con `DefaultToolAdapterService` y registra `OrderToolsRegistrarService`. `SalesToolsRegistrarService` esta comentado. Si faltan tools, revisar primero providers en `app.module.ts`.

Agent Builder usa ADK/AG-UI (`agentBuilderApi`, `agentBuilderWs`) y video/voice puede usar KAI/Genkit via WebSocket. No mezclar Genkit y ADK en el mismo flujo sin una razon explicita.

## Maestros e inicializacion

`AuthService` llama `InitializationService.initializeAppServices()` tras login. Ese servicio importa dinamicamente `PedidosUtilService` y llama `initializeMaestros()`.

`PedidosUtilService`:

- carga maestros para venta;
- cachea por empresa;
- mantiene carrito en `localStorage`;
- hace warmup de formas de pago, generos y ocasiones;
- tiene auto-reload cada 5 minutos.

Si un bug aparece "solo despues de login" o "al refrescar", revisar el orden entre `currentCompany`, `InitializationService`, `PedidosUtilService` y componentes de ventas.

## UI y estilos

Stack visual:

- Bootstrap 5
- PrimeNG 14
- ng-bootstrap
- SweetAlert2
- ngx-toastr
- Feather Icons, PrimeIcons, Font Awesome

Convencion local importante: stats/cards deben ser planos, con `border-left` como acento. Evitar gradientes en cards/stats. Antes de agregar estilo nuevo, buscar SCSS cercano.

## Riesgos tecnicos observados

- Componentes gigantes: `ventas/list` y `crear-ventas` concentran demasiada logica. Ediciones ahi deben ser quirurgicas y con busquedas amplias.
- Duplicacion de servicios y carpetas: `guard` vs `guards`, `BaseService.ts` vs `base.service.ts`, POS en varias rutas.
- Hay bastantes `console.log` en servicios/componentes, aunque la regla arquitectonica pide evitar telemetria por consola. Para nuevos cambios, preferir notificaciones controladas o auditoria estructurada si existe.
- Algunos servicios usan `HttpClient` directo. En componentes nuevos, no hacerlo; crear/usar servicio para conservar headers del interceptor.
- `urlPermitidas` se manda como header `Access-Control-Allow-Origin`, aunque ese header normalmente es de respuesta. No cambiarlo incidentalmente porque puede haber backend esperando ese valor.
- `environment.prod.ts` usa `https://api.katuq.com`, mientras parte de la documentacion antigua menciona `back.katuq.com`.

## Checklist antes de modificar

1. Revisar `AGENTS.md` y el `CLAUDE.md` mas cercano al archivo que se va a tocar.
2. Buscar usos con `rg` por metodo, endpoint, campo de modelo y template.
3. Si toca ventas, revisar `pedido.ts`, `payment.service.ts`, `VentasService` y el componente afectado.
4. Si toca inventario/bodegas, confirmar si el ID esperado es `idBodega` business code o doc ID.
5. Si toca AI/tools, revisar providers en `app.module.ts` y environment correspondiente.
6. Si toca rutas/menu, revisar `app-routing.module.ts`, `shared/routes/routes.ts` y `NavService`.
7. No correr `build:prod` salvo que se acepte modificar version.

## Comandos de exploracion preferidos

```bash
rg -n "texto" src/app
rg --files src/app/components/ventas
find src/app -maxdepth 2 -type d | sort
wc -l archivo.ts
git status --short --branch
```

## Documentos locales utiles

- `AGENTS.md`: reglas vivas para Codex en este repo.
- `CLAUDE.md`: guia amplia previa del sistema.
- `docs/documentacion/FULFILLMENT_SALES_FLOW.md`: criterio de Katuq como sistema maestro frente a fulfillment.
- `docs/design/productos-paginacion-server-side.md`: contexto de paginacion de productos.
- `docs/documentacion/modulos/agent-builder/README.md`: contexto de Agent Builder.
- `src/app/shared/services/ventas/CLAUDE.md`: contexto especifico de ventas si se toca esa capa.
- `src/app/components/ventas/list/CLAUDE.md`: contexto especifico para lista de ventas.
- `src/app/components/ventas/crear-ventas/CLAUDE.md`: contexto especifico para creacion de ventas.

## Principio operativo

Este sistema tiene mucha logica de negocio historica y varios flujos paralelos. La forma segura de trabajar es seguir el dato completo: localStorage -> servicio Angular -> interceptor -> endpoint -> modelo -> template. Evitar fixes por intuicion en ventas, inventario, facturacion e AI.
