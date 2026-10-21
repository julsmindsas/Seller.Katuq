## ADDED Requirements

### Requirement: La simulación va primero y no escribe nada
WHEN el comercio sube sus archivos, THE system SHALL mostrar una simulación antes de permitir la importación. La simulación SHALL NOT crear, cambiar ni borrar ningún dato del comercio ni de otra plataforma.

#### Scenario: Simular 500 productos
- **WHEN** el comercio simula un archivo de 500 productos
- **THEN** ve los conteos y los avisos, y su catálogo, existencias, categorías, sitio y clientes quedan iguales

#### Scenario: Archivo demasiado grande
- **WHEN** el archivo trae más de 2.000 productos
- **THEN** el sistema pide partirlo y no procesa nada

### Requirement: Conteos que dicen qué va a pasar
THE system SHALL mostrar en la simulación:
- los productos nuevos, los que se actualizarían y los omitidos;
- las variantes;
- las fotos válidas, rechazadas y sobrantes;
- los productos separados por precio y los que tienen más de dos ejes;
- las referencias sin código, repetidas en el archivo o ambiguas en Katuq;
- los archivados y las tarjetas de regalo;
- las categorías nuevas y las unidades por cargar;
- las existencias que se reemplazarían;
- las redirecciones generadas, probables, en choque con las manuales y las que no caben;
- → D-518, pendiente de aprobación: el formato del archivo, los productos exentos de IVA, las clases de impuesto sin tarifa, las ofertas que se cargarán y las que no, los precios que tapa la lista del público, los productos sin control de existencias, los productos con textos para buscadores, las fotos que se copiarán y, en el plan gratis, cuántos productos no se verán (`store-migration-plan-stock`).

#### Scenario: Referencia repetida en Katuq
- **WHEN** una referencia del archivo coincide con dos productos del comercio
- **THEN** la simulación la cuenta como ambigua y dice que se omitirá

### Requirement: Bloqueos visibles antes de empezar
IF la importación no puede hacerse, THEN THE system SHALL decirlo en la simulación, con un mensaje sin jerga y qué hacer. Pasa cuando una automatización publica en otra plataforma, cuando el maestro de categorías no se puede leer, cuando la bodega elegida no existe o está inactiva, o cuando el comercio tiene activa la integración con WooCommerce (→ D-518 F5-30·8, pendiente de aprobación; ver `store-migration-woocommerce`).

#### Scenario: Bodega inactiva
- **WHEN** el comercio elige una bodega inactiva
- **THEN** la simulación lo avisa y la importación no empieza hasta que elija otra

### Requirement: Reporte final fila por fila
WHEN termina una importación, THE system SHALL mostrar lo que entró y lo que no, con la fila, el producto y el motivo. Debe poder descargarse como CSV. El reporte SHALL NOT incluir correos, teléfonos ni direcciones.

#### Scenario: Descargar el reporte
- **WHEN** el comercio descarga el reporte de una importación con omitidos
- **THEN** obtiene un CSV con fila, producto, resultado y motivo, sin datos personales

### Requirement: Rastro de cada paso
THE system SHALL dejar un registro de cada paso con el identificador de la migración, el lote, los conteos, la duración, el resultado y quién lo hizo, identificado sin su correo. El registro SHALL NOT incluir filas del archivo ni datos personales.

#### Scenario: Revisar una migración
- **WHEN** soporte revisa una migración por su identificador
- **THEN** ve cada paso con su duración y su resultado, sin datos de clientes

### Requirement: La simulación tiene un tope de frecuencia
IF un comercio pide más de 20 simulaciones en 15 minutos, THEN THE system SHALL rechazar las siguientes sin leer su catálogo, con un mensaje que pide esperar, y SHALL NOT afectar a otros comercios.

> **NUEVO (D-518, 21-oct), pendiente de aprobación.** Fuente: D-518 F5-30·9 (revisión de seguridad privada, M3).

#### Scenario: Simulaciones en bucle
- **WHEN** un administrador simula 21 veces en 15 minutos
- **THEN** la simulación 21 responde que espere unos minutos, y otro comercio sigue simulando normalmente
