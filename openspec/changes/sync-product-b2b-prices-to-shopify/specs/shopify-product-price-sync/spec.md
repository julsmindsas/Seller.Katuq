# Delta: shopify-product-price-sync

## ADDED Requirements

### Requirement: Cobertura de precio por perfil de todo SKU activo
THE system SHALL exponer en Shopify el precio por perfil (mayorista y modelo) de cada SKU activo de una empresa habilitada que tenga ese precio en `preciosPorTipoCliente` de Katuq, de modo que el storefront resuelva el precio por compañía/perfil sin intervención manual.

#### Scenario: SKU con precio mayorista y modelo
- **GIVEN** un SKU activo con precio mayorista y precio modelo en Katuq
- **WHEN** se sincroniza
- **THEN** el storefront de OMS resuelve el precio mayorista para una compañía Mayoristas y el precio modelo para una compañía Modelos

#### Scenario: SKU con un solo perfil de precio
- **GIVEN** un SKU con precio mayorista pero sin precio modelo en Katuq
- **WHEN** se sincroniza
- **THEN** se publica solo el precio mayorista y el perfil modelo cae al precio público, sin inventar un valor

### Requirement: Katuq es la fuente de verdad de los precios
THE system SHALL tratar `preciosPorTipoCliente` de Katuq como la única fuente de verdad y SHALL NOT modificar precios, listas de precios ni catálogo dentro de Katuq.

#### Scenario: El precio de Katuq no se altera al publicar
- **GIVEN** un SKU con su precio por perfil en Katuq
- **WHEN** se publica hacia Shopify
- **THEN** el documento de producto, sus variantes, su precio y `preciosPorTipoCliente` en Katuq permanecen sin cambios

#### Scenario: Un precio distinto en Shopify no se propaga de vuelta
- **GIVEN** un precio editado directamente en Shopify
- **WHEN** corre la sincronización
- **THEN** gana el valor de Katuq y no se escribe nada de vuelta en Katuq

### Requirement: Propagación de cambios de precio
WHEN el precio por perfil de un SKU cambia en Katuq THE system SHALL propagar el nuevo precio a Shopify dentro de la ventana acordada, sin requerir edición producto por producto.

#### Scenario: Cambio de precio individual
- **GIVEN** un SKU cuyo precio mayorista cambia en Katuq
- **WHEN** ocurre el cambio
- **THEN** Shopify refleja el nuevo precio mayorista dentro de la ventana acordada y el resto de SKUs no se re-escriben innecesariamente

### Requirement: La sincronización de producto no borra el precio publicado
THE system SHALL garantizar que la sincronización de PRODUCTO existente no elimine ni sobrescriba el precio por perfil ya publicado por esta capacidad.

#### Scenario: Re-sync de producto tras publicar precios
- **GIVEN** un SKU con su precio por perfil ya publicado en Shopify
- **WHEN** el flujo de sincronización de producto vuelve a tocar ese SKU
- **THEN** el precio por perfil publicado permanece intacto

### Requirement: Carga masiva con dry-run y reporte de cobertura
WHEN se ejecuta la carga masiva THE system SHALL correr en modo dry-run por defecto y producir un reporte con conteos: publicados, sin precio de perfil, sin match en Shopify y con error.

#### Scenario: Dry-run del backfill
- **GIVEN** una ejecución de backfill sin la bandera de escritura
- **WHEN** corre sobre el catálogo de la empresa
- **THEN** no escribe en Shopify y reporta cobertura y desfases (p. ej. SKUs de Katuq sin producto en Shopify)

### Requirement: Idempotencia y resiliencia
IF el proveedor responde rate-limit o error transitorio THEN THE system SHALL reintentar con backoff sin publicar valores duplicados, y un SKU con error SHALL NOT bloquear el resto del lote.

#### Scenario: Rate limit durante la carga masiva
- **GIVEN** un lote de ~7.000 SKUs en publicación y respuestas 429 del proveedor
- **WHEN** se reintenta con backoff
- **THEN** la publicación se completa sin duplicar precios y los demás SKUs continúan

### Requirement: Aislamiento multi-tenant
WHILE la sincronización esté deshabilitada para una empresa THE system SHALL NOT publicar precios de esa empresa hacia Shopify.

#### Scenario: Empresa sin la sincronización
- **GIVEN** una empresa distinta de OH MY STORE sin la capacidad habilitada
- **WHEN** cambia un precio en esa empresa
- **THEN** no se produce ninguna escritura hacia Shopify

### Requirement: Trazabilidad
THE system SHALL dejar traza consultable de cada carga masiva y de cada sync por cambio en la trazabilidad existente de flows, con conteos y errores.

#### Scenario: Run de sync por cambio
- **GIVEN** una propagación de cambio de precio
- **WHEN** finaliza
- **THEN** queda un run consultable con el SKU afectado, el resultado y cualquier error, sin colecciones nuevas
