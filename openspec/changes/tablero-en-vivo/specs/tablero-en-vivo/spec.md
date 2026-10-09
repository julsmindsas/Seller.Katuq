## Purpose

Pantalla "En vivo" del Seller: muestra al comercio, en el momento en que pasa, cada pedido que llega, cambia de etapa, sale con un mensajero o se entrega. Lo muestra con cifras, una escena 3D de su operación, el mapa del país y una lista de eventos, también para dejarla en un televisor.

## ADDED Requirements

### Requirement: Pantalla encendida por rol
El sistema SHALL mostrar la pantalla "En vivo" solo a los roles que tengan la entrada `en-vivo` en sus menús, que el administrador agrega en Roles. Para los roles existentes MUST nacer apagada.

#### Scenario: Rol sin la entrada
- **WHEN** un usuario cuyo rol no tiene "En vivo" en sus menús abre la ruta directo
- **THEN** la pantalla explica que su rol no la tiene activa y cómo activarla, y no muestra datos

#### Scenario: Activada en Roles
- **WHEN** el administrador agrega "En vivo" al rol y el usuario vuelve a iniciar sesión
- **THEN** ve la entrada en el menú "Operaciones" y la pantalla carga

### Requirement: Cifras del día que se mueven solas
La pantalla SHALL mostrar las cifras del día en hora de Colombia: ventas, pedidos, ticket promedio, en preparación, listos para salir, en camino y entregados. Cada cifra MUST actualizarse sin recargar cuando llega un evento, con una transición visible. "Ventas de hoy" MUST dar el mismo valor que la bienvenida para el mismo usuario y el mismo momento.

#### Scenario: Llega un pedido
- **WHEN** entra un pedido de $128.900
- **THEN** "Ventas de hoy" sube $128.900 contando hacia arriba, "Pedidos hoy" suma 1 con una marca "+1", y "En preparación" suma 1

#### Scenario: Vendedor con "solo sus métricas"
- **WHEN** la empresa tiene activo "cada vendedor ve solo sus métricas" (D-349) y entra un vendedor
- **THEN** los rótulos dicen "Mis…" y las cifras, la escena, el mapa y la lista solo incluyen sus pedidos

### Requirement: Escena de la operación
La pantalla SHALL mostrar una escena 3D donde cada pedido activo es una caja. La caja se ubica en la estación de su etapa: **Recibido** (sin producir), **Producción** (en producción o producido parcialmente), **Alistamiento** (producido totalmente, picking, packing o empacado) y **Listo para salir** (para despachar, listo para despacho o en despacho). Cada evento MUST tener su animación propia:

| Evento | Animación |
|---|---|
| Pedido nuevo | la caja cae sobre Recibido con un pulso y una tarjeta con número, monto, cliente corto y ciudad |
| Cambio de etapa | la caja viaja por la banda hasta su estación nueva |
| Salida con mensajero | una moto con el nombre del mensajero recoge las cajas y sale por la vía |
| Salida con transportadora | un camión carga las cajas y sale |
| Entregado | una casa del barrio recibe la caja con un sello verde |
| Rechazado o cancelado | la caja se pone roja y desaparece |

#### Scenario: Cambio dentro de la misma estación
- **WHEN** un pedido pasa de "en picking" a "en packing"
- **THEN** la caja no viaja, y el cambio aparece en la lista de eventos

#### Scenario: Estación llena
- **WHEN** una estación tiene más cajas de las que caben a la vista
- **THEN** la estación muestra el total real y el excedente como "+N"

#### Scenario: Mensajero ocupado
- **WHEN** sale un pedido con un mensajero cuya moto ya está en la calle
- **THEN** la caja sale de "Listo para salir" con un desvanecido y el evento aparece igual en la lista

### Requirement: Vista "Mi país"
La pantalla SHALL ofrecer la vista del mapa de Colombia con: un pulso en la ciudad de cada pedido nuevo, un arco desde la ciudad de la bodega hasta la ciudad del pedido cuando sale, y un pulso verde cuando se entrega. Los pedidos sin ciudad MUST contar en las cifras aunque no se dibujen. El país completo MUST llenar el recuadro de la escena sin quedar tapado por el título ni por la franja de etapas. La pantalla SHALL ofrecer "Ampliar", que le da todo el ancho a la escena y pasa la lista debajo.

#### Scenario: Pedido a otra ciudad
- **WHEN** sale con transportadora un pedido de Bogotá a Medellín
- **THEN** un arco viaja de Bogotá a Medellín y la columna de Medellín muestra sus pedidos de hoy

#### Scenario: Ampliar
- **WHEN** el usuario toca "Ampliar"
- **THEN** la escena ocupa todo el ancho, el mapa crece hasta llenarla y la lista de eventos queda debajo

