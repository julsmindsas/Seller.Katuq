## Delta sobre D-547 (`order-pinned-actions`)

Solo se listan los requisitos que cambian. Todo lo demás de D-547 (bandera, rol, restablecer, fijar no da acceso, privacidad, fallas) se conserva igual.

## MODIFIED Requirements

### Requirement: Nueve espacios, cuatro del rol y cinco del usuario
THE bloque ACCIONES SHALL mostrar 9 acciones: primero las 4 del rol del usuario y después sus 5 personales. Las acciones de factura electrónica SHALL seguir apareciendo debajo cuando aplican. Se pueden fijar solo las 16 acciones fijas de la grilla.

#### Scenario: Usuario nuevo con perfil General
- **WHEN** un usuario con perfil General y sin uso abre un pedido
- **THEN** ve PDF del pedido, Orden de venta, Editar cliente, Facturación, Pagos, Cambiar estado, Notas, Historial y Editar dirección

### Requirement: Las cinco del usuario y el pin
Los espacios personales SHALL llenarse así, sin repetir las del rol:

1. las acciones que el usuario fijó, en su orden, hasta 5;
2. las más usadas en los últimos 30 días (por días distintos de uso), marcadas «Frecuente»;
3. el orden fijo: Pagos, Cambiar estado, Notas, Historial, Editar dirección y luego el resto de la grilla.

Lo que el usuario fija SHALL mandar sobre lo «Frecuente». IF los 5 pines ya están usados, THEN Katuq SHALL decir «Puedes fijar hasta 5» y preguntar cuál reemplazar. THE pin SHALL estar en el modal y en cada tarjeta personal del panel (al pasar el mouse o con foco de teclado), con el mismo guardado. Las del rol SHALL mostrar el pin con candado y «Fijada por tu administrador» y SHALL NOT poder soltarse.

#### Scenario: Fijar desde el panel
- **WHEN** el usuario pasa el mouse sobre la tarjeta «Notas» (frecuente) y toca el pin
- **THEN** Notas queda fijada, pierde la etiqueta «Frecuente» y se ve con pin en el panel y en el modal

#### Scenario: Límite
- **WHEN** el usuario con 5 pines intenta fijar Descuento
- **THEN** ve «Puedes fijar hasta 5» y puede elegir cuál reemplazar; si cancela, nada cambia

### Requirement: Estables durante el día
THE «Frecuente» SHALL calcularse una sola vez, al cargar las preferencias del usuario al iniciar sesión. Ninguna regla automática SHALL mover, quitar ni reordenar las 9 acciones después. Las 9 SHALL cambiar solo cuando el usuario fija, suelta o restablece, cuando un administrador cambia su rol, o en su siguiente inicio de sesión.

#### Scenario: Uso a mitad de jornada
- **WHEN** el usuario usa Historial 10 veces en una mañana sin fijar nada
- **THEN** el panel no cambia durante la jornada; en su siguiente inicio de sesión Historial puede aparecer como «Frecuente»

### Requirement: Uso de 30 días
THE sistema SHALL contar, por usuario, los días distintos de los últimos 30 en que usó cada acción fijable, y SHALL guardar solo la acción, el usuario y el día. THE sistema SHALL NOT guardar datos del pedido ni del cliente, ni escribir en la consola. IF el usuario no tiene uso, THEN SHALL aplicar el orden fijo.

#### Scenario: Usuario sin historial
- **WHEN** un usuario nuevo abre su primer pedido
- **THEN** ve el orden fijo y ninguna etiqueta «Frecuente»

### Requirement: Estado visible en la tarjeta
THE tarjeta Facturación SHALL mostrar «Sin factura» cuando el pedido no tiene factura; THE tarjeta Pagos SHALL mostrar el saldo pendiente cuando lo hay. Ambos datos SHALL salir del pedido ya cargado, sin una consulta nueva. THE acciones que no aplican SHALL seguir deshabilitadas con su motivo en su mismo lugar, sin dejar huecos.

#### Scenario: Pedido facturado
- **WHEN** el pedido ya tiene factura
- **THEN** Facturación se ve deshabilitada con su motivo y las demás tarjetas no se mueven

### Requirement: Diseño en tres columnas
THE bloque SHALL mostrar las tarjetas en 3 columnas en escritorio, 2 en tablet y 1 en celular, según el ancho del panel, y SHALL NOT tener scroll horizontal. Cada tarjeta lleva ícono, nombre y reseña corta; el texto baja de línea y no se corta. El pin y la etiqueta «Frecuente» SHALL usar los tokens de `openspec/specs/design-system/spec.md` (acento `#5F3FE0`, sin gradientes) y el pin SHALL tener nombre accesible y alcance por teclado.

#### Scenario: Celular de 390 px
- **WHEN** el usuario abre un pedido en un celular de 390 px
- **THEN** ve las 9 tarjetas en una columna, completas y sin scroll horizontal

#### Scenario: Escritorio de 1440 px
- **WHEN** el usuario abre un pedido a 1440 px
- **THEN** ve las 9 tarjetas en una cuadrícula de 3 por 3 sin scroll vertical dentro del panel
