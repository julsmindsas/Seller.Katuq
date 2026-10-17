# Facturación electrónica en Integraciones: un proveedor por comercio, con estado y asistentes

> Ticket 1260 (FE-01). Propuesta **para aprobación; no implementar**. Toca facturación DIAN y
> consecutivos (resoluciones), que son módulos sensibles. El número D-XXX se asigna al aprobarla
> (el último usado en `specs/CONTRACT.md` es D-480).

## Why

El comercio debe configurar la facturación electrónica en un solo lugar, Configuración >
Integraciones. Ahí elige con quién factura (Katuq DIAN directa o Siigo, y más adelante Alegra y
World Office), ve si la conexión funciona y puede cambiar de proveedor sin perder lo ya emitido.

Hoy (leído en el código el 2026-10-17, sin consultar Firestore):

- **La configuración DIAN ya está en Integraciones.** El asistente de 5 pasos (Comercio, Firma
  digital, Rango, Revisar, Activar) vive en `integrations.component.ts` (`createDianForm`,
  `dianSteps`, `submitDianHabilitation`) y abre en `/integrations/configure?provider=dian`.
  La pantalla operativa `facturacion-electronica.component.ts` no tiene campos de configuración.
  Muestra el ambiente y el estado, y lleva al asistente con `goToConfiguration()`. El compositor
  muestra "próximo número" leído de `config.numbering`.
- **Dónde se guarda.** `integration_configs/{empresa}_dian` guarda el emisor, el ambiente, `numbering`,
  `noteNumbering` y `fileSequence`. Certificado, contraseña, Software ID, PIN, clave técnica y
  TestSetId van cifrados en `integration_secrets` (esquema `dian` de
  `services/integrationConfigService.js`). Al navegador solo llegan banderas de presencia
  (`storedSecrets`), nunca los valores.
- **El consecutivo vive en el mismo documento de configuración.** `services/accounting/dian/numbering.js`
  avanza en transacción `config.numbering.current`, las notas y los consecutivos de archivo.
  `integrations/configUpdatePolicy.js` impide retroceder la numeración y pide clave técnica nueva
  al cambiar de resolución. `billing/membershipInvoicing.js` (membresía de Katuq, D-272) y
  `dianXMLProvider.js` leen ese documento por id.
- **Hay una sola resolución.** `config.numbering` es un objeto, no una lista.
- **No existe un "proveedor elegido".** El front usa el primero configurado en orden fijo
  DIAN → Siigo → World Office (`ORDEN_PROVEEDORES` en `facturacion-automatica.util.ts`;
  `checkInvoicingIntegration` en `ventas/list/list.component.ts`). La factura automática al
  aprobar el pago solo mira Siigo (`controllers/orders.js`, bloque "FACTURACIÓN AUTOMÁTICA SIIGO").
  No hay proveedor por tipo de documento.
- **Cada pedido ya guarda con quién se facturó**: `facturacionElectronica.provider`, y el historial
  queda en `facturasReemplazadas` y `facturasAnuladas` (`accountingManager.createInvoiceFromOrder`).
  Una nota DIAN exige que la factura original sea `provider: 'dian'` (`createDianNote`).
- **Tarjetas.** El grupo "¿Cómo facturas?" de `integrations-directorio.ts` muestra SIIGO, World
  Office y "Factura electrónica DIAN" por separado, y Alegra como "Próximamente". Para estas
  tarjetas `estadoTarjeta` solo distingue "Conectado" y "Sin conectar". Una DIAN en pruebas
  aparece "Conectado" y no hay estado "con error".
- **Siigo se configura en dos sitios**: el modal genérico (`case 'siigo'`) y `/integrations/siigo`
  (`siigo-config.component`: credenciales, tipo de documento, centro de costo, bodega, cuentas,
  facturación automática).
- **Conectores.** `accountingManager.js` carga estrategias `providers/*Provider.js`: `siigo`,
  `world_office` y `dian`. **No hay estrategia de Alegra**, aunque el manager le tenga alias.
  `integrations/IntegrationDispatcher.js` solo registra `multiop`.
- **Permisos.** Para guardar una configuración hay que ser de la familia Administrador
  (`ONLY_ADMIN` en `routers/integrationConfig.js`). El rol Contador existe (`role-templates.ts`,
  `BOOKKEEPING_ROLES` en `routers/bookkeeping.js`), pero no puede configurar.
