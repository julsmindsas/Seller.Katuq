# Spec delta — inventory-weekly-digest

## ADDED Requirements

### Requirement: Resumen semanal por correo
El sistema SHALL enviar cada lunes, a las 7:00 de Colombia, un correo por empresa con lo que hay que comprar ya, el capital parado y los avisos, cabiendo en una sola pantalla de lectura y con enlace a la pantalla de inteligencia de inventario.

#### Scenario: semana con cosas por hacer
- **WHEN** la empresa tiene al menos un elemento en alguno de los tres bloques
- **THEN** the system SHALL enviar el correo con los elementos más importantes de cada bloque y el total de los que quedaron por ver

#### Scenario: semana sin nada accionable
- **WHEN** los tres bloques están vacíos
- **THEN** the system SHALL NOT enviar correo

#### Scenario: cambio frente a la semana anterior
- **WHEN** existe el resumen de la semana anterior
- **THEN** the system SHALL indicar cuántos urgentes entraron, cuáles se resolvieron y cuánto cambió el capital parado

### Requirement: Mismas cifras que la pantalla
El sistema SHALL generar el correo con la misma función y la misma medida de demanda que la pantalla de inteligencia de inventario.

#### Scenario: coherencia
- **WHEN** se compara el correo con la pantalla en el mismo momento
- **THEN** las cantidades, montos y días SHALL coincidir

### Requirement: Encendido por empresa y sombra previa
El envío SHALL estar apagado por omisión y activarse por bandera de empresa; antes de encender el envío, el sistema SHALL poder calcular y guardar el resumen sin enviarlo.

#### Scenario: bandera apagada
- **WHEN** una empresa no tiene la bandera encendida
- **THEN** the system SHALL NOT enviar ni cobrar IA para esa empresa

#### Scenario: modo sombra
- **WHEN** la empresa está en sombra
- **THEN** the system SHALL calcular y guardar el resumen, y SHALL NOT enviar correo

### Requirement: Destinatarios y baja
El sistema SHALL enviar el correo al dueño y a los administradores de la empresa que tengan correo, con un enlace que permita dejar de recibirlo sin iniciar sesión.

#### Scenario: baja con un clic
- **WHEN** un destinatario usa el enlace de baja
- **THEN** the system SHALL dejar de enviarle el resumen, a él y solo a él

#### Scenario: empresa sin destinatarios
- **WHEN** nadie de la empresa tiene correo
- **THEN** the system SHALL omitirla y dejar el motivo registrado

### Requirement: Un envío por semana, sin duplicados
El sistema SHALL enviar como máximo un resumen por empresa y por semana, aunque el proceso se reinicie o corra dos veces.

#### Scenario: reinicio el lunes
- **WHEN** el proceso se reinicia después de enviar el resumen de la semana
- **THEN** the system SHALL NOT volver a enviarlo

### Requirement: Un fallo no frena a los demás
El sistema SHALL procesar las empresas de forma independiente y SHALL enviar la versión sin frase de IA si Opttia no responde.

#### Scenario: Opttia caído
- **WHEN** Opttia falla para una empresa
- **THEN** the system SHALL enviar el resumen con las listas calculadas y sin texto de la IA

#### Scenario: una empresa falla
- **WHEN** el cálculo de una empresa produce un error
- **THEN** the system SHALL registrar el error con el identificador de la empresa y continuar con las demás

### Requirement: Datos mínimos
El correo SHALL incluir solo productos, bodegas, cantidades y montos de la empresa, y SHALL NOT incluir datos personales de clientes finales.

#### Scenario: contenido del correo
- **WHEN** se genera el correo
- **THEN** the system SHALL omitir documentos, teléfonos y direcciones de clientes

### Requirement: Inventario no modifica productos ni precios
El sistema SHALL escribir únicamente el estado del resumen semanal en el documento de la empresa, y SHALL NOT escribir productos, variantes, precios, listas de precios ni datos de Shopify.

#### Scenario: productos y precios intactos
- **WHEN** corre el cálculo o el envío del resumen
- **THEN** producto, variantes, precio y listas de precios SHALL permanecer sin cambios
