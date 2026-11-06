## ADDED Requirements

### Requirement: Cifras de dinero separadas
El sistema SHALL presentar por separado contratado (estimado), cobrado (real), por cobrar y mora, y SHALL NOT llamar «ingreso» a una estimación sin rotularla. El contratado SHALL sumar solo comercios reales activos con plan de pago (fórmulas en `platform-metrics-formulas`). El cobrado SHALL sumar pagos aprobados y pagos manuales vigentes, ubicados por su **fecha efectiva de pago** en hora de Colombia.

#### Scenario: Plan anual
- **WHEN** un comercio paga un plan anual
- **THEN** el contratado mensual suma su equivalente mensual y el cobrado muestra el año completo en el mes de la fecha efectiva

#### Scenario: Empresa suspendida
- **WHEN** una empresa está suspendida
- **THEN** no suma en contratado, se muestra aparte y su deuda sigue en mora

### Requirement: La verdad del cobrado
El cobrado SHALL salir de los pagos aprobados por Wompi y de los pagos manuales. Solo SHALL contar un pago de Wompi cuya aprobación esté verificada con el proveedor; un evento duplicado o sin verificar NOT cuenta. El sistema SHALL contar una sola vez un mismo pago visible en varias fuentes y SHALL señalar las discrepancias para revisión. Las referencias de transacción SHALL mostrarse parcialmente en listados.

#### Scenario: Pago en dos fuentes
- **WHEN** el mismo pago de Wompi aparece en la factura y en el historial de la suscripción
- **THEN** suma una sola vez

#### Scenario: Fuentes que discrepan
- **WHEN** la factura figura pagada y no existe pago aprobado asociado
- **THEN** se señala «por revisar» y no se mezcla en silencio con el cobrado confirmado

#### Scenario: Pago sin verificar
- **WHEN** llega un aviso de pago aprobado que el proveedor no confirma
- **THEN** no entra al cobrado

### Requirement: Pago manual
El Super Administrador SHALL poder marcar el pago de un periodo de un comercio como pagado fuera de Wompi (por ejemplo, transferencia). El registro SHALL incluir comercio, **periodo cubierto**, **fecha efectiva del pago** (distinta de la de registro), monto, medio, soporte, quién y cuándo lo registra. El sistema SHALL rechazar un registro incompleto. El registro SHALL ser solo de anexar: una corrección es un nuevo registro que anula al anterior con motivo, hecho por un usuario distinto del que lo creó o con confirmación reforzada. El pago manual SHALL NOT modificar facturas, suscripciones, próximo cobro ni escalones. Cada pago manual SHALL llevar una clave de idempotencia: repetir el envío NOT crea un segundo registro. Un monto atípico respecto al escalón del comercio SHALL mostrar una advertencia antes de guardar. Un pago manual SHALL rotularse «manual» en toda cifra y exportación.

#### Scenario: Transferencia
- **WHEN** el Super Administrador registra una transferencia con periodo, fecha efectiva, monto, medio y soporte
- **THEN** el cobrado, el por cobrar, la mora y el estado de pago del comercio la reflejan, y queda auditado quién y cuándo

#### Scenario: Registro incompleto
- **WHEN** falta periodo, fecha efectiva, monto, medio o soporte
- **THEN** el sistema rechaza el registro y no guarda nada

#### Scenario: Doble clic
- **WHEN** el mismo envío llega dos veces con la misma clave
- **THEN** existe un solo registro

#### Scenario: Corrección
- **WHEN** se registró un monto equivocado
- **THEN** otro usuario (o el mismo con confirmación reforzada) lo anula con motivo y se crea uno nuevo; ambos quedan visibles

#### Scenario: Usuario sin autorización
- **WHEN** un usuario que no es Super Administrador de la empresa operadora intenta registrar un pago manual
- **THEN** el servidor lo rechaza y no guarda nada

### Requirement: Efecto del pago manual en mora y por cobrar
WHEN existe un pago manual vigente cuyo periodo cubre una factura vencida o pendiente, el sistema SHALL tratar esa factura como saldada manualmente: SHALL excluirla de mora y de por cobrar, sin modificar la factura, y SHALL mostrarla así en la ficha. WHEN el pago manual es de un plan anual, SHALL cubrir los doce meses desde el inicio de su periodo. WHEN el pago manual se anula, la factura SHALL volver a mora o por cobrar según su vencimiento.

