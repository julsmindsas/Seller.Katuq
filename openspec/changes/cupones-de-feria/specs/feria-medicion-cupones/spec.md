## ADDED Requirements

### Requirement: El registro guarda el cupón
Cuando una persona canjea un cupón de campaña que no regala Premium, la empresa SHALL quedar con el cupón guardado: la campaña, el código, el beneficio, los términos con los que se canjeó y el momento del canje. Lo que se edite después en la campaña SHALL NOT cambiar los términos de quien ya canjeó. Cuando el canje se aplaza hasta confirmar el correo, el cupón SHALL guardarse al confirmar.

#### Scenario: Canje al registrarse
- **WHEN** una persona termina el registro con un cupón vigente
- **THEN** la empresa nace con el cupón y su tope guardados

#### Scenario: Se edita la campaña después
- **WHEN** un administrador cambia el número de pedidos de la campaña después de que una empresa canjeó
- **THEN** esa empresa conserva el número con el que canjeó

### Requirement: Cuántos lo usaron
El resultado de una campaña SHALL decir cuántas empresas la usaron, contando solo las que canjearon esa campaña. Un cupón de feria SHALL contarse por el cupón guardado en la empresa y una campaña de Premium de siempre por su campo de siempre, sin mezclarse.

#### Scenario: Dos campañas distintas
- **WHEN** hay empresas con el cupón A, empresas con el cupón B y empresas sin cupón
- **THEN** el resultado de A cuenta solo las suyas

### Requirement: Cuántos pagaron
El resultado SHALL decir cuántas de las empresas que usaron el código pagaron un plan alguna vez y cuántas siguen pagando. Un plan SHALL contarse como pagado solo si hubo un pago aprobado. El Premium regalado, el que activa un administrador a mano, un pago pendiente o rechazado y las empresas de otra campaña SHALL NOT contarse.

#### Scenario: Premium regalado no es un pago
- **WHEN** una empresa llegó por una campaña de Premium y todavía no ha pagado nada
- **THEN** cuenta como "usó" y no como "pagó"

#### Scenario: Pagó y volvió al plan gratis
- **WHEN** una empresa pagó un plan y después volvió al plan gratis
- **THEN** cuenta como "pagó" y no como "sigue pagando"

### Requirement: El embudo completo
El resultado SHALL conservar las visitas, los clics y las conversiones que ya entregaba, y SHALL sumar la conversión de quienes usaron el código a quienes pagaron. Una campaña sin empresas SHALL mostrar ceros y una conversión vacía, sin dividir por cero. Un cupón de pedidos SHALL NOT reportar empresas "degradadas", porque nunca subió a nadie a Premium.

#### Scenario: Campaña sin empresas
- **WHEN** se consulta el resultado de un cupón que nadie ha usado
- **THEN** todos los conteos son cero y la conversión no se calcula

#### Scenario: Lo de siempre no cambia
- **WHEN** se consulta el resultado de una campaña de Premium de siempre
- **THEN** registradas, siguen en Premium, bajaron a gratis y el embudo de visitas dan los mismos valores que antes

### Requirement: Solo Katuq mira el resultado
El resultado SHALL poder consultarse solo por un administrador de Katuq. Un plan vendible o un identificador que no sea de una campaña SHALL responder que no se encontró.

#### Scenario: Plan vendible
- **WHEN** se pide el resultado del identificador de un plan vendible
- **THEN** la respuesta es "campaña no encontrada"
