## ADDED Requirements

> Capacidad `facturacion-proveedor` (D-500, ticket 1260). Solo describe el cambio (a). Las capacidades
> `dian-resoluciones` y `dian-marca-pdf` traen su spec con los cambios (b) y (c). Las decisiones técnicas están en `design.md`.

### Requirement: Elegir el proveedor de facturación
WHERE la facturación en Integraciones está encendida para la empresa, el sistema SHALL permitir a un Administrador o a un
Contador elegir, entre los proveedores configurados y activos, con quién factura la empresa.

#### Scenario: Elegir un proveedor activo
- **WHEN** el Administrador elige Katuq DIAN directa, que está configurada y activa
- **THEN** ese proveedor queda para todos los tipos de documento y queda auditado quién lo eligió y cuándo

#### Scenario: Proveedor sin configurar o inactivo
- **WHEN** alguien intenta elegir un proveedor sin configurar o inactivo
- **THEN** el sistema lo rechaza con el motivo y la elección anterior sigue igual

#### Scenario: Qué se puede elegir
- **WHEN** se abre el selector
- **THEN** aparecen Katuq DIAN directa y Siigo; World Office solo si la empresa ya lo tiene configurado, y Alegra como
  "Próximamente", sin poder elegirlo

#### Scenario: Dos personas guardan a la vez
- **WHEN** dos personas guardan una elección partiendo de la misma versión
- **THEN** se guarda la primera y la segunda recibe un aviso de que la elección cambió, sin pisarla

### Requirement: Un solo punto decide el proveedor de cada documento
El sistema SHALL decidir en un solo punto del servidor el proveedor de cada documento, y venta asistida, POS, Todos los
pedidos y la factura automática SHALL usar ese mismo resultado.

#### Scenario: Tipos de documento
- **WHEN** se factura
- **THEN** el documento es uno de: factura de pedido, factura POS, factura libre, nota crédito o nota débito

#### Scenario: Tipo de un pedido
- **WHEN** se factura un pedido sin que quien llama diga el tipo
- **THEN** es factura POS si el pedido es una venta POS, y factura de pedido en cualquier otro caso

#### Scenario: Proveedor por tipo
- **WHEN** el Administrador asigna a un tipo un proveedor que lo soporta
- **THEN** ese tipo usa ese proveedor y los demás siguen con el elegido

#### Scenario: Tipo no soportado
- **WHEN** un proveedor no soporta un tipo de documento
- **THEN** el selector no lo ofrece para ese tipo y el servidor rechaza esa asignación

### Requirement: Las notas siguen a la factura original
WHEN se emite una nota crédito o débito, el sistema SHALL usar el proveedor con el que se emitió la factura original,
aunque la elección vigente sea otra.

#### Scenario: Original DIAN con elección Siigo
- **WHEN** la factura original se emitió por DIAN y hoy la elección es Siigo
- **THEN** la nota se emite por DIAN

#### Scenario: Original sin proveedor conocido
- **WHEN** no se sabe con qué proveedor se emitió la factura original
- **THEN** la nota no se emite y se explica el motivo

### Requirement: Sin elección guardada, todo igual que hoy
IF la empresa no tiene una elección guardada o la función está apagada, THEN el sistema SHALL usar el primer proveedor
configurado y activo en el orden fijo de hoy: DIAN directa, Siigo y World Office.

#### Scenario: Probar la conexión no es elegir
- **WHEN** alguien prueba la conexión de un proveedor y la empresa no había elegido
- **THEN** la empresa sigue sin elección y factura como hoy

#### Scenario: Elección revertida
- **WHEN** se revierte la elección de una empresa
- **THEN** vuelve a regir el orden fijo, sin tocar la configuración de ningún proveedor

### Requirement: Nunca facturar con otro proveedor
IF el proveedor que corresponde está inactivo o no soporta el tipo de documento, THEN el sistema SHALL NOT emitir el
documento con otro proveedor y SHALL mostrar el motivo.

#### Scenario: Proveedor elegido desactivado
- **WHEN** se crea una venta y el proveedor elegido está desactivado
- **THEN** la venta se crea sin factura, la persona ve el motivo, la tarjeta queda "Con error" y el pedido se puede
  facturar después desde Todos los pedidos

#### Scenario: Todos los pedidos
- **WHEN** el proveedor de un pedido no se puede usar
- **THEN** la acción de facturar muestra el motivo y no ofrece otro proveedor

### Requirement: Estado de la conexión
El sistema SHALL mostrar en Integraciones una sola tarjeta "Facturación electrónica" con el proveedor activo y uno de
cuatro estados calculados en el servidor, sin secretos ni datos tributarios.

#### Scenario: Cuatro estados en orden
- **WHEN** se calcula el estado
- **THEN** es, en este orden de prioridad: Sin configurar; Con error (certificado o resolución vencidos, certificado que no
  se puede abrir, rango agotado, última prueba de conexión fallida o rechazos recientes sin resolver en producción); En
  pruebas (DIAN en habilitación o Siigo en modo prueba); Conectado