#### Scenario: Factura vencida y transferencia
- **WHEN** una factura de octubre está vencida y se registra un pago manual del periodo de octubre
- **THEN** la mora no la cuenta, el comercio sale de la mora y la factura aparece «saldada manualmente»

#### Scenario: Anulación
- **WHEN** ese pago manual se anula
- **THEN** la factura vuelve a contar en la mora con sus días de atraso

### Requirement: Registro tardío y cierre de mes
WHEN la fecha efectiva de un pago manual cae en un mes ya cerrado, el cierre oficial de ese mes SHALL NOT cambiar y SHALL mostrarse un ajuste rotulado «posterior al cierre» en la cifra viva de ese mes.

#### Scenario: Pago de octubre registrado en noviembre
- **WHEN** el 5 de noviembre se registra un pago con fecha efectiva del 28 de octubre
- **THEN** el cierre de octubre no cambia y octubre muestra un ajuste «posterior al cierre» visible

### Requirement: Reclasificación visible
WHEN una cuenta se reclasifica a cortesía, demo o prueba y tiene mora abierta, el sistema SHALL listarla en una vista de «reclasificadas con mora abierta» para revisión del dueño.

#### Scenario: Cortesía con deuda
- **WHEN** una cuenta con una factura vencida se cambia a cortesía
- **THEN** aparece en esa vista con la deuda y la fecha del cambio

### Requirement: Último pago aprobado
El sistema SHALL derivar un único «último pago aprobado» por comercio (fecha, monto, medio, transacción) de los pagos aprobados de Wompi y los pagos manuales vigentes. La «última factura» SHALL mostrarse aparte y no presentarse como pago.

#### Scenario: Factura vencida más reciente
- **WHEN** la factura más reciente está vencida y la anterior está pagada
- **THEN** el último pago aprobado es el de la anterior y la fila indica además la factura vencida

#### Scenario: Nunca ha pagado
- **WHEN** un comercio no tiene pagos
- **THEN** muestra «sin pagos», no una fecha ni un cero

### Requirement: Mora
La mora SHALL sumar las facturas vencidas de comercios reales en estado que se cobra, netas de pagos manuales vigentes, con días de atraso desde el vencimiento. La franja, la lista y las exportaciones SHALL usar la misma regla y excluir cortesía, demo e inactivas.

#### Scenario: Tarjeta y lista
- **WHEN** el Super Administrador compara la tarjeta de mora con la suma de la lista
- **THEN** coinciden

### Requirement: Estado del cobro automático visible
El sistema SHALL mostrar la fecha de la última ejecución del cobro automático. IF han pasado más de [26 horas, por confirmar] desde esa ejecución, THEN SHALL advertir que la mora puede estar desactualizada.

#### Scenario: Ejecución antigua
- **WHEN** la última ejecución fue hace 3 días
- **THEN** la sección de mora muestra la advertencia con esa fecha

### Requirement: Moneda
WHERE un pago está en una moneda distinta de COP, el sistema SHALL separarlo o convertirlo con la tasa de la fecha de la factura, rotulando la conversión.

#### Scenario: Otra moneda
- **WHEN** existe un pago en moneda distinta de COP
- **THEN** no se suma como COP sin conversión rotulada

### Requirement: Soporte y datos sensibles del pago manual
El soporte del pago manual SHALL ser visible solo para el Super Administrador de la empresa operadora y SHALL ofrecerse con acceso de caducidad corta. El sistema SHALL aceptar solo tipos de archivo y tamaños acotados. El sistema SHALL rechazar una referencia que contenga un número de tarjeta o de cuenta completo, y SHALL NOT guardar ni mostrar datos de tarjetas ni credenciales de pago.

#### Scenario: Referencia con tarjeta
- **WHEN** la referencia contiene un número de tarjeta completo
- **THEN** el sistema rechaza el registro

### Requirement: Conservación
Los registros de pagos manuales y su bitácora SHALL conservarse el plazo de `platform-history` y SHALL NOT poder editarse ni borrarse antes de él.

#### Scenario: Inspección
- **WHEN** se inspecciona un pago manual
- **THEN** contiene quién, cuándo, periodo, fecha efectiva, monto, medio y soporte, y ningún dato de tarjeta
