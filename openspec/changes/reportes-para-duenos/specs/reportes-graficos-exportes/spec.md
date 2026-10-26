## ADDED Requirements

### Requirement: Gráficos con la marca y legibles
Los gráficos de Reportes SHALL:
- usar la paleta de marca de Katuq del sistema de diseño, legible en modo claro y oscuro y sin colores de otras marcas;
- mostrar los pesos en formato colombiano ($41.400);
- abreviar los ejes ($1,2 M, $350 mil);
- poner etiquetas de valor en las barras y en los puntos clave;
- tener tooltips claros;
- mostrar la leyenda solo si hay más de una serie.

#### Scenario: Barras de ventas
- **WHEN** se ve un gráfico de barras de ventas por canal
- **THEN** cada barra muestra su valor en pesos, el eje dice "$1,2 M" y no hay leyenda porque hay una sola serie

### Requirement: Orden y "Otros"
Por omisión, las barras SHALL ordenarse de mayor a menor.

IF hay más de 10 categorías, THEN el gráfico SHALL mostrar las 10 mayores y una barra "Otros" con el resto. La persona SHALL poder cambiar a 20 o a todas.

Las tortas SHALL tener 6 porciones como máximo (5 más "Otros") y mostrar el porcentaje de cada una.

#### Scenario: Muchos productos
- **WHEN** un gráfico de ventas por producto tiene 80 productos
- **THEN** muestra los 10 mayores y "Otros", y el total del gráfico sigue igual

### Requirement: Indicadores con contexto
Cada indicador SHALL mostrar:
- el valor en grande;
- la variación contra el período anterior (↑ verde si sube, ↓ rojo si baja);
- una mini tendencia.

IF el período anterior no tiene datos, THEN el indicador SHALL decirlo en vez de mostrar una variación.

#### Scenario: Ventas del mes
- **WHEN** el dueño ve el indicador de ventas del mes
- **THEN** ve el valor, "↑ 12 % vs. mes anterior" en verde y la tendencia de los últimos meses

### Requirement: Fechas y títulos en español
Las fechas SHALL mostrarse en español ("may 2026", "lun 20").

Cada gráfico y cada tabla SHALL tener un título y un subtítulo automáticos con el período, la fecha base y los filtros aplicados.

#### Scenario: Subtítulo
- **WHEN** se filtra por el canal "Almara Online" en octubre
- **THEN** el subtítulo dice "1–23 oct 2026 · por fecha de entrega · canal Almara Online"

### Requirement: Bajar al detalle
WHEN la persona hace clic en una barra, una porción, un punto o una fila, el sistema SHALL mostrar los pedidos, clientes o productos que forman ese valor, y SHALL permitir exportarlos.

El detalle SHALL respetar los mismos permisos y el mismo alcance del vendedor que el reporte. La suma del detalle SHALL dar el valor del que se partió.

#### Scenario: Clic en un canal
- **WHEN** el dueño hace clic en la barra de un canal
- **THEN** ve los pedidos de ese canal en el período, y su suma da el valor de la barra

#### Scenario: Vendedor restringido
- **WHEN** un vendedor con "solo sus métricas" baja al detalle
- **THEN** solo ve sus pedidos

### Requirement: Adaptable y con estado vacío amable
Gráficos y tablas SHALL verse bien en computador, tableta y celular, sin desplazamiento lateral de la página.

IF un resultado no tiene datos, THEN el sistema SHALL mostrar un estado vacío con ícono, título y una frase de qué cambiar.

#### Scenario: Sin ventas en el período
- **WHEN** el período no tiene pedidos
- **THEN** se ve "No hay ventas en este período" con la sugerencia de ampliar las fechas

### Requirement: Excel listo para enviar
El Excel exportado SHALL tener:
- un encabezado con el logo y el nombre de la empresa, el título, el período, los filtros y la fecha de generación;
- encabezados de columna con el color de marca y la fila congelada;
- formato de moneda, miles y fechas;
- columnas ajustadas;
- una fila de totales;
- filtros activados;
- una hoja de datos y, cuando haya gráfico, una hoja con el gráfico.

#### Scenario: Excel de ventas
- **WHEN** se exporta ventas por producto de mayo
- **THEN** el archivo abre con logo, título, período y totales, con los pesos con formato y sin retoques

### Requirement: PDF y PNG de marca
El PDF SHALL tener:
- la plantilla de marca;
- orientación horizontal si la tabla es ancha;
- el gráfico, un resumen en palabras y la tabla;
- número de página;
- el pie "Generado con Katuq · <fecha>".

El resumen en palabras SHALL usar solo cifras del reporte.

El PNG SHALL salir en alta resolución (2x), con título, período y logo.

#### Scenario: PDF ancho
- **WHEN** se exporta a PDF una tabla de 12 columnas
- **THEN** sale en horizontal, con número de página y el pie de Katuq

### Requirement: Nombre de archivo y botones claros
Cada archivo SHALL llamarse según su contenido y período (por ejemplo, "Ventas-por-producto_may-2026.xlsx").

Los botones de exportar SHALL verse activos cuando se pueden usar. IF no hay datos, THEN SHALL explicar por qué no se puede exportar.

#### Scenario: Sin resultado
- **WHEN** el reporte no se ha ejecutado
- **THEN** los botones explican "Ejecuta el reporte para poder exportarlo"

### Requirement: Exporte igual a la pantalla
Las cifras de cualquier archivo exportado SHALL ser iguales a las de la pantalla. Un exporte SHALL NOT incluir datos que la persona no puede ver en pantalla.

#### Scenario: Totales del Excel
- **WHEN** se exporta un reporte
- **THEN** la fila de totales del Excel coincide con el total en pantalla
