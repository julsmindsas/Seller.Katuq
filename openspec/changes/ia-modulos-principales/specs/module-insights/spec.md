# Spec delta — module-insights

## ADDED Requirements

### Requirement: Clientes para recuperar
El sistema SHALL listar los clientes con 3 o más días de compra en 12 meses, cadencia de 7 o más días y más de 1,5 veces su cadencia (y al menos 30 días) sin comprar, ordenados por valor comprado.

#### Scenario: varias compras el mismo día
- **WHEN** un cliente tiene varios pedidos el mismo día
- **THEN** the system SHALL contarlos como una sola compra para la cadencia

#### Scenario: mensaje sugerido
- **WHEN** Opttia devuelve una plantilla con `{nombre}` y sin números
- **THEN** the system SHALL ofrecer un enlace de WhatsApp con el primer nombre del cliente, que la persona abre y envía

### Requirement: A quién cobrar primero
El sistema SHALL usar la cartera calculada por tesorería, sin recalcularla, y ordenar los clientes por saldo vencido y luego por saldo.

#### Scenario: misma cifra que la pantalla Cartera
- **WHEN** se muestra el total por cobrar
- **THEN** the system SHALL mostrar el mismo total que la pantalla Cartera

#### Scenario: roles
- **WHEN** quien consulta no tiene un rol de tesorería
- **THEN** the system SHALL negar la consulta de cartera

### Requirement: Pedidos que necesitan atención
El sistema SHALL señalar los pedidos por producir con entrega hoy o mañana, pagados hace más de 3 días sin empezar, y sin pago hace más de 2 días sin despachar, excluyendo contraentrega y crédito.

### Requirement: Privacidad y solo lectura
El sistema SHALL NOT enviar a Opttia nombres, teléfonos ni documentos de clientes, y SHALL NOT escribir en Firestore.

#### Scenario: vendedor restringido
- **WHEN** quien consulta tiene métricas propias
- **THEN** the system SHALL calcular solo con los pedidos que tiene asignados
