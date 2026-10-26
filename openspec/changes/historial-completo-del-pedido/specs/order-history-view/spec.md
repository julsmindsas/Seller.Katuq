## ADDED Requirements

### Requirement: Acceso a «Historial del pedido» (F1)
La opción «Historial de estados y movimientos» del menú del pedido SHALL llamarse «Historial del pedido» y SHALL abrir la vista del historial de ese pedido. La vista SHALL tener un botón «Cerrar» secundario: blanco con borde, no el botón principal.

#### Scenario: Abrir el historial
- **WHEN** el usuario toca «Historial del pedido» en un pedido
- **THEN** ve el historial de ese pedido y lo cierra con «Cerrar»

### Requirement: Resumen arriba (F1)
La vista SHALL empezar con un resumen del pedido:

- número y cliente;
- total y saldo;
- estados actuales de proceso, pago y entrega;
- quién lo creó, cuándo y desde dónde;
- cuántos eventos tiene y cuál fue el último cambio.

#### Scenario: Pedido con saldo
- **WHEN** el usuario abre el historial de un pedido de $200.000 con $50.000 pagados
- **THEN** el resumen muestra el total $200.000 y el saldo $150.000 resaltados

### Requirement: Línea de tiempo por día (F1)
Los eventos SHALL mostrarse agrupados por día («Hoy», «Ayer» o la fecha), del más reciente al más antiguo, con la opción de invertir el orden.

Cada evento SHALL mostrar:

- la hora de Colombia con segundos;
- el usuario, con su nombre y rol;
- el origen;
- un ícono y un color según el tipo (creación, estado, pago, edición, sistema, integración, facturación, cliente);
- sus detalles antes → después;
- el motivo.

Los montos de plata SHALL ir resaltados, con la diferencia en más o en menos.

#### Scenario: Evento de descuento
- **WHEN** el historial tiene un descuento que bajó el total de $200.000 a $180.000
- **THEN** el evento muestra «$200.000 → $180.000 (−$20.000)» resaltado, con el usuario, la hora con segundos y el motivo

### Requirement: Registros reconstruidos a la vista (F1)
WHERE un evento es reconstruido, la vista SHALL marcarlo «registro reconstruido», con la aclaración de que sale de los datos actuales del pedido, y SHALL distinguirlo de los eventos reales.

#### Scenario: Pedido anterior a la F1
- **WHEN** el usuario abre el historial de un pedido anterior a la F1
- **THEN** la creación y los pagos llevan la marca «registro reconstruido»

### Requirement: Carga por partes (F1)
La vista SHALL cargar los eventos por páginas de hasta 50, con «Ver más», y la primera página SHALL aparecer en menos de 1,5 s (p95) para pedidos de hasta 500 eventos.

#### Scenario: Pedido con muchos eventos
- **WHEN** un pedido tiene 180 eventos
- **THEN** la vista muestra los 50 más recientes y carga los siguientes al tocar «Ver más»

### Requirement: Filtros y buscador (F2)
La vista SHALL permitir:

- filtrar por tipo de evento y por usuario;
- buscar un texto en los detalles y en los motivos.

El resumen SHALL indicar cuántos eventos quedan visibles con los filtros activos.

#### Scenario: Solo pagos de una persona
- **WHEN** el usuario filtra por tipo «Pagos» y por usuario «Ana»
- **THEN** ve solo los pagos que registró, editó o anuló Ana, y el contador lo refleja

### Requirement: Comparar entre dos fechas (F4)
WHEN el usuario escoge dos momentos, la vista SHALL mostrar los campos del pedido que cambiaron entre ambos, con el valor en el primer momento y en el segundo. IF alguno de los momentos es anterior a la F1, THEN SHALL avisar que no hay foto real para ese momento.

#### Scenario: Antes y después de una edición
- **WHEN** el usuario compara el 10 de noviembre a las 9:00 con el 12 de noviembre a las 18:00
- **THEN** ve solo los campos que cambiaron entre esas dos horas, cada uno con su valor en ambos momentos

### Requirement: Exportar a PDF y Excel (F4)
La vista SHALL exportar el historial, con los filtros aplicados, a PDF y a Excel. La exportación SHALL incluir:

- el número del pedido y la empresa;
- quién la generó y cuándo;
- todos los campos de cada evento.

En Excel, los montos SHALL ir como números.

#### Scenario: Exportar para un reclamo
- **WHEN** el usuario exporta a Excel el historial filtrado por «Pagos»
- **THEN** descarga un archivo con una fila por evento de pago, con la fecha y hora, el usuario, el origen, el monto, el saldo antes → después y el motivo

### Requirement: Lenguaje y diseño Katuq
La vista SHALL hablar en lenguaje de negocio, sin nombres técnicos de campos ni de funciones. Por ejemplo, dice «Cliente editado» y no `updateOrderInternal`.

La vista SHALL seguir `openspec/specs/design-system/spec.md` y la regla de diseño Katuq:

- plana y sin gradientes;
- pares semánticos de color fuerte con fondo suave;
- labels en MAYÚSCULA con color muted;
- estado vacío con ícono, título y texto corto;
- sin scroll horizontal a 1440 px ni a 390 px.

#### Scenario: Pedido sin eventos reales ni reconstruibles
- **WHEN** no hay nada que mostrar
- **THEN** aparece el estado vacío «Este pedido aún no tiene movimientos», sin mensajes técnicos
