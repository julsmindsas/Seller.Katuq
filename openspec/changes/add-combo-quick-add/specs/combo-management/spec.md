# Delta: combo-management

## ADDED Requirements

### Requirement: Maestro de combos sin precio propio
EL sistema DEBERÁ (SHALL) permitir a un administrador crear un combo compuesto por nombre, descripción y una lista de productos existentes (por `productoId`), SIN un campo de precio propio en el combo.

#### Scenario: Crear un combo válido
- **GIVEN** un administrador con al menos 2 productos activos en el catálogo
- **WHEN** crea un combo con nombre, descripción y esos 2 productos
- **THEN** el combo se persiste en la colección `combos` filtrado por `company`, sin ningún campo de precio

#### Scenario: Rechazar combo sin productos
- **GIVEN** un administrador intenta crear un combo sin productos asociados
- **WHEN** envía la solicitud de creación
- **THEN** el sistema rechaza la creación con un mensaje de validación explícito

### Requirement: Agregar un combo al carrito agrega sus productos como líneas independientes
CUANDO un vendedor hace click en un combo desde el catálogo de venta asistida, el sistema DEBERÁ (SHALL) agregar al carrito, como líneas normales e independientes, cada producto asociado al combo — sin crear una línea "combo" colapsada ni un precio calculado aparte.

#### Scenario: Combo sin productos que requieran configuración
- **GIVEN** un combo con 2 productos, ninguno con `requiereConfiguracion() === true`
- **WHEN** el vendedor hace click en el combo
- **THEN** el carrito muestra 2 líneas nuevas, una por cada producto, cada una con cantidad mínima, precio por categoría de cliente (si aplica) y datos de entrega por defecto ya resueltos — mismo resultado que si el vendedor hubiera usado "agregar rápido" en cada producto por separado

#### Scenario: Combo con un producto que requiere configuración
- **GIVEN** un combo con 2 productos, uno de ellos con `requiereConfiguracion() === true`
- **WHEN** el vendedor hace click en el combo
- **THEN** ambos productos se agregan al carrito como líneas independientes; la línea del producto que requiere configuración queda marcada con `_requiereConfiguracionPendiente: true` y sin bloquear ni interrumpir el agregado del resto del combo con un modal

### Requirement: Indicador visual de configuración pendiente en el carrito
EL sistema DEBERÁ (SHALL) mostrar un indicador visual (banner o pill) en cada línea del carrito marcada con `_requiereConfiguracionPendiente: true`, y DEBERÁ (SHALL) permitir completar la configuración de esa línea específica desde el propio indicador, sin duplicar el ítem en el carrito.

#### Scenario: Completar configuración pendiente desde el carrito
- **GIVEN** una línea de carrito con `_requiereConfiguracionPendiente: true`
- **WHEN** el vendedor hace click en el pill/banner de esa línea y completa la configuración requerida
- **THEN** la línea existente se actualiza con la configuración capturada, `_requiereConfiguracionPendiente` pasa a `false`, y no se crea una línea adicional en el carrito

### Requirement: El precio del combo emerge de sus líneas, sin cálculo nuevo
EL sistema NO DEBERÁ (MUST NOT) introducir un cálculo de precio específico para combos en `orderCalculationService.js` ni en ningún consumidor de precio por línea — el total pagado por un combo DEBERÁ (SHALL) ser exactamente la suma de los precios individuales resueltos para cada producto agregado, incluyendo IVA y cualquier descuento de línea o global que aplique de la forma ya existente.

#### Scenario: Total del combo coincide con la suma de sus componentes
- **GIVEN** un combo de 2 productos con precios sin IVA de $50.000 y $30.000 respectivamente, sin descuentos
- **WHEN** el vendedor agrega el combo y finaliza el pedido
- **THEN** el subtotal correspondiente a esas 2 líneas es exactamente $80.000 más el IVA de cada producto según su propia tarifa, calculado por el motor de precios existente sin lógica adicional de combo

### Requirement: Un producto inactivo o eliminado dentro de un combo no bloquea el resto del agregado
CUANDO un vendedor hace click en un combo cuyo `productoId` referencia un producto que ya no existe o está inactivo en el catálogo, el sistema DEBERÁ (SHALL) omitir únicamente ese producto del agregado, DEBERÁ (SHALL) agregar normalmente el resto de los productos del combo, y DEBERÁ (SHALL) informar al vendedor cuántos productos no se agregaron.

#### Scenario: Combo con un producto desactivado después de armarlo
- **GIVEN** un combo con 3 productos, uno de los cuales fue desactivado después de crear el combo
- **WHEN** el vendedor hace click en el combo
- **THEN** las 2 líneas de los productos activos se agregan normalmente al carrito, y el vendedor ve un aviso no bloqueante indicando que 1 producto del combo no se agregó por no estar disponible

### Requirement: Aislamiento de catálogo, inventario y sincronización externa
EL sistema NO DEBERÁ (MUST NOT) crear un tipo de producto "combo" dentro de la colección de productos, NI sincronizar combos a Shopify u otro canal externo, NI modificar la lógica de disponibilidad/inventario existente por el hecho de que un producto forme parte de un combo.

#### Scenario: Un combo no se publica a Shopify
- **GIVEN** un combo creado en el maestro de combos
- **WHEN** corren los flows de sincronización a Shopify (`cereza-products-to-shopify`, `katuq-web-to-shopify`)
- **THEN** el combo no genera ningún producto, variante ni cambio de inventario en Shopify — solo los productos individuales que ya se sincronizaban antes de este cambio siguen su flujo normal, sin relación con la existencia del combo
