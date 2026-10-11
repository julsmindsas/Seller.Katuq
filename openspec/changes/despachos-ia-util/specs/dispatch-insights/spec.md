# Spec delta — dispatch-insights

## ADDED Requirements

### Requirement: Qué despachar hoy
El sistema SHALL ordenar la cola lista para despachar en tramos por fecha pactada (vencido hace 1 a 3 días, para hoy, para mañana) y agruparla por ciudad o zona.

#### Scenario: cola en tramos
- **WHEN** hay pedidos listos para despachar con fecha pactada hoy, mañana o vencida hace 1 a 3 días
- **THEN** the system SHALL listarlos en ese orden de prioridad, con número de pedido, ciudad, franja horaria y saldo por cobrar

#### Scenario: atrasado
- **WHEN** un pedido listo para despachar tiene la fecha pactada vencida hace 4 a 15 días
- **THEN** the system SHALL dejarlo en la cola como "atrasado", después de mañana, primero los menos viejos

#### Scenario: vencido hace más de 15 días
- **WHEN** un pedido listo para despachar tiene la fecha pactada vencida hace más de 15 días
- **THEN** the system SHALL sacarlo de la cola y mostrarlo como aviso de pedido posiblemente desactualizado (medido: en OH MY STORE 354 de 355 pendientes tenían la fecha vencida hace más de 3 días)

#### Scenario: armar rutas
- **WHEN** varios pedidos de la cola de hoy son de la misma ciudad o zona
- **THEN** the system SHALL mostrar cuántos hay por ciudad o zona, de mayor a menor

#### Scenario: cancelados
- **WHEN** un pedido está cancelado, anulado o rechazado
- **THEN** the system SHALL excluirlo

### Requirement: Despachados sin cerrar y plata por cobrar
El sistema SHALL mostrar los pedidos en "Despachado" hace más de 3 días, agrupados por transportador, con el saldo por cobrar.

#### Scenario: por transportador
- **WHEN** hay despachados sin cerrar
- **THEN** the system SHALL mostrar, por transportador, cuántos pedidos y cuánta plata por cobrar tiene, de mayor a menor plata

#### Scenario: sin transportador
- **WHEN** un despachado no tiene transportador
- **THEN** the system SHALL agruparlo como "Sin transportador" y contarlo como aviso

### Requirement: Avisos de despachos
El sistema SHALL detectar con código un catálogo cerrado de avisos: sin fecha de entrega, sin ciudad o dirección, despachado sin transportador, problema reportado por la transportadora, empacado o en despacho hace más de 2 días, y listo para despachar vencido hace más de 3 días.

#### Scenario: nada que avisar
- **WHEN** el código no detecta avisos
- **THEN** the system SHALL decir que no hay avisos

### Requirement: La IA no produce cifras ni datos del cliente
El sistema SHALL calcular con código toda cifra; la IA SHALL redactar frases sobre los elementos entregados, y SHALL NOT recibir nombre, teléfono ni dirección exacta del cliente final.

#### Scenario: elemento inventado
- **WHEN** la IA nombra un pedido o un transportador que no estaba en la entrada
- **THEN** the system SHALL descartarlo

#### Scenario: Opttia no responde
- **WHEN** Opttia falla
- **THEN** the system SHALL mostrar las cifras calculadas y avisar que el texto no está disponible

### Requirement: Solo lectura y por empresa
El sistema SHALL calcular solo con pedidos de la empresa de la sesión y SHALL NOT escribir en Firestore.

#### Scenario: estados intactos
- **WHEN** se calcula o se explica
- **THEN** pedidos, órdenes de envío y transportadores SHALL permanecer sin cambios