#### Scenario: Probar la conexión
- **WHEN** un Administrador o Contador prueba la conexión
- **THEN** el resultado actualiza el estado y no se emite ningún documento

#### Scenario: Directorio sin cambios de conteo
- **WHEN** la tarjeta única reemplaza a las de Siigo, World Office y DIAN
- **THEN** los totales de conectadas y por conectar, "Solo las mías" y "Otras conexiones" cuentan la facturación una
  sola vez; con la función apagada, el directorio queda idéntico

### Requirement: Cambiar de proveedor sin borrar
WHEN se cambia de proveedor, el sistema SHALL cambiar solo la elección y SHALL conservar la configuración anterior, los
documentos emitidos y el proveedor de cada uno.

#### Scenario: Volver atrás
- **WHEN** el Administrador pulsa "Volver a" el proveedor anterior
- **THEN** la elección vuelve a ese proveedor con su configuración intacta

#### Scenario: Facturas en proceso
- **WHILE** hay una factura en proceso con un proveedor que deja de usarse
- **THEN** el cambio se bloquea y se indica qué pedido o envío lo bloquea

#### Scenario: Envío sin confirmar
- **WHEN** un envío a la DIAN quedó sin confirmar
- **THEN** el bloqueo no vence solo; se levanta al consultar su estado y conocer el resultado

### Requirement: Permisos
El sistema SHALL permitir configurar la facturación solo a Administrador y Contador, y SHALL exigirlo en el servidor.

#### Scenario: Contador
- **WHEN** un Contador entra a la configuración
- **THEN** puede elegir proveedor, editar datos tributarios y correo, probar la conexión y ver el historial, pero no
  cambiar el certificado, las claves, el ambiente ni la numeración

#### Scenario: Otros roles
- **WHEN** un Vendedor u otro rol intenta elegir, probar o ver el historial
- **THEN** el servidor lo rechaza; solo ve el estado de la tarjeta

### Requirement: Certificado y credenciales
El sistema SHALL NOT devolver al navegador el certificado, su contraseña ni las credenciales, y SHALL mostrar solo si
están guardados y la fecha de vencimiento del certificado.

#### Scenario: Certificado legible
- **WHEN** se guarda un certificado que se puede abrir
- **THEN** el asistente muestra su fecha de vencimiento

#### Scenario: Certificado que no se puede abrir
- **WHEN** el certificado o su contraseña no sirven
- **THEN** se guarda como hoy, sin fecha de vencimiento, y el estado queda "Con error" con el motivo

#### Scenario: Cambio auditado
- **WHEN** se cambia el certificado u otro secreto
- **THEN** queda auditado quién cambió qué campo, sin su valor

### Requirement: Factura automática al aprobar el pago
WHERE la factura automática según la elección está encendida para la empresa, WHEN el pago de un pedido pasa a Aprobado,
el sistema SHALL facturar automáticamente solo con el proveedor que corresponde y con la misma regla que tiene hoy.

#### Scenario: Siigo
- **WHEN** corresponde Siigo y tiene la facturación automática activa
- **THEN** se factura igual que hoy: la misma factura, los mismos datos en el pedido y el mismo ajuste de inventario en Siigo

#### Scenario: DIAN o World Office
- **WHEN** corresponde DIAN o World Office
- **THEN** no se emite automáticamente al aprobar el pago, no se factura con Siigo y queda registrado el motivo

#### Scenario: Pedido ya facturado o función apagada
- **WHEN** el pedido ya tiene factura o la función está apagada
- **THEN** no se emite otra factura, o todo sigue como hoy

### Requirement: Alcance de datos
El cambio SHALL NOT escribir productos, variantes, precios, listas de precios, inventario de Katuq ni la numeración vigente,
y SHALL NOT agregar datos nuevos a los pedidos.

#### Scenario: Elegir, probar o migrar
- **WHEN** se elige proveedor, se prueba la conexión o se migra una empresa
- **THEN** productos, variantes, precios, listas de precios, inventario, pedidos y el próximo número quedan iguales

### Requirement: Medir antes de encender
WHILE la medición está encendida, el sistema SHALL registrar, por cada factura de pedido, si el proveedor usado coincide con
el que resolvería el servidor, sin cambiar la respuesta ni los datos del pedido.

#### Scenario: Cada factura deja su registro
- **WHEN** se factura un pedido
- **THEN** queda un registro "igual", "divergente" u "omitido", de modo que un día sin registros indica que la medición no corrió

### Requirement: Pantalla operativa y migración
El sistema SHALL mostrar en la pantalla operativa el estado, el próximo número con su resolución y "Ver en
Integraciones" solo a quien puede configurar; y WHEN se migra la elección de una empresa, SHALL simular primero sin escribir.

#### Scenario: Migración de Julsmind
- **WHEN** se aplica la migración después de revisar la simulación
- **THEN** la elección queda en DIAN para todos los tipos, el próximo número es el mismo y no se emitió nada

#### Scenario: Revertir la migración
- **WHEN** se revierte y nadie cambió la elección desde la migración
- **THEN** la empresa vuelve a no tener elección; si alguien la cambió, la reversa se niega
