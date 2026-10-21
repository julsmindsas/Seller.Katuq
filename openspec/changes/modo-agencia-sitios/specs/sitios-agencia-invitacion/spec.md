# sitios-agencia-invitacion

> Sub-spec de `sitios-acceso-agencia` (cambio D), separada para cumplir el tope de 3 páginas (Artículo XIII). **NUEVA (D-518 F5-29·8), pendiente de aprobación del texto.** Reemplaza el requisito aprobado el 18-oct «Solo el comercio otorga, cambia y revoca el acceso», que otorgaba a cualquier correo sin invitación (decisión 2 del design, SUPERSEDED). «(por defecto N)» remite a la decisión N del design.

## ADDED Requirements

### Requirement: Solo el comercio invita, cambia y revoca [MODIFICADO D-518]
THE system SHALL permitir solo a la familia administrador del comercio, con la empresa de su sesión firmada, invitar a un correo a editar sus Sitios. La invitación lleva el rol «Editor de agencia» o «Publicador de agencia», una vigencia (90 días por defecto, editable o sin vencimiento) y el permiso de medición y pauta (apagado por defecto). La invitación SHALL quedar pendiente hasta que la persona de ese correo la acepte con su propia cuenta, y SHALL vencer a los 14 días si nadie la acepta. THE system SHALL permitir solo a esa familia cambiar el rol, la vigencia o el permiso, retirar una invitación y revocar el acceso (por defecto 2 y 6).
Fuente: ticket 1253 («permisos que cada comercio otorga y revoca»); D-518 F5-29·8; D-450 (invitar a miembros explícitos, sin crear cuentas ajenas). Se aparta de D-450 en la aceptación explícita, la respuesta igual y el vencimiento: design §D0.1 y pregunta 16. [REVISADO]

#### Scenario: Invitar y aceptar
- **WHEN** un administrador invita a un correo y la persona entra con su cuenta y acepta en «Mis comercios»
- **THEN** la concesión queda vigente con el rol, la vigencia y el permiso elegidos, y queda registrado quién invitó y quién aceptó

#### Scenario: Sin aceptar
- **WHEN** nadie acepta la invitación en 14 días
- **THEN** la invitación vence y no da acceso

#### Scenario: Quien no administra
- **WHEN** lo intenta un usuario del comercio que no es administrador, o alguien de otra empresa
- **THEN** el sistema lo rechaza y no escribe nada

#### Scenario: Correo con o sin cuenta
- **WHEN** se invita a un correo con cuenta en Katuq y a otro sin cuenta
- **THEN** las dos respuestas son iguales

#### Scenario: Destinos no aceptados
- **WHEN** quien invita es la empresa plataforma, o el correo es de un usuario del mismo comercio
- **THEN** el sistema lo rechaza

#### Scenario: Unicidad y tope
- **WHEN** ya existe una invitación pendiente o una concesión vigente para ese correo, o el comercio ya suma 50 entre pendientes y vigentes (por defecto 14)
- **THEN** el sistema rechaza la nueva
- **AND** lo vencido o revocado no cuenta para ninguno de los dos límites

#### Scenario: Revocar dos veces
- **WHEN** se revoca una concesión ya revocada o se retira una invitación ya retirada
- **THEN** la respuesta es la misma y no cambia nada

### Requirement: Correos de invitación con tope [REVISADO]
WHERE Katuq avisa por correo al invitado (pregunta 12), WHEN un administrador invita, THE system SHALL enviar como máximo un correo por invitación y SHALL limitar los correos de invitación de cada comercio por día, aunque se retiren y se vuelvan a crear invitaciones. IF el comercio llegó al tope del día, THEN THE system SHALL crear la invitación sin enviar el correo y SHALL decirle al administrador que el invitado la verá en «Mis comercios».
Fuente: pregunta 12; revisión privada (P-13).

#### Scenario: Invitar, retirar e invitar otra vez
- **WHEN** un administrador retira y vuelve a crear invitaciones muchas veces en un día
- **THEN** los correos se detienen al llegar al tope del día, y las invitaciones siguen siendo válidas
