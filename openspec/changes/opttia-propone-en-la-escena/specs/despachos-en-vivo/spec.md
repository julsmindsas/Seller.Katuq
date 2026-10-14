## ADDED Requirements

### Requirement: Plan de despachos en la escena
Cuando la empresa tiene encendido el plan de despachos y el plan tiene grupos, la pantalla SHALL proponer cada grupo como una tarjeta de Opttia dentro de la escena (capacidad `opttia-en-vivo`), sin una vista aparte. La tarjeta lleva:
- **Título:** quién lleva cuántos pedidos y a dónde, por ejemplo "Carlos lleva 4 pedidos a Chapinero (9 a 11 a. m.)", "2 pedidos por Cereza" o "3 pedidos a Bello: escoge mensajero".
- **Razón:** la del mensajero sugerido, o la nota y la tarifa de la transportadora.
- **Efectos reales de aprobar:** a quién se avisa y cuántas órdenes se crean en la integración. Lo que hay por cobrar se muestra solo si "ocultar" está apagado.

Cuando la persona toca Aprobar, el botón SHALL cambiar a "Confirmar: <efecto>", por ejemplo "Confirmar: salen 4 con Carlos · avisa a 4 clientes". Si no hay un segundo toque en 5 segundos, MUST volver solo a "Aprobar". El segundo toque SHALL aprobar con las mismas reglas y garantías de `aprobar-plan-de-despachos` y dejar el canal "escena" en el historial. Mientras aplica, la tarjeta SHALL mostrar "Despachando…" con su propio indicador, sin el cargador general.

- **Varios grupos:** si todos los grupos de la cola son de mensajero, la tarjeta SHALL ofrecer "Aprobar los N grupos (M pedidos)". Los grupos por transportadora MUST aprobarse de a uno.
- **Resultado:** SHALL decirse por grupo, en palabras: "Listo: 4 salieron con Carlos", "Dejé fuera el #1043 porque cambió; lo vuelvo a planear" o "Ya estaba aprobado".
- **Cambios en vivo:** si llega un evento que toca un pedido de un grupo, solo ese grupo SHALL marcarse "Cambió el #1043, lo actualizo" y su Aprobar MUST bloquearse hasta refrescar. Los demás grupos siguen aprobables.

#### Scenario: Aprobar un grupo de mensajero
- **WHEN** la tarjeta propone "Carlos lleva 4 pedidos a Chapinero (9 a 11 a. m.)" y la persona toca Aprobar y luego Confirmar
- **THEN** los 4 pedidos quedan como con "Guardar y despachar", el historial dice canal "escena" y la escena anima la salida con los eventos reales

#### Scenario: Un solo toque
- **WHEN** la persona toca Aprobar una vez y no vuelve a tocar en 5 segundos
- **THEN** el botón vuelve a "Aprobar" y no se escribe nada

#### Scenario: Cola con un grupo por transportadora
- **WHEN** la cola tiene 2 grupos de mensajero y 1 por transportadora
- **THEN** la tarjeta no ofrece "Aprobar los N grupos" y cada grupo se aprueba por su lado

#### Scenario: Cambia un pedido del grupo
- **WHEN** con la tarjeta del grupo de Carlos a la vista, el pedido #1043 de ese grupo pasa a otro estado
- **THEN** solo ese grupo dice "Cambió el #1043, lo actualizo" y su Aprobar queda bloqueado hasta refrescar

### Requirement: Ajustar un grupo
Cuando la persona toca "Ajustar" en una tarjeta de despachos, la pantalla SHALL abrir una hoja al costado de la escena. En pantallas de 620 px o menos, la hoja SHALL abrirse abajo, con velo. La hoja muestra:
- el grupo;
- el envío automático;
- lo que no entra al plan, con su razón.

Desde la hoja la persona SHALL poder cambiar el mensajero o la transportadora del grupo, sacar un pedido y aprobar el grupo con la misma confirmación de dos toques. Cerrar la hoja SHALL devolver el foco a la tarjeta.

La hoja no es una ficha. La ficha de un pedido (capacidad `ficha-en-vivo`) MUST seguir sin despachar ni asignar.

#### Scenario: Cambiar el mensajero
- **WHEN** la persona abre Ajustar en el grupo de Carlos y escoge a Ana
- **THEN** la tarjeta dice que lleva Ana, el anillo y la línea de la escena pasan a la moto de Ana, y aprobar despacha con Ana

## RENAMED Requirements

- FROM: `### Requirement: El resto de En vivo sigue siendo de solo lectura`
- TO: `### Requirement: Solo escribe la tarjeta de Opttia`

## MODIFIED Requirements

