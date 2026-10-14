## ADDED Requirements

### Requirement: Ubicar pedidos con barrio y zona de cobro
WHEN el mapa de Despachos ubica un pedido sin coordenadas, the system SHALL consultar su dirección y ciudad junto con el barrio y la zona de cobro del envío, y SHALL aceptar solo un resultado validado contra esa área (modo estricto de dirección de entrega).

#### Scenario: Pedido con barrio y zona
- **WHEN** un pedido tiene dirección "Cra 20 #10-15", ciudad "Medellín", barrio "San Antonio de Prado" y zona de cobro "Rural"
- **THEN** la consulta incluye barrio y zona, y el punto pintado cae dentro de esa área

#### Scenario: Pedido sin barrio ni zona
- **WHEN** el envío no trae barrio ni zona de cobro
- **THEN** el pedido se ubica con dirección y ciudad, con la misma validación estricta

### Requirement: Nunca pintar un punto aproximado
IF un pedido no se puede ubicar con confianza, THEN the system SHALL dejarlo sin punto en el mapa y SHALL NOT pintarlo en el centro de la ciudad ni en ningún punto aproximado.

#### Scenario: Dirección que no se encuentra
- **WHEN** ningún proveedor devuelve un resultado confiable para el pedido
- **THEN** el pedido no aparece en el mapa y aparece en la lista "Sin ubicar"

#### Scenario: Punto puesto por una persona
- **WHEN** el pedido ya tiene un punto protegido (marcado en el mapa, enlace o GPS, D-417)
- **THEN** no se vuelve a ubicar y se pinta donde está

### Requirement: Lista "Sin ubicar"
WHILE haya pedidos que no se pudieron ubicar, the system SHALL mostrarlos junto al mapa con número de pedido, cliente, dirección y un motivo en lenguaje de negocio, sin códigos técnicos.

#### Scenario: Motivos
- **WHEN** un pedido no tiene dirección escrita o es de relleno
- **THEN** el motivo dice "Falta la dirección"
- **WHEN** la dirección no se encontró con confianza
- **THEN** el motivo dice "No encontramos esta dirección en el mapa"

#### Scenario: Todos ubicados
- **WHEN** todos los pedidos quedaron ubicados
- **THEN** la lista no se muestra

### Requirement: Avance de la ubicación al estilo Katuq
WHILE se ubican pedidos, the system SHALL mostrar una sola tarjeta compacta sobre el mapa con el texto "Ubicando pedidos en el mapa · N de M" y una barra de avance, sin velo sobre el mapa, y SHALL pintar cada pedido apenas se ubica. WHEN termina, the system SHALL mostrar durante unos segundos el resumen "X ubicados · Y sin ubicar".

#### Scenario: Mapa usable mientras ubica
- **WHEN** se están ubicando 30 pedidos
- **THEN** el mapa se puede mover y los pedidos ya ubicados se ven, y la tarjeta dice "Ubicando pedidos en el mapa · 12 de 30"

#### Scenario: Resumen final
- **WHEN** termina con 28 ubicados y 2 sin ubicar
- **THEN** la tarjeta muestra "28 ubicados · 2 sin ubicar" y desaparece sola

#### Scenario: Tema visual
- **WHEN** se muestra la tarjeta de avance
- **THEN** es blanca, con acento #5F3FE0 plano y sin gradientes, y no hay barra azul en el encabezado de Despachos

### Requirement: Solo lectura de pedidos
The system SHALL NOT escribir en `orders` al ubicar pedidos en el mapa; las coordenadas encontradas viven solo en la pantalla.

#### Scenario: Recargar Despachos
- **WHEN** se ubican pedidos y se recarga la pantalla
- **THEN** ningún documento de `orders` cambió
