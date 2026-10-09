## ADDED Requirements

### Requirement: Solo se guardan enlaces públicos y seguros
El sistema SHALL guardar un enlace de foto solo si empieza por `https://`, apunta a un sitio público de internet con nombre, no lleva usuario ni contraseña escritos adentro, mide como máximo 2.048 caracteres y no es de un archivo que no sea foto (PDF, documento, hoja de cálculo, presentación, texto, video, audio o comprimido). Un enlace que no cumpla SHALL rechazarse con un aviso que diga qué pasó y qué hacer, sin detener el resto de la fila ni del archivo.

#### Scenario: Enlace directo de una foto
- **WHEN** la celda trae `https://misitio.com/fotos/camiseta.jpg`
- **THEN** se guarda como foto, sin aviso

#### Scenario: Enlace sin https o con usuario y contraseña
- **WHEN** la celda trae `http://misitio.com/a.jpg` o `https://ana:clave@misitio.com/b.jpg`
- **THEN** ninguno se guarda; el aviso del primero pide copiar la dirección segura, que empieza por https://, y el del segundo explica que por seguridad no se guardan enlaces con usuario y contraseña

#### Scenario: Dirección interna o solo de números
- **WHEN** la celda trae `https://localhost/a.jpg`, `https://192.168.0.5/a.jpg` o `https://2130706433/a.jpg`
- **THEN** no se guarda y el aviso pide usar el enlace público de la foto

#### Scenario: Nombre de archivo del computador
- **WHEN** la celda trae `camisa.jpg` o `C:\fotos\camisa.jpg`
- **THEN** no se guarda y el aviso explica que eso es un archivo del computador y que hay que subir la foto a internet y pegar su enlace

#### Scenario: Archivo que no es una foto
- **WHEN** la celda trae un enlace que termina en `.pdf` o en `.mp4`
- **THEN** no se guarda y el aviso pide el enlace de la foto en sí

### Requirement: Páginas, carpetas y documentos se rechazan diciendo qué hacer
El sistema SHALL rechazar los enlaces de páginas que muestran la foto en vez de ser la foto (Instagram, Facebook, Google Fotos, OneDrive, WeTransfer, Canva, Pinterest, iCloud) y los de carpetas o documentos de Google Drive, Google Docs y Dropbox, con un aviso que explique cómo obtener el enlace correcto. Los enlaces directos de imagen de esos mismos servicios (los que salen de sus servidores de imágenes) y los sitios que solo se parecen en el nombre SHALL NOT rechazarse por eso.

#### Scenario: Enlace de una publicación de Instagram
- **WHEN** la celda trae un enlace de instagram.com
- **THEN** no se guarda; el aviso dice que es una página y no la foto, y pide subir la foto a Google Drive o Dropbox, o copiar la dirección de la imagen misma

#### Scenario: Carpeta de Google Drive
- **WHEN** la celda trae el enlace de una carpeta de Drive
- **THEN** no se guarda; el aviso explica que hay que abrir la foto, compartirla como «Cualquier persona con el enlace» y copiar el enlace de esa foto

### Requirement: Enlaces de compartir de Drive y Dropbox
Cuando el enlace es el de «compartir» de una sola foto de Google Drive o de Dropbox, el sistema SHALL guardarlo como enlace directo de la imagen y contarlo entre los convertidos. El sistema SHALL convertir solo cuando pueda asegurar que es un archivo. El sistema SHALL advertir que la foto tiene que estar compartida como «Cualquier persona con el enlace», porque no puede comprobarlo.

#### Scenario: Foto compartida en Drive
- **WHEN** la celda trae `https://drive.google.com/file/d/<id>/view?usp=sharing`
- **THEN** se guarda el enlace directo de esa foto, el resultado cuenta un enlace convertido y avisa cómo debe estar compartida

#### Scenario: Foto compartida en Dropbox
- **WHEN** la celda trae `https://www.dropbox.com/s/abc/foto.jpg?dl=0`
- **THEN** se guarda el enlace directo de esa foto y cuenta como convertido

### Requirement: El sistema no visita los enlaces
El sistema SHALL revisar solo el texto de cada enlace. El sistema SHALL NOT descargar la foto, pedirle nada al sitio al que apunta ni consultar su dirección. La foto SHALL pedirla después el navegador de quien mira la tienda.

#### Scenario: Importación sin tráfico saliente
- **WHEN** se importa un archivo con cientos de enlaces, buenos y malos
- **THEN** el sistema no hace ninguna petición hacia esos sitios y el tiempo de la importación no depende de qué tan rápidos o lentos sean

### Requirement: Límites contra celdas armadas a propósito
El sistema SHALL revisar a lo sumo 24 enlaces por celda y un máximo de texto por celda, avisando que lo que sobró no se miró, y SHALL guardar a lo sumo 8 fotos por producto. Una celda armada a propósito (decenas de miles de caracteres repetidos) SHALL procesarse en milisegundos, sin demorar al resto de los comercios que usan el sistema, y SHALL NOT impedir que los productos se guarden.

#### Scenario: Celda con cien mil caracteres
- **WHEN** una celda trae cien mil «>» seguidos y una «x»
- **THEN** la importación responde en una fracción de segundo y los productos entran igual

#### Scenario: Celda con cientos de enlaces
- **WHEN** una celda trae cientos de enlaces
- **THEN** se revisan los primeros 24, se guardan hasta 8 fotos y el resultado avisa que sobraron enlaces

### Requirement: Avisos claros que no filtran secretos
Cada aviso SHALL decir qué pasó y qué hacer en español claro, sin códigos ni jerga. El enlace que se muestra en el aviso SHALL ir recortado y SHALL NOT incluir la contraseña de un enlace con usuario. El sistema SHALL NOT escribir en sus registros internos el enlace completo de una foto.

#### Scenario: Enlace con contraseña
- **WHEN** la celda trae `https://ana:clave9@sitio.com/b.jpg`
- **THEN** el aviso lo muestra sin la contraseña (`https://***@sitio.com/b.jpg`) y la respuesta no contiene «clave9» en ninguna parte
