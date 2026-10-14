## MODIFIED Requirements

### Requirement: Solo lectura
La pantalla MUST NOT cambiar estados de pedidos, despachar, crear ni editar nada, con una sola excepción: la tarjeta de Opttia, cuando una persona aprueba una propuesta. En ese caso la escritura va por la ruta de esa operación, con sus garantías (capacidades `opttia-en-vivo`, `despachos-en-vivo` y `operaciones-de-opttia`).

Tocar un pedido SHALL abrir su ficha (capacidad `ficha-en-vivo`), y desde ella su detalle en Pedidos. Ni la escena, ni el orbe, ni el ensayo de una propuesta MUST mover o cambiar un pedido real.

#### Scenario: Tocar una caja
- **WHEN** el usuario toca la caja de un pedido
- **THEN** se abre la ficha del pedido sobre la escena, y "Abrir en Todos los pedidos" lleva a su detalle

#### Scenario: Ensayo de una propuesta
- **WHEN** la escena ensaya una propuesta de despacho y nadie la aprueba
- **THEN** ningún pedido cambia de estado ni de mensajero
