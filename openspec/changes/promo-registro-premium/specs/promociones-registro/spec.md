## ADDED Requirements

### Requirement: Código de campaña

El sistema SHALL representar cada campaña como un código con nombre visible, días de premium otorgados, cupo máximo de usos, fecha límite de vigencia y estado activo/inactivo. El código SHALL ser único, insensible a mayúsculas y minúsculas, y no SHALL colisionar con los planes de suscripción vendibles.

#### Scenario: Código único
- **WHEN** un administrador de Katuq intenta crear un código cuyo texto ya existe en otra campaña
- **THEN** el sistema rechaza la creación e informa que ese código ya está en uso

#### Scenario: Los códigos no aparecen como planes vendibles
- **WHEN** cualquier consumidor consulta los planes de suscripción activos, con o sin sesión
- **THEN** la respuesta contiene únicamente planes vendibles y ninguna campaña promocional

### Requirement: Validación pública del código

El sistema SHALL permitir validar un código sin sesión iniciada y SHALL devolver el beneficio en términos que el visitante entienda: nombre de la campaña y duración del premium. La validación NO SHALL exponer el cupo restante, el conteo de usos ni ningún otro dato interno de la campaña.

#### Scenario: Código vigente
- **WHEN** un visitante abre el enlace de una campaña activa, dentro de vigencia y con cupo disponible
- **THEN** el sistema muestra el nombre de la campaña y cuánto tiempo de premium otorga, e invita a registrarse

#### Scenario: Código inexistente, inactivo, vencido o sin cupo
- **WHEN** un visitante abre el enlace de un código que no existe, está inactivo, pasó su fecha límite o agotó el cupo
- **THEN** el sistema explica que la promoción no está disponible y ofrece continuar al registro normal

#### Scenario: El cupo no se filtra
- **WHEN** se valida cualquier código
- **THEN** la respuesta no incluye cupo máximo, usos consumidos ni usos restantes

### Requirement: Canje del código al registrarse

El sistema SHALL aceptar el código como dato opcional del registro y SHALL revalidarlo al momento de crear la empresa, no solo al abrir la landing. Cuando el código es válido, la empresa SHALL nacer en plan premium con fecha de vencimiento y SHALL quedar registrado el origen de la campaña. Cuando el código es inválido o su validación falla por cualquier motivo, el registro SHALL completarse igual en plan freemium.

#### Scenario: Registro con código válido
- **WHEN** una persona completa el registro llegando con un código vigente y con cupo
- **THEN** la empresa queda creada en plan premium, con fecha de vencimiento calculada desde el día del registro y con el código y la campaña registrados como origen

#### Scenario: El código se agotó entre la landing y el registro
- **WHEN** una persona completa el registro con un código que perdió vigencia o agotó el cupo después de haber visto la landing
- **THEN** la empresa se crea igual en plan freemium y se le informa que la promoción ya no estaba disponible

#### Scenario: El registro nunca se rompe por el código
- **WHEN** la resolución del código falla por un error técnico durante el registro
- **THEN** la empresa se crea igual en plan freemium y el error queda registrado para revisión, sin bloquear el registro

#### Scenario: Registro sin código
- **WHEN** una persona se registra por el camino normal, sin código
- **THEN** la empresa se crea en plan freemium exactamente como hoy, sin cambio de comportamiento

### Requirement: Consumo del cupo

El sistema SHALL descontar un uso del cupo por cada empresa creada con el código, de forma que dos registros simultáneos no puedan superar el cupo máximo. Un registro rechazado o que no llegó a crear empresa NO SHALL consumir cupo.

#### Scenario: Cupo agotado con registros simultáneos
- **WHEN** quedan tres usos disponibles y diez registros con el mismo código ocurren al mismo tiempo
- **THEN** exactamente tres empresas quedan en premium y las demás quedan en freemium

#### Scenario: Registro fallido no consume cupo
- **WHEN** un registro con código falla antes de crear la empresa
- **THEN** el cupo de la campaña queda igual que antes del intento

### Requirement: Administración de campañas

El sistema SHALL permitir a los administradores de Katuq crear, editar, activar y desactivar campañas, y SHALL mostrar por campaña cuántas empresas se registraron con ella y cuántas siguen en premium. Solo los administradores de Katuq SHALL poder administrar campañas.

#### Scenario: Desactivar una campaña en curso
- **WHEN** un administrador desactiva una campaña que ya tiene registros
- **THEN** el enlace deja de otorgar premium a nuevos registros y las empresas que ya lo canjearon conservan su premium hasta su fecha de vencimiento

#### Scenario: Acceso restringido
- **WHEN** un usuario que no es administrador de Katuq intenta crear o editar una campaña
- **THEN** el sistema rechaza la operación

#### Scenario: Resultado de la campaña
- **WHEN** un administrador consulta una campaña
- **THEN** ve cuántas empresas se registraron con ella, cuántas siguen en premium promocional y cuántos usos le quedan
