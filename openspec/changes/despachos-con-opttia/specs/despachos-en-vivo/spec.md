## Purpose

Lleva el plan de despachos a la pantalla En vivo del comercio, como una vista más: Opttia avisa cuando hay plan, la persona lo revisa y lo aprueba ahí mismo. El resto de En vivo sigue sin escribir nada.

## ADDED Requirements

### Requirement: La vista Despachos
La página del comercio en En vivo SHALL ofrecer una cuarta vista, "Despachos", junto a Mi operación, Mi país y Pedidos. La vista SHALL aparecer solo si se cumplen las dos condiciones:
- la empresa tiene la bandera `despachosOpttia` encendida;
- la persona puede ver En vivo.

Se escoge en el mismo selector de vistas y la pantalla recuerda la última vista elegida, igual que con las demás.

#### Scenario: Bandera encendida
- **WHEN** una persona con En vivo abre la página de su comercio y la bandera está encendida
- **THEN** el selector ofrece Mi operación, Mi país, Pedidos y Despachos

#### Scenario: Bandera apagada
- **WHEN** la bandera de la empresa está apagada
- **THEN** el selector no muestra Despachos y la pantalla no pide el plan

### Requirement: Qué muestra la vista
La vista SHALL mostrar:
- **Arriba:** cuántos pedidos están listos, cuántos grupos tiene el plan, cuántos mensajeros sugiere, cuántos pedidos van en un envío automático y cuántos no entran.
- **El perfil:** la línea con lo que el perfil de despacho del comercio detectó (capacidad `perfil-de-despacho`).
- **El resumen de Opttia.**
- **Los grupos**, con:
  - zona y franja, o la transportadora;
  - cada pedido con su número y lo que tiene por cobrar;
  - el mensajero o la transportadora sugeridos y la razón;
  - el botón Aprobar.
- **"Aprobar todo".**
- **Las secciones "Envío automático" y "No entra al plan"**, con la razón de cada pedido.

La vista MUST ser la misma para todo comercio. Solo cambian las secciones que aplican a su perfil: un comercio sin mensajeros no ve grupos de mensajero y uno sin transportadora no ve grupos por transportadora.

Tocar un pedido SHALL abrir su ficha de En vivo, la misma de las otras vistas.

#### Scenario: Plan con tres grupos
- **WHEN** el plan tiene 3 grupos y 2 pedidos para recoger en tienda
- **THEN** la vista muestra los 3 grupos en el orden de sus franjas y los 2 pedidos en "No entra al plan" con la razón "Recoge en tienda"

### Requirement: Cuándo no se puede aprobar
La vista MUST NOT ofrecer aprobar ni ajustar en estos casos:
- personal de Katuq mirando el tablero de otro comercio (solo lectura);
- un vendedor que solo ve sus propios pedidos (D-349);
- la pantalla en modo pantalla completa para televisor;
- mientras corre "Repetir el día".

En los casos de solo lectura y de vendedor restringido, la vista Despachos MUST NOT aparecer.

#### Scenario: Repetir el día
- **WHEN** la persona activa "Repetir el día" y luego va a Despachos
- **THEN** los botones de aprobar están desactivados y la vista dice que vuelvan a "en vivo" para aprobar

### Requirement: Estados de la vista
La vista SHALL mostrar en palabras, sin texto técnico, cada uno de sus estados:
- **cargando;**
- **sin pedidos por despachar:** con un estado vacío con ícono, título y texto corto;
- **plan listo;**
- **plan viejo:** "Cambió algo desde las 10:02", con un botón para actualizar;
- **aplicando:** con su propio indicador, porque En vivo no usa el cargador general;
- **resultado:** el resultado de cada grupo.

Los resultados y errores MUST anunciarse también a los lectores de pantalla.

#### Scenario: Un pedido del plan cambia en vivo
- **WHEN** con el plan abierto llega el evento de que un pedido del plan cambió de estado
- **THEN** el pedido se marca como "cambió", la vista ofrece actualizar el plan y no se aprueba nada sola

### Requirement: Opttia avisa que hay pedidos para planear
En las otras vistas del comercio, cuando la bandera está encendida y los datos que En vivo ya tiene muestran pedidos de hoy listos para salir, la narración SHALL decir "Hay N pedidos listos; armo el plan en Despachos" y el orbe de Opttia SHALL señalar el selector de vistas.
- **Sin gasto:** el aviso MUST armarse con plantilla y con los datos que la pantalla ya recibe, sin llamar a Opttia y sin leer pedidos de más.
- **Cuándo se arma el plan:** solo cuando la persona abre la vista Despachos.
- **Frecuencia:** sale a lo sumo una vez cada vez que cambia ese número, en cada sesión.
- **Sin saltos:** MUST NOT cambiar de vista por su cuenta.

#### Scenario: Llegan pedidos listos
- **WHEN** la persona está en Mi operación y 6 pedidos de hoy pasan a Empacado
- **THEN** la narración dice "Hay 6 pedidos listos; armo el plan en Despachos" una sola vez, y la vista sigue en Mi operación hasta que la persona escoja Despachos

### Requirement: El resto de En vivo sigue siendo de solo lectura
La única parte de En vivo que escribe SHALL ser la vista Despachos, solo al aprobar y por su propia ruta. Las vistas Mi operación, Mi país y Pedidos, la ficha, el radar y las preguntas a Opttia MUST seguir sin cambiar pedidos ni datos. Esto es la excepción al requisito "Solo lectura" de `tablero-en-vivo`.

#### Scenario: Ficha desde la vista Pedidos
- **WHEN** la persona abre la ficha de un pedido desde la vista Pedidos
- **THEN** la ficha no ofrece despachar ni asignar; solo abrir el pedido en Todos los pedidos

### Requirement: Diseño
La vista SHALL usar el tema de En vivo, que sigue el design-system (D-131):
- acento morado;
- tarjetas blancas planas;
- labels en mayúscula de color tenue;
- avisos en par color fuerte y fondo suave.

No SHALL usar gradientes ni primarios prohibidos. A 1440 y a 390 px MUST verse sin scroll horizontal y sin texto invisible. A 390 px los grupos van en una sola columna con el botón Aprobar al alcance del pulgar.

#### Scenario: Celular de 390 px
- **WHEN** la vista se abre en un celular de 390 px de ancho
- **THEN** los grupos se apilan en una columna, sin scroll horizontal, y cada grupo tiene su botón Aprobar visible
