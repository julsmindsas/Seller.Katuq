## ADDED Requirements

### Requirement: El embudo de la pauta hasta el pago
El sistema SHALL mostrar al Super Admin de Julsmind, en Marketing → Pauta, para un rango de fechas de registro y por campaña y anuncio:

- gasto;
- registros;
- con producto propio;
- con tienda publicada;
- con primer pedido real;
- con pago;
- costo por registro, por primer pedido y por cliente que paga;
- ingreso cobrado a los clientes que pagaron.

Cada etapa SHALL mostrar cuántas empresas pasan de la anterior, en número y porcentaje.

#### Scenario: Campaña con un cliente pagado
- **WHEN** una campaña gastó $140.000, trajo 20 registros y 1 de ellos pagó $108.000
- **THEN** la fila muestra costo por registro $7.000, costo por cliente que paga $140.000 e ingreso $108.000

#### Scenario: Orgánico
- **WHEN** hay registros sin campaña
- **THEN** aparecen en una fila "Orgánico" sin gasto, para comparar

### Requirement: Solo Julsmind lo ve
La pantalla y sus datos SHALL estar disponibles solo para usuarios Super Administrador de Julsmind. Cualquier otro usuario SHALL recibir acceso denegado del servidor, aunque conozca la ruta.

#### Scenario: Administrador de un comercio
- **WHEN** el administrador de un comercio entra a `/marketing/pauta`
- **THEN** el servidor responde acceso denegado y la pantalla no muestra datos

### Requirement: Mismos criterios que los demás números de pauta
El embudo SHALL contar las empresas con los mismos criterios que la métrica de registros por campaña: sin excluidas de métricas, sin cuentas de prueba y sin correos sin confirmar. Las etapas SHALL usar las mismas definiciones que los eventos enviados a Meta.

#### Scenario: Comparar con la consola
- **WHEN** se mira el mismo rango en la consola y en el embudo
- **THEN** el número de registros por campaña es el mismo

### Requirement: Resumen diario por correo
Todos los días a las 7:00 (hora Colombia), el sistema SHALL enviar a los destinatarios configurados un resumen con:
- lo de ayer y lo de los últimos 7 días: gasto, registros, costo por registro, primeros pedidos, pagos y costo por cliente que paga;
- los anuncios con gasto mayor a un umbral configurable en los últimos 3 días y sin registros, con la recomendación "pausarlo".

El resumen SHALL NOT pausar ni cambiar nada en Meta.

#### Scenario: Anuncio que gasta sin traer
- **WHEN** un anuncio gastó $45.000 en 3 días sin registros y el umbral es $30.000
- **THEN** el resumen lo lista en "Para pausar" con su gasto y un enlace al Administrador de anuncios

#### Scenario: Día sin datos de Meta
- **WHEN** la lectura de Meta falló
- **THEN** el resumen sale igual, con registros, pedidos y pagos, y dice "No pudimos leer el gasto de Meta"

### Requirement: Rápido y sin cargar la base
El embudo de 30 días SHALL responder en 5 segundos o menos (p95), con las consultas limitadas a las empresas registradas en el rango.

#### Scenario: Rango de 90 días
- **WHEN** se piden 90 días
- **THEN** la respuesta llega sin leer empresas registradas fuera del rango
