## ADDED Requirements

### Requirement: El registro dudoso confirma su correo antes de entrar
Cuando un registro queda en "verificar", el sistema SHALL crear la empresa y el usuario, SHALL NOT darle sesión, y SHALL enviarle a su correo un código de 6 dígitos. La persona SHALL entrar a Katuq apenas escriba el código correcto, sin volver a escribir su contraseña. El código SHALL vencer a los 15 minutos, admitir 5 intentos y poder reenviarse cada 60 segundos. Dentro de la app no SHALL haber límites por esto: una vez verificada, la cuenta queda igual que una aprobada.

#### Scenario: Registro dudoso que es real
- **WHEN** alguien cae en "verificar", abre su correo y escribe el código
- **THEN** entra a Katuq y sigue la configuración inicial como cualquier registro

#### Scenario: Código equivocado cinco veces
- **WHEN** escribe mal el código cinco veces
- **THEN** ese código deja de servir y puede pedir uno nuevo

#### Scenario: Vuelve otro día
- **WHEN** alguien con la verificación pendiente intenta iniciar sesión
- **THEN** no entra; se le ofrece mandarle un código nuevo a su correo y entrar al confirmarlo

### Requirement: La pauta solo cuenta registros confirmados
El evento de registro completo para Meta y TikTok SHALL dispararse una sola vez por empresa: al registrarse si quedó aprobada, o al confirmar el código si quedó en "verificar". Una empresa sin verificar SHALL quedar fuera de las métricas de registros hasta que confirme.

#### Scenario: Registro falso que nunca confirma
- **WHEN** un registro queda en "verificar" y nadie escribe el código
- **THEN** Meta y TikTok no reciben el evento de registro y la empresa no cuenta en las métricas

### Requirement: Las empresas de antes no cambian
Las empresas creadas antes de este cambio, y las aprobadas, SHALL iniciar sesión exactamente como hoy.

#### Scenario: Comercio existente
- **WHEN** alguien de ALMARA inicia sesión
- **THEN** entra como siempre, sin código