- **Lo que pide el ticket y no existe:** varias resoluciones; ver el vencimiento del certificado en
  el asistente (hoy solo lo calculan `validateCredentials` y los avisos de D-448); la marca del PDF
  (`dian/documentPackage.js` usa colores fijos y no tiene logo); proveedor por tipo de documento.
  El correo ya existe: `issuer.email` y `sendEmail`, que dependen del SMTP del backend
  (`emailReadiness.js`).
- Solo Julsmind emite hoy por DIAN directa en producción (D-448).

## What Changes

1. **Una tarjeta "Facturación electrónica"** en "¿Cómo facturas?", con el proveedor activo y uno de
   cuatro estados calculados en el servidor:
   - **Sin configurar:** no hay configuración activa.
   - **En pruebas:** DIAN en habilitación o Siigo en modo prueba.
   - **Con error:** certificado o resolución vencidos, rango agotado, credenciales rechazadas o
     rechazos recientes sin resolver.
   - **Conectado:** en cualquier otro caso.

   La tarjeta recibe un resumen sin secretos.
2. **Elegir proveedor** entre Katuq DIAN directa y Siigo. World Office sigue como hoy y Alegra queda
   como "Próximamente".
3. **Proveedor por tipo de documento**: factura de pedido, factura POS, factura libre y notas.
   Por omisión todos usan el proveedor elegido. Una nota crédito o débito siempre sigue al
   proveedor de la factura original. El servidor decide el proveedor en una sola función, y la
   usan venta asistida, POS, Todos los pedidos y la factura automática. El orden fijo de hoy queda
   como respaldo para las empresas sin elección guardada, así que su comportamiento no cambia.
4. **Asistente Katuq DIAN** (reordena el actual):
   - datos tributarios;
   - certificado .p12/.pfx con su fecha de vencimiento visible (se lee en el servidor y el archivo
     nunca vuelve al navegador);
   - habilitación con TestSetId y paso a producción;
   - **varias resoluciones**, cada una con prefijo, rango, vigencia y siguiente número;
   - marca del PDF (logo y color);
   - correo;
   - historial técnico (`dian_documents` y `config_audit`).
5. **Asistente Siigo** que une el modal y `/integrations/siigo`, con los mismos campos y el mismo
   almacenamiento.
6. **Permisos:** solo Administrador o Contador configuran. Los demás ven el estado, pero no los
   datos tributarios, el certificado ni las credenciales. El servidor lo exige y la pantalla lo
   refleja.
7. **Cambiar de proveedor sin borrar.** Cambiar de proveedor solo cambia la elección. La
   configuración anterior y sus documentos se conservan, cada documento con su proveedor, y se
   puede volver atrás. El cambio se bloquea mientras haya facturas en proceso
   (`facturacionEnProceso`).
8. **Pantalla operativa:** solo estado y "Ver en Integraciones" para quien tenga permiso. "Próximo
   número" sigue, ahora con su resolución.
9. **Conectores:** cada proveedor declara qué tipos de documento soporta, sus ambientes, sus campos
   y cómo se calcula su estado. Sumar Alegra o World Office será un descriptor más su estrategia,
   sin `if (provider === …)` en la UI (Artículo VI).
10. **Migración de Julsmind** con un script que primero corre en `--dry-run`:
    - elección = DIAN para todos los tipos;
    - `numbering` pasa a ser la primera resolución de la lista, con `current` idéntico;
    - los secretos no se tocan;
    - se escribe en el mismo documento, sin colección nueva.

## Capabilities

### New Capabilities
- `facturacion-proveedor`: elección de proveedor por empresa y tipo de documento, estado de la
  conexión, permisos de configuración y cambio de proveedor conservando el historial.
- `dian-resoluciones`: varias resoluciones DIAN por empresa y su consecutivo.
- `dian-marca-pdf`: logo y color de la empresa en la representación gráfica.

### Modified Capabilities
_(ninguna spec vigente en `openspec/specs/` describe facturación; la UI aplica `design-system`)_

Por el Artículo XIII se propone partir el trabajo en tres cambios:
- (a) este: tarjeta, estados, elección, permisos, asistentes, pantalla operativa y migración;
- (b) `dian-varias-resoluciones`, que toca consecutivos;
- (c) `dian-marca-pdf`.

