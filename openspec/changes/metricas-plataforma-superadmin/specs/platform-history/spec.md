## ADDED Requirements

### Requirement: Snapshots diarios por empresa
El sistema SHALL guardar cada día un snapshot de las métricas de cada empresa, derivado y borrable, con fecha de corte y versión de regla. El «día» SHALL cerrarse a las 23:59:59 de hora de Colombia. El snapshot SHALL poder reconstruirse; borrarlo SHALL NOT afectar ningún dato operativo. Las cifras sin snapshot SHALL leerse como se indica abajo.

#### Scenario: Corte del día
- **WHEN** termina el día en Colombia
- **THEN** existe un snapshot por empresa con fecha de corte, cifras y versión de regla

#### Scenario: Reproceso
- **WHEN** se regenera el snapshot de un día
- **THEN** reemplaza al anterior de ese día sin duplicar

### Requirement: Cierre de mes estable
El snapshot del último día de cada mes SHALL ser el cierre oficial y SHALL NOT cambiar por ediciones posteriores, incluido un cambio posterior de tipo de cuenta; el cierre conserva su versión de regla y el cambio solo rige hacia adelante, con rótulo de versión. El «mes anterior» SHALL leerse del cierre; antes del primer cierre SHALL mostrarse «reconstruido» y puede cambiar.

#### Scenario: Edición tardía
- **WHEN** se edita un pedido del mes cerrado
- **THEN** el cierre oficial de ese mes permanece igual

#### Scenario: Cuenta reclasificada tras el cierre
- **WHEN** una cuenta pasa de demo a real después del cierre de octubre
- **THEN** el cierre de octubre no cambia y la cuenta entra desde el siguiente cálculo

### Requirement: Historia declarada y sin relleno inventado
WHEN existe snapshot, el sistema SHALL mostrar su valor. WHEN no existe pero el valor puede reconstruirse desde pedidos y facturas (cobrado, GMV, altas), SHALL mostrarlo rotulado «reconstruido». WHEN no es reconstruible (salud, adopción), SHALL mostrar «sin dato». El sistema SHALL NOT estimar valores faltantes.

#### Scenario: Antes del primer snapshot
- **WHEN** se consulta un mes anterior a la puesta en marcha
- **THEN** muestra el valor reconstruido rotulado o «sin dato», nunca un valor supuesto

### Requirement: Retención y base de datos personales
El sistema SHALL borrar automáticamente los datos de historia al vencer su plazo, sin pedir nuevo visto bueno (la aprobación de estos plazos por Daniel lo es). Plazos propuestos [por confirmar]: snapshots y uso por módulo 24 meses; auditoría de Opttia 12 meses; bitácoras de pago manual y de cambios 5 años (plazo contable, a confirmar); sesiones 13 meses (D-634). La finalidad SHALL ser medir el uso de la plataforma para soporte y mejora, y SHALL publicarse un aviso en los términos y política de privacidad antes de activar la medición por usuario.

#### Scenario: Plazo cumplido
- **WHEN** un snapshot tiene 25 meses
- **THEN** se borra en la siguiente limpieza y los de 23 meses quedan

### Requirement: Sesiones por dependencia de D-634
El historial de sesiones SHALL apoyarse en `user-sessions` de `openspec/changes/sesiones-y-tiempo-conectado` (D-634, ticket 1506) y SHALL NOT duplicar su registro ni crear nuevos latidos. Esta propuesta SHALL consumir de ella tiempo conectado, primer ingreso, última actividad y sesiones abiertas, solo agregados por comercio y, por usuario, nombre y rol sin correo. La ficha SHALL enlazar o incorporar la vista general de D-634, no rehacerla. WHILE D-634 no esté implementada, el sistema SHALL mostrar «—» en actividad y conservar el último ingreso rotulado «ingreso». WHERE un comercio no tenga el seguimiento de sesiones encendido, el sistema SHALL rotularlo «no medido» y NOT contarlo como inactivo ni en usuarios dormidos ni en el riesgo.

#### Scenario: D-634 sin implementar
- **WHEN** no hay sesiones registradas
- **THEN** la ficha muestra «—» en tiempo conectado y conserva el último ingreso

#### Scenario: Comercio sin seguimiento
- **WHEN** un comercio no tiene el seguimiento de sesiones encendido
- **THEN** su actividad dice «no medido» y no cuenta como inactividad

### Requirement: Uso por módulo
El sistema SHALL registrar qué módulos abre cada comercio y cuándo, como conteo por día, comercio y módulo, sin rutas con identificadores, contenido, IP ni usuario individual. La empresa del conteo SHALL salir de la sesión firmada, nunca del cuerpo ni de encabezados de la petición. IF el sistema ya conserva las pantallas abiertas por usuario para las notas de versión, THEN SHALL reutilizarlas antes de crear otro registro. El registro SHALL tener su propia bandera, escribir sin bloquear al usuario y poder apagarse con un interruptor global. El registro NO SHALL tomar el registro por petición existente como fuente; la empresa y el usuario salen solo de la sesión firmada.

#### Scenario: Comercio abre un módulo
- **WHEN** un usuario abre Facturación electrónica
- **THEN** se suma un conteo del día para su comercio y módulo, sin dato personal

#### Scenario: Empresa falsificada en el cuerpo
- **WHEN** una petición de conteo trae en el cuerpo otra empresa
- **THEN** se atribuye a la empresa de la sesión firmada

#### Scenario: Falla el registro
- **WHEN** el registro de uso falla
- **THEN** el usuario sigue trabajando sin aviso

### Requirement: Datos por usuario con mínimos y supresión
Los datos por usuario SHALL mostrarse como nombre y rol sin correo. WHEN un comercio tiene pocos usuarios [menos de 3], SHALL mostrarse solo el agregado por comercio. WHEN un usuario pide la supresión de sus datos de sesión, el sistema SHALL borrarlos o anonimizarlos.

#### Scenario: Comercio de un usuario
- **WHEN** un comercio tiene un solo usuario
- **THEN** la ficha muestra el agregado, no el detalle individual

### Requirement: Costo de escritura acotado
El sistema SHALL escribir como máximo un snapshot por empresa por día y sus conteos con agrupación, sin una escritura por petición. SHALL medir el costo en sombra antes de abrirlo a todas las empresas y poder apagarse con un interruptor global en la configuración (D-505).

#### Scenario: Interruptor apagado
- **WHEN** se apaga el interruptor de historia
- **THEN** dejan de escribirse snapshots y conteos y las pantallas muestran «sin dato» para los días siguientes

### Requirement: Quién lee la historia
La lectura de snapshots y conteos SHALL ser del Super Administrador de la empresa operadora (`platform-access`); Opttia SHALL además exigir la lista de autorizados (`platform-opttia`). La historia SHALL contener solo agregados por empresa y SHALL NOT incluir correos, teléfonos, clientes finales ni pedidos individuales.

#### Scenario: Revisión de un snapshot
- **WHEN** se inspecciona un snapshot
- **THEN** no contiene correos, teléfonos ni pedidos individuales