### Requirement: Lista "Lo que está pasando"
La pantalla SHALL listar los eventos del más nuevo al más viejo: tipo (pastilla con color semántico), número de pedido, cliente corto, ciudad, canal, monto y hora relativa ("ahora", "hace 3 min"). Al entrar MUST traer los eventos recientes que el servidor conserve. Al pasar el puntero por un evento, la escena MUST resaltar la caja de ese pedido, si está a la vista.

#### Scenario: Ráfaga de eventos
- **WHEN** llegan muchos eventos en pocos segundos
- **THEN** la lista los muestra todos en orden, y la escena agrupa las animaciones para que ninguna quede a medias ni se tape

### Requirement: Ventas por hora, hoy contra ayer
La pantalla SHALL mostrar las ventas por hora de hoy contra las de ayer a la misma hora, y la barra de la hora actual MUST crecer con cada pedido.

#### Scenario: Comparación a esta hora
- **WHEN** son las 3:40 p. m.
- **THEN** la pantalla dice cuánto se ha vendido hoy contra lo que se había vendido ayer a las 3:40 p. m., en porcentaje

### Requirement: Celebraciones
La pantalla SHALL celebrar una sola vez por día cada hito, con un aviso y confeti planos: primer pedido, primera entrega, cada 10 pedidos, mejor hora del día y "ya vendiste más que todo ayer". MUST NOT celebrar al cargar la pantalla ni durante "Repetir el día".

#### Scenario: Pedido número 40
- **WHEN** entra el pedido 40 del día
- **THEN** aparece "¡40 pedidos hoy!" con confeti, y no se repite si la pantalla se recarga

### Requirement: Modo pantalla y privacidad
La pantalla SHALL tener un modo pantalla para televisor: pantalla completa, tema oscuro, letra grande y sin apagar la pantalla mientras esté abierta. MUST permitir ocultar nombres de clientes y montos, y esa preferencia MUST quedar guardada en el navegador.

#### Scenario: Televisor en el local
- **WHEN** el comercio activa el modo pantalla con "ocultar clientes y montos"
- **THEN** las tarjetas muestran número de pedido y ciudad, sin nombre ni monto, y las cifras de dinero se reemplazan por conteos

### Requirement: Sonido opcional
La pantalla SHALL ofrecer sonidos distintos para pedido nuevo, salida y entrega. MUST nacer apagado y solo sonar después de que el usuario lo encienda.

#### Scenario: Sonido encendido
- **WHEN** el usuario enciende el sonido y entra un pedido
- **THEN** suena el tono de pedido nuevo, una sola vez por pedido

### Requirement: Repetir el día
La pantalla SHALL ofrecer "Repetir el día": vuelve a contar el día de hoy en unos 30 segundos, con las llegadas en su hora real y un reloj que avanza. Los cambios de etapa sin hora registrada MUST mostrarse al final, en su etapa actual. Al terminar, la pantalla MUST volver al vivo sin perder eventos que hayan llegado mientras tanto.

#### Scenario: Llega un pedido durante la repetición
- **WHEN** entra un pedido real mientras se repite el día
- **THEN** al terminar la repetición ese pedido está en las cifras, en la escena y en la lista

### Requirement: Estado de la conexión
La pantalla SHALL mostrar si está "En vivo", "Reconectando…" o "Actualiza cada 30 s" (modo de respaldo). Al reconectar MUST ponerse al día con el estado actual y avisar cuántos cambios hubo mientras no había conexión.

#### Scenario: Se cae el internet un minuto
- **WHEN** vuelve la conexión
- **THEN** las cifras y la escena quedan iguales al estado real y aparece "Te pusimos al día: N cambios"

### Requirement: Accesible y liviana
Sin WebGL, la pantalla SHALL seguir mostrando cifras, etapas, lista y gráfica. Con "reducir movimiento" MUST quitar el movimiento de ambiente y cambiar las animaciones por transiciones cortas. Con la pestaña oculta o la escena fuera de pantalla, la escena MUST pausarse sin perder eventos. Las etapas y sus cifras MUST estar también en texto.

#### Scenario: Equipo sin WebGL
- **WHEN** el navegador no tiene WebGL
- **THEN** la pantalla muestra la franja de etapas, las cifras, la lista y la gráfica en vivo, sin mensaje de error técnico

### Requirement: Solo lectura
La pantalla MUST NOT cambiar estados de pedidos, despachar, crear ni editar nada. Tocar un pedido SHALL abrir su ficha (capacidad `ficha-en-vivo`), y desde ella su detalle en Pedidos.

#### Scenario: Tocar una caja
- **WHEN** el usuario toca la caja de un pedido
- **THEN** se abre la ficha del pedido sobre la escena, y "Abrir en Todos los pedidos" lleva a su detalle
