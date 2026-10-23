## ADDED Requirements

### Requirement: Ancho del panel del ticket en escritorio
WHILE la ventana mide 1001 px de ancho o más, el panel del ticket SHALL medir el 32 % del ancho del área del POS, con un mínimo de 400 px y un máximo de 440 px.

#### Scenario: Pantalla ancha
- **WHEN** el cajero abre el POS en una pantalla de 1920 px
- **THEN** el panel del ticket mide 440 px y el catálogo ocupa el resto

#### Scenario: Pantalla de 1366 px
- **WHEN** el cajero abre el POS en una pantalla de 1366×768
- **THEN** el panel mide entre 400 y 440 px y el catálogo no queda con scroll horizontal

### Requirement: Cliente plegable a una línea
WHILE hay un cliente asociado a la venta, el panel SHALL mostrarlo en una sola línea con el avatar (inicial), el nombre, el documento y el botón «Cambiar», y SHALL ocultar el buscador.

WHEN el cajero toca la línea del cliente, el panel SHALL desplegar la facturación (con su «Cambiar» de D-419), el teléfono, el correo y las acciones de hoy (métricas, editar y quitar). WHEN la toca otra vez, SHALL plegarla.

WHEN el cajero toca «Cambiar», el panel SHALL mostrar el buscador con el foco puesto y SHALL conservar el cliente actual hasta que se escoja otro. IF el cajero cancela (Esc o clic fuera), THEN el panel SHALL volver a la línea del cliente actual.

IF la facturación del cliente está incompleta, THEN la línea plegada SHALL mostrar el aviso con el par semántico de alerta, sin que haga falta desplegarla.

WHILE no hay cliente, el panel SHALL mostrar el buscador y el botón «Nuevo» en una sola fila.

Buscar, asociar, crear, editar, quitar y cambiar la facturación SHALL funcionar igual que hoy.

#### Scenario: Cliente asociado
- **WHEN** el cajero asocia a «Laura Gómez, CC 1.036.000.000»
- **THEN** ve una sola línea con «L», «Laura Gómez», el documento y «Cambiar», y el buscador no aparece

#### Scenario: Facturación incompleta
- **WHEN** el cliente asociado no tiene completos sus datos de facturación
- **THEN** la línea plegada muestra el aviso de facturación incompleta en color de alerta

#### Scenario: Cambiar y arrepentirse
- **WHEN** el cajero toca «Cambiar» y luego presiona Esc sin escoger a nadie
- **THEN** la venta sigue con el mismo cliente y vuelve la línea plegada

### Requirement: Filas de producto compactas
Cada línea del ticket SHALL mostrarse en una fila de unos 48 px (máximo 56 px) con:

- la miniatura;
- el nombre en máximo 2 líneas, cortado con «…» y completo al pasar el puntero;
- los botones − y + con la cantidad;
- el precio unitario con IVA;
- el subtotal de la línea (precio unitario × cantidad);
- el botón quitar.

Los botones −, + y quitar SHALL medir al menos 32×32 px. El precio unitario y el subtotal SHALL salir del mismo cálculo por línea que el total del ticket (D-536).

#### Scenario: Línea con varias unidades
- **WHEN** el ticket tiene 3 unidades de un producto de $12.000
- **THEN** la fila muestra $12.000 de precio unitario y $36.000 de subtotal, y mide como máximo 56 px de alto

### Requirement: Editor de precio plegado
El editor de precio, IVA y descuento por línea (D-536) SHALL quedar oculto detrás de un botón «Editar precio» en cada línea.

WHEN el cajero toca «Editar precio», el panel SHALL abrir el editor debajo de esa línea, con los mismos campos, reglas y «Restaurar» de hoy, y SHALL cerrar el editor de cualquier otra línea. Cerrar el editor SHALL NOT deshacer los cambios.

WHILE una línea tiene cambios, SHALL mostrar la marca «Editado» aunque el editor esté cerrado.

#### Scenario: Editar y plegar
- **WHEN** el cajero abre «Editar precio», cambia el IVA de la línea a 0 % y cierra el editor
- **THEN** la fila muestra el nuevo precio unitario y la marca «Editado», y el TOTAL refleja el cambio

### Requirement: Pie fijo compacto
El pie del panel SHALL quedar fijo abajo y SHALL contener:

- el TOTAL como el elemento más grande del pie;
- los métodos de pago de hoy (Efectivo, Métodos electrónicos y E-wallet) en una sola fila, con los mismos textos y el mismo flujo de cobro.

