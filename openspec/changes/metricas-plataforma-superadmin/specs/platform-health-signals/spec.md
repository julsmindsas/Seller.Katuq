## ADDED Requirements

### Requirement: Riesgo de abandono transparente
El sistema SHALL calcular un puntaje de riesgo por comercio real con componentes visibles y explicables: caída de pedidos frente al mes anterior, días sin ingreso, mora o falta de medio de pago, tickets de error abiertos, usuarios dormidos, ausencia de integración y calificación baja. SHALL mostrar los componentes y los pesos vigentes, y no cambiar de reglas sin cambiar de versión. Los comercios «no medidos» (`platform-history`) NOT aportan a ingresos ni usuarios dormidos.

#### Scenario: Explicación
- **WHEN** el Super Administrador abre el puntaje de un comercio en riesgo
- **THEN** ve cada componente con valor, peso y aporte

#### Scenario: Componente sin dato
- **WHEN** un componente no se puede calcular
- **THEN** se muestra «—», no aporta y el puntaje se rotula parcial

### Requirement: Antigüedad mínima
El riesgo SHALL excluir a los comercios con menos de [30 días, por confirmar] desde su alta y clasificarlos «nuevos».

#### Scenario: Comercio nuevo
- **WHEN** un comercio tiene cinco días y ningún pedido
- **THEN** figura como nuevo, no en riesgo

### Requirement: Segmentos accionables
El sistema SHALL ofrecer segmentos con criterio explicado y lista: nuevos sin primer pedido en 14 días, pagan sin medio de pago, premium con ventas en caída, gratuitos cerca del límite de integraciones, plan vencido o por vencer, e integraciones conectadas sin uso.

#### Scenario: Premium con ventas en caída
- **WHEN** un comercio premium vendió 40 % menos que el mes anterior
- **THEN** aparece en ese segmento con ambas cifras

### Requirement: Adopción de módulos
El sistema SHALL mostrar el porcentaje de comercios reales activos que usan cada módulo y qué módulos usan los que más venden. «Usado» SHALL basarse en actividad real; WHERE solo existe configuración, SHALL rotularse «configurado».

#### Scenario: Integración conectada sin tráfico
- **WHEN** una integración no tiene eventos en 30 días
- **THEN** cuenta «configurada», no «usada»

### Requirement: Calidad de datos
El sistema SHALL mostrar un panel con empresas sin fecha de alta, sin nombre, sin correo de facturación, sin ingreso conocido, con tipo de cuenta deducido o por confirmar, con plan no reconocido y con fechas sin zona, indicando cuántas y cuáles.

#### Scenario: Sin fecha de alta
- **WHEN** hay empresas sin fecha de alta
- **THEN** el panel las lista y las cifras de antigüedad las excluyen con aviso

### Requirement: Sugerencias de clientes
El sistema SHALL agrupar las sugerencias de los comercios por tema de una lista cerrada de etiquetas y por número de comercios distintos que las piden, y cruzarlas con los tickets de tipo idea. SHALL NOT mostrar el texto completo de tickets ni citas literales con datos personales, y la asignación de tema SHALL NOT depender de que el modelo lea texto libre con herramientas.

#### Scenario: Tema repetido
- **WHEN** siete comercios distintos piden lo mismo
- **THEN** el tema aparece con «7 comercios»

### Requirement: Motivo de baja estructurado
WHEN un comercio pasa a baja o inactivo, el Super Administrador SHALL poder registrar un motivo de una lista cerrada más un comentario. El sistema SHALL agrupar las bajas por motivo y NOT enviar el comentario al modelo.

#### Scenario: Baja por precio
- **WHEN** se registra la baja con motivo «precio»
- **THEN** el tablero cuenta esa baja bajo «precio»

### Requirement: Señales sin acciones automáticas
Las señales SHALL informar y SHALL NOT enviar mensajes, cambiar planes ni bloquear cuentas.

#### Scenario: Comercio en riesgo alto
- **WHEN** un comercio supera el umbral
- **THEN** solo aparece en las listas

### Requirement: Rendimiento y fases
Las señales SHALL responder dentro del límite de frescura de `platform-metrics-definitions`, sin lecturas pesadas por petición. En F1 los segmentos y la calidad de datos SHALL usar agregados existentes, la adopción SHALL rotularse «configurado» y el riesgo «parcial»; en F2 se suman adopción «usada», tendencia y motivo de baja agrupado.

#### Scenario: Abrir segmentos
- **WHEN** el Super Administrador abre un segmento
- **THEN** la lista aparece sin recalcular desde los pedidos
