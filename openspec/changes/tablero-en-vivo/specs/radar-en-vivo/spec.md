## Purpose

Lo que la vista de toda Katuq le avisa al equipo para actuar a tiempo: qué comercio necesita ayuda o está en racha, cuánto tarda la operación de punta a punta, y la proyección y los récords del día. Todo se calcula en el servidor con los datos de la plataforma.

## ADDED Requirements

### Requirement: Radar de atención
La vista SHALL listar los comercios que necesitan atención, del más grave al menos grave, con lo que pasó, una sugerencia y la entrada a su tablero. Las reglas son:

| Alerta | Cuándo |
|---|---|
| Pedidos atascados (grave) | 2 o más pedidos llevan más de 75 minutos listos para salir |
| Silencio raro | el comercio lleva sin pedidos más de 50 minutos y más del tiempo que su ritmo hace probable (menos de 1 vez en 100) |
| Rechazos | 3 o más pedidos rechazados hoy y al menos el 10 % de sus pedidos |
| En racha (oportunidad) | en la última hora recibió al menos 6 pedidos y 2,4 veces su ritmo normal |

El ritmo normal de un comercio MUST salir de sus pedidos de hoy sin contar la última hora, ajustados a la curva de ayer a esa hora. Así una racha o un silencio no se miden contra sí mismos. MUST mostrarse una sola racha a la vez, la más fuerte. Las torres, los edificios y las tarjetas de los comercios con alerta MUST marcarse con un anillo o un borde del color de la alerta.

#### Scenario: Comercio callado de verdad
- **WHEN** un comercio que a esta hora recibe unos 5 pedidos por hora lleva 1 hora y 40 minutos sin pedidos
- **THEN** aparece "Sin pedidos hace 1 h 40 min", con la sugerencia de revisar su tienda o su integración

#### Scenario: Comercio pequeño en una pausa normal
- **WHEN** un comercio que recibe 2 pedidos por hora lleva 55 minutos sin pedidos
- **THEN** no aparece en el radar

#### Scenario: Pedidos atascados
- **WHEN** un comercio tiene 3 pedidos listos para salir desde hace más de 75 minutos
- **THEN** aparece como grave, y "Ver los pedidos" abre la ficha con esos 3 pedidos

#### Scenario: Durante "Repetir el día"
- **WHEN** se está repitiendo el día
- **THEN** el radar no cambia hasta que termine la repetición

### Requirement: Tiempos de la operación
La vista SHALL mostrar, con los pedidos de hoy de toda la plataforma, la mediana del ciclo completo con mensajero propio (de la llegada a la entrega) y sus tres partes: preparación (hasta listo para salir), espera para salir y entrega. También SHALL mostrar el comercio más rápido (con al menos 3 entregas) y la mediana de entrega con transportadora. Los tramos sin hora registrada MUST NOT contar.

#### Scenario: Dónde se pierde el tiempo
- **WHEN** la espera para salir es el tramo más largo del día
- **THEN** la barra del ciclo lo muestra como el tramo más ancho

### Requirement: Proyección y récords
La vista SHALL mostrar:
- la proyección al cierre del día en ventas y en pedidos, con lo que va de hoy y la curva de ayer a esta hora;
- el récord de pedidos en un día de los últimos 90 días, con su fecha;
- la mejor hora de hoy y el ritmo récord de hoy (pedidos por minuto en 5 minutos).

Cuando la proyección pase el récord, la vista MUST celebrarlo una sola vez por día.

#### Scenario: Camino al récord
- **WHEN** la proyección de pedidos supera el récord de 90 días
- **THEN** aparece "¡Katuq va camino a su récord de pedidos!" una sola vez en el día

### Requirement: Muro de comercios
La vista SHALL ofrecer el muro: una tarjeta por comercio que se ilumina con cada evento. Cada tarjeta muestra:
- ventas y pedidos de hoy;
- las barras por hora de hoy contra la línea de ayer;
- el último evento y su hora;
- cuántos pedidos tiene en preparación, listos, en camino y entregados;
- su estado: vendiendo, sin pedidos hace un rato, revisar o atención.

Tocar una tarjeta SHALL abrir el tablero del comercio.

#### Scenario: Pedido en un comercio del muro
- **WHEN** entra un pedido en un comercio con el muro abierto
- **THEN** su tarjeta se ilumina, sube su cifra y cambia su último evento