El título del resumen SHALL decir cuántas unidades lleva el ticket (la suma de las cantidades): «1 unidad» o «N unidades».

Las filas Descuento y Cupón SHALL mostrarse solo cuando su valor sea distinto de 0. El Subtotal SHALL mostrarse solo cuando sea distinto del TOTAL.

El TOTAL SHALL ser el mismo valor que hoy se cobra y se envía en el pedido.

El campo de cupón SHALL quedar plegado detrás de «Agregar cupón» y SHALL comportarse igual que hoy.

#### Scenario: Conteo de unidades
- **WHEN** el ticket tiene 3 unidades de un producto y 2 de otro
- **THEN** el título dice «5 unidades»

#### Scenario: Sin descuento ni cupón
- **WHEN** el ticket no tiene descuento ni cupón
- **THEN** el pie muestra solo el TOTAL y los botones de pago, sin filas en $0

### Requirement: Un solo scroll
WHILE la ventana mide 1001 px de ancho o más, el panel SHALL tener como máximo una zona que se desplaza: la lista de productos. El cliente y el pie SHALL quedar fijos.

IF el alto disponible no alcanza para el cliente, el título, 2 líneas de producto y el pie, THEN el panel completo SHALL desplazarse y la lista SHALL dejar de tener scroll propio, para que el TOTAL y los botones de pago siempre se puedan alcanzar (D-430).

#### Scenario: Ticket largo
- **WHEN** el ticket tiene 12 productos en una pantalla de 1366×768
- **THEN** solo la lista se desplaza, y el TOTAL y los botones de pago siguen visibles

#### Scenario: Ventana muy baja
- **WHEN** la ventana del navegador mide 1366×520
- **THEN** el panel se desplaza como un todo, no hay dos barras de scroll y el cajero alcanza los botones de pago

### Requirement: Criterio de aceptación en 1366×768
WHEN el ticket tiene 5 productos y un cliente asociado con su facturación, en una pantalla de 1366×768 con el navegador maximizado y el zoom al 100 %, el cajero SHALL ver las 5 líneas completas, el TOTAL y los 3 botones de pago sin desplazar la página ni el panel, y ningún elemento SHALL quedar encima de otro.

#### Scenario: Venta típica de ALMARA
- **WHEN** el cajero arma una venta de 5 productos con cliente en una pantalla de 1366×768
- **THEN** ve la lista, el TOTAL y Efectivo, Métodos electrónicos y E-wallet sin hacer scroll, y nada se monta encima de nada

### Requirement: Sin cambios de comportamiento
El rediseño SHALL NOT cambiar:

- el pedido que se crea;
- el monto que se cobra;
- el cálculo del total;
- la forma de identificar y quitar líneas;
- el flujo de cobro;
- la asociación del cliente y su facturación.

#### Scenario: Misma venta antes y después
- **WHEN** se hace la misma venta (5 productos, uno con precio editado, con cliente, cobrada en efectivo) con la versión anterior y con la nueva
- **THEN** el pedido enviado al servidor y el monto cobrado son idénticos

### Requirement: Móvil y tablet sin cambios
WHILE la ventana mide menos de 1001 px de ancho, el ticket SHALL verse y funcionar como hoy: hoja que sube desde la barra inferior, con el total y «Cobrar» siempre a la vista.

#### Scenario: Celular
- **WHEN** el cajero usa el POS en un celular de 390 px
- **THEN** la barra inferior y la hoja del ticket se ven y funcionan igual que en la versión anterior, sin scroll horizontal

### Requirement: Regla de diseño Katuq
El panel SHALL usar los tokens y patrones de `openspec/specs/design-system/spec.md`:

- acento `#5F3FE0`;
- labels en MAYÚSCULA con color muted;
- radios de 16, 11 y 20 px;
- pares semánticos de color fuerte con fondo suave;
- sin gradientes decorativos ni primarios prohibidos;
- foco visible con teclado.

Ninguna clase nueva SHALL contener «p-», y todo texto que aparezca condicionalmente SHALL llevar su propio color y tamaño.

#### Scenario: Revisión de diseño
- **WHEN** se revisa el cambio antes de cerrarlo
- **THEN** el conteo de gradientes y de primarios prohibidos en `pos2` no sube, y en 1440 px y 390 px no hay scroll horizontal ni texto invisible
