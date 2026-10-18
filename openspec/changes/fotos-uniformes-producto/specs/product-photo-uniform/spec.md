## ADDED Requirements

### Requirement: La función nace apagada por comercio
WHILE una empresa no tenga encendida la bandera `productPhotoUniform` (ausente, en `false` o con un valor distinto del booleano `true`), el sistema SHALL NOT mostrar «Uniformar fotos» ni el aviso de calidad nuevo, y SHALL rechazar toda petición de la función sin leer fotos ni escribir nada.

#### Scenario: Comercio sin la bandera
- **WHEN** ALMARA FELICIDAD, sin la bandera, abre la lista de productos o pide una vista previa por la vía directa
- **THEN** ve las mismas pantallas de siempre y la petición se rechaza sin procesar ninguna foto

#### Scenario: Solo FLORECER encendida
- **WHEN** la bandera está en `true` solo para FLORECER
- **THEN** las personas de FLORECER ven la función y las de las demás empresas no notan ningún cambio

### Requirement: Interruptor general del servidor
WHILE el interruptor general esté apagado, el sistema SHALL rechazar las vistas previas y los lotes nuevos con un aviso amable, y SHALL seguir permitiendo consultar, cancelar y revertir. WHEN el interruptor baja de nivel, o la bandera de la empresa se apaga, mientras corre un lote, THEN el sistema SHALL detener el lote antes del siguiente producto y SHALL dejar reversible todo lo que ya se aplicó.

#### Scenario: Se apaga con un lote a medias
- **WHEN** un lote va en el producto 40 de 100 y se apaga el interruptor
- **THEN** el lote se detiene al cerrar el producto 40, los 40 quedan reversibles y no se procesa ninguno más

#### Scenario: Un servidor de pruebas no toma lotes ajenos
- **WHEN** arranca un servidor que no está autorizado para correr trabajos programados
- **THEN** no retoma ni procesa lotes pendientes de ninguna empresa

### Requirement: Modo sombra
WHILE el sistema esté en modo sombra, un lote SHALL procesar las fotos solo para medir y SHALL guardar únicamente en el registro del lote los conteos, los tiempos y los resultados que habría tenido. SHALL NOT cambiar productos ni su historial, ni crear archivos.

#### Scenario: Lote en sombra en FLORECER
- **WHEN** FLORECER corre un lote de 20 productos en sombra
- **THEN** el registro del lote muestra cuántas fotos se habrían uniformado, cuántas se omitieron y por qué, y los 20 productos, su historial y los archivos quedan idénticos

### Requirement: Vista previa sin escrituras y con límite
WHEN una persona pide la vista previa, el sistema SHALL mostrar el antes y el después de hasta 3 fotos y SHALL NOT escribir nada. IF la misma empresa ya tiene una vista previa en curso, o pidió demasiadas en poco tiempo, THEN el sistema SHALL pedirle que espere, sin procesar.

#### Scenario: Doble clic
- **WHEN** una persona pide dos vistas previas al mismo tiempo
- **THEN** la segunda recibe el aviso de esperar y solo se procesa la primera

### Requirement: La empresa sale de la sesión firmada
El sistema SHALL decidir la empresa solo por la sesión firmada y SHALL procesar únicamente productos de esa empresa y archivos que se puedan probar suyos. IF un archivo es de otra empresa, de otro almacenamiento o no declara dueño, THEN el sistema SHALL omitir esa foto con su motivo, sin leerla ni procesarla.

#### Scenario: Nombre de otra empresa
- **WHEN** una persona de FLORECER manda el nombre de otra empresa en la petición
- **THEN** solo se consideran productos y archivos de FLORECER

#### Scenario: Foto que apunta a un archivo ajeno
- **WHEN** un producto de FLORECER tiene una foto cuyo archivo pertenece a otra empresa o no tiene dueño
- **THEN** esa foto se omite con su motivo y las demás siguen

### Requirement: Empresas con sincronización de productos
IF la empresa tiene activa una sincronización que escribe productos o reacciona a sus cambios, THEN el sistema SHALL rechazar el lote con un aviso que nombre esa sincronización y SHALL NOT escribir nada.

#### Scenario: OH MY STORE
- **WHEN** OH MY STORE, con sus flujos de productos activos, intenta uniformar fotos
- **THEN** recibe el aviso con el nombre del flujo, y sus productos y flujos quedan como estaban

### Requirement: Solo cambian las fotos del producto
WHEN se aplica un lote, el sistema SHALL cambiar solo las fotos principales del producto (su dirección, su archivo y las marcas de original y procesado), quién y cuándo lo editó, el historial del producto y el registro del lote. SHALL NOT cambiar precios, precios por tipo de cliente, inventario, categorías, variantes, integraciones, fotos de otros canales ni datos de la empresa. Las demás fotos, su orden y su cantidad SHALL quedar iguales.

#### Scenario: Producto con precios por cliente
- **WHEN** se uniforman las fotos de un producto con precios por tipo de cliente
- **THEN** cambian sus fotos principales y la fecha de edición, y sus precios, su inventario y sus categorías quedan idénticos

#### Scenario: El producto cambió durante el lote
- **WHEN** alguien edita las fotos de un producto mientras el lote lo procesa
- **THEN** el lote omite ese producto y conserva lo que guardó la persona

### Requirement: El original nunca se borra y se puede revertir
El sistema SHALL conservar el original de cada foto procesada y SHALL NOT borrar ni sobrescribir ningún archivo. WHEN una persona con el rol permitido revierte una foto, un producto o un lote, el sistema SHALL devolver el original, sin importar el modo del interruptor. IF el original ya no existe o no es de la empresa, THEN SHALL dejar la foto como está e informarlo.

#### Scenario: Revertir con el interruptor apagado
- **WHEN** el interruptor está apagado y un administrador de FLORECER revierte el lote de ayer
- **THEN** vuelven las fotos originales y no se crea ningún archivo

#### Scenario: Reprocesar no degrada
- **WHEN** una foto ya uniformada se uniforma de nuevo con otro fondo
- **THEN** se parte del original, no de la versión procesada

### Requirement: Un lote a la vez por empresa
El sistema SHALL permitir un solo lote activo por empresa. WHEN llega un reintento del mismo lote, SHALL devolver el lote existente sin duplicarlo.

#### Scenario: Dos lotes al tiempo
- **WHEN** dos administradores de la misma empresa lanzan lotes distintos al mismo tiempo
- **THEN** solo uno queda activo y el otro recibe el aviso de que ya hay un lote en curso

### Requirement: Aviso de calidad informativo
WHEN una foto tiene poca resolución o se ve borrosa, el sistema SHALL avisarlo en la vista previa, en el resumen y al subirla en el editor, y SHALL NOT impedir que se guarde ni que se use.

#### Scenario: Foto chica
- **WHEN** una persona sube una foto con el lado menor bajo el umbral
- **THEN** ve el aviso y puede guardar el producto igual
