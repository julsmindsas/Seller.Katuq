# Delta: shopify-customer-type-sync

## ADDED Requirements

### Requirement: Estampado del tipo de cliente en Shopify
THE system SHALL estampar en el customer de Shopify cuyo email coincida los metafields `katuq.tipo_cliente` (nombre del tipo) y `katuq.customer_id` (docId del cliente en Katuq) cuando un cliente de una empresa con la sincronización habilitada es creado o editado y tiene email.

#### Scenario: Cliente existente en Shopify
- **GIVEN** un cliente de Katuq con email que ya existe como customer en Shopify
- **WHEN** el cliente se crea o edita en Katuq
- **THEN** el customer de Shopify queda con `katuq.tipo_cliente` = nombre del tipo actual y `katuq.customer_id` = docId del cliente, sin duplicar valores

#### Scenario: Cliente sin email
- **GIVEN** un cliente de Katuq sin email
- **WHEN** se procesa su creación o edición
- **THEN** el sistema lo omite y lo cuenta en el reporte del run, sin abortar el proceso

### Requirement: Regla única de resolución del tipo
THE system SHALL resolver el tipo del cliente con una única regla — `categoria.nombre` si existe, en su defecto `tipoCliente` — y el valor emitido SHALL ser el nombre tal cual está en el maestro de tipos de Katuq, que es la fuente de verdad.

#### Scenario: Renombre del maestro
- **GIVEN** un tipo renombrado en el maestro `tiposPrecios` del comercio
- **WHEN** el cliente se vuelve a sincronizar
- **THEN** el metafield se estampa con el nombre nuevo, sin congelar el valor anterior

#### Scenario: Doble representación en el doc de cliente
- **GIVEN** un cliente con `categoria` {id,nombre} y también un `tipoCliente` string distinto
- **WHEN** se resuelve el tipo
- **THEN** gana `categoria.nombre` y el string legacy no altera el valor emitido

### Requirement: Sobrescritura idempotente
THE system SHALL sobrescribir el valor anterior del metafield en cada actualización y SHALL NOT acumular valores ni tags.

#### Scenario: Reejecución sobre el mismo cliente
- **GIVEN** un cliente ya estampado con un tipo
- **WHEN** se vuelve a ejecutar la sincronización con el mismo tipo
- **THEN** el metafield conserva un único valor idéntico y no se crean valores adicionales

### Requirement: Creación del customer inexistente
IF no existe customer en Shopify con el email del cliente THEN THE system SHALL crearlo con identidad mínima (email + nombre del cliente en Katuq) y estamparle los metafields en la misma operación.

#### Scenario: Email sin customer en la tienda
- **GIVEN** un cliente de Katuq con email que no corresponde a ningún customer de Shopify
- **WHEN** se sincroniza
- **THEN** se crea el customer con email y nombre y queda con `katuq.tipo_cliente` y `katuq.customer_id`

### Requirement: Baja del tipo
IF el cliente pierde su tipo en Katuq (categoría vacía) THEN THE system SHALL eliminar el metafield `katuq.tipo_cliente` del customer.

#### Scenario: Cliente sin tipo
- **GIVEN** un cliente cuyo tipo se vació en Katuq
- **WHEN** se sincroniza
- **THEN** el customer de Shopify queda sin el metafield `katuq.tipo_cliente` y el storefront resuelve precio público

### Requirement: Estampado al vuelo desde la tienda
WHEN aparece un customer nuevo en Shopify (registro directo en la tienda) cuyo email coincide con un cliente existente de Katuq, THE system SHALL estamparle los metafields al recibir el evento del proveedor, sin esperar backfill ni edición manual.

#### Scenario: Registro directo con match en Katuq
- **GIVEN** un registro nuevo en la tienda con un email que existe como cliente de Katuq
- **WHEN** llega el webhook `customers/create`
- **THEN** el customer queda estampado con el tipo actual del cliente en Katuq

#### Scenario: Registro directo sin match en Katuq
- **GIVEN** un registro nuevo en la tienda cuyo email no existe en Katuq
- **WHEN** llega el webhook
- **THEN** el sistema no crea cliente en Katuq y no estampa ningún tipo inventado

### Requirement: Backfill retroactivo con reporte
WHEN se ejecuta la carga retroactiva THE system SHALL procesar todos los clientes de la empresa en modo dry-run por defecto y producir un reporte con conteos de actualizados, sin email, sin match y con error.

#### Scenario: Dry-run por defecto
- **GIVEN** una ejecución de backfill sin la bandera de escritura
- **WHEN** corre sobre la base de la empresa
- **THEN** no escribe en Shopify y reporta cuántos se actualizarían, cuántos sin email, cuántos sin match y cuántos con error

### Requirement: Resiliencia ante límites del proveedor
IF el proveedor responde rate-limit o error transitorio THEN THE system SHALL reintentar con backoff sin efectos duplicados, y un cliente con error SHALL NOT bloquear el resto del lote.

#### Scenario: Rate limit durante el backfill
- **GIVEN** un lote de clientes en proceso y una respuesta 429 del proveedor
- **WHEN** se reintenta con backoff
- **THEN** el estampado se completa sin duplicar metafields y los demás clientes del lote continúan

### Requirement: Aislamiento multi-tenant
WHILE la sincronización esté deshabilitada para una empresa THE system SHALL NOT emitir ninguna actualización de clientes de esa empresa.

#### Scenario: Empresa sin la sincronización
- **GIVEN** una empresa distinta de OH MY STORE sin la sincronización habilitada
- **WHEN** se crea o edita un cliente de esa empresa
- **THEN** no se produce ninguna escritura hacia Shopify

### Requirement: Trazabilidad sin PII en logs
THE system SHALL dejar traza consultable de cada ejecución en la trazabilidad existente de flows, y SHALL NOT volcar emails ni PII a los logs de error.

#### Scenario: Run con clientes con error
- **GIVEN** una ejecución con algunos clientes en error
- **WHEN** finaliza el run
- **THEN** los conteos y causas quedan consultables y los logs de error no contienen emails
