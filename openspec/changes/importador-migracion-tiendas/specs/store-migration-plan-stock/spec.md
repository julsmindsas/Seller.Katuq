## ADDED Requirements

> **NUEVO (21-oct), pendiente de aprobación de Daniel.** Sale de la revisión de la ampliación D-518, verificada en el código (`design-ampliacion-plan-existencias.md`). Cada requisito dice su fuente.

### Requirement: El plan gratis avisa lo que no se va a ver
WHERE el plan del comercio limita los productos visibles en su tienda, WHEN el comercio simula una importación, THE system SHALL decirle cuántos productos importados no se verán en su tienda y que las redirecciones necesitan dominio propio. Lo importado SHALL NOT desplazar de la tienda a los productos que el comercio ya vendía. THE system SHALL NOT generar una redirección hacia un producto que el plan no deja ver.

Fuente: crítica del 21-oct (plan gratis: 50 productos visibles y sin dominio propio; lo importado entraba como lo más reciente); ticket F5-30 («con sus redirecciones listas»). [NEEDS CLARIFICATION: pregunta 15]

#### Scenario: Comercio gratis con 38 productos importa 500
- **WHEN** un comercio del plan gratis con 38 productos visibles simula 500 productos
- **THEN** la simulación dice que solo 12 de los importados se verán y por qué, y después de importar sus 38 productos siguen en la tienda

#### Scenario: Redirección hacia un producto oculto
- **WHEN** se generan las redirecciones de ese comercio
- **THEN** no hay ninguna hacia los productos que el plan no deja ver, y el reporte dice cuántas se omitieron

### Requirement: Un producto sin control de existencias se sigue vendiendo
IF el archivo dice que un producto no lleva control de existencias o que se vende sin unidades, THEN THE system SHALL importarlo como producto que se vende sin existencias, SHALL NOT cargarle existencias y SHALL decirlo en el reporte. IF en un mismo producto unas variantes llevan control y otras no, THEN THE system SHALL importarlo con control y avisarlo.

Fuente: crítica del 21-oct (en la plantilla oficial, 2 de 3 productos no llevan control y entrarían agotados); D-518 F2-43·7 (la tienda ya reconoce el producto que no lleva existencias). [NEEDS CLARIFICATION: pregunta 16]

#### Scenario: Libro digital de la plantilla
- **WHEN** se importa el libro digital de la plantilla oficial, que no lleva control de existencias
- **THEN** se puede comprar en la tienda, no tiene existencias en ninguna bodega y el reporte lo explica

### Requirement: Las tallas de un producto importado siguen la disponibilidad del producto
WHERE la pregunta 18 deja este arreglo en la entrega, WHILE un producto importado no esté conectado con otra plataforma, THE system SHALL ofrecer cada talla o color activo según la disponibilidad del producto, y SHALL NOT depender de las cantidades por talla del archivo, que nunca se actualizan. Los productos que no vienen de una importación SHALL seguir igual.

Fuente: tarea 13.2 (requisito para encender en un comercio real); D-518 T·1 (lo pendiente sigue en este ticket); D-214 (no hay existencias por variante). [NEEDS CLARIFICATION: pregunta 18]

#### Scenario: Talla repuesta
- **WHEN** una talla llegó en 0 en el archivo y el comercio después carga existencias del producto
- **THEN** esa talla se puede elegir y comprar en la tienda
