## ADDED Requirements

### Requirement: El registro público decide en tres niveles
Cuando llega un registro público, el sistema SHALL decidir uno de tres niveles: **aprobado** (entra sin límites), **verificar** (entra con límites hasta verificar su celular o correo) o **rechazado** (no se crea nada). El sistema SHALL rechazar solo por señales definitivas: campo trampa lleno, correo desechable o ráfaga de registros desde la misma IP. Ninguna señal introducida por este cambio SHALL llevar a rechazo por sí sola ni sumada a otras. El umbral de "verificar" SHALL poder ajustarse sin desplegar.

#### Scenario: Registro real de pauta
- **WHEN** llega un registro con identificador de clic del anuncio, correo de Gmail o Hotmail, celular y documento sin patrones de serie
- **THEN** queda aprobado y entra sin límites

#### Scenario: Registro con varios datos inventados
- **WHEN** llega un registro con celular en serie (3001234567), correo de un dominio fuera de lo esperado (qq.com), documento en serie y UTM con la macro sin reemplazar
- **THEN** queda en "verificar": entra al panel con límites y no se rechaza aunque el puntaje supere el umbral de rechazo

#### Scenario: Señal definitiva
- **WHEN** el campo trampa llega lleno o el correo es de un servicio desechable
- **THEN** el registro se rechaza o se descarta en silencio como hoy, sin crear empresa ni usuario

#### Scenario: Un solo dato mal escrito
- **WHEN** llega un registro real con una sola señal débil (por ejemplo, un documento con una serie de 7 dígitos)
- **THEN** su puntaje queda por debajo del umbral de verificar y entra aprobado

### Requirement: Señales deterministas nuevas
El sistema SHALL sumar puntaje de verificación por cada una de estas señales, y cada razón SHALL quedar guardada en la empresa y en la auditoría:
- celular con todos los dígitos iguales, con una serie ascendente o descendente de 7 o más, o ya usado por otra empresa;
- correo de un dominio en la lista de "fuera de lo esperado", que se mantiene sin desplegar;
- cédula o NIT en serie o repetido, con el mismo criterio del aviso actual;
- origen de campaña con macros sin reemplazar (texto entre `__…__`, `{{…}}` o `{…}`);
- origen de pauta pagada sin identificador de clic (`fbclid` o `ttclid`);
- mismo dispositivo que otro registro de los últimos 30 días;
- misma IP real que otro registro de las últimas 24 horas;
- correo casi igual a otro de los últimos 30 días (igual al quitar puntos, la etiqueta `+…` y los dígitos finales de la parte local);
- navegador que se declara automatizado.

#### Scenario: Macro sin reemplazar
- **WHEN** el origen de campaña trae `utm_content=__CID__`
- **THEN** la razón `utm_unreplaced_macro` queda registrada y suma al puntaje de verificación

#### Scenario: Pauta pagada sin clic
- **WHEN** el origen trae `utm_medium=paid` o una fuente de Meta o TikTok y no trae `fbclid` ni `ttclid`
- **THEN** la razón `paid_without_click_id` queda registrada y suma al puntaje

#### Scenario: Registro orgánico
- **WHEN** el registro no trae origen de campaña
- **THEN** ninguna de las dos señales de campaña suma

#### Scenario: Lista de dominios actualizada sin desplegar
- **WHEN** alguien agrega un dominio a la lista de "fuera de lo esperado" en la configuración del servidor
- **THEN** el siguiente registro con ese dominio suma la señal, sin desplegar código

### Requirement: Opttia solo en la zona gris
Si el puntaje determinista queda en la zona gris (debajo del umbral de verificar, pero con al menos una señal), el sistema SHALL consultar a Opttia una sola vez si el nombre, el correo, el negocio y el sector tienen sentido juntos, y SHALL guardar el puntaje y la razón que devuelva. El juicio de Opttia SHALL poder llevar el registro a "verificar" y SHALL NOT llevarlo a rechazo. Si Opttia falla, tarda más del tiempo límite o responde algo inválido, el registro SHALL seguir con la decisión determinista.

#### Scenario: Caso dudoso incoherente
- **WHEN** el registro tiene una señal débil y Opttia responde que el negocio "Tienda Aurora" con correo chino y sector sin especificar no es coherente, con puntaje alto
- **THEN** el registro pasa a "verificar" y la razón de Opttia queda guardada

#### Scenario: Opttia no responde
- **WHEN** Opttia no responde dentro del tiempo límite
- **THEN** el registro sigue con su decisión determinista y la auditoría anota que Opttia no respondió

#### Scenario: Registro limpio
- **WHEN** el registro no tiene ninguna señal
- **THEN** no se consulta a Opttia

### Requirement: La IP es la del visitante
El sistema SHALL contar los registros por la IP real del visitante y no por la del proxy. El límite por hora SHALL aplicar a cada IP por separado.

#### Scenario: Dos personas distintas en la misma hora
- **WHEN** 12 personas distintas se registran desde IPs distintas en la misma hora
- **THEN** ninguna suma puntos por velocidad de IP

#### Scenario: Ráfaga desde una IP
- **WHEN** llegan 12 intentos de registro desde la misma IP en una hora
- **THEN** se rechazan los siguientes intentos desde esa IP, como hoy

### Requirement: El gate barato corre antes que la IA
El sistema SHALL evaluar la validación de formato, el campo trampa, el correo desechable y la velocidad de IP antes de cualquier llamada a Opttia. Un registro rechazado o descartado SHALL NOT generar ninguna llamada a Opttia.

#### Scenario: Bot con campo trampa
- **WHEN** llega un registro con el campo trampa lleno
- **THEN** se descarta sin llamar a Opttia ni para el diagnóstico ni para la coherencia
