## MODIFIED Requirements

### Requirement: El cierre exige dirección confirmada y resumen consistente

Antes de pedir el cierre de un pedido, el agente SHALL haber confirmado la
forma de entrega y la fecha de entrega (validadas por el backend contra los
maestros del comercio), y con entrega a domicilio SHALL haber confirmado además
dirección y ciudad. El resumen del carrito SHALL listar producto, cantidad,
precio unitario y total con el mismo formato en toda la conversación, e
incluir la entrega y la fecha acordadas. La configuración capturada SHALL
sobrevivir entre turnos en la sesión del bot — no se repregunta lo ya
respondido.

#### Scenario: Cierre con entrega configurada

- **WHEN** el cliente confirma que quiere cerrar el pedido
- **THEN** el bot repite el resumen completo: productos, total, forma de entrega, fecha y (si es domicilio) dirección y ciudad
- **AND** si falta la forma o la fecha, las pide antes de cerrar

#### Scenario: La conversación se corta y vuelve

- **WHEN** el cliente ya había dicho "domicilio el viernes" y vuelve a escribir horas después
- **THEN** el bot no vuelve a preguntar la entrega ni la fecha — están en la sesión
