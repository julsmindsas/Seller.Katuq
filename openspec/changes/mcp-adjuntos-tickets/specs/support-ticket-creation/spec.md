## ADDED Requirements

### Requirement: Adjuntar archivos al crear un ticket desde Claude (F1)
WHEN el MCP de Katuq muestra la tarjeta de aprobación de un ticket nuevo, la tarjeta SHALL ofrecer «Adjuntar archivos» para elegir o arrastrar uno o varios archivos. La tarjeta SHALL aceptar los mismos tipos y topes que acepta hoy la evidencia de tickets: imágenes, PDF, Excel, CSV, Word, audio y video; 15 MB por archivo, y 50 MB para audio y video. El archivo SHALL subirse desde el navegador de la persona al almacenamiento de Katuq, sin pasar por el entorno de ejecución del modelo ni por el texto del chat.

#### Scenario: Criterio de aceptación del ticket 1339
- **WHEN** una persona crea un ticket desde Claude y en la tarjeta adjunta un PDF y dos imágenes, y aprueba
- **THEN** el ticket queda creado con las tres evidencias, sin salir del chat, y se ven en la app de Support como las demás

#### Scenario: Archivo no permitido
- **WHEN** la persona arrastra un archivo de un tipo no permitido o más grande que el tope
- **THEN** la tarjeta lo rechaza con un mensaje claro y no lo sube, y los demás archivos siguen en la lista

### Requirement: Lista de archivos antes de aprobar (F1)
La tarjeta SHALL mostrar cada archivo adjunto con su nombre, su tamaño y, si es imagen, una vista previa, y SHALL permitir quitarlo antes de aprobar. Mientras un archivo se sube, la tarjeta SHALL mostrar su avance, y el botón de aprobar SHALL esperar a que todas las subidas terminen o fallen.

#### Scenario: Quitar un archivo
- **WHEN** la persona adjunta tres archivos, quita uno y aprueba
- **THEN** el ticket queda con los dos archivos que siguen en la lista

### Requirement: La aprobación cubre los archivos exactos (F1)
Aprobar SHALL crear el ticket con exactamente los archivos que la tarjeta mostraba al aprobar. IF la lista cambia después de emitida la aprobación, THEN esa aprobación SHALL NOT servir y la tarjeta SHALL pedir aprobar de nuevo. El modelo SHALL NOT poder aprobar ni agregar archivos en nombre de la persona.

#### Scenario: Reintento de la aprobación
- **WHEN** la misma aprobación llega dos veces
- **THEN** existe un solo ticket, con un solo juego de evidencias

### Requirement: Lo no aprobado se descarta (F1)
IF la persona cancela, o la tarjeta vence sin aprobación, THEN los archivos que subió SHALL NOT quedar en ningún ticket y SHALL descartarse dentro del plazo definido.

#### Scenario: Tarjeta cancelada
- **WHEN** la persona adjunta un pantallazo y toca «Cancelar»
- **THEN** no se crea ticket y el pantallazo no aparece como evidencia de ningún ticket

### Requirement: Adjuntar a un ticket existente desde Claude (F2)
WHEN se llama a la herramienta de agregar evidencia con un ticket y sin fuente de archivo, el MCP SHALL mostrar una tarjeta de carga para ese ticket, con la misma selección, lista, quitar y confirmación. IF el ticket no es de la empresa de la sesión, THEN SHALL responder como si no existiera y no mostrar la tarjeta.

#### Scenario: Evidencia después de crear el ticket
- **WHEN** una persona pide en Claude agregar dos pantallazos al ticket 1339 y los arrastra a la tarjeta
- **THEN** el ticket 1339 queda con las dos evidencias nuevas, con la misma ruta y el mismo enlace que usa la app de Support

### Requirement: Subida directa y segura
La tarjeta SHALL declarar como destino permitido solo el origen del almacenamiento de evidencias, y ningún otro. Cada permiso de subida SHALL:

- durar poco;
- servir para un solo archivo;
- quedar ligado a la empresa de la sesión y al ticket o a la propuesta.

El servidor SHALL revisar el tipo, el tamaño y la ubicación de cada archivo al registrarlo, sin confiar en lo que reporte la tarjeta. Los logs SHALL NOT contener el contenido de los archivos ni datos personales completos.

#### Scenario: Permiso de otra empresa
- **WHEN** alguien intenta registrar un archivo subido con un permiso emitido para otra empresa
- **THEN** el servidor lo rechaza y no lo agrega al ticket

### Requirement: Base64 con límite claro (F1)
La herramienta de evidencia SHALL documentar el tamaño máximo que acepta en base64. IF llega un contenido mayor, THEN SHALL rechazarlo con un mensaje que indique usar la tarjeta de adjuntos.

#### Scenario: Archivo grande en base64
- **WHEN** el modelo intenta mandar en base64 un PDF más grande que el límite documentado
- **THEN** recibe el mensaje de que el archivo supera el límite y que la persona lo adjunte en la tarjeta, y no se agrega nada al ticket

### Requirement: Clientes sin tarjeta conservan los caminos actuales
WHERE el cliente del MCP no muestra tarjetas, la creación del ticket y la evidencia por URL, por subida firmada o por base64 SHALL seguir funcionando como hoy. El chat integrado de Opttia SHALL conservar su propio flujo de soporte (D-545).

#### Scenario: Cliente sin tarjetas
- **WHEN** un cliente del MCP sin tarjetas registra una evidencia con una URL pública
- **THEN** la evidencia se agrega como hoy
