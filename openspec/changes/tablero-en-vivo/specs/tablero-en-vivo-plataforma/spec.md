## Purpose

Vista "Toda Katuq" de la pantalla En vivo: el equipo de Katuq (sesiones de Julsmind) ve a todos los comercios operando a la vez. Incluye las cifras de la plataforma, el mapa con una torre por comercio, la ciudad de comercios, la carrera del día y la entrada al tablero de cualquier comercio, en solo lectura.

## ADDED Requirements

### Requirement: Solo para sesiones de Katuq
La vista "Toda Katuq" y sus datos SHALL estar disponibles solo cuando la empresa de la sesión firmada sea la de la plataforma (Julsmind). La empresa MUST salir de la sesión firmada, nunca de un encabezado ni de un parámetro, y el rechazo MUST ocurrir antes de leer pedidos. Un comercio MUST NOT ver datos de otro comercio.

#### Scenario: Comercio que se hace pasar por Katuq
- **WHEN** un usuario de ALMARA FELICIDAD pide la foto de toda Katuq con el encabezado `company: Julsmind`
- **THEN** responde 403 y no se lee ningún pedido

#### Scenario: Sesión de Katuq
- **WHEN** un administrador de Julsmind abre "Katuq en vivo"
- **THEN** ve todos los comercios con pedidos de ayer y de hoy

### Requirement: Cifras de la plataforma
La vista SHALL mostrar en hora de Colombia, sin cancelados:
- ventas de hoy de todos los comercios, contra ayer a esta hora;
- pedidos de hoy y ticket promedio;
- comercios con pedidos hoy y en la última hora;
- pedidos por minuto en los últimos 5 minutos y el récord del día;
- pedidos en camino y despachos de hoy;
- entregados de hoy y en cuántas ciudades;
- lo vendido hoy con Opttia (capacidad `opttia-en-vivo`).

Las ventas del día SHALL verse en grande, con cifras que ruedan al cambiar, y junto a las ventas por hora de hoy contra ayer. El pulso de Katuq SHALL mostrar una línea que late con cada pedido de cualquier comercio durante los últimos 2 minutos.

Las ventas de cada comercio MUST seguir la regla de su propia bienvenida. Las empresas excluidas de las métricas de plataforma (D-323) MUST NOT contar.

#### Scenario: Pedido en cualquier comercio
- **WHEN** entra un pedido de $85.000 en un comercio de Medellín
- **THEN** "Ventas en Katuq hoy" sube $85.000, "Pedidos hoy" suma 1 y el comercio avanza en la carrera

### Requirement: Escenas de toda Katuq
La vista SHALL ofrecer dos escenas:
- **Colombia:** el mapa, con una torre por comercio en su ciudad que crece con lo vendido hoy.
- **Comercios:** una ciudad con un edificio por comercio, con letrero y pedidos de hoy.

Cada evento MUST verse sobre el comercio que lo tuvo:

| Evento | Colombia | Comercios |
|---|---|---|
| Pedido nuevo | luz y pulso en la torre; tarjeta con comercio, monto y ciudad del cliente | cae una caja en el techo |
| Cambio de etapa | pulso pequeño del color de la etapa | pulso en la puerta |
| Salida | arco hasta la ciudad del cliente, o pulso si es la misma ciudad | sale una moto o un camión |
| Entregado | pulso verde en la ciudad del cliente | pulso verde en el edificio |

Con muchos eventos a la vez MUST haber a lo sumo 3 tarjetas, y los pulsos MUST seguir saliendo. Los nombres fijos MUST ser de los comercios que más venden y MUST NOT encimarse entre ciudades vecinas.

En Colombia, cada departamento SHALL teñirse de un tono plano según sus pedidos de hoy, con su leyenda. En pantallas anchas, el comercio del momento (el de más pedidos en 30 minutos) y la carrera SHALL flotar sobre la escena, a la izquierda, y la lista de eventos a la derecha. "Ampliar" los quita y deja solo la escena.

#### Scenario: Ciudades vecinas
- **WHEN** Bogotá e Ibagué tienen comercios entre los que más venden
- **THEN** queda fijo solo el nombre del que más vende, y el otro aparece al pasar el puntero

### Requirement: Carrera, cinta y ciudades
La vista SHALL mostrar:
- la carrera de los 8 comercios que más venden hoy, que se reordena con animación y marca "▲ N" al que sube;
- una cinta con todos los comercios, sus pedidos, sus ventas y la variación contra ayer;
- las ciudades a donde van los pedidos de hoy;
- la lista de eventos de todos los comercios.

#### Scenario: Un comercio adelanta a otro
- **WHEN** un comercio pasa en ventas al que tenía adelante
- **THEN** su fila sube con animación y muestra "▲ 1"

### Requirement: Entrar al tablero de un comercio
Tocar un comercio SHALL abrir su tablero en solo lectura, con los mismos datos que vería el comercio y con "Toda Katuq" para volver. Vale tocar su torre, su edificio, su fila en la carrera o en la cinta. Las ventas y pedidos de ese tablero MUST coincidir con los de la carrera.

#### Scenario: Volver a toda Katuq
- **WHEN** un usuario de Katuq entra a un comercio y luego toca "Toda Katuq"
- **THEN** vuelve a la vista general sin haber perdido eventos de ningún comercio

### Requirement: Privacidad y modo pantalla
La vista SHALL tener modo pantalla con cámara automática: recorre el mapa y se acerca a donde pasa algo. También SHALL tener "ocultar comercios y montos", que cambia los nombres por "Comercio en <ciudad>" y el dinero por conteos. La lista y las escenas de toda Katuq MUST NOT mostrar nombres de clientes.

#### Scenario: Televisor en una feria
- **WHEN** se activa "ocultar comercios y montos"
- **THEN** la carrera, la cinta, la lista y los letreros dicen "Comercio en Medellín" y muestran conteos, sin dinero

### Requirement: Repetir el día de toda Katuq
"Repetir el día" SHALL contar en unos 30 segundos todas las llegadas de hoy de todos los comercios, con la carrera reordenándose. Al terminar MUST volver al estado real.

#### Scenario: Fin de la repetición
- **WHEN** termina la repetición
- **THEN** las cifras, la carrera y las escenas quedan iguales al estado actual

### Requirement: Un solo observador de la plataforma
El servidor SHALL observar con un solo observador los pedidos de todos los comercios creados desde ayer (hora de Colombia). El observador MUST encenderse con la primera pantalla de toda Katuq y apagarse 2 minutos después de la última.

Cada evento de toda Katuq MUST llevar el comercio (id y nombre comercial), la ciudad del comercio y la del cliente, el canal, el monto, los estados y el tipo de transportador. MUST NOT llevar el nombre ni otros datos del cliente.

#### Scenario: Pedido con datos del cliente
- **WHEN** entra un pedido con nombre y teléfono del cliente en cualquier comercio
- **THEN** el evento de toda Katuq no trae ni el nombre ni el teléfono
