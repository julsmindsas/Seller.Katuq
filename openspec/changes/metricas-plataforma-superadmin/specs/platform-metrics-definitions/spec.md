## ADDED Requirements

### Requirement: Universo de comercio real
El sistema SHALL calcular todos los totales de plataforma sobre «comercios reales». El sistema SHALL excluir de los totales las cuentas internas (Julsmind), demo, prueba y cortesía, SHALL listarlas aparte con su motivo y SHALL rotular cada cifra con su universo. La empresa operadora SHALL identificarse por un identificador configurado, no por su nombre.

#### Scenario: Cuenta de cortesía
- **WHEN** una empresa está marcada como cortesía
- **THEN** no suma en activas, premium, pedidos, usuarios, riesgo ni ingresos, y aparece en «Cuentas excluidas» con su motivo

#### Scenario: Julsmind
- **WHEN** se calcula el total de comercios
- **THEN** la empresa operadora no se cuenta como comercio

### Requirement: Tipo de cuenta explícito
El sistema SHALL ofrecer un tipo de cuenta por empresa con al menos los valores real, demo, prueba, cortesía e interna. WHEN una empresa no tiene tipo de cuenta, el sistema SHALL deducirlo y marcarlo «deducido». La deducción SHALL usar, en este orden de precedencia: empresa operadora, exclusión de métricas ya marcada, cortesía de cobro, lista manual de cortesía, señales de demo o prueba. IF las señales entran en conflicto (por ejemplo, cortesía con pagos reales aprobados), THEN el tipo SHALL quedar «por confirmar», SHALL NOT excluirse en silencio de los totales y SHALL aparecer en la calidad de datos.

#### Scenario: Cuenta sin tipo
- **WHEN** una empresa de cortesía antigua no tiene tipo de cuenta
- **THEN** se trata como cortesía, se rotula «deducido» y la calidad de datos la señala como pendiente de confirmar

#### Scenario: Señales en conflicto
- **WHEN** una empresa tiene la señal de cortesía y un pago aprobado de Wompi
- **THEN** su tipo es «por confirmar», sigue dentro de los totales y se avisa en la calidad de datos

#### Scenario: Cambio de tipo
- **WHEN** el Super Administrador cambia una empresa de demo a real
- **THEN** entra a los totales desde el siguiente cálculo y el cambio queda auditado (`platform-access`)

### Requirement: Mes oficial por fecha de creación, versionado
El sistema SHALL asignar cada pedido al mes de su fecha de creación, en hora de Colombia, para todas las cifras mensuales oficiales. La referencia de mes SHALL formar parte de la versión de la regla, de modo que cambiarla genere una versión nueva sin reescribir cifras ni cierres anteriores. El sistema MAY ofrecer una vista secundaria por fecha de entrega, rotulada «por entrega» y nunca mezclada con las oficiales. El «mes actual» SHALL incluir todo pedido creado desde el inicio del mes hasta el momento del cálculo, sin importar su fecha de entrega.

#### Scenario: Pedido creado hoy con entrega futura
- **WHEN** un pedido se crea hoy y su entrega es el día 25
- **THEN** cuenta en el mes actual oficial desde hoy

#### Scenario: Entrega editada
- **WHEN** se edita la fecha de entrega de un pedido de un mes cerrado
- **THEN** las cifras oficiales de ese mes no cambian

### Requirement: Fechas normalizadas
El sistema SHALL interpretar toda fecha de pedido o pago como un instante con zona horaria conocida antes de asignarla a un día o mes. WHERE una fecha viene sin hora o sin zona, el sistema SHALL asumir la hora de Colombia y SHALL contarla en la calidad de datos. El «día» y el «mes» de toda cifra SHALL ser de hora de Colombia; la zona horaria del ciclo de cobro se anota «a verificar en el diseño».

#### Scenario: Borde de mes
- **WHEN** un pedido llega con -05:00 a las 23:30 del último día del mes
- **THEN** cuenta en ese mes y no en el siguiente

### Requirement: Una sola definición de venta válida
El sistema SHALL usar una única regla de «venta válida» para ventas, GMV, ticket promedio, comercios con venta, número de pedidos y clientes con actividad: excluye pedidos cancelados, anulados, duplicados, de ejemplo y de prueba. El valor del pedido SHALL calcularse con una única regla (impuesto incluido) que coincida con la del cobro de la suscripción, incluso cuando el total viene en cero o ausente. La regla SHALL tener identificador de versión visible. El módulo de Cobros SHALL usar el mismo universo de comercios reales.

#### Scenario: Total en cero
- **WHEN** un pedido válido trae total 0 pero tiene subtotal e impuesto
- **THEN** la plataforma y el cobro lo valoran con el mismo monto