### Requirement: Cuándo no se puede aprobar
La pantalla MUST NOT ofrecer aprobar ni ajustar en estos casos:
- personal de Katuq mirando el tablero de otro comercio (solo lectura);
- un vendedor que solo ve sus propios pedidos (D-349);
- la pantalla en modo pantalla para televisor;
- mientras corre "Repetir el día".

En los dos primeros casos la pantalla MUST NOT pedir ni mostrar propuestas. En televisor y en "Repetir el día", los botones MUST estar ocultos, no desactivados.

#### Scenario: Repetir el día
- **WHEN** la persona activa "Repetir el día" con una tarjeta a la vista
- **THEN** la tarjeta y el ensayo se esconden, y al volver al vivo la cola se pide otra vez

#### Scenario: Vendedor que solo ve lo suyo
- **WHEN** un vendedor con alcance de solo sus pedidos abre Mi operación
- **THEN** no aparecen la tarjeta ni el contador de ideas, y la pantalla no pide propuestas

### Requirement: Opttia avisa que hay pedidos para planear
Cuando la cola tiene grupos de despachos y no hay una tarjeta a la vista, la narración SHALL decir "Organicé N pedidos en M salidas; apruébalas aquí".
- **Sin gasto:** el aviso MUST armarse con una plantilla y los conteos de la cola, sin llamar a Opttia.
- **Frecuencia:** SHALL salir a lo sumo una vez cada vez que cambian N o M, en cada sesión.
- **Con tarjeta:** mientras hay una tarjeta a la vista, la narración MUST callarse.

#### Scenario: Llegan pedidos listos
- **WHEN** la persona cerró la tarjeta con "Después" y la cola pasa a 6 pedidos en 2 salidas
- **THEN** la narración dice "Organicé 6 pedidos en 2 salidas; apruébalas aquí" una sola vez

### Requirement: Diseño
La tarjeta y la hoja SHALL usar el tema de En vivo, que sigue el design-system (D-131):
- tarjeta blanca y plana, con radio de 16 px, borde lila y sombra violeta difusa;
- Aprobar en el acento morado y los botones secundarios blancos con borde;
- labels en mayúscula de color tenue;
- chips en par de color fuerte y fondo suave.

MUST NOT usar gradientes, primarios prohibidos ni bordes de acento a la izquierda. A 1440 y a 390 px MUST verse sin scroll horizontal y sin texto invisible.

#### Scenario: Celular de 390 px
- **WHEN** la tarjeta se abre en un celular de 390 px de ancho
- **THEN** va abajo dentro de la escena, a todo el ancho con 16 px de margen y hasta el 45 % del alto, con Aprobar a todo el ancho y 48 px de alto, sin scroll horizontal

### Requirement: Solo escribe la tarjeta de Opttia
La única parte de En vivo que escribe SHALL ser la tarjeta de Opttia, con su hoja Ajustar. Escribe solo cuando una persona aprueba y por la ruta de cada operación. En la fase 1, la única operación que escribe es despachar, por la ruta de `aprobar-plan-de-despachos`.

MUST seguir sin cambiar pedidos ni datos:
- las escenas, el orbe y el ensayo;
- la ficha, el radar y la narración;
- las preguntas a Opttia.

Leer la cola de propuestas MUST NOT escribir nada. Esto es la excepción al requisito "Solo lectura" de `tablero-en-vivo`.

#### Scenario: El ensayo no mueve nada
- **WHEN** la escena ensaya un grupo con copias fantasma
- **THEN** las cajas reales siguen en su estación y ningún pedido cambia hasta que una persona apruebe

## REMOVED Requirements

### Requirement: La vista Despachos
**Reason**: Daniel pidió que Opttia organice los despachos "ahí mismo en la animación", no en otra pestaña (D-421).

**Migration**: el plan se propone en la escena ("Plan de despachos en la escena") y su detalle pasa a "Ajustar un grupo". Quien tenía guardada la vista "despachos" cae en "Mi operación". La insignia de pedidos listos pasa al contador del botón del orbe.

### Requirement: Qué muestra la vista
**Reason**: ya no hay vista Despachos.

**Migration**: el contenido se reparte así:
- los conteos van en el título de la tarjeta y en el contador del orbe;
- el resumen de Opttia es la frase de la tarjeta;
- los grupos, el envío automático y "No entra al plan" van en la hoja Ajustar;
- la línea del perfil va en la hoja Ajustar (capacidad `perfil-de-despacho`).

### Requirement: Estados de la vista
**Reason**: ya no hay vista Despachos.

**Migration**: los estados pasan a la tarjeta, según `opttia-en-vivo`, y a "Plan de despachos en la escena":
- cola vacía: "Todo al día. Te aviso si sale algo";
- grupo viejo;
- "Despachando…";
- resultado por grupo, anunciado a los lectores de pantalla.
