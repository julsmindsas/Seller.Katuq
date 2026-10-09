## ADDED Requirements

### Requirement: Una tienda con productos, textos y diseño en un solo paso
El sistema SHALL permitir que un administrador, con la función encendida para su empresa, cree su tienda escribiendo el nombre de su negocio y una frase de qué vende, o subiendo hasta 3 fotos con su precio. El sistema SHALL responder al instante con el sitio y SHALL seguir el trabajo en segundo plano, dejando el avance (estado, paso, productos listos y un mensaje amable) en el propio sitio para que se consulte cada pocos segundos. Cerrar la ventana SHALL NOT cancelar el trabajo.

#### Scenario: Tres fotos con precio
- **WHEN** el administrador sube 3 fotos, escribe el precio de cada una y toca "Crear mi tienda"
- **THEN** ve el avance por pasos y al final el enlace de su tienda publicada con tres productos a los precios que escribió

#### Scenario: Cerrar a mitad de camino
- **WHEN** cierra la ventana mientras se arma la tienda
- **THEN** la tienda aparece en "Mis páginas" como "Creándose" y termina sola

### Requirement: El precio lo pone el comercio
Cada foto SHALL traer el precio que escribió la persona. El sistema SHALL NOT crear un producto sin ese precio, SHALL NOT inventar un precio ni un producto, y SHALL NOT tomar ningún precio de lo que devuelva la IA. Un precio de cero, negativo, vacío o que no sea un número SHALL rechazarse con un mensaje que diga cuál foto. El precio SHALL ser en pesos enteros: el punto o la coma SHALL entenderse como separador de miles solo en grupos de 3 dígitos ("12.500", "1.250.000"), y un valor con decimales ("12.5", "1.5", "45,50") SHALL rechazarse con el mensaje "escribe el precio en pesos, sin decimales" en vez de redondearse. La misma regla SHALL aplicar en el navegador y en el servidor, y el servidor SHALL volver a validar el precio guardado antes de crear el producto.

#### Scenario: Precio con decimales
- **WHEN** una foto trae el precio "12.5"
- **THEN** no se envía nada y se le dice a la persona que escriba el precio en pesos, sin decimales

#### Scenario: Foto sin precio
- **WHEN** una de las fotos no trae precio
- **THEN** no se envía nada y se le dice a la persona cuál foto necesita su precio

#### Scenario: La IA sugiere un precio
- **WHEN** la lectura de la foto devuelve un precio
- **THEN** el producto queda con el precio que escribió el comercio

### Requirement: Nunca se publica una tienda sin un producto con precio
El sistema SHALL publicar la tienda solo si al terminar existe al menos un producto con precio, activo y para la página web. Con solo la descripción, o si todas las fotos fallan, SHALL dejar la página diseñada como borrador sin publicar y SHALL decir qué falta (agregar un producto con foto y precio).

#### Scenario: Solo la descripción
- **WHEN** el administrador no sube fotos
- **THEN** la página queda como borrador diseñado, sin publicar, y el aviso dice qué falta para publicarla

### Requirement: Cada foto por separado
El sistema SHALL procesar cada foto aparte. Si una falla, SHALL omitirla con un aviso que diga qué pasó y qué hacer, y SHALL seguir con las demás.

#### Scenario: Una foto no se puede leer
- **WHEN** la segunda foto no se puede leer
- **THEN** se crean los demás productos, se publica la tienda y el aviso nombra la foto 2

### Requirement: Idempotente y a prueba de reinicios
La misma solicitud (doble clic, reintento de red, reintento tras una interrupción) SHALL caer en el mismo sitio y SHALL NOT duplicar productos, sitios, lecturas de IA ni el cupo de páginas. Si el servidor se reinicia a medias, el trabajo SHALL quedar marcado como interrumpido y SHALL poder retomarse sin repetir lo ya hecho. SHALL existir un solo trabajo sin terminar por empresa, aun si llegan dos solicitudes distintas (dos pestañas) a la vez: solo la que quedó guardada primero SHALL seguir, y la otra SHALL responder que ya hay una tienda a medio crear y SHALL NOT gastar IA ni crear productos. La misma solicitud con otros datos (por ejemplo, un precio corregido) SHALL responder 409 en vez de reenganchar el trabajo anterior, y el navegador SHALL usar un identificador nuevo cuando el formulario cambió. Un trabajo que no responde pasado su tiempo máximo SHALL marcarse como fallido con un mensaje amable y poder reintentarse.

#### Scenario: Reinicio a mitad de camino
- **WHEN** el servidor se reinicia después de crear el segundo producto
- **THEN** el avance dice que se interrumpió, "Reintentar" termina la tienda y quedan exactamente tres productos

