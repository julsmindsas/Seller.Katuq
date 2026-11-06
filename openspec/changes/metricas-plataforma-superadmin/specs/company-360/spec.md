## ADDED Requirements

### Requirement: Ficha en pantalla propia y enlazable
El sistema SHALL ofrecer una ficha detallada por comercio en una pantalla propia con dirección enlazable, abierta desde la tabla, accesible solo al Super Administrador de la empresa operadora. Cada apertura SHALL registrarse (`platform-access`).

#### Scenario: Abrir desde la tabla
- **WHEN** el Super Administrador elige un comercio en la tabla
- **THEN** se abre su ficha y la dirección puede compartirse con otro Super Administrador

### Requirement: Identidad y clasificación
La ficha SHALL mostrar nombre, identificador tributario, tipo de cuenta (confirmado o deducido), estado de ciclo, plan, fecha de alta con su origen, antigüedad y fecha de conversión a pago.

#### Scenario: Tipo deducido
- **WHEN** el tipo de cuenta fue deducido
- **THEN** la ficha lo rotula así y ofrece confirmarlo

### Requirement: Suscripción y pagos
La ficha SHALL mostrar modo de cobro, escalón, próximo cobro, último pago aprobado (fecha, monto, medio, transacción parcial), línea de tiempo de pagos y facturas con su estado, mora actual y pagos manuales. SHALL ofrecer registrar un pago manual según `platform-billing-truth`.

#### Scenario: Línea de tiempo
- **WHEN** el comercio tiene doce meses de facturas
- **THEN** la ficha las muestra en orden con estado, fecha de pago y monto, distinguiendo Wompi, manual y «saldada manualmente»

### Requirement: Historial del ciclo de vida
La ficha SHALL mostrar los cambios de estado con fecha y motivo.

#### Scenario: Reactivación
- **WHEN** el comercio estuvo suspendido y volvió a activo
- **THEN** ambos cambios aparecen con su fecha

### Requirement: Uso
La ficha SHALL mostrar último ingreso y, si existe, última actividad; usuarios con rol y último ingreso; pedidos de 12 meses por mes oficial y canal; módulos adoptados; uso de Opttia; e integraciones conectadas y usadas. La vista de sesiones SHALL ser la de D-634, enlazada o incorporada.

#### Scenario: Usuarios dormidos
- **WHEN** un comercio con cinco usuarios tiene uno que ingresó en 30 días
- **THEN** la ficha lo muestra con nombre y rol, sin correo ni teléfono completos

### Requirement: Salud
La ficha SHALL mostrar el puntaje de salud con componentes visibles y su tendencia cuando existan snapshots.

#### Scenario: Sin historia
- **WHEN** el comercio no tiene snapshots suficientes
- **THEN** muestra el puntaje actual y la tendencia como «sin dato»

### Requirement: Soporte y retroalimentación
La ficha SHALL mostrar los tickets por tipo y estado (archivados separados de resueltos), la calificación del comercio y la cantidad de sugerencias enviadas.

#### Scenario: Archivados
- **WHEN** un comercio tiene tickets archivados
- **THEN** no se cuentan como resueltos

### Requirement: Notas internas (pendiente de aprobación)
El requisito de notas internas y próxima acción NO se incluye en esta propuesta: es una colección nueva sin aprobar (propuesta, pregunta 7). WHEN Daniel la apruebe, se especificará con tope de longitud, aviso de no escribir datos personales sensibles y exclusión del envío al modelo.

#### Scenario: Sin notas
- **WHEN** se abre la ficha antes de la aprobación
- **THEN** no hay campo de notas

### Requirement: Privacidad de contactos
La ficha SHALL mostrar contactos y sedes enmascarados. No existe desenmascarado en esta propuesta; si se pidiera, será un cambio aparte, restringido al Super Administrador y con registro. La ficha SHALL NOT mostrar clientes finales, pedidos individuales, contenido de tickets ni el texto de las sugerencias o calificaciones.

#### Scenario: Contacto
- **WHEN** la ficha muestra el contacto de facturación
- **THEN** el correo y el teléfono aparecen parcialmente ocultos

### Requirement: Pregunta a Opttia desde la ficha
La ficha SHALL ofrecer «Preguntar a Opttia sobre este comercio» solo a personas autorizadas según `platform-opttia`, con el comercio ya fijado.

#### Scenario: Usuario no autorizado
- **WHEN** un Super Administrador no listado abre la ficha
- **THEN** la acción no aparece y el servidor rechazaría la consulta

### Requirement: Carga y diseño
La ficha SHALL cargar por secciones independientes, seguir el diseño Katuq y verse sin scroll horizontal en 1440 y 390 px. IF una sección falla, THEN las demás SHALL seguir visibles.

#### Scenario: Falla de soporte
- **WHEN** el resumen de soporte no responde
- **THEN** esa sección muestra el error y el resto se ve
