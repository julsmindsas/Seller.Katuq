## ADDED Requirements

### Requirement: Disponible por empresa
WHERE el comercio tiene encendida la bandera de acciones principales personalizables, THE detalle del pedido SHALL aplicar esta capacidad. WHERE no la tiene, el bloque ACCIONES SHALL verse como quedó en la fase 1.

#### Scenario: Comercio sin la bandera
- **WHEN** un usuario de un comercio sin la bandera abre un pedido
- **THEN** ve el bloque ACCIONES de la fase 1 y el modal sin pines

### Requirement: Ocho espacios, cuatro del rol y cuatro del usuario
THE bloque ACCIONES SHALL mostrar 8 acciones: primero las 4 del rol del usuario y después sus 4 personales. Usan los mismos títulos y reseñas del modal. Las demás acciones SHALL seguir en «Más opciones».

Las acciones de factura electrónica SHALL seguir apareciendo debajo de las 8 cuando aplican, como hoy. WHILE Historial está entre las 8, el pie del detalle SHALL mostrar solo «Más opciones».

Se pueden fijar solo las 16 acciones de la grilla del modal. Las de contexto y Eliminar pedido SHALL NOT poder fijarse.

#### Scenario: Cajero
- **WHEN** un usuario cuyo rol tiene el perfil Caja abre un pedido
- **THEN** ve primero PDF del pedido, Pagos, Facturación y Editar productos, y después sus 4 personales

### Requirement: Las cuatro del rol
Un administrador del comercio SHALL poder escoger, en Roles y permisos, las 4 acciones de cada rol. Para eso parte de un perfil y puede cambiar cualquiera de las 4:

| Perfil | Acciones del rol |
|---|---|
| Caja | PDF del pedido · Pagos · Facturación · Editar productos |
| Despacho | Editar dirección · Orden de venta · Cambiar estado · Historial |
| Comercial | Editar cliente · Notas · Editar productos · Orden de venta |
| General | PDF del pedido · Orden de venta · Editar cliente · Facturación |

IF un rol no tiene acciones escogidas, THEN SHALL usar el perfil General, que son las 4 primeras de hoy. Solo un administrador de ese comercio SHALL poder cambiar las acciones de sus roles. Esas acciones SHALL NOT dar ni quitar permisos.

#### Scenario: Rol sin configurar
- **WHEN** ALMARA enciende la bandera y nadie ha configurado el rol VENTAS
- **THEN** los usuarios de VENTAS ven como acciones del rol PDF del pedido, Orden de venta, Editar cliente y Facturación

### Requirement: Las cuatro del usuario y el pin
Mientras el usuario no fije nada, sus 4 espacios personales SHALL mostrar las siguientes acciones de un orden fijo, sin repetir las del rol: Notas, Cambiar estado, Editar productos, Editar dirección, Pagos, Historial…

En el modal, cada tarjeta fijable SHALL mostrar su pin:

- azul si la acción está entre las 8;
- gris si no.

WHEN el usuario toca un pin gris, la acción SHALL quedar en uno de sus espacios personales. IF los 4 ya tienen acciones fijadas, THEN Katuq SHALL preguntarle cuál reemplazar. WHEN toca el pin azul de una acción personal, la acción SHALL salir y su espacio SHALL volver al orden fijo. Las acciones del rol SHALL mostrar el pin azul con candado y el texto «Fijada por tu rol», y SHALL NOT poder soltarse. Lo que el usuario fija SHALL mandar sobre cualquier sugerencia.

#### Scenario: Fijar Pagos
- **WHEN** un usuario con el perfil General toca el pin gris de Pagos
- **THEN** Pagos aparece en sus acciones personales y su pin queda azul en el modal

#### Scenario: Espacios llenos
- **WHEN** el usuario ya fijó 4 acciones y toca el pin de Descuento
- **THEN** Katuq le pregunta cuál de las 4 reemplazar, y si cancela nada cambia

### Requirement: Estables durante el día
Ninguna regla automática SHALL mover, quitar ni reordenar las 8 acciones mientras el usuario trabaja. Las 8 SHALL cambiar solo cuando el usuario fija o suelta una, cuando restablece o cuando un administrador cambia su rol. El cambio del administrador SHALL verse en el siguiente inicio de sesión del usuario.

#### Scenario: Toda la jornada
- **WHEN** un usuario abre 40 pedidos en el día sin fijar nada
- **THEN** las 8 acciones están en el mismo orden y lugar en todos

