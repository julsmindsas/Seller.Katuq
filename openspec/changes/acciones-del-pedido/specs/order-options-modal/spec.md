## ADDED Requirements

### Requirement: Grilla de 16 acciones por tema
THE modal «Opciones del pedido» SHALL mostrar las 16 acciones fijas en una grilla de 4 columnas por 4 filas, en este orden y con estos textos (mockup aprobado del ticket 1350):

| Documentos | Cliente y entrega | Productos y pagos | Seguimiento |
|---|---|---|---|
| PDF del pedido · Descarga el pedido completo | Editar cliente · Cambia los datos del cliente | Editar productos · Agrega o quita productos | Cambiar estado · Actualiza el pago o el proceso |
| Orden de venta · PDF sencillo para el cliente | Editar dirección · Corrige dónde se entrega | Descuento · Aplica o ajusta un descuento | Historial · Mira todos los cambios |
| Reenviar confirmación · Envía de nuevo al cliente | Facturación · Datos para la factura | Impuestos · Ajusta el IVA del pedido | Notas · Agrega o edita notas |
| Duplicar · Crea una copia del pedido | Cambiar asesor · Asigna otro responsable | Pagos · Registra y consulta pagos | Limpiar notas · Borra notas de productos retirados |

WHERE el comercio maneja impuestos distintos del IVA, la reseña de Impuestos SHALL decir «Ajusta los impuestos del pedido».

Cada acción SHALL tener un ícono propio, distinto de los demás, en contorno y con el mismo grosor, de la familia aprobada para Katuq. El mockup usa Tabler como referencia. Todas las reseñas SHALL ir en el mismo gris.

#### Scenario: Pedido de venta normal
- **WHEN** el usuario abre «Más opciones» en un pedido de venta pendiente
- **THEN** ve las 16 tarjetas en las cuatro columnas del cuadro, cada una con su ícono, sin huecos y con todas las reseñas del mismo color

### Requirement: Tamaño sin scroll
THE modal SHALL medir 1040 px de ancho, o el 80 % de la pantalla si no cabe. WHILE la pantalla mide 1366×768 o más, con el navegador maximizado y el zoom al 100 %, el modal SHALL verse completo sin scroll, incluida la fila «Para este pedido». WHILE la pantalla es más angosta que el modal, la grilla SHALL pasar a 2 columnas y el modal SHALL NOT tener scroll horizontal.

#### Scenario: Portátil de 1366×768
- **WHEN** el usuario abre el modal en un pedido despachado y sin factura, en 1366×768
- **THEN** ve el encabezado, las 16 tarjetas, la fila de contexto y el pie sin desplazar nada

### Requirement: Tarjeta pareja y sin textos cortados
Cada tarjeta SHALL mostrar el ícono de 28 px, el título, la reseña y, a la derecha, el lugar del pin, que en esta fase queda vacío. Ningún texto SHALL cortarse con «…»: si la reseña no cabe, baja a una segunda línea y las tarjetas de esa fila SHALL crecer juntas.

#### Scenario: Reseña larga
- **WHEN** la reseña de «Limpiar notas» ocupa dos líneas
- **THEN** las otras tres tarjetas de la cuarta fila miden lo mismo y ningún texto lleva «…»

### Requirement: Encabezado con buscador
THE encabezado SHALL mostrar «Opciones del pedido», el número del pedido, el buscador «Buscar acción» y el botón cerrar (X).

WHEN el usuario escribe en el buscador, el modal SHALL dejar visibles solo las acciones cuyo título, reseña o nombre anterior coincidan, sin importar mayúsculas ni tildes. WHEN queda una sola acción habilitada y el usuario presiona Enter, SHALL abrirla. IF ninguna coincide, THEN SHALL decir «Ninguna acción con ese nombre».

#### Scenario: Buscar con el nombre viejo
- **WHEN** el usuario escribe «imprimir»
- **THEN** queda visible «PDF del pedido»

### Requirement: Pie con eliminar aparte y cerrar
THE pie SHALL mostrar a la izquierda «Eliminar pedido · se borra para siempre» como enlace rojo, solo para quien hoy puede eliminar. A la derecha SHALL mostrar «Cerrar» como botón secundario, en lugar de «Cancelar». La X, «Cerrar» y Esc SHALL cerrar el modal sin hacer nada.

WHEN el usuario toca «Eliminar pedido», Katuq SHALL pedirle que escriba el número del pedido. El botón de eliminar SHALL habilitarse solo cuando el número escrito coincide, y Enter sin coincidencia SHALL NOT eliminar.

#### Scenario: Eliminar con confirmación
- **WHEN** un usuario autorizado toca «Eliminar pedido» y escribe un número distinto
- **THEN** el botón de eliminar sigue deshabilitado y el pedido no se elimina

### Requirement: Posición fija con motivo
En un pedido de venta, las 16 acciones SHALL estar siempre en su lugar. IF una acción no aplica a ese pedido o a ese usuario, THEN su tarjeta SHALL verse deshabilitada, con un candado y el motivo en lugar de la reseña, en el par semántico de alerta:

