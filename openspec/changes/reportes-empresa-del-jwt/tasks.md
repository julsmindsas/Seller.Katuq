Todo el código vive en `katuq_admin_back_firebase/functions`. El front no cambia. No toca pedidos, inventario ni consecutivos, pero cada grupo se aplica con diff y aprobación antes de pasar al siguiente.

## 0. Antes de tocar código

- [x] 0.1 Reservar D-484 en `specs/CONTRACT.md` con el alcance de `proposal.md`, y anotar que D-483 (tarea 6.1) depende de este cambio
  - Resultado: ya estaba reservada y aprobada en `specs/CONTRACT.md` (entrada D-484 del 17-oct, aprobada el 23-oct; D-483 la cita). No se editó `CONTRACT.md`: tiene cambios sin commitear de otras sesiones.
- [x] 0.2 Leer completos `routers/reports.js`, `routers/companies.js`, `middleware/tenant.js`, `middleware/companyAccess.js`, `controllers/platformOverview.js`, `controllers/billingOverview.js`, `controllers/pedidosExcluidos.js` y las funciones `getCompanies`, `getBrandKit`, `setBrandKit`, `cambiarEstadoCiclo` y `getHistorialEstado` de `controllers/companies.js`
  - Resultado: leídos. El arreglo urgente 03aae0fe ya había creado `requirePlatformTenant` (código `SOLO_PLATAFORMA`) y lo había puesto en `/estado-ciclo`.
- [x] 0.3 Repetir la búsqueda de consumidores de `/v1/reports`, `/v1/companies/overview`, `/billing-overview`, `/estado-ciclo`, `/all` y `/brand-kit` con `x-api-key` en el backend, `KAI/kai`, las apps móviles y `katuq_support`. Si aparece alguno, parar y avisar
  - Resultado: cero consumidores con `x-api-key` en el backend, `KAI/kai` (el ADK lee reportes directo de Firestore o por MCP), iOS, Android y `katuq_support`.

## 1. Auditoría de solo lectura (primero, con --dry-run)

- [x] 1.1 Escribir `scripts/auditar-cruce-empresas-reportes.js`, de solo lectura y con `--dry-run` por defecto. Debe listar:
  - reportes con `ownerEmail` de otra empresa, marcando públicos y `reportPublicIndex`;
  - `brandKit.updatedBy` de otra empresa;
  - `historialEstado` con autor que no es de Julsmind.

  Correos enmascarados y sin escrituras
  - Resultado: `functions/scripts/auditar-cruce-empresas-reportes.js`, sin modo de escritura (`--apply` sale con error). Prueba `tests/reports/auditoriaCruceEmpresas.test.js` con base falsa que revienta ante cualquier escritura.
- [x] 1.2 Correrlo con `--dry-run` y entregar el resultado a Daniel antes del despliegue. Lo que se haga con los hallazgos es otra decisión
  - Resultado (23-oct, solo lectura): 23 reportes en 5 empresas, 7 públicos; **0** públicos y 0 privados de una empresa distinta a la de su dueño; 7 privados sin dueño o con dueño desconocido. Índice público: 7 entradas, todas coherentes. Kit de marca: 1 empresa, escrito por la misma. Historial de estados: 7 entradas, todas de Julsmind. Repetido y confirmado igual en la revisión final (23-oct); el resultado va a Daniel en el reporte de la sesión.

## 2. Pruebas de contrato primero (deben fallar contra el código actual)

- [x] 2.1 Crear `tests/reports/empresaDelJwt.contract.test.js` con los casos 1-12 de `design.md`. Usar `auth` y `requireJwtTenant` reales y espías sobre motor, repositorio, fuentes, `alcanceMetricas` y `admin.firestore`
  - Resultado: 14 casos (1-12 más 8b, visibilidad sin mayúsculas). Rojo contra el código anterior: «GET /sources con la cabecera de otra empresa respondió 200».
- [x] 2.2 Crear `tests/companies/candadoPlataforma.test.js` con los casos 1-5 de `design.md`, incluido el de `estado-ciclo` con `body.companyId` de otra empresa
  - Resultado: 11 casos, incluidos Julsmind suspendiendo a otra empresa por `body.companyId` y los candados completos de la consola. Rojo antes: el panorama respondía 200 a un comercio con cabecera Julsmind.
