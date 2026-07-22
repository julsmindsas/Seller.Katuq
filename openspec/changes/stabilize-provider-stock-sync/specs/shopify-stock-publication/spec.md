# Delta: shopify-stock-publication

## ADDED Requirements

### Requirement: Publicación desde disponibilidad aprobada de Katuq
WHEN Katuq publica stock a Shopify, THE system SHALL usar la cantidad operativa aprobada para la empresa, producto y ubicación correspondientes.

#### Scenario: Comercio sin proyección nueva activa
- **GIVEN** una empresa que continúa en el modelo actual
- **WHEN** publica a Shopify
- **THEN** usa su `inventory.cantidad` canónica y no una fórmula sombra

### Requirement: Transiciones a cero incluidas
WHEN una cantidad publicable cambia de un valor positivo a cero, THE system SHALL enviar el cero a Shopify.

#### Scenario: Última unidad vendida
- **GIVEN** un producto publicado con una unidad y disponibilidad Katuq ahora igual a cero
- **WHEN** corre la sincronización
- **THEN** Shopify recibe cero para la ubicación correspondiente

### Requirement: Cobertura completa mediante cursor
THE system SHALL recorrer el catálogo elegible completo mediante un cursor estable y SHALL NOT limitar permanentemente la sincronización a las primeras páginas o productos más recientes.

#### Scenario: Producto antiguo cambia de stock
- **GIVEN** un producto fuera de las primeras páginas del catálogo
- **WHEN** cambia su disponibilidad y el barrido alcanza su cursor
- **THEN** el producto se publica sin requerir edición manual

### Requirement: Recuperación después de interrupción
WHEN una ejecución se interrumpe, THE system SHALL retomar desde el último punto confirmado sin saltar productos ni duplicar efectos perjudiciales.

#### Scenario: Falla en mitad de un lote
- **GIVEN** un lote parcialmente confirmado
- **WHEN** se reintenta
- **THEN** se reprocesan de forma idempotente los pendientes y no se omiten los posteriores

### Requirement: Aislamiento por empresa e integración
THE system SHALL publicar únicamente para empresas con Shopify activo y SHALL mantener apagado este comportamiento para las demás.

#### Scenario: Almacén Bombas sin Shopify configurado
- **GIVEN** el ingreso de Almacén Bombas al programa de inventario sin Shopify activo
- **WHEN** corren los jobs del sistema
- **THEN** no se intenta publicar su inventario a Shopify

### Requirement: Evidencia de cada ejecución
THE system SHALL reportar cursor, productos examinados, publicados, enviados en cero, omitidos con causa, errores y siguiente punto de continuación.

#### Scenario: Ejecución completa
- **GIVEN** un ciclo que termina sin error
- **WHEN** se consulta su resultado
- **THEN** existe evidencia suficiente para demostrar la cobertura alcanzada

### Requirement: Publicación limitada a cantidad de inventario
THE system MUST NOT crear ni modificar productos, variantes, títulos, imágenes, colecciones, estados comerciales, precios o listas de precios al publicar stock a Shopify.

#### Scenario: Actualización de existencias
- **GIVEN** un producto Shopify vinculado y una nueva cantidad Katuq
- **WHEN** se publica el stock
- **THEN** solo cambia el nivel de inventario de la ubicación objetivo y el catálogo y precio permanecen iguales

### Requirement: Camino de stock independiente
THE system SHALL ejecutar la publicación ampliada de existencias sin recorrer nodos de creación/actualización de productos ni sincronización de listas de precios.

#### Scenario: Stock Cereza cambia a cero
- **GIVEN** un producto Cereza existente en Katuq y Shopify cuya disponibilidad cambia a cero
- **WHEN** el publicador de existencias procesa el cambio
- **THEN** actualiza únicamente el nivel de inventario y no ejecuta el upsert del producto ni la lista de precios

#### Scenario: Flow mixto continúa activo
- **GIVEN** un flow histórico que sincroniza catálogo y stock
- **WHEN** se habilita el camino nuevo de existencias
- **THEN** su frecuencia, límite y nodos de producto/precio no se modifican como parte de esta capacidad