- Editar productos, Descuento e Impuestos: «Congelado · estado del pedido»;
- Editar dirección: «Solo domicilios»;
- Facturación: «Ya tiene factura»;
- Notas: «No aplica a pedidos POS»;
- Cambiar asesor: «Solo administradores».

Una tarjeta deshabilitada SHALL NOT abrir nada.

#### Scenario: Pedido congelado
- **WHEN** el pedido está Despachado y el usuario no es administrador
- **THEN** Editar productos, Descuento e Impuestos se ven en su lugar con candado y «Congelado · Despachado», y no se abren

### Requirement: Fila «Para este pedido»
WHEN al pedido le aplica al menos una acción de contexto, THE modal SHALL mostrar debajo de la grilla una fila compacta «Para este pedido», de una línea por acción. WHEN no aplica ninguna, la fila SHALL NOT aparecer. Las acciones de contexto SHALL ser solo estas:

- **Factura electrónica:** agrupa Facturar, Refacturar, Liberar factura, Estado DIAN, PDF DIAN, Nota crédito y Ajuste NC/ND, con las mismas condiciones de hoy. Si aplica una sola, la tarjeta lleva su nombre y la abre. Si aplican varias, muestra la lista de las que aplican;
- **Despacho:** Ver despacho y entrega, cuando el pedido está Despachado o Entregado;
- **Corregir precio** y **Cambiar tipo de precio:** cuando D-543 y D-544 las habiliten, con sus propias reglas;
- **Producción** y **Marcar revisión:** cuando el pedido se abre desde Producción.

Una acción nueva del pedido SHALL entrar a la grilla o a esta fila solo si su propuesta lo decide.

| Situación del pedido | Acciones de contexto (máximo) |
|---|---|
| Venta sin factura, despachada, piloto ALMARA | Factura electrónica · Despacho · Corregir precio · Cambiar tipo de precio |
| Venta facturada y entregada | Factura electrónica · Despacho · las dos de precio, si D-543 y D-544 las muestran bloqueadas |
| Abierto desde Producción | Producción · Marcar revisión · Despacho |

#### Scenario: Pedido facturado con DIAN
- **WHEN** el usuario abre el modal de un pedido facturado con DIAN
- **THEN** la fila muestra «Factura electrónica» y, al tocarla, ofrece Estado DIAN, PDF DIAN, Nota crédito y Ajuste NC/ND

### Requirement: Descuento en una sola tarjeta
WHEN el pedido no tiene descuento, la tarjeta Descuento SHALL abrir la ventana de aplicar de hoy. WHEN ya tiene descuento, SHALL ofrecer las dos ventanas de hoy: aplicar, y editar o quitar.

#### Scenario: Pedido con descuento
- **WHEN** el pedido tiene descuento y el usuario toca Descuento
- **THEN** puede escoger entre aplicar otro o editar y quitar el actual

### Requirement: Un solo nombre en los tres lugares
El bloque ACCIONES del detalle, el modal y el menú «⋯» de cada fila del listado SHALL usar el mismo título para la misma acción:

- Imprimir PDF / Generar PDF del pedido → PDF del pedido;
- Estado de Pago / Actualizar estados del pedido → Cambiar estado;
- Agregar Productos / Añadir o retirar productos → Editar productos;
- Enviar de nuevo la confirmación / Envía de nuevo la confirmación del pedido → Reenviar confirmación;
- y así con todas las del cuadro de la grilla.

En el bloque, la reseña SHALL ser la misma del modal.

#### Scenario: Mismo nombre
- **WHEN** el usuario ve el bloque ACCIONES y luego abre el modal del mismo pedido
- **THEN** la acción que abre el PDF se llama «PDF del pedido» en los dos lugares y en el menú «⋯» de la fila

### Requirement: Mismo comportamiento y vista de Producción
Cada acción SHALL abrir la misma ventana, con las mismas reglas y permisos, y producir el mismo resultado que hoy. Las únicas excepciones son la confirmación de eliminar y la tarjeta Descuento. Esta fase SHALL NOT escribir datos nuevos. WHILE el pedido se abre desde Producción, el modal SHALL mostrar solo las acciones que hoy aplican allí, sin tarjetas deshabilitadas.

#### Scenario: Antes y después
- **WHEN** se hace la misma acción sobre el mismo pedido con la versión anterior y con la nueva
- **THEN** lo que se guarda en el pedido es idéntico

### Requirement: Diseño y teclado
THE modal SHALL usar los tokens de `openspec/specs/design-system/spec.md`: acento `#5F3FE0`, pares semánticos, labels de columna en MAYÚSCULA muted y nada de gradientes ni primarios prohibidos. Las tarjetas SHALL recorrerse con Tab en orden de lectura, con el foco visible. Ninguna clase nueva SHALL contener «p-».

#### Scenario: Solo teclado
- **WHEN** el usuario abre el modal y usa Tab y Enter
- **THEN** llega al buscador, a cada tarjeta habilitada y al pie, con el foco visible
