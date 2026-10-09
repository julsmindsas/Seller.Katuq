## Purpose

La ficha de la pantalla En vivo: al tocar un pedido, una cifra, una etapa, una ciudad, un canal o un mensajero, muestra su detalle sin salir de la pantalla, mientras la escena lo señala.

## ADDED Requirements

### Requirement: Ficha del pedido
Tocar un pedido SHALL abrir su ficha. Se toca la caja, el evento en la lista o la fila en otra ficha. La ficha muestra:
- número, cliente corto, ciudad y barrio, etapa y monto;
- canal, estado del pago, hora de llegada y mensajero o transportadora;
- el recorrido de hoy: cada etapa cumplida con su hora, la actual resaltada y las que faltan como pendientes;
- los productos con cantidad y valor.

La ficha MUST actualizarse sola cuando el pedido cambie, y la etapa nueva MUST entrar animada. Mientras esté abierta, la escena MUST resaltar el pedido, y la cámara MUST acercarse y seguirlo si se mueve.

#### Scenario: El pedido sale mientras se mira
- **WHEN** la ficha del pedido #1772 está abierta y el pedido sale con Carlos
- **THEN** aparece el paso "Salió a entrega" con su hora y "con Carlos", y la cámara sigue la moto

#### Scenario: Etapa sin hora
- **WHEN** el pedido cambió de etapa antes de que el servidor empezara a observarlo
- **THEN** ese paso aparece cumplido y dice "Sin hora registrada"

### Requirement: Fichas de grupos y de mensajeros
Tocar uno de estos elementos SHALL abrir una ficha con sus pedidos, del más nuevo al más viejo, con su total y ticket promedio:
- una cifra: pedidos, en preparación, listos, en camino o entregados;
- una etapa de la franja o de la escena;
- una ciudad del mapa;
- un canal.

Tocar un mensajero o la transportadora SHALL abrir su ficha: estado, última salida, entregados de hoy y pedidos que lleva. Desde cualquier fila MUST poder abrirse la ficha del pedido y volver con "Atrás".

#### Scenario: Cuáles van en camino
- **WHEN** el usuario toca "En camino: 19"
- **THEN** ve los 19 pedidos y, al tocar uno, su ficha, con "Atrás" para volver a la lista

### Requirement: Acciones de la ficha
En el tablero del comercio, la ficha del pedido SHALL ofrecer "Abrir en Todos los pedidos". En la vista de toda Katuq SHALL ofrecer "Ver el tablero de <comercio>", que abre ese tablero con la misma ficha. Si quien mira un comercio es Katuq, la ficha MUST decir que es solo lectura. Ninguna ficha MUST permitir cambiar estados, asignar ni despachar.

#### Scenario: De toda Katuq al comercio
- **WHEN** un usuario de Katuq toca un pedido de Moda Ceiba en la lista general y luego "Ver el tablero de Moda Ceiba"
- **THEN** se abre el tablero de Moda Ceiba con la ficha de ese pedido

### Requirement: Detalle con datos mínimos
El detalle del pedido SHALL pedirse al servidor al abrir su ficha, con la sesión y el alcance de la pantalla: la empresa de la sesión firmada y D-349. Katuq puede pedir el de cualquier empresa. El detalle MUST traer solo los datos mínimos de la pantalla más los productos (nombre, cantidad y valor, como los muestra Pedidos). MUST NOT traer teléfono, dirección, documento ni correo. Con "ocultar clientes y montos", la ficha MUST mostrar "Cliente" y ocultar los valores.

Las fichas de grupos y de mensajeros MUST armarse con la foto ya cargada, sin pedir datos nuevos.

#### Scenario: Pedido de otra empresa
- **WHEN** un usuario de la empresa A pide el detalle de un pedido de la empresa B
- **THEN** responde 404 sin datos

#### Scenario: Vendedor con "solo sus métricas"
- **WHEN** un vendedor con D-349 pide el detalle de un pedido de otro vendedor
- **THEN** responde 404 sin datos

### Requirement: Cerrar la ficha y accesibilidad
La ficha SHALL cerrarse con su botón, con Escape o tocando un lugar vacío de la escena, y la cámara MUST volver a su encuadre. En celular la ficha MUST abrirse como una hoja desde abajo. Las cifras, etapas, filas y mensajeros que se pueden tocar MUST poder usarse también con el teclado.

#### Scenario: Escape
- **WHEN** la ficha está abierta y el usuario oprime Escape
- **THEN** la ficha se cierra y la escena vuelve a su vista
