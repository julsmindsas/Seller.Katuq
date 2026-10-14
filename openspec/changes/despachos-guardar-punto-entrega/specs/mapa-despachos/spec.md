## MODIFIED Requirements

### Requirement: Solo lectura de pedidos
WHEN el mapa de Despachos ubica un pedido, the system SHALL escribir en ese pedido solamente el punto encontrado (latitud, longitud, coordenadas, fuente `geocodificada`, quién y cuándo) y SHALL NOT cambiar ningún otro dato del pedido.

#### Scenario: Pedido ubicado
- **WHEN** Despachos ubica con confianza un pedido que no tenía punto
- **THEN** el pedido queda con ese punto y fuente `geocodificada`, y su estado, productos, totales, transportador y demás datos de entrega no cambian

#### Scenario: Sin efectos secundarios
- **WHEN** se guarda el punto de un pedido
- **THEN** no se mueve inventario, no se factura, no se envían correos, SMS ni avisos al mensajero, y no cambia el estado del pedido

#### Scenario: Pedido de otra empresa
- **WHEN** llega una solicitud para guardar el punto de un pedido que no es de la empresa autenticada
- **THEN** se rechaza y el pedido no cambia

## ADDED Requirements

### Requirement: Nunca pisar un punto puesto por una persona
IF el pedido ya tiene un punto marcado en el mapa, por enlace o por GPS (D-417), THEN the system SHALL NOT reemplazarlo, aunque la pantalla envíe otro.

#### Scenario: Punto manual
- **WHEN** Despachos intenta guardar un punto en un pedido con fuente `manual`
- **THEN** el pedido conserva su punto y la pantalla pinta ese

### Requirement: Sin guardado accidental
WHILE un punto encontrado no se haya guardado, the system SHALL NOT incluirlo en las ediciones del pedido que haga Despachos (despachar, transportador, estado, fecha).

#### Scenario: Despachar después de ubicar
- **WHEN** guardar el punto falló y luego se despacha el pedido
- **THEN** la edición del pedido no lleva ese punto

### Requirement: Pintar el punto guardado al abrir
WHEN se abre el mapa de Despachos, the system SHALL pintar los pedidos que ya tienen punto guardado sin volver a buscarlos, y SHALL buscar solo los que no tienen punto.

#### Scenario: Recargar Despachos
- **WHEN** se ubicaron pedidos y se recarga la pantalla
- **THEN** esos pedidos aparecen en el mapa sin la tarjeta "Ubicando pedidos" para ellos

### Requirement: Volver a ubicar
WHEN el usuario elige "Volver a ubicar pedidos", the system SHALL buscar de nuevo los puntos de fuente `geocodificada` (nunca los de una persona); IF encuentra uno confiable, THEN SHALL guardarlo en lugar del anterior; IF no lo confirma, THEN SHALL dejar el pedido fuera del mapa, en "Sin ubicar" con el motivo "No pudimos confirmar el punto guardado", sin borrar el punto guardado.

#### Scenario: Punto guardado equivocado
- **WHEN** un pedido de Medellín tiene guardado un punto `geocodificada` en otro departamento y la búsqueda estricta no lo confirma
- **THEN** no se pinta, aparece en "Sin ubicar" con ese motivo y el punto guardado sigue en el pedido
