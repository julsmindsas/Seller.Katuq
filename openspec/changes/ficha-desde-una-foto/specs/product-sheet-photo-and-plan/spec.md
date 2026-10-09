## ADDED Requirements

### Requirement: Fotos que se aceptan
WHEN la persona elige un archivo, el sistema SHALL aceptar fotos en JPG, PNG o WEBP, y otros formatos de imagen que el navegador pueda abrir (como los del iPhone), de hasta 15 MB, y SHALL rechazar con un aviso lo que no sea una imagen o pese más. Una foto en JPG, PNG o WEBP de hasta 5 MB SHALL usarse sin reducirla como imagen del producto, igual que si la persona la hubiera subido a mano; cualquier otra SHALL reducirse a un JPG antes de usarla.

#### Scenario: Archivo que no es una foto
- **WHEN** la persona elige un PDF
- **THEN** ve "El archivo no es una imagen. Elija una foto en formato JPG, PNG o WEBP." y no se gasta ningún uso del plan

#### Scenario: Foto muy pesada
- **WHEN** la foto pesa más de 15 MB
- **THEN** ve que pesa demasiado y que puede tomar una nueva con menor resolución, y no se gasta ningún uso del plan

#### Scenario: Foto que el navegador no puede abrir
- **WHEN** la persona elige una foto en un formato que su navegador no sabe abrir
- **THEN** ve "No pudimos abrir esa foto. Pruebe con otra en formato JPG, PNG o WEBP." y no se gasta ningún uso del plan

#### Scenario: Foto normal de celular
- **WHEN** la persona elige una foto JPG de 3 MB
- **THEN** esa misma foto, sin reducirla, queda como imagen del producto y solo se reduce la copia que se envía a leer

### Requirement: La foto se revisa antes de gastar un uso del plan
WHEN llega una foto que no sirve (no es una imagen de verdad, está dañada o es demasiado grande), el sistema SHALL rechazarla sin descontar un uso del plan de IA y sin consultar a la IA. El sistema SHALL reconocer que es una imagen por su contenido real y no por lo que declara el archivo.

#### Scenario: Archivo disfrazado de foto
- **WHEN** llega un texto o un PDF con nombre de foto
- **THEN** se rechaza con "No pudimos leer esa foto. Suba una imagen JPG, PNG o WEBP e intente de nuevo." y el contador del plan no cambia

#### Scenario: Foto enorme
- **WHEN** llega una foto que supera el tamaño máximo que se puede leer
- **THEN** se rechaza con un aviso que pide una más liviana y el contador del plan no cambia

### Requirement: Qué sale hacia la IA y qué se guarda
El sistema SHALL enviar a la IA solo una copia reducida de la foto y los nombres de las categorías activas de la empresa, y SHALL NOT enviarle precios, clientes ni otros datos de la empresa. El sistema SHALL NOT guardar la foto al leerla: la imagen del producto se guarda solo cuando la persona guarda el producto, por el camino de siempre. Mientras no haya un servicio de recorte de fondo aprobado, el sistema SHALL NOT enviar la foto a ningún servicio externo de recorte, y la imagen sin fondo SHALL ir vacía.

#### Scenario: Sin servicio de recorte
- **WHEN** se lee una foto y no hay ningún servicio de recorte configurado
- **THEN** la ficha sale igual y la imagen sin fondo va vacía, sin llamadas a terceros

#### Scenario: Falla el servicio de recorte, cuando exista
- **WHEN** hay un servicio de recorte aprobado y falla, tarda más de 20 segundos o devuelve algo que no es una imagen
- **THEN** la ficha sale igual de buena, solo que sin la imagen recortada

#### Scenario: Qué recibe la IA
- **WHEN** se lee una foto de una empresa con categorías
- **THEN** la IA recibe la copia reducida y esas categorías, y nada más de la empresa

### Requirement: Cada lectura cuenta un uso del plan
WHEN se lee una foto, el sistema SHALL descontar un uso de la IA de productos del plan de la persona antes de consultar a la IA, y el contador que ve la persona SHALL actualizarse tanto si la lectura sale bien como si falla. IF el plan no tiene usos disponibles, THEN el sistema SHALL avisarlo antes de preparar la foto, con un mensaje que diga qué pasó y qué hacer, y SHALL NOT consultar a la IA.

#### Scenario: Plan sin usos
- **WHEN** la persona agotó los usos de IA de su plan por hoy
- **THEN** ve "Ya usó las lecturas de IA de su plan" con la opción de volver más tarde o pasar a Premium, y no se prepara la foto ni se consulta a la IA

#### Scenario: La lectura falla
- **WHEN** la IA no responde y la persona debe intentar de nuevo
- **THEN** el contador de usos que ve ya refleja el uso descontado

### Requirement: Los fallos se explican sin jerga
IF algo falla en cualquier paso, THEN el sistema SHALL mostrar un aviso en español claro que diga qué pasó y qué hacer, SHALL NOT mostrar códigos, nombres de campos ni errores técnicos, y SHALL dejar el detalle técnico solo en el registro del servidor.

#### Scenario: La IA no está disponible
- **WHEN** la IA no responde
- **THEN** ve "No pudimos leer la foto en este momento. Intente de nuevo en un minuto; si sigue igual, escríbanos por soporte."

#### Scenario: Sin conexión
- **WHEN** la persona no tiene internet
- **THEN** ve "No pudimos conectarnos. Revise su internet e intente de nuevo."

#### Scenario: Error inesperado
- **WHEN** ocurre un error que el sistema no esperaba
- **THEN** ve un aviso general que dice que lo intente de nuevo o escriba por soporte, sin ningún texto técnico
