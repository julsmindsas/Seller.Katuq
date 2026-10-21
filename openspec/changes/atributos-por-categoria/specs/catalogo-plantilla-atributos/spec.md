## ADDED Requirements

> D-495, ampliación del 2026-10-21 (F3), **pendiente de aprobación**. Ticket 1234 (F2-42).
> Reemplaza el requisito «Plantilla de importación por categoría [F3]» de
> `catalogo-atributos-categoria`, aprobado el 18-oct.

### Requirement: Plantilla de especificaciones por categoría [F3]

WHERE la función está encendida, WHEN el comercio descarga la plantilla de productos eligiendo una categoría, THE system SHALL incluir una hoja de especificaciones con la referencia y una columna por atributo de esa categoría (los heredados incluidos), con la unidad o «SI/NO» en el encabezado, y SHALL listar en las instrucciones el tipo, la unidad y las opciones válidas de cada atributo y cómo se separan varios valores.

*Fuente: ticket 1234 («carga manual y por importación masiva (Excel) con plantilla por categoría»).*

#### Scenario: Plantilla de Networking

- **WHEN** el comercio descarga la plantilla eligiendo «Networking > Routers»
- **THEN** la hoja de especificaciones trae «Referencia», «Tecnología WiFi», «Velocidad (Mbps)» y «Puertos LAN»
- **AND** las instrucciones listan «WiFi 5», «WiFi 6» y «WiFi 6E» como opciones válidas

### Requirement: Importar cambia solo las especificaciones [F3]

WHEN se importa un archivo con la hoja de especificaciones, THE system SHALL escribir solo los atributos de cada fila, validados contra la categoría de ese producto, y SHALL avisar fila por fila los valores inválidos, las referencias que no existen y las repetidas, sin detener las demás filas. WHEN la misma importación crea un producto y carga sus especificaciones, THE system SHALL encontrarlo y guardarlas. IF una celda está vacía, THEN THE system SHALL dejar ese valor como estaba. THE system SHALL borrar un valor solo si la celda lo pide expresamente. THE system SHALL NOT modificar ningún otro dato del producto ni reenviarlo a las tiendas conectadas.

*Fuente: ticket 1234; requisito «Guardar atributos no toca nada más» (F1); aviso del export de productos (reimportar un export parcial pisa campos ausentes).*

#### Scenario: Valor fuera de las opciones

- **WHEN** una fila trae «WiFi 9» en «Tecnología WiFi»
- **THEN** esa fila se rechaza con el campo y las opciones válidas, y las demás filas se guardan

#### Scenario: Producto, precio y listas quedan sin cambios

- **WHEN** se importa la hoja de especificaciones de productos con variantes, precios por tipo de cliente e integraciones
- **THEN** precio, precios por tipo de cliente, variantes, integraciones, existencias y listas de precios quedan exactamente iguales
- **AND** los productos no se reenvían a las tiendas conectadas

### Requirement: Exportar, corregir y reimportar [F3]

WHERE la función está encendida, WHEN el comercio exporta sus productos eligiendo una categoría, THE system SHALL incluir la misma hoja de especificaciones con los valores actuales de los productos exportados que están en esa categoría o en sus subcategorías.

*Fuente: ticket 1234; propuesta aprobada del 18-oct («el export filtrado por esa categoría trae las mismas columnas»).*

#### Scenario: Ciclo completo

- **WHEN** el comercio exporta «Networking», corrige valores en la hoja de especificaciones y reimporta solo esa hoja
- **THEN** los atributos quedan corregidos y ningún otro dato de los productos cambia

### Requirement: Con la función apagada la importación queda como hoy [F3]

WHILE la función está apagada, THE system SHALL descargar, importar y exportar productos exactamente como hoy. IF un archivo trae la hoja de especificaciones, THEN THE system SHALL ignorarla como hoy ignora cualquier hoja que no conoce, sin avisos nuevos.

*Fuente: D-385; requisito «Con la función apagada todo queda como hoy» (F1–F3). Revisión del 21-oct: se quitó el aviso, que era comportamiento nuevo con la función apagada.*

#### Scenario: Comercio sin la función

- **WHEN** un comercio sin la función importa un archivo con hoja de especificaciones
- **THEN** sus productos se importan como hoy, con los mismos mensajes de hoy, y las especificaciones no se cargan
