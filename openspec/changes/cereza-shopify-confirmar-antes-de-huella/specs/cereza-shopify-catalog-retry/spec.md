## Purpose

Garantizar que un producto de Cereza que el flow de catálogo envía a Shopify quede de verdad creado o actualizado allí, con sus listas de precios. Si no queda, el sistema lo vuelve a intentar de forma acotada, sin duplicar productos en la tienda y sin ampliar la carga del flow mixto (D-134).

## ADDED Requirements

### Requirement: Un producto se da por sincronizado solo con confirmación de Shopify
El sistema SHALL considerar sincronizado un producto emitido por el flow de catálogo Cereza→Shopify solo cuando:
- Shopify confirmó la creación o actualización del producto, y
- las listas de precios del producto quedaron sincronizadas.

Mientras no haya confirmación, el producto SHALL seguir siendo candidato a emitirse.

#### Scenario: Shopify falla al crear un producto nuevo
- **WHEN** el flow emite un producto nuevo de Cereza con stock y precio válido, y el paso a Shopify falla (error, timeout o rechazo de Shopify)
- **THEN** el producto no queda marcado como sincronizado y se vuelve a emitir en una corrida posterior

#### Scenario: Shopify crea el producto y las listas de precios quedan sincronizadas
- **WHEN** Shopify crea el producto y las listas Mayorista y Modelo quedan con sus precios
- **THEN** el producto queda marcado como sincronizado y no se vuelve a emitir mientras su contenido en Cereza no cambie

#### Scenario: Shopify crea el producto pero falla la lista de precios
- **WHEN** el producto se crea en Shopify y la sincronización de listas de precios falla
- **THEN** el producto no queda marcado como sincronizado y se vuelve a intentar

### Requirement: Los reintentos son acotados
El sistema SHALL reintentar un producto no confirmado como máximo un número fijo de veces, con una espera creciente entre intentos. Los reintentos SHALL consumir el mismo tope de emisiones por corrida que ya tiene el flow, y nunca uno adicional.

#### Scenario: Un producto agota sus intentos
- **WHEN** un producto falla en todos sus intentos permitidos
- **THEN** deja de reintentarse, queda marcado para revisión humana con el último error, y el resto del catálogo sigue su curso normal

#### Scenario: Muchos productos fallan a la vez
- **WHEN** una caída de Shopify hace fallar a cientos de productos en la misma corrida
- **THEN** cada corrida emite como máximo el tope configurado del flow, sumando productos nuevos, cambiados y reintentos

### Requirement: Un reintento no duplica productos en Shopify
Antes de crear un producto, el sistema SHALL buscarlo en Shopify por el identificador de Katuq que lleva el producto. Si lo encuentra, SHALL actualizarlo en vez de crear otro.

#### Scenario: La creación anterior quedó a medias
- **WHEN** un intento anterior creó el producto en Shopify, pero el flow no recibió la confirmación
- **THEN** el reintento encuentra ese producto, lo enlaza y lo actualiza, y la tienda queda con un solo producto para esa referencia

### Requirement: No se recrean productos borrados de la tienda
Si un producto estuvo enlazado a Shopify y ya no existe allí, el sistema SHALL NOT volver a crearlo automáticamente. SHALL marcarlo para revisión humana.

#### Scenario: Alguien borró el producto en Shopify
- **WHEN** el reintento encuentra que el producto enlazado ya no existe en la tienda
- **THEN** no lo crea y lo deja marcado para revisión

### Requirement: Las protecciones de precio no cambian
El sistema SHALL mantener que un producto sin precio válido no se crea en Shopify. Tampoco se reintenta mientras su precio siga sin ser válido.

#### Scenario: Producto sin precio en Cereza
- **WHEN** un producto llega de Cereza con precio 0
- **THEN** no se crea en Shopify y no consume reintentos. Cuando su precio cambia en Cereza, se emite por el camino normal

### Requirement: El reintento se enciende por flow y nunca deja el flow sin tope
El reintento SHALL encenderse por flow con tres modos: apagado (comportamiento actual), sombra (solo registra lo que reintentaría) y encendido. Con el reintento en sombra o encendido, si el flow no tiene un tope de emisiones mayor que cero, el trigger SHALL NOT correr y SHALL dejar registrado el motivo.

#### Scenario: Configuración incompleta
- **WHEN** se enciende el reintento y el flow queda sin tope de emisiones
- **THEN** el trigger no emite nada y registra que falta el tope

#### Scenario: Modo sombra
- **WHEN** el reintento está en sombra
- **THEN** el flow se comporta igual que hoy y queda registrado qué productos se habrían reintentado

### Requirement: El flow mixto no amplía su alcance
El cambio SHALL NOT modificar la frecuencia del flow, su tope de emisiones, las páginas de Cereza que lee ni el filtro de solo productos con stock. Las escrituras SHALL limitarse a las que el flow ya hace: producto en Katuq, producto en Shopify, inventario y listas de precios. A eso se suma el estado de reintentos dentro del estado del trigger que ya existe.

#### Scenario: Prueba del write-set
- **WHEN** se ejecuta la prueba de contrato del cambio
- **THEN** falla si el trigger o los nodos escriben en colecciones nuevas, o si cambian la frecuencia, el tope, las páginas o el filtro de stock