- [x] 2.3 Reescribir `tests/platformMetrics/accessLock.test.js` para que el candado se pruebe con `req.userInfo.company`, y que una cabecera "Julsmind" con JWT de un comercio dé 403 antes de tocar Firestore
  - Resultado: reescrita; rojo antes (500 en vez de 403), verde después.
- [x] 2.4 Agregar `test:reportes-empresa-jwt` a `package.json` y sumar `candadoPlataforma` a `test:company-access`. Confirmar que las pruebas nuevas fallan antes de los cambios
  - Resultado: `test:reportes-empresa-jwt` nuevo; `test:company-access` suma `rutasDePlataforma` y `candadoPlataforma`. Ambos en rojo antes de los cambios.

## 3. Auditoría de rechazos (tarea separable)

- [x] 3.1 En `middleware/tenant.js`, registrar cada rechazo de `requireJwtTenant` en `audit_log_access` sin esperar respuesta: método, ruta, código, origen, empresa pedida, correo del JWT, IP y hora. Nunca el token. Una falla no cambia la respuesta
  - Resultado: `registrarRechazo` y `_usarRegistro` (solo pruebas) en `middleware/tenant.js`; ruta sin query string; campos `code`, `source`, `requestedCompany`, `sessionCompany`, `email`, `ip`; sin token.
- [x] 3.2 Prueba: un rechazo escribe la entrada sin `authorization`, y una auditoría que falla deja el mismo 403
  - Resultado: casos 11a y 11b de `empresaDelJwt` (registro que lanza y que rechaza: mismo 403).
- [x] 3.3 Correr las suites que ya usan `requireJwtTenant` (`test:company-access`, `test:soporte-proyectos`, `test:independientes` y los contratos de despachos y opttiaPropuestas): ninguna cambia de resultado
  - Resultado: 93 archivos relacionados antes y después: ningún resultado cambia salvo `accessLock` (rojo→verde). Fallan igual que antes, sin relación: `soloLectura` (rutas POST sin clasificar), `dropshipping/settings` y `orders/correoConfirmacionPedido` (de otra sesión). Las pruebas que inician una app con proyecto falso ahora intentan el registro y fallan en silencio, como ya hace `requireRole`; `rutasDePlataforma` lo reemplaza y comprueba el registro.

## 4. Reportes: empresa del JWT

- [x] 4.1 En `routers/reports.js`, agregar `requireJwtTenant` después de `auth` en las 9 rutas con sesión y borrar `getCompany`. Los handlers usan `req.tenant`. Las rutas `/public/*` no se tocan
  - Resultado: las 9 rutas con `auth, requireJwtTenant` y `req.tenant`; `getCompany` borrado. Además, `/query` ya no usa la cabecera `email` de respaldo para el filtro del vendedor (el JWT siempre trae correo).
- [x] 4.2 `GET /list`: visibilidad con `req.userInfo.email` y `req.userInfo.role || req.userInfo.rol`
  - Resultado: hecho. Desvío necesario: el login guarda el correo del JWT en minúsculas y `ownerEmail` lleva las mayúsculas del registro, así que `isVisibleToUser` (`reports.repository.js`) compara el correo sin mayúsculas para que nadie deje de ver sus reportes. También lo usa `list_katuq_reports` del MCP: solo puede mostrar más de lo propio, nunca menos.
- [x] 4.3 Correr `test:reportes-empresa-jwt` y `tests/reports/baseFilters.test.js` en verde, y `node --check` sobre los archivos tocados
  - Resultado: `test:reportes-empresa-jwt` en verde (14 + 8 + baseFilters) y `node --check` sobre todos los archivos tocados.

## 5. Consola de plataforma: candado por el JWT

- [x] 5.1 En `middleware/companyAccess.js`, exportar `esSesionDePlataforma(req)` y `requirePlatformTenant`: 403 `TENANT_NOT_IN_JWT` o `PLATFORM_ONLY`, con auditoría igual a 3.1
  - Resultado: `esSesionDePlataforma` exportada y auditoría en `requirePlatformTenant`. Desvío: se conserva el código `SOLO_PLATAFORMA` (ya en producción desde 03aae0fe y usado en `/v1/pauta`) en vez de `PLATFORM_ONLY`; el front no lo lee.
