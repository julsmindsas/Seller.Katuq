> **Enmienda del 2026-10-23 (tarde): plan B.** Daniel decidió saltarse el spike e ir directo al plan B (design D7). Los requisitos de abajo ya describen ese camino: la tarjeta NO elige ni sube archivos; ofrece un enlace de un solo uso a una página de Katuq donde la persona los sube. Los requisitos originales del plan A (elegir y arrastrar dentro de la tarjeta, vista previa y «Quitar» en la tarjeta, origen del almacenamiento declarado en la tarjeta) quedan sustituidos. La constancia en `specs/CONTRACT.md` está pendiente (tasks.md 0.2, 0.3 y 8.5).

## ADDED Requirements

### Requirement: Adjuntar archivos al crear un ticket desde Claude (F1)
WHEN el MCP de Katuq muestra la tarjeta de aprobación de un ticket nuevo, la tarjeta SHALL ofrecer «Subir los archivos en Katuq», que abre una página de Katuq por un enlace de un solo uso. La página SHALL aceptar los mismos tipos y topes que acepta hoy la evidencia de tickets: imágenes, PDF, Excel, CSV, Word, audio y video; 15 MB por archivo, y 50 MB para audio y video; y hasta 10 archivos por solicitud. El archivo SHALL subirse desde el navegador de la persona al almacenamiento de Katuq, sin pasar por el entorno de ejecución del modelo ni por el texto del chat. La tarjeta SHALL NOT elegir, leer ni subir archivos.

#### Scenario: Criterio de aceptación del ticket 1339
- **WHEN** una persona crea un ticket desde Claude, abre el enlace de la tarjeta, sube un PDF y dos imágenes, vuelve a la tarjeta, toca «Ya los subí» y aprueba
- **THEN** el ticket queda creado con las tres evidencias y se ven en la app de Support como las demás

#### Scenario: Archivo no permitido
- **WHEN** la persona elige en la página un archivo de un tipo no permitido o más grande que el tope
- **THEN** la página lo rechaza con un mensaje claro y no lo sube, y los demás archivos siguen en la lista

### Requirement: Lista de archivos antes de aprobar (F1)
La página SHALL mostrar cada archivo con su nombre, su tamaño, el avance de su subida y, si es imagen, una vista previa, y SHALL permitir quitarlo; el botón «Listo» SHALL esperar a que todas las subidas terminen o fallen. Al volver, «Ya los subí» SHALL hacer que la tarjeta muestre la lista que quedó en el servidor (nombre y tamaño de cada archivo), y esa lista SHALL ser la que se aprueba.

#### Scenario: Quitar un archivo
- **WHEN** la persona sube tres archivos en la página, quita uno, toca «Listo», vuelve a la tarjeta, toca «Ya los subí» y aprueba
- **THEN** el ticket queda con los dos archivos que siguen en la lista

### Requirement: La aprobación cubre los archivos exactos (F1)
Aprobar SHALL crear el ticket con exactamente los archivos que la tarjeta mostraba al aprobar. IF la lista cambia después de emitida la aprobación, THEN esa aprobación SHALL NOT servir y la tarjeta SHALL pedir aprobar de nuevo. El modelo SHALL NOT poder aprobar ni agregar archivos en nombre de la persona.

#### Scenario: Reintento de la aprobación
- **WHEN** la misma aprobación llega dos veces
- **THEN** existe un solo ticket, con un solo juego de evidencias

### Requirement: Lo no aprobado se descarta (F1)
IF la persona cancela, THEN la tarjeta SHALL descartar al momento los archivos subidos y cerrar el enlace, de modo que no acepte más subidas. IF la tarjeta vence sin aprobación, o el descarte falla, THEN los archivos SHALL descartarse a las 24 horas. Lo no aprobado SHALL NOT quedar en ningún ticket.

#### Scenario: Tarjeta cancelada
- **WHEN** la persona sube un pantallazo en la página y toca «Cancelar» en la tarjeta
- **THEN** no se crea ticket, el pantallazo se borra, el enlace responde «ya se usó» y el pantallazo no aparece como evidencia de ningún ticket

### Requirement: Adjuntar a un ticket existente desde Claude (F2)
WHEN se llama a la herramienta de agregar evidencia con un ticket y sin fuente de archivo, el MCP SHALL mostrar la misma tarjeta para ese ticket, con el mismo enlace, lista y confirmación. IF el ticket no es de la empresa de la sesión, THEN SHALL responder como si no existiera y no mostrar la tarjeta. Aprobar SHALL agregar los archivos sin editar ni reemplazar ninguna evidencia ya registrada, aunque el nombre del archivo nuevo sea igual al de uno anterior.

#### Scenario: Evidencia después de crear el ticket
- **WHEN** una persona pide en Claude agregar dos pantallazos al ticket 1339 y los sube en la página
- **THEN** el ticket 1339 queda con las dos evidencias nuevas, con el mismo formato de enlace que usa la app de Support

#### Scenario: Mismo nombre en una segunda solicitud
- **WHEN** se aprueban dos solicitudes sobre el mismo ticket y ambas traen un archivo llamado `captura.png`
- **THEN** el ticket conserva los dos archivos, y el enlace de la primera sigue funcionando

### Requirement: Subida directa y segura
La tarjeta SHALL NOT declarar ningún dominio de red (la política de contenido de toda tarjeta sigue vacía); solo la página de Katuq habla con el almacenamiento. El enlace SHALL:

- ser de un solo uso y durar 30 minutos;
- quedar ligado a la empresa de la sesión y al ticket o a la propuesta, sin llevar a la persona dentro;
- firmarse con otra etiqueta que el permiso de la tarjeta, de modo que uno no sirva como el otro.

Cada permiso de subida SHALL durar poco, servir para un solo archivo y llevar firmado el tope de su tipo. El servidor SHALL revisar el tipo, el tamaño y la ubicación de cada archivo al registrarlo, sin confiar en lo que reporte la página ni la tarjeta. Los logs SHALL NOT contener el contenido de los archivos, sus nombres ni el enlace: ni los registros del módulo, ni el registro global de uso, ni el logger legacy, ni Sentry.

#### Scenario: Permiso de otra empresa
- **WHEN** alguien intenta registrar un archivo subido con un permiso o un enlace emitido para otra empresa
- **THEN** el servidor lo rechaza y no lo agrega al ticket

#### Scenario: El enlace no queda en los registros
- **WHEN** la página pide permiso para subir un archivo por `/v1/soporte/adjuntos/:enlace/permiso`
- **THEN** ningún registro de uso, de errores ni de Sentry guarda el enlace ni el nombre del archivo

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
