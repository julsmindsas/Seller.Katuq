## 1. Medición (solo lectura, antes de tocar código)

- [ ] 1.1 Script `functions/scripts/dropshipping-cifrar-claves.js` en modo `--dry-run` (predeterminado): por empresa, cuenta proveedores y órdenes, los que no tienen `company`, y claves en texto plano o ya cifradas. No escribe nada.
- [ ] 1.2 Ejecutarlo en producción, registrar el resultado en `specs/CONTRACT.md` (D-403) y, si hay registros sin empresa o un consumidor de plataforma, parar y preguntarle a Daniel.
- [ ] 1.3 Buscar en el front y en el backend quién llama a `/v1/dropshipping/*` y confirmar que ninguna pantalla de plataforma espera ver datos de varias empresas.

## 2. Backend fase 1: candado de empresa y claves (rama `backend-aws-security`)

- [ ] 2.1 Prueba de contrato `tests/dropshipping/tenantIsolation.contract.test.js` (falla antes del arreglo): sesión de A y documentos de B en cada ruta de proveedores, órdenes y resumen; nada de B sale ni cambia.
- [ ] 2.2 Prueba `tests/dropshipping/apiKeyMasking.test.js`: la clave se guarda cifrada, nunca sale completa y una clave enmascarada o vacía no pisa la guardada.
- [ ] 2.3 `utils/dropshippingTenant.js` (`tenantDe`, `docDeLaEmpresa`).
- [ ] 2.4 `controllers/dropshippingProveedores.js`: listas y búsqueda con filtro obligatorio, rutas por id con `docDeLaEmpresa` (404), `create` con la empresa del JWT, cifrado al guardar y `presentarProveedor` en toda respuesta.
- [ ] 2.5 `controllers/dropshippingOrdenes.js`: lo mismo en las listas, por id, por proveedor, por estado, resumen, `create`, `crearDesdeVenta` y `sincronizarProductos`.
- [ ] 2.6 Modo real del script de 1.1 (`--apply`): cifra las claves en texto plano, es idempotente y solo toca `api_config.api_key`.
- [ ] 2.7 `node --check`, suites de `tests/dropshipping/` y `tests/enVivo/` en verde; commit; desplegar a EC2 (`set -e`, HEAD verificado, `pm2 restart katuq-api`); ejecutar el script con `--apply` y registrar el resultado.

## 3. Backend fase 2: configuración de la empresa

- [ ] 3.1 Verificar qué respuesta llena `currentCompany` en el front y si trae los campos de primer nivel de `companies`. Registrar el resultado en el design; si no los trae, `nav.service` usa `GET dropshipping-settings`.
- [ ] 3.2 Pruebas `tests/dropshipping/settings.test.js`: valores por defecto, rangos, rol, plan, empresa ajena (403), `fechaActivacion` solo al prender, y que `editCompany`/`updateCompanyById` no pisan `dropshipping`.
- [ ] 3.3 `controllers/companies.js`: `getDropshippingSettings` y `setDropshippingSettings`, siguiendo el molde de pricing-mode.
- [ ] 3.4 `routers/companies.js`: las dos rutas, antes de `/:id`, con `auth`, `requireJwtTenant` y, en el POST, `ONLY_ADMIN` y `requireSubscriptionFeature('dropshipping')`.
- [ ] 3.5 `editCompany` y `updateCompanyById` quitan `dropshipping` del payload.
- [ ] 3.6 Suites en verde, commit y despliegue igual que en 2.7.

## 4. Front (rama `feature/venta-asistida-mejorada`)

- [ ] 4.1 `DropshippingSettingsService extends BaseService` (`obtener`, `guardar`).
- [ ] 4.2 `nav.service.isDropshippingEnabled` lee `currentCompany.dropshipping?.habilitado === true`, más un método para refrescar el menú después de guardar.
- [ ] 4.3 `crear-productos`: usa el método de `nav.service` y quita su copia de `isDropshippingEnabled` y el "habilitar temporalmente para pruebas". El producto se guarda igual; se revisa el diff antes de seguir.
- [ ] 4.4 `dropshipping-config`:
  - carga y guarda por el servicio, sin `setTimeout`;
  - al guardar, actualiza `currentCompany` y el menú;
  - migración de la copia local con el aviso;
  - se quitan la sección de integración, el webhook, la clave y las herramientas de desarrollo;
  - aviso con enlace a Proveedores;
  - base `cfg-*` y reglas de diseño de AGENTS.md.
- [ ] 4.5 `proveedores.service.ts` y las pantallas de proveedor: muestran la clave enmascarada y `tiene_api_key`, y al editar no reenvían la enmascarada como clave nueva.
- [ ] 4.6 `ng build --configuration production` sin errores.

## 5. Cierre

- [ ] 5.1 `git pull`, publicar el front (versión mayor a la viva, `verify-dist-prod`) y commitear `version.json`.
- [ ] 5.2 Prueba en el navegador con la sesión de Daniel en FLORECER:
  - habilitar y guardar;
  - el menú aparece;
  - en otra ventana o perfil se ve lo mismo;
  - la creación de producto ofrece dropshipping;
  - deshabilitar lo oculta;
  - la lista de proveedores muestra solo los de FLORECER y sin claves.
- [ ] 5.3 `openspec validate dropshipping-config-servidor --strict`, cierre en `specs/CONTRACT.md` y aviso a Daniel con la lista de empresas que tenían proveedores.