### Requirement: Sugerencias por uso
THE sistema SHALL contar, por usuario, cuántas veces usa cada acción fijable. Como máximo una vez por semana, al abrir el primer pedido del día, Katuq SHALL sugerirle fijar una acción que no está entre sus 8 y que usó en al menos 3 días distintos de la última semana («Usas Pagos a diario, ¿lo fijamos?»), con «Fijar» y «Ahora no». WHEN el usuario elige «Ahora no», Katuq SHALL NOT sugerir esa misma acción durante 30 días. Katuq SHALL NOT fijar nada sin que el usuario lo acepte.

#### Scenario: Sugerencia aceptada
- **WHEN** el usuario usó Pagos 4 días de la última semana, no la tiene entre sus 8 y abre su primer pedido del lunes
- **THEN** ve la sugerencia y, si toca «Fijar», Pagos pasa a sus acciones personales como si la hubiera fijado él

### Requirement: Resaltar sin mover
THE bloque SHALL resaltar una acción según el estado del pedido, sin cambiarla de lugar:

- pago pendiente: Pagos;
- pagado (pago aprobado o preaprobado) y sin factura: Facturación.

El resaltado usa el par semántico de alerta y una etiqueta corta («Pago pendiente», «Sin factura»). IF la acción no está entre las 8, THEN SHALL resaltarse solo su tarjeta en el modal.

#### Scenario: Pedido pagado sin factura
- **WHEN** un usuario con el perfil Caja abre un pedido pagado y sin factura
- **THEN** Facturación se ve resaltada con «Sin factura», en el mismo lugar de siempre

### Requirement: Restablecer acciones
THE bloque SHALL ofrecer «Restablecer acciones». WHEN el usuario lo confirma, sus 4 espacios personales SHALL volver al orden fijo y sus pines personales SHALL soltarse. Las acciones del rol SHALL NOT cambiar.

#### Scenario: Restablecer
- **WHEN** el usuario fijó Pagos y Descuento y confirma «Restablecer acciones»
- **THEN** sus 4 personales vuelven al orden fijo y los pines de Pagos y Descuento quedan grises

### Requirement: Fijar no da acceso
IF una acción de las 8 no aplica al pedido o el usuario no tiene permiso para ella, THEN su tarjeta SHALL verse deshabilitada con el mismo motivo que en el modal y SHALL NOT abrir nada. Fijar, sugerir o configurar un rol SHALL NOT cambiar ningún permiso.

#### Scenario: Cambiar asesor sin ser administrador
- **WHEN** un usuario que no es administrador fija Cambiar asesor
- **THEN** la acción aparece entre sus 8, deshabilitada con «Solo administradores»

### Requirement: Preferencias del usuario en cualquier equipo y por empresa
Las acciones fijadas, las sugerencias rechazadas y el conteo de uso SHALL pertenecer al usuario dentro de su comercio y SHALL seguirlo en cualquier equipo. Las acciones de cada rol SHALL pertenecer a ese rol en ese comercio. Ningún usuario SHALL ver ni cambiar las preferencias de otro usuario o comercio.

#### Scenario: Caja compartida
- **WHEN** dos cajeros usan el mismo computador con sesiones distintas
- **THEN** cada uno ve sus propias acciones personales

### Requirement: Rendimiento, privacidad y fallas
Abrir el detalle del pedido SHALL NOT tardar más que hoy por esta capacidad: las preferencias llegan con la sesión, sin una consulta por pedido. El conteo de uso SHALL guardar solo la acción, el usuario y el día, sin datos del pedido ni del cliente, y SHALL NOT escribirse en la consola. IF guardar el conteo o una preferencia falla, THEN la acción SHALL hacerse igual, y Katuq SHALL avisar que la preferencia no se guardó y dejar el bloque como estaba.

#### Scenario: Falla al guardar el pin
- **WHEN** se cae la conexión mientras el usuario fija Pagos
- **THEN** Katuq le avisa que no se guardó, el bloque queda como estaba y Pagos sigue disponible en el modal

### Requirement: Diseño
THE bloque y los pines SHALL usar los tokens de `openspec/specs/design-system/spec.md`:

- acento `#5F3FE0` para el pin fijado;
- gris muted para el no fijado;
- par de alerta para el resaltado;
- nada de gradientes.

El pin SHALL tener un nombre accesible («Fijar en acciones principales» o «Quitar de acciones principales») y ser alcanzable con el teclado. En el celular, las 8 SHALL verse en 2 columnas sin scroll horizontal.

#### Scenario: Celular
- **WHEN** el usuario abre un pedido en un celular de 390 px
- **THEN** ve las 8 acciones en 2 columnas, completas y sin scroll horizontal