#### Scenario: Pedido cancelado
- **WHEN** un pedido está cancelado
- **THEN** no cuenta en ventas, GMV, ticket, número de pedidos ni clientes con actividad

### Requirement: Estados de ciclo, activa, premium y plan de pago
El sistema SHALL definir con el estado de ciclo de vida de la empresa dos conjuntos distintos: **activa** = activo o en mora; **se cobra** = activo, en mora o suspendido (el conjunto de la mora y el por cobrar). Prueba, pausado, bloqueado, cancelado y eliminado no son activas ni se cobran. **Plan de pago** SHALL ser todo plan normalizado distinto de gratuito; **premium** = plan de pago; **freemium** = el resto. IF el plan tiene un valor no reconocido, THEN SHALL tratarse como desconocido («—»), no como gratuito ni de pago, y aparecer en la calidad de datos. La misma definición SHALL aplicar a tarjeta, tabla, exportación y Opttia, publicada en un diccionario de métricas que Opttia cite con el mismo texto.

#### Scenario: Empresa que paga y la bandera antigua dice inactiva
- **WHEN** una empresa tiene plan de pago y estado de ciclo activo, pero la bandera antigua de activo está en falso
- **THEN** se clasifica activa, premium y cobrable en todas las pantallas

#### Scenario: Empresa suspendida
- **WHEN** una empresa está suspendida
- **THEN** no es activa, sí está en «se cobra» para mora y por cobrar, y no suma en contratado

### Requirement: Desconocido no es cero
WHEN no hay datos para calcular una cifra, el sistema SHALL devolver y mostrar «—», nunca 0. IF un cálculo parcial falla, THEN el sistema SHALL marcar la cifra como incompleta y SHALL NOT conservarla como definitiva.

#### Scenario: Comercio sin pedidos
- **WHEN** un comercio no tiene pedidos en el periodo
- **THEN** sus ventas del periodo son 0 y su ticket promedio es «—»

### Requirement: Fecha del dato y versión de regla
El sistema SHALL acompañar cada cifra con la fecha de cálculo y la versión de la regla. WHEN las reglas cambian, el sistema SHALL conservar la versión anterior identificable y explicar el cambio a quien consulta.

#### Scenario: Cambio de regla
- **WHEN** se publica una versión nueva de la regla de venta válida
- **THEN** las cifras nuevas muestran la versión nueva y los snapshots antiguos conservan la suya

### Requirement: Un solo cálculo para todas las superficies
La pantalla, las exportaciones y Opttia SHALL mostrar las mismas cifras para la misma pregunta y momento. El front SHALL NOT recalcular totales con reglas propias.

#### Scenario: Acción sobre una empresa
- **WHEN** el Super Administrador cambia el tipo de cuenta de una empresa
- **THEN** los totales se actualizan con el cálculo del servidor y no saltan por un recálculo local

### Requirement: Empresas completas y último ingreso por empresa
El sistema SHALL incluir toda empresa existente aunque le falten datos, y reportarla en la calidad de datos. El último ingreso SHALL atribuirse por empresa y usuario, nunca por un correo suelto; IF no puede atribuirse con certeza a la empresa, THEN SHALL mostrarse «—». La antigüedad y «nuevo» SHALL calcularse solo con la fecha de alta real; IF no hay alta, THEN la empresa queda excluida de esas cifras y no se usa el inicio de suscripción como alta.

#### Scenario: Empresa sin nombre
- **WHEN** una empresa no tiene nombre comercial
- **THEN** aparece con su identificador y marcada como dato incompleto

#### Scenario: Último ingreso no atribuible
- **WHEN** el último ingreso de un usuario no puede atribuirse con certeza a una empresa
- **THEN** el último ingreso de esa empresa es «—»

### Requirement: Rendimiento y frescura
El cálculo SHALL traer solo los campos necesarios y paginar las lecturas de colecciones grandes. Las cifras de plataforma SHALL tener una antigüedad máxima de [24 horas, por confirmar] y SHALL declararla. WHEN el corte cruza a un mes nuevo, ninguna cifra mensual SHALL seguir mostrándose con el mes anterior. Las cifras clave del tablero SHALL responder en menos de [3 segundos, por confirmar]. WHEN se pide recalcular, el sistema SHALL evitar dos recálculos a la vez. Si el diseño necesita precalcular, requiere aprobación como excepción a «sin capas de cache nuevas» (propuesta, Riesgos).

#### Scenario: Recálculo simultáneo
- **WHEN** dos recálculos se piden a la vez
- **THEN** solo uno corre y el otro recibe el estado «en curso»

#### Scenario: Cambio de mes
- **WHEN** son las 00:01 del día 1 en Colombia
- **THEN** «mes actual» muestra el mes nuevo y no la cifra del mes anterior
