## ADDED Requirements

### Requirement: La persona elige su contraseña al registrarse
El formulario público de registro SHALL pedir una contraseña elegida por la persona, SHALL mostrar las reglas mínimas antes de enviar y SHALL permitir ver u ocultar lo escrito. El formulario SHALL impedir continuar con una contraseña que no cumpla las reglas mínimas, con un mensaje que diga qué falta. El servidor SHALL rechazar una contraseña con formato inválido o igual a una contraseña por defecto conocida del sistema.

#### Scenario: Contraseña válida
- **WHEN** la persona escribe una contraseña que cumple las reglas mínimas y continúa
- **THEN** el formulario avanza sin error y la contraseña viaja con el registro

#### Scenario: Contraseña que no cumple las reglas
- **WHEN** la persona intenta continuar con una contraseña que no cumple las reglas mínimas
- **THEN** el formulario no avanza y muestra junto al campo qué regla falta

#### Scenario: El servidor recibe una contraseña inválida
- **WHEN** llega al servidor un registro cuya contraseña tiene formato inválido o es una contraseña por defecto conocida del sistema
- **THEN** el servidor responde con error de validación, no crea la empresa ni el usuario y el formulario deja corregir

#### Scenario: La contraseña no queda en el borrador del navegador
- **WHEN** la persona escribe su contraseña y el formulario guarda el borrador del registro
- **THEN** el borrador guardado en el navegador no contiene la contraseña

### Requirement: Registro aprobado entra con sesión iniciada
Cuando el control contra registros falsos aprueba el registro, el sistema SHALL dejar a la persona dentro de Katuq con la sesión iniciada y SHALL llevarla a su primer paso en el panel, sin mostrar la pantalla de inicio de sesión y sin exigir cambio de contraseña. La persona SHALL poder volver a entrar después con su correo y la contraseña que eligió.

#### Scenario: Registro aprobado
- **WHEN** la persona termina el registro y el control lo aprueba
- **THEN** ve la confirmación de su cuenta y entra al panel de su empresa con la sesión iniciada, sin escribir credenciales

#### Scenario: Volver a entrar otro día
- **WHEN** la persona cierra sesión y entra con su correo y la contraseña que eligió en el registro
- **THEN** el inicio de sesión funciona y no le pide cambiar la contraseña

#### Scenario: La sesión es solo de su empresa
- **WHEN** la persona entra por el registro
- **THEN** la sesión corresponde a su propia empresa y usuario, con los mismos permisos que tendría entrando por el inicio de sesión

### Requirement: El correo de bienvenida no lleva contraseña
Para un registro hecho con contraseña elegida, el correo de bienvenida SHALL NOT incluir ninguna contraseña y SHALL incluir el enlace para entrar y el de recuperar la contraseña.

#### Scenario: Bienvenida sin contraseña
- **WHEN** se crea una cuenta con contraseña elegida
- **THEN** el correo de bienvenida confirma la cuenta, trae el enlace de entrada y el de "Olvidé mi contraseña", y no contiene ninguna contraseña

### Requirement: Registro en revisión no recibe sesión
Cuando el control contra registros falsos deja el registro en revisión, el sistema SHALL NOT iniciar sesión, SHALL guardar la contraseña elegida con la cuenta inactiva y SHALL mostrar la pantalla de "registro en revisión". Al aprobarse la cuenta, la persona SHALL poder entrar con la contraseña que eligió.

#### Scenario: Registro en revisión
- **WHEN** el control deja el registro en revisión
- **THEN** no hay sesión iniciada, la persona ve que su registro está en revisión y a las plataformas de pauta no se les cuenta como registro completo

#### Scenario: Aprobación manual posterior
- **WHEN** un administrador activa una cuenta que estaba en revisión
- **THEN** la persona entra con el correo y la contraseña que eligió al registrarse

### Requirement: Registro rechazado no crea nada
Cuando el control contra registros falsos rechaza el registro, el sistema SHALL NOT crear empresa, usuario ni sesión.

#### Scenario: Registro rechazado
- **WHEN** el control rechaza el registro
- **THEN** no se crea empresa, usuario ni sesión y la persona ve el mensaje de contacto con soporte

### Requirement: Compatibilidad con clientes que no mandan contraseña
Mientras exista este camino de compatibilidad, el servidor SHALL aceptar un registro sin contraseña y SHALL tratarlo como hoy: contraseña temporal enviada por correo, sin sesión en la respuesta y con cambio obligatorio en el primer ingreso.

#### Scenario: Navegador con el front viejo
- **WHEN** llega un registro sin contraseña
- **THEN** la cuenta se crea con contraseña temporal enviada por correo, la respuesta no trae sesión y el primer ingreso exige cambiar la contraseña

### Requirement: La contraseña no queda en logs ni en claro
El sistema SHALL NOT escribir la contraseña en logs, auditorías, avisos internos ni en la base de datos en texto plano.

#### Scenario: Revisión de rastros
- **WHEN** se completa un registro con contraseña elegida
- **THEN** ni los logs, ni la auditoría de registro, ni el aviso a administradores, ni `surveyResponses` contienen la contraseña
