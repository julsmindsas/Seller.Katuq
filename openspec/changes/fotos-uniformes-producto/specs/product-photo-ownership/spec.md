> **[D-518, pendiente de aprobación]** Fase 1b de la ampliación del 21-oct: fotos externas y sin dueño. Diseño: `design-fase-1b.md`. La seguridad detallada está en la revisión privada del backend.

## ADDED Requirements

### Requirement: Las fotos por enlace se copian al almacenamiento de la empresa
WHEN un lote aplicado encuentra una foto que es un enlace externo, el sistema SHALL copiarla al almacenamiento de Katuq marcada como de la empresa de la sesión, SHALL uniformarla desde esa copia y SHALL guardar de dónde vino. IF el enlace no responde, no es una foto, es demasiado grande o apunta a un destino no permitido, THEN el sistema SHALL omitir esa foto con su motivo y seguir con las demás. WHILE el lote esté en modo sombra o sea una vista previa, el sistema SHALL NOT guardar ninguna copia.

Fuente: D-518 TX-37·3 («copiar a Storage las externas con la empresa en los metadatos»); D-518 F5-30·2 («Copiarlas a Storage en esta entrega, con la misma pieza de la fase 1b de TX-37»); ticket 1037 (cd qNjh7rksIa98wEd3ibVL), carga de fotos por enlace.

#### Scenario: Producto importado con fotos de Drive
- **WHEN** ALMACEN BOMBAS uniforma una categoría cuyos productos tienen fotos por enlace de Google Drive
- **THEN** cada foto queda copiada en Katuq, uniformada y marcada como de ALMACEN BOMBAS, y el enlace de origen queda anotado

#### Scenario: Enlace muerto
- **WHEN** una foto apunta a un enlace que ya no existe
- **THEN** esa foto se omite con el motivo «no se pudo descargar» y las demás del producto se uniforman

### Requirement: Las fotos sin dueño se adoptan con una copia propia
WHEN un lote aplicado encuentra en un producto de la empresa una foto de producto del almacenamiento de Katuq que no declara dueño, el sistema SHALL crear una copia marcada como de esa empresa y SHALL uniformar desde la copia. El sistema SHALL NOT cambiar el archivo de origen ni su dueño. IF el archivo declara como dueña a otra empresa, THEN el sistema SHALL omitir esa foto sin leerla. IF el archivo sin dueño no está guardado como foto de producto, THEN el sistema SHALL omitirlo sin leerlo ni mostrarlo, también en la vista previa.

Fuente: D-518 TX-37·3 («adoptar las sin dueño cuando un producto de la empresa las usa»); ticket 1252, «Qué pasa hoy: las fotos de Almara…»; revisión privada del backend.

#### Scenario: Foto vieja de ALMARA
- **WHEN** ALMARA FELICIDAD uniforma un producto con una foto subida antes de que Katuq guardara el dueño
- **THEN** la foto se uniforma desde una copia de ALMARA FELICIDAD y el archivo viejo queda igual

#### Scenario: Foto de otra empresa
- **WHEN** un producto de FLORECER usa una foto que declara como dueña a otra empresa
- **THEN** esa foto se omite con su motivo y no se copia

#### Scenario: Archivo que no es foto de producto
- **WHEN** un producto apunta a un archivo sin dueño del almacenamiento que no es una foto de producto y se pide la vista previa
- **THEN** la vista previa no muestra esa foto y el resumen la cuenta como omitida

### Requirement: Revertir no devuelve un enlace externo
WHEN una persona revierte una foto que se copió desde un enlace o se adoptó, el sistema SHALL devolver la copia guardada en Katuq, que es la misma imagen, y SHALL conservar la anotación de su origen.

Fuente: D-518 TX-37·3; ticket 1252, «Conservar la foto original y poder revertir»; pregunta 1 de la ampliación (pendiente de Daniel).

#### Scenario: Revertir una foto de Drive
- **WHEN** se revierte el lote del escenario de Drive
- **THEN** cada producto vuelve a su foto original, ahora servida desde Katuq, y su origen sigue anotado

### Requirement: Las fotos nuevas nacen con su empresa
WHEN se guarda una foto de producto desde «Tienda en un paso» o desde las herramientas del conector para asistentes de IA, el sistema SHALL marcarla como de la empresa de la sesión, igual que las que se suben desde el formulario de producto. El sistema SHALL NOT guardar en la foto el correo de quien la sube.

Fuente: D-518 TX-37·3 («corregir Tienda en un paso y las herramientas MCP para que guarden la empresa»).

#### Scenario: Tienda en un paso
- **WHEN** un comercio nuevo crea su tienda con «Tienda en un paso» y sube 5 fotos
- **THEN** las 5 quedan marcadas como de ese comercio y se pueden uniformar sin copiarlas

#### Scenario: Asistente de IA
- **WHEN** una persona agrega una foto a un producto desde su asistente con el conector de Katuq, y la aprueba en pantalla
- **THEN** la foto queda marcada como de su empresa

### Requirement: Copiar no toca nada más ni frena a los demás
WHEN el sistema copia o adopta una foto, SHALL escribir solo el archivo nuevo en la carpeta de la empresa y las fotos de ese producto. SHALL NOT borrar ni modificar ningún archivo existente, ni cambiar precios, inventario, categorías ni integraciones. WHILE se descargan fotos externas, el sistema SHALL NOT impedir que otras empresas pidan su vista previa.

Fuente: D-501 (write-set cerrado y «CPU» en riesgos, aprobado el 18-oct); D-518 TX-37·3.

#### Scenario: Lote con 30 fotos externas
- **WHEN** se aplica un lote con 30 fotos por enlace
- **THEN** se crean 30 copias en la carpeta de la empresa, ningún archivo existente cambia y los precios y el inventario quedan idénticos

#### Scenario: Descargas lentas
- **WHEN** un lote espera enlaces lentos y otra empresa pide una vista previa
- **THEN** la vista previa de la otra empresa no espera a esas descargas
