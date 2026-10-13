## Purpose

Convierte un grupo del plan en un despacho real solo cuando una persona con permiso lo aprueba. El efecto es el mismo que "Guardar y despachar" en la pantalla de Despachos, sin duplicados y dejando registro de quién aprobó.

## ADDED Requirements

### Requirement: Quién aprueba
Puede aprobar SHALL ser una persona de la empresa de la sesión que cumpla alguna de estas condiciones:
- su rol tiene la entrada Despachos en el menú;
- es de la familia Administrador.

Además, la empresa MUST tener encendida la bandera `despachosOpttia`. Los demás MUST ver el plan sin botones de aprobar ni de ajustar.

#### Scenario: Rol de ventas con Despachos en el menú
- **WHEN** una persona con un rol de ventas que tiene Despachos en su menú abre la vista con la bandera encendida
- **THEN** ve los botones Aprobar y puede ajustar los grupos

#### Scenario: Rol sin Despachos
- **WHEN** una persona cuyo rol no tiene Despachos en el menú abre la vista
- **THEN** ve el plan sin botones de aprobar, y el servidor rechaza cualquier intento de aprobación

### Requirement: Ajustes antes de aprobar
Antes de aprobar, la persona SHALL poder:
- cambiar el mensajero de un grupo por otro de la empresa que no esté fuera de línea;
- sacar un pedido de un grupo, y entonces vuelve a "sin grupo";
- pasar un pedido a otro grupo.

No se SHALL permitir otros cambios: dirección, fecha, franja y estado no se editan desde aquí.

#### Scenario: Cambiar el mensajero
- **WHEN** la persona cambia el mensajero sugerido de un grupo y aprueba
- **THEN** el despacho sale con el mensajero que ella escogió

### Requirement: Efecto de aprobar un grupo
Aprobar un grupo SHALL producir lo mismo que "Guardar y despachar" en la pantalla de Despachos:
- **Orden de envío:** una sola por grupo, con el consecutivo siguiente de la empresa.
- **Cada pedido:**
  - pasa a Despachado, con las mismas reglas de transición que la pantalla;
  - queda con el mensajero escrito como lo busca la app del mensajero, el número de la orden y la fecha y hora de despacho;
  - el campo de quién despachó guarda el correo de quien aprobó, nunca su sesión.
- **Aviso al cliente:** el mismo que manda la pantalla.
- **Historial:** registra el cambio de estado con el origen "plan de Opttia" y el correo de quien aprobó.
- **Mensajero:** recibe en la app el aviso de actualizar su lista.

#### Scenario: Grupo de 5 pedidos aprobado
- **WHEN** se aprueba un grupo de 5 pedidos con el mensajero M
- **THEN** M los ve en su app (lista de hoy) igual que si se hubieran despachado desde la pantalla, y la orden aparece en "Órdenes de despacho" con su número

### Requirement: Pedidos que cambiaron desde que se armó el plan
Al aprobar, cada pedido del grupo MUST volver a revisarse. Un pedido queda por fuera del despacho, con la razón, en cualquiera de estos casos:
- cambió de estado;
- cambió su pago a un pago no apto;
- quedó en otra orden de envío;
- fue cancelado.

Los demás pedidos del grupo se despachan. Si no queda ninguno, no se escribe nada.

#### Scenario: Otro usuario ya despachó un pedido
- **WHEN** entre armar el plan y aprobarlo otra persona despachó uno de los 5 pedidos desde la pantalla
- **THEN** se despachan los otros 4, y el resultado dice que el quinto "ya salió en la orden N"

### Requirement: Sin duplicados
Aprobar el mismo grupo más de una vez SHALL producir un solo despacho. Esto incluye el doble toque, dos personas al tiempo y un reintento por la red. La segunda aprobación MUST responder quién lo aprobó y a qué hora, sin escribir nada.

#### Scenario: Dos personas aprueban a la vez
- **WHEN** dos personas del mismo comercio aprueban el mismo grupo en el mismo segundo
- **THEN** existe una sola orden de envío para ese grupo, y a una de ellas se le dice "Ya lo aprobó <correo> a las 10:02"

### Requirement: Aprobar todo
"Aprobar todo" SHALL tratar cada grupo por separado y mostrar el resultado de cada uno:
- despachado;
- despachado con pedidos por fuera;
- no despachado, con la razón.

Que un grupo falle MUST NOT deshacer los que ya salieron.

#### Scenario: Un grupo falla
- **WHEN** se aprueban 4 grupos y el tercero falla porque todos sus pedidos cambiaron
- **THEN** los grupos 1, 2 y 4 quedan despachados y el 3 dice por qué no salió

### Requirement: Lo que escribe la aprobación
La aprobación SHALL escribir solo en tres lugares:
- **órdenes de envío;**
- **pedidos:** los campos de despacho (estado, mensajero, orden de envío, fecha y hora de despacho y quién despachó);
- **historial de estados del pedido.**

MUST NOT escribir productos, variantes, precios, listas de precios, inventario, integraciones, mensajeros ni reglas de despacho. Una prueba de contrato lo verifica.

#### Scenario: Prueba del write-set
- **WHEN** la prueba de contrato aprueba un grupo sobre una base simulada
- **THEN** las únicas escrituras son en órdenes de envío, en los campos de despacho de los pedidos del grupo y en el historial de estados

### Requirement: Apagado
Con la bandera de la empresa apagada o con el interruptor general apagado, toda aprobación SHALL rechazarse con un mensaje en palabras, sin escribir nada.

#### Scenario: Interruptor general apagado
- **WHEN** el interruptor general de la función está apagado y alguien aprueba un grupo
- **THEN** recibe "Esta función está en pausa" y no se escribe nada
