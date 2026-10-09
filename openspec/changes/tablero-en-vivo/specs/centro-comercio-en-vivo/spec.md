## Purpose

El centro de mando del comercio dentro de la pantalla En vivo: lo que el dueño o el equipo del comercio necesita para operar el día. Incluye qué hacer ya, el tablero de pedidos que se mueve solo, el pulso de su tienda, su proyección contra su récord, sus tiempos frente al promedio de Katuq y sus productos estrella.

## ADDED Requirements

### Requirement: Héroe del comercio
La pantalla del comercio SHALL mostrar arriba:
- las ventas de hoy en grande, con cifras que ruedan, la variación contra ayer a esta hora y el ticket promedio;
- la proyección al cierre contra el récord de pedidos del comercio en un día de los últimos 90 días, y un mini gráfico de ventas por hora de hoy contra ayer;
- el pulso de su tienda: una línea que late con cada pedido de los últimos 6 minutos, con los pedidos de la última hora y la mejor hora de hoy;
- las cifras de pedidos, en preparación, listos para salir, en camino, entregados y "Con Opttia". Tocar cada cifra abre la lista de esos pedidos (capacidad `ficha-en-vivo`).

Con D-349, todo MUST incluir solo los pedidos del vendedor.

#### Scenario: Camino al récord
- **WHEN** la proyección de pedidos del día supera el récord del comercio
- **THEN** la pantalla lo celebra una sola vez en el día

### Requirement: Atención ahora y lo próximo
La pantalla SHALL listar lo que necesita la operación, del más urgente al menos urgente. Cada punto lleva una sugerencia y la entrada a la ficha del pedido o del mensajero:

| Punto | Cuándo |
|---|---|
| Listo sin despachar (urgente) | un pedido lleva más de 45 minutos listo para salir; la sugerencia nombra un mensajero libre, o la transportadora si va a otra ciudad |
| Demorado | un pedido lleva más del doble de lo normal de hoy en su etapa, y al menos 60 minutos |
| Mensajero en la calle | un mensajero lleva más de 80 minutos fuera con pedidos |
| Sin pago | un pedido lleva más de 90 minutos sin pago confirmado |
| Racha | en la última hora llegaron al menos 5 pedidos y el doble de lo normal |

MUST mostrarse a lo sumo 3 listos, 2 demorados y 2 sin pago. Los tres puntos más urgentes con acción SHALL verse también en el panel flotante "Lo próximo", sobre la escena.

#### Scenario: Pedido listo hace una hora
- **WHEN** el pedido #1018 lleva 1 hora y 10 minutos listo para salir a Bogotá y Yeison está en bodega
- **THEN** aparece "#1018 lleva 1 h 10 min listo para salir", con la sugerencia "Yeison está en bodega: asígnaselo", y tocarlo abre la ficha del pedido

#### Scenario: Todo al día
- **WHEN** no hay nada listo, demorado ni sin pago
- **THEN** "Lo próximo" dice "Todo al día"

### Requirement: Tablero de pedidos en vivo
La pantalla del comercio SHALL ofrecer la vista "Pedidos": una columna por etapa (recibidos, producción, alistamiento, listos, en camino y entregados hoy) con una tarjeta por pedido. Cada tarjeta muestra el número, el cliente corto, la ciudad, el canal, el monto, la marca "Opttia" y cuánto lleva en esa etapa.
- La tarjeta MUST pasar con animación a su columna nueva cuando el pedido cambie de etapa, y los pedidos nuevos MUST entrar resaltados.
- La tarjeta que pase el tiempo normal de su etapa MUST marcarse. Los envíos con transportadora no se marcan en "En camino".
- Cada columna muestra hasta 40 tarjetas (los entregados, las 14 últimas) y cuántas quedan.

Tocar una tarjeta SHALL abrir la ficha del pedido.

#### Scenario: Un pedido cambia de etapa
- **WHEN** el pedido #1027 pasa de producción a alistamiento
- **THEN** su tarjeta viaja de la columna "En producción" a "Alistamiento" y los contadores de las dos columnas cambian

### Requirement: Tiempos frente al promedio de Katuq
La pantalla SHALL mostrar los tiempos de hoy del comercio (ciclo completo con sus mensajeros, preparación, espera para salir y entrega). También SHALL compararlos con la mediana de los comercios de Katuq: más rápido, igual o más lento, y en qué tramo pierde más tiempo. La comparación MUST NOT nombrar ni dejar identificar a otro comercio, y MUST mostrarse solo si en el cálculo hay al menos 5 comercios.

#### Scenario: Más lento que el promedio
- **WHEN** el ciclo del comercio es 20 % más largo que la mediana de Katuq y su tramo más largo es la espera para salir
- **THEN** la pantalla dice "Vas 20 % más lento que el promedio de los comercios de Katuq" y que el tiempo se le va esperando mensajero

### Requirement: Productos estrella
La pantalla SHALL mostrar los 6 productos más vendidos hoy por el comercio, con unidades y valor, sin contar pedidos cancelados ni rechazados. Con "ocultar clientes y montos" MUST ocultar los valores.

#### Scenario: Pedido cancelado
- **WHEN** se cancela un pedido con 2 unidades del producto más vendido
- **THEN** ese producto baja 2 unidades en la lista

### Requirement: Paneles sobre la escena
En pantallas anchas, "Lo próximo" y "Tu flota" SHALL flotar a la izquierda de la escena, y la lista de eventos a la derecha. "Tu flota" muestra cada mensajero, si está en bodega o en ruta, con cuántos pedidos y desde hace cuánto. La escena MUST encuadrarse para que nada quede tapado, y "Ampliar" MUST quitar los paneles.

#### Scenario: Mensajero en ruta
- **WHEN** Carlos sale con 2 pedidos
- **THEN** "Tu flota" lo muestra "En ruta · 2 · 0 min", y el tiempo sube mientras siga en la calle