## No-goals

- Implementar Alegra o cambiar World Office. Solo queda el espacio del conector.
- Tocar el motor de emisión (UBL, firma, SOAP, CUFE), las notas o el libro de ventas.
- Cambiar la numeración vigente de Julsmind o emitir documentos de prueba en producción.
- Mover la configuración de Siigo de otras empresas. Sin elección guardada siguen con el orden de hoy.
- Colecciones nuevas o endpoints "v2" sin aprobación explícita.
- Cola de reintentos o modo contingencia. Dependen de la idempotencia de FE-03 (#1261).
- Corregir permisos fuera de las rutas de esta función.

## Riesgos

- **Consecutivos y resoluciones.** `current` está en el documento de configuración, así que guardar
  desde el asistente puede cruzarse con una emisión. Con varias resoluciones:
  - cada una necesita su propia protección contra retroceso y su transacción;
  - no puede haber dos activas para el mismo prefijo y tipo, y no se reusan números;
  - activar otra resolución exige su clave técnica.

  Al ser un módulo sensible, se hace un cambio a la vez, con diff, aprobación y contract tests de
  numeración (Artículo VIII).
- **Certificado y credenciales nunca vuelven al navegador.** El archivo viaja una vez al subirlo y se
  cifra en `integration_secrets`. Después solo se muestran su presencia y su vencimiento. Nada de
  esto va a logs (Artículo XI). Cambiar el certificado da poder de firmar a nombre de la empresa,
  así que conviene que quede auditado en `config_audit`.
- **Migración sin cortar la emisión.**
  - Se escribe en el mismo documento y con el mismo id.
  - Los lectores (`numbering.js`, `membershipInvoicing.js`, `dianXMLProvider.js`, avisos D-448)
    aceptan la forma nueva y vuelven a `numbering` si no la encuentran.
  - El `--dry-run` muestra el diff.
  - Al aplicar, se comprueba que `current` no cambió desde el dry-run (compare-and-set), en una hora
    tranquila.
  - Se verifica con la vista previa de solo lectura antes de emitir.
- **Límite del plan.** Cada configuración activa cuenta para `maxIntegrations` (`saveConfig`).
  Guardar la elección como otra integración podría bloquear a los planes pequeños.
- **Rollback.**
  - Pantallas detrás de una bandera por empresa, con dueño y fecha de retiro (Artículo XII).
  - El backend sigue leyendo `numbering` hasta la limpieza.
  - Sin elección guardada, rige el orden fijo.
  - El script guarda la imagen previa en `config_audit` para revertir.
- **Seguridad.** Los ajustes de permisos de lectura y escritura de las rutas de configuración y
  contables se especifican en un cambio privado del backend, que es prerrequisito. No se describen
  aquí porque este repositorio es público.
- **Datos que se escriben:** `integration_configs` e `integration_secrets` de la empresa (DIAN y
  Siigo), `config_audit` y donde se guarde la elección. No se escriben pedidos, productos ni
  inventario. Los campos nuevos van en inglés (Artículo XV).
- **Diseño:** base D-400 (`_config-pagina.scss`) y `design-system` (D-131), sin gradientes.

## Preguntas para Daniel

1. ¿El Contador puede cambiar el certificado y las resoluciones, o solo ver y editar datos no
   sensibles?
2. ¿Qué tipos de documento entran: factura de pedido, POS, factura libre, notas y la membresía de
   Katuq?
3. ¿La factura automática al aprobar el pago, que hoy solo usa Siigo, debe seguir la elección? Eso
   toca `orders`.
4. Varias resoluciones: ¿activas a la vez (por sede o prefijo), o una activa y la siguiente en cola
   cuando se agote o venza?
5. ¿Partimos en los tres cambios (a), (b) y (c)?
6. ¿Dónde guardamos la elección: en un campo de la empresa o en un documento de
   `integration_configs`? Hay que tener en cuenta el límite del plan.
7. ¿Julsmind tiene también Siigo activo? No se consultó Firestore y eso define su elección inicial.
8. ¿World Office entra al selector desde ya (ya tiene estrategia) o queda como hoy?
9. ¿FE-03 (#1261, idempotencia) va antes de varias resoluciones?