- [x] 5.2 En `routers/companies.js`:
  - `/overview` y `/billing-overview`: `auth, requireJwtTenant, requirePlatformTenant`;
  - `/:id/historial-estado` y `/:id/pedidos-excluidos`: sumar `requirePlatformTenant`;
  - `/estado-ciclo`: `auth, requirePlatformTenant, ONLY_ADMIN`, sin `requireJwtTenant`
  - Resultado: hecho. `/estado-ciclo` ya tenía `auth, ONLY_ADMIN, requirePlatformTenant` desde 03aae0fe; se deja ese orden.
- [x] 5.3 Cambiar la comparación con la cabecera por `esSesionDePlataforma(req)` en `platformOverview.js:156-158`, `billingOverview.js:254-256`, `companies.js:2281`, `companies.js:2399` y `pedidosExcluidos.js:78`
  - Resultado: los cinco controladores usan `esSesionDePlataforma(req)`; se borraron las constantes sin uso.
- [x] 5.4 Correr `test:company-access`, `test:platform-overview` y `test:ciclo-vida` en verde
  - Resultado: `test:company-access` y `test:platform-overview` en verde. `test:ciclo-vida` falla solo por `soloLectura.test.js`, que ya fallaba antes por rutas POST sin clasificar en `accounting.js`/`logistica.js`.

## 6. `/all` y `/brand-kit`: empresa del JWT

- [x] 6.1 Agregar `requireJwtTenant` a `GET /all`, `GET /brand-kit` y `PUT /brand-kit`. En `getBrandKit` y `setBrandKit`, cambiar la cabecera por `req.tenant`. En `getCompanies`, cambiar la comparación por `esSesionDePlataforma(req)`
  - Resultado: hecho. Si falta `req.tenant`, `getBrandKit`/`setBrandKit` responden 403 `TENANT_NOT_IN_JWT` en vez de 400 (es inalcanzable con el middleware).
- [x] 6.2 Correr `test:company-access` y `test:sitios-listo` en verde
  - Resultado: `test:company-access` y `test:sitios-listo` en verde.

## 7. Cierre y despliegue (con aprobación de Daniel)

- [x] 7.1 Correr completas todas las suites nombradas arriba y revisar el diff entero: solo los archivos listados en `proposal.md`
  - Resultado (sin commit): backend `middleware/tenant.js`, `middleware/companyAccess.js`, `routers/reports.js`, `routers/companies.js`, `controllers/{platformOverview,billingOverview,pedidosExcluidos,companies}.js`, `services/reports/persistence/reports.repository.js`, `package.json`, `scripts/auditar-cruce-empresas-reportes.js` y 5 pruebas. No se corrieron `tests/mcp/*KatuqReport*`: usan `serviceAccountKey.json` contra Firestore real y `create` escribe.
  - Revisión final (23-oct): `test:reportes-empresa-jwt`, `test:company-access`, `test:platform-overview`, `test:sitios-listo`, `test:soporte-proyectos` e `test:independientes` en verde; `test:ciclo-vida` solo falla `soloLectura` (rutas POST de `accounting.js`/`logistica.js`, previo y ajeno). `services/orderCalculationService.js` (D-543, `priceChange`) es de otra sesión y no pertenece a este cambio.
- [ ] 7.2 (pendiente de Daniel: despliegue) Desplegar el backend por el procedimiento habitual. El front no se publica
- [ ] 7.3 Verificar con cuentas reales, sin pruebas de ataque:
  - comercio: Dashboards (correr, listar, guardar, editar y borrar un reporte de prueba), crear usuario con vendedores WO y kit de marca en Sitios;
  - Julsmind: panorama, cobros, historial y un cambio de estado de ida y vuelta en FLORECER
- [ ] 7.4 Revisar `audit_log_access` a las 24 y a las 48 h. Si una pantalla real recibe rechazos, revertir el commit y analizar
- [ ] 7.5 Bitácora en `specs/CONTRACT.md` (D-484 aprobada y desplegada, commit del backend). Abrir los cambios aparte de los hallazgos adicionales de `design.md`, empezando por `/edit`, `/delete`, `/changeStatus`, `/updateAuthorizationCodes` y `POST /v1/analiticas/data`
