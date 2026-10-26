> Aprobada el 18-oct (D-501, fase 1). **Ampliación D-518 del 21-oct, aprobada en bloque el 21-oct:** el requisito «Empresas con sincronización de productos» cambia (TX-37·5) y se agrega «Aviso de posible marca de agua o logo» (TX-37·2). Lo marcado con **[D-518]** es lo nuevo de la ampliación; el resto es lo aprobado el 18-oct. El requisito «Interruptor general del servidor» no cambia: el diseño de D-518 lo cumple leyendo el interruptor antes de cada producto (`design-ampliacion.md` §A1). Entradas, categorías y series: `../product-photo-batch-scope/spec.md`. Fase 1b: `../product-photo-ownership/spec.md`. Fase 2: `../product-photo-background-ai/spec.md`.

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
**[→ D-518: con «Quitar fondo» (fase 2) aplica la excepción de `../product-photo-background-ai/spec.md`, «La vista previa avisa su costo y no se paga dos veces». Sin «Quitar fondo», este requisito sigue igual.]**

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
**[D-518; reemplaza el texto aprobado el 18-oct: «IF la empresa tiene activa una sincronización que escribe productos o reacciona a sus cambios, THEN el sistema SHALL rechazar el lote…»]**

IF la empresa tiene activa una integración que escribe las fotos de sus productos (Cereza, Shopify, WooCommerce o un operador logístico), o un flujo que las escribe o que lleva productos a una de esas integraciones, THEN el sistema SHALL rechazar la vista previa y el lote con un aviso que nombre esa integración y SHALL NOT escribir nada. IF un producto está vinculado a una de esas integraciones, THEN el sistema SHALL omitirlo con su motivo. Una integración que no escribe fotos (por ejemplo, la de facturación) SHALL NOT excluir a la empresa ni al producto.

Fuente: D-518 TX-37·5 («Excluir solo las integraciones que escriben fotos (Osmosis, Shopify, WooCommerce, fulfillment). OH MY STORE y CAFE ESCOBAR siguen fuera por ahora»); D-501, No-goals («Shopify … otra propuesta»; «Syncs: no cambian … el contenido»), para los flujos que llevan productos a esas integraciones; ticket 1252, criterio 1 («un comercio uniforma las fotos de una categoría completa»).

#### Scenario: OH MY STORE
- **WHEN** OH MY STORE, con sus flujos de productos de Cereza y Shopify activos, intenta uniformar fotos
- **THEN** recibe el aviso con el nombre del flujo, y sus productos y flujos quedan como estaban

#### Scenario: CAFE ESCOBAR
- **WHEN** CAFE ESCOBAR, con la integración de WooCommerce activa, pide una vista previa
- **THEN** recibe el aviso que nombra WooCommerce y no se procesa ninguna foto

#### Scenario: Producto con código de facturación
- **WHEN** ALMACEN BOMBAS, sin integraciones que escriban fotos, uniforma una categoría y un producto tiene guardado su código de producto del sistema de facturación
- **THEN** ese producto entra al lote como cualquier otro

#### Scenario: Flujo que solo avisa
- **WHEN** una empresa tiene activo un flujo que, al cambiar un producto, solo manda un mensaje por WhatsApp
- **THEN** la empresa puede uniformar sus fotos

#### Scenario: Flujo que solo lleva pedidos
- **WHEN** una empresa sin integraciones activas que escriban fotos tiene un flujo que solo envía sus pedidos a un operador
- **THEN** la empresa puede uniformar sus fotos

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

### Requirement: Aviso de posible marca de agua o logo
**[D-518]** WHEN una foto de fondo liso tiene, separada del producto, una marca pequeña en una esquina o en un borde, el sistema SHALL avisarlo como «posible marca de agua o logo» en la vista previa y en el resumen del lote, y SHALL NOT impedir que se uniforme ni que se use. WHILE la foto tenga un fondo de escena, el sistema SHALL NOT dar ese aviso.

Fuente: D-518 TX-37·2 («En la fase 1 se detectan y se avisa. Quitarlos con IA va en la fase 2»); ticket 1252, «Qué pasa hoy: … algunas traen marca de agua o logo»; adjunto del ticket 1259 (cd 3UrH47Mko7eruBnF4tak).

#### Scenario: Foto de Almara con su logo
- **WHEN** se pide la vista previa de una foto de fondo verde lima con «Almara» abajo a la derecha
- **THEN** la muestra lleva el aviso de posible marca de agua o logo, y se puede aplicar igual

#### Scenario: Foto sin marca
- **WHEN** se uniforma una foto de fondo blanco con el producto solo
- **THEN** no aparece ese aviso
