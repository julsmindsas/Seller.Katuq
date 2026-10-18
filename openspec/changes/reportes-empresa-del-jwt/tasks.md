Todo el código vive en `katuq_admin_back_firebase/functions`. El front no cambia. No toca pedidos, inventario ni consecutivos, pero cada grupo se aplica con diff y aprobación antes de pasar al siguiente.

## 0. Antes de tocar código

- [ ] 0.1 Reservar D-484 en `specs/CONTRACT.md` con el alcance de `proposal.md`, y anotar que D-483 (tarea 6.1) depende de este cambio
- [ ] 0.2 Leer completos `routers/reports.js`, `routers/companies.js`, `middleware/tenant.js`, `middleware/companyAccess.js`, `controllers/platformOverview.js`, `controllers/billingOverview.js`, `controllers/pedidosExcluidos.js` y las funciones `getCompanies`, `getBrandKit`, `setBrandKit`, `cambiarEstadoCiclo` y `getHistorialEstado` de `controllers/companies.js`
- [ ] 0.3 Repetir la búsqueda de consumidores de `/v1/reports`, `/v1/companies/overview`, `/billing-overview`, `/estado-ciclo`, `/all` y `/brand-kit` con `x-api-key` en el backend, `KAI/kai`, las apps móviles y `katuq_support`. Si aparece alguno, parar y avisar

## 1. Auditoría de solo lectura (primero, con --dry-run)

- [ ] 1.1 Escribir `scripts/auditar-cruce-empresas-reportes.js`, de solo lectura y con `--dry-run` por defecto. Debe listar:
  - reportes con `ownerEmail` de otra empresa, marcando públicos y `reportPublicIndex`;
  - `brandKit.updatedBy` de otra empresa;
  - `historialEstado` con autor que no es de Julsmind.

  Correos enmascarados y sin escrituras
- [ ] 1.2 Correrlo con `--dry-run` y entregar el resultado a Daniel antes del despliegue. Lo que se haga con los hallazgos es otra decisión

## 2. Pruebas de contrato primero (deben fallar contra el código actual)

- [ ] 2.1 Crear `tests/reports/empresaDelJwt.contract.test.js` con los casos 1-12 de `design.md`. Usar `auth` y `requireJwtTenant` reales y espías sobre motor, repositorio, fuentes, `alcanceMetricas` y `admin.firestore`
- [ ] 2.2 Crear `tests/companies/candadoPlataforma.test.js` con los casos 1-5 de `design.md`, incluido el de `estado-ciclo` con `body.companyId` de otra empresa
- [ ] 2.3 Reescribir `tests/platformMetrics/accessLock.test.js` para que el candado se pruebe con `req.userInfo.company`, y que una cabecera "Julsmind" con JWT de un comercio dé 403 antes de tocar Firestore
- [ ] 2.4 Agregar `test:reportes-empresa-jwt` a `package.json` y sumar `candadoPlataforma` a `test:company-access`. Confirmar que las pruebas nuevas fallan antes de los cambios

## 3. Auditoría de rechazos (tarea separable)

- [ ] 3.1 En `middleware/tenant.js`, registrar cada rechazo de `requireJwtTenant` en `audit_log_access` sin esperar respuesta: método, ruta, código, origen, empresa pedida, correo del JWT, IP y hora. Nunca el token. Una falla no cambia la respuesta
- [ ] 3.2 Prueba: un rechazo escribe la entrada sin `authorization`, y una auditoría que falla deja el mismo 403
- [ ] 3.3 Correr las suites que ya usan `requireJwtTenant` (`test:company-access`, `test:soporte-proyectos`, `test:independientes` y los contratos de despachos y opttiaPropuestas): ninguna cambia de resultado

## 4. Reportes: empresa del JWT

- [ ] 4.1 En `routers/reports.js`, agregar `requireJwtTenant` después de `auth` en las 9 rutas con sesión y borrar `getCompany`. Los handlers usan `req.tenant`. Las rutas `/public/*` no se tocan
- [ ] 4.2 `GET /list`: visibilidad con `req.userInfo.email` y `req.userInfo.role || req.userInfo.rol`
- [ ] 4.3 Correr `test:reportes-empresa-jwt` y `tests/reports/baseFilters.test.js` en verde, y `node --check` sobre los archivos tocados

## 5. Consola de plataforma: candado por el JWT

- [ ] 5.1 En `middleware/companyAccess.js`, exportar `esSesionDePlataforma(req)` y `requirePlatformTenant`: 403 `TENANT_NOT_IN_JWT` o `PLATFORM_ONLY`, con auditoría igual a 3.1
- [ ] 5.2 En `routers/companies.js`:
  - `/overview` y `/billing-overview`: `auth, requireJwtTenant, requirePlatformTenant`;
  - `/:id/historial-estado` y `/:id/pedidos-excluidos`: sumar `requirePlatformTenant`;
  - `/estado-ciclo`: `auth, requirePlatformTenant, ONLY_ADMIN`, sin `requireJwtTenant`
- [ ] 5.3 Cambiar la comparación con la cabecera por `esSesionDePlataforma(req)` en `platformOverview.js:156-158`, `billingOverview.js:254-256`, `companies.js:2281`, `companies.js:2399` y `pedidosExcluidos.js:78`
- [ ] 5.4 Correr `test:company-access`, `test:platform-overview` y `test:ciclo-vida` en verde

## 6. `/all` y `/brand-kit`: empresa del JWT

- [ ] 6.1 Agregar `requireJwtTenant` a `GET /all`, `GET /brand-kit` y `PUT /brand-kit`. En `getBrandKit` y `setBrandKit`, cambiar la cabecera por `req.tenant`. En `getCompanies`, cambiar la comparación por `esSesionDePlataforma(req)`
- [ ] 6.2 Correr `test:company-access` y `test:sitios-listo` en verde

## 7. Cierre y despliegue (con aprobación de Daniel)

- [ ] 7.1 Correr completas todas las suites nombradas arriba y revisar el diff entero: solo los archivos listados en `proposal.md`
- [ ] 7.2 Desplegar el backend por el procedimiento habitual. El front no se publica
- [ ] 7.3 Verificar con cuentas reales, sin pruebas de ataque:
  - comercio: Dashboards (correr, listar, guardar, editar y borrar un reporte de prueba), crear usuario con vendedores WO y kit de marca en Sitios;
  - Julsmind: panorama, cobros, historial y un cambio de estado de ida y vuelta en FLORECER
- [ ] 7.4 Revisar `audit_log_access` a las 24 y a las 48 h. Si una pantalla real recibe rechazos, revertir el commit y analizar
- [ ] 7.5 Bitácora en `specs/CONTRACT.md` (D-484 aprobada y desplegada, commit del backend). Abrir los cambios aparte de los hallazgos adicionales de `design.md`, empezando por `/edit`, `/delete`, `/changeStatus`, `/updateAuthorizationCodes` y `POST /v1/analiticas/data`
