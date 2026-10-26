## ADDED Requirements

### Requirement: Código SIIGO guardado en el producto

WHEN Katuq arma un ítem de factura SIIGO y el producto tiene
`integrations.siigo.productCode`, THE SYSTEM SHALL usar ese código para buscar
el producto en SIIGO, antes que la referencia.

#### Scenario: Producto con código guardado
- **WHEN** el producto `GLD-00-01-4SSFR` tiene `integrations.siigo.productCode = "GLD-01-4SSFR"`
- **THEN** la factura lleva el producto SIIGO `GLD-01-4SSFR` y no se crea ninguno nuevo

#### Scenario: Producto sin código guardado
- **WHEN** el producto no tiene `integrations.siigo.productCode`
- **THEN** se busca por la referencia, igual que hoy

### Requirement: Equivalencia única antes de crear

WHEN la referencia no existe en SIIGO y el producto no tiene código guardado,
THE SYSTEM SHALL buscar en SIIGO el código equivalente por la regla
marca + referencia sin los bloques de dos dígitos. Si hay exactamente uno, lo
usa y lo guarda en el producto. Si hay cero o más de uno, crea el producto como
hoy.

#### Scenario: Un solo equivalente
- **WHEN** se factura `HCP-00-00-F21U3` y SIIGO solo tiene `HCP-00-F21U3`
- **THEN** la factura usa `HCP-00-F21U3` y el producto queda con ese código guardado

#### Scenario: Dos equivalentes
- **WHEN** la regla encuentra dos productos en SIIGO
- **THEN** no adivina: crea el producto con la referencia de Katuq, como hoy

### Requirement: Escritura acotada en el producto

THE SYSTEM SHALL escribir en `products` solo `integrations.siigo.productCode`,
`integrations.siigo.productCodeSource` e `integrations.siigo.productCodeAt`,
con dot-notation, sin tocar referencia, precios ni catálogo.

#### Scenario: Contract test del write-set
- **WHEN** se guarda un código SIIGO en un producto
- **THEN** el update solo contiene esas tres rutas

### Requirement: Categoría contable según la categoría de Katuq

WHEN Katuq crea un producto en SIIGO y la categoría de Katuq del producto está
conectada en `accountsMapping.accountGroupByCategory`, THE SYSTEM SHALL crear el
producto con esa categoría de SIIGO (`account_group`). Si no está conectada,
SHALL usar `accountsMapping.accountGroup`, igual que hoy.

#### Scenario: Categoría conectada
- **WHEN** se crea un producto de la categoría `MOTORES > Eléctrico 56C/J` y la conexión dice `MOTORES` → 1348
- **THEN** el producto queda en SIIGO con `account_group` 1348, no en Motobombas

#### Scenario: Subcategoría con conexión propia
- **WHEN** existen las conexiones `BOMBAS` → 378 y `BOMBAS > Motobomba` → 377
- **THEN** un producto de `BOMBAS > Motobomba` queda en 377 y uno de `BOMBAS > Kit` en 378

#### Scenario: Sin conexión
- **WHEN** la categoría del producto no está conectada
- **THEN** se usa la categoría de la empresa, como hoy

### Requirement: Servicios sin control de inventario

WHEN Katuq crea en SIIGO un producto de tipo servicio, THE SYSTEM SHALL
enviarlo con `stock_control: false`.

#### Scenario: Servicio
- **WHEN** se factura el servicio "Diagnóstico", que no existe en SIIGO
- **THEN** se crea con `type: Service` y sin control de inventario

### Requirement: La vista previa dice qué pasará con cada producto en SIIGO

WHILE la empresa tiene la bandera `siigoProductEquivalence` encendida, WHEN se
pide la vista previa de una factura SIIGO, THE SYSTEM SHALL revisar en SIIGO,
solo leyendo, cada código del carrito con la misma regla que la factura, y
SHALL anotar cada línea con `enSiigo` (`existente`, `equivalente`, `ambiguo`,
`nuevo` o `error`) y con `codigoSiigo` cuando va con un equivalente. Con la
bandera apagada, la vista previa SHALL quedar igual que hoy, sin consultar
productos en SIIGO. La revisión SHALL NOT crear clientes ni productos, ni
escribir en Firestore.

#### Scenario: Código guardado que existe (criterio de 3.2)
- **WHEN** el producto `GLD-00-01-4SSFR` tiene guardado `GLD-01-4SSFR` y ese código existe en SIIGO
- **THEN** la línea sale con `enSiigo: 'existente'` y no hay aviso de creación

#### Scenario: Avisos
- **WHEN** hay productos que se crearán, que van con un equivalente o que tienen más de un posible
- **THEN** la vista previa lo avisa con textos cortos en singular o plural («No existe en SIIGO y se creará al facturar: A.», «Se facturará con el producto que ya existe en SIIGO: A → B.», «Tiene más de un posible en SIIGO y se creará con el código de Katuq: X.»), y no avisa nada si todo existe

#### Scenario: Revisión acotada
- **WHEN** el carrito tiene más de 20 códigos distintos, o la revisión pasa de 15 s
- **THEN** se revisan los primeros en orden, cada código una vez, y se avisa «Se revisaron en SIIGO k de N productos.»

#### Scenario: SIIGO falla
- **WHEN** una consulta a SIIGO falla
- **THEN** esa línea queda en `error`, no se consulta más (una sola falla, sin reintentos y con timeout de 5 s, para no abrir el circuit breaker compartido de SIIGO), se avisa cuántos se revisaron y la vista previa sale igual. A diferencia de la factura, que en ese caso sigue y crea, la vista previa no afirma ni que existe ni que se creará

#### Scenario: La revisión entera falla
- **WHEN** la revisión o la lectura de la bandera fallan
- **THEN** la vista previa sale exactamente como hoy