#### Scenario: Dos solicitudes iguales al tiempo
- **WHEN** llegan dos solicitudes con el mismo identificador a la vez
- **THEN** existe un solo sitio y corre un solo trabajo

#### Scenario: Dos pestañas con distinto identificador al tiempo
- **WHEN** llegan dos solicitudes con identificadores distintos de la misma empresa a la vez
- **THEN** corre un solo trabajo, se gastan las lecturas de IA una sola vez y la otra pestaña ve el aviso de la tienda a medio crear

#### Scenario: Una llamada que nunca responde
- **WHEN** una llamada a un tercero no responde y el trabajo pasa de su tiempo máximo
- **THEN** el avance dice que tardó más de lo normal, se puede reintentar y la empresa puede volver a empezar

### Requirement: Los cupos se revisan antes de empezar
El sistema SHALL revisar, antes de guardar nada, las lecturas de fotos que le quedan al plan, las páginas con Opttia del mes y, con fotos, la tienda publicada del plan gratis. Si no alcanzan, SHALL responder con un mensaje claro y SHALL NOT gastar IA, guardar fotos ni crear el sitio. Las lecturas de fotos SHALL contarse con la misma llave del cupo que usa el resto de la IA de productos (un solo contador por persona, no uno por esta función y otro por la ficha desde una foto).

#### Scenario: Ya gastó lecturas en la ficha desde una foto
- **WHEN** la misma persona ya usó lecturas hoy en la ficha desde una foto y crea su tienda con fotos
- **THEN** las lecturas se suman en el mismo contador y el tope diario es uno solo

#### Scenario: Quedan 2 lecturas y subió 3 fotos
- **WHEN** el plan gratis tiene 2 lecturas de fotos disponibles hoy y llegan 3 fotos
- **THEN** se rechaza con el mensaje de cuántas puede subir y no se gasta nada

### Requirement: Solo el administrador, con la empresa del token, y sin descargar direcciones
La empresa y el correo SHALL salir del token de sesión y SHALL NOT salir del cuerpo ni de los encabezados (la única excepción es la llave del cupo de IA, que es la del camino de siempre). Las fotos SHALL guardarse sin la empresa ni el correo en sus metadatos públicos. El sistema SHALL aceptar solo administradores. Las fotos SHALL llegar dentro de la solicitud como imagen validada; el sistema SHALL NOT descargar ninguna dirección que le manden. El avance de otra empresa SHALL NOT existir.

#### Scenario: Una dirección en vez de una foto
- **WHEN** una foto llega como una dirección (`https://…`, `file://…`)
- **THEN** se rechaza sin mirarla y no se gasta nada

### Requirement: Lo que escribe la IA no promete lo que el comercio no dijo
Los textos y el diseño SHALL salir de Opttia. El sistema SHALL devolver el texto de la plantilla en todo campo donde la IA incluya un precio, un enlace (con formato `[texto](destino)`, sin protocolo, con un esquema como `javascript:` o un dominio suelto), un correo o un teléfono, y SHALL NOT dejar que la IA cambie a dónde lleva un botón, esconda la vitrina o el encabezado, ni escriba la barra de anuncios.

#### Scenario: La IA mete un enlace
- **WHEN** la IA escribe "mira [aquí](//evil.com/x)" o "visita evil.com" en un texto
- **THEN** la tienda muestra el texto de la plantilla en ese campo

#### Scenario: La IA mete un descuento
- **WHEN** la IA escribe "desde $29.900 con envío gratis" en la portada
- **THEN** la tienda muestra el texto de la plantilla en ese campo

### Requirement: Apagada por defecto y sin tocar lo que existe
La función SHALL estar apagada para todas las empresas hasta encenderse con `featureFlags.singleStepStore`. Con la bandera ausente, las rutas SHALL responder 403 (`FEATURE_DISABLED`), la pantalla SHALL NOT mostrar nada nuevo y ninguna ruta, plantilla o comportamiento existente SHALL cambiar. La función SHALL NOT escribir inventario ni movimientos, y SHALL NOT modificar ningún producto que ya existía.

#### Scenario: Empresa sin la bandera
- **WHEN** un administrador de una empresa sin la bandera llama a las rutas o abre "Crear página"
- **THEN** recibe 403 y no ve ninguna opción nueva

#### Scenario: Productos e inventario que ya existían
- **WHEN** la empresa ya tenía productos con inventario y crea su tienda en un solo paso
- **THEN** los productos y el inventario anteriores quedan idénticos
