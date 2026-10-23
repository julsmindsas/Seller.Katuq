## ADDED Requirements

### Requirement: Leer solo lo que el reporte necesita
WHEN un reporte tiene un período, el sistema SHALL leer solo los registros de ese período y de la empresa de la sesión, y SHALL NOT recorrer la historia completa de la empresa.

El sistema SHALL agrupar, sumar y filtrar antes de responder. Al navegador SHALL llegar solo el resultado resumido.

#### Scenario: Un mes de pedidos
- **WHEN** se corre un reporte de pedidos de octubre
- **THEN** solo se leen pedidos de octubre, y los registros leídos quedan en el detalle técnico de la consulta

### Requirement: Tiempos de respuesta
El sistema SHALL cumplir, para una empresa del tamaño de ALMARA FELICIDAD (unos 1.300 pedidos al mes):
- abrir una plantilla o el tablero en 2 segundos o menos;
- calcular 12 meses de pedidos por mes y canal en 5 segundos o menos.

#### Scenario: Doce meses por canal
- **WHEN** el dueño de ALMARA pide ventas de los últimos 12 meses por mes y canal
- **THEN** ve el resultado en 5 segundos o menos

#### Scenario: Plantilla
- **WHEN** abre una plantilla de ventas del mes
- **THEN** la ve en 2 segundos o menos

### Requirement: Las cifras no cambian por ir más rápido
El sistema SHALL dar las mismas cifras antes y después de cualquier mejora de velocidad, con el mismo período y los mismos filtros.

#### Scenario: Paridad
- **WHEN** se corre el mismo reporte antes y después de la mejora
- **THEN** cada fila y cada total son iguales

### Requirement: Tablas que no se pegan
El sistema SHALL mostrar al inicio las primeras 500 filas de una tabla, con "Ver más" para las siguientes.

La exportación SHALL traer todas las filas del resultado. IF el resultado supera el máximo exportable, THEN el sistema SHALL decirlo antes de exportar y sugerir un filtro.

#### Scenario: Tabla larga
- **WHEN** un resultado tiene 3.000 filas
- **THEN** la pantalla muestra 500 y "Ver más", y el Excel trae las 3.000

### Requirement: Tabla dinámica acotada
IF una tabla dinámica genera más de 30 columnas, THEN el sistema SHALL mostrar las 29 de mayor valor más una columna "Otros", y SHALL avisar que agrupó el resto y cómo verlas todas.

#### Scenario: Productos como columnas
- **WHEN** se pone "producto" en "Comparar por" y hay 200 productos
- **THEN** se ven 29 productos más "Otros", con el aviso

### Requirement: Consulta pesada avisada antes de correr
WHEN el sistema estima que una consulta va a leer muchos registros (por ejemplo, más de 50.000), SHALL avisarlo antes de correrla ("Trae unos 120.000 registros; te sugerimos filtrar por mes"). El aviso SHALL traer el filtro sugerido, listo para aplicar con un clic, y SHALL dejar seguir sin filtro.

#### Scenario: Toda la historia sin filtro
- **WHEN** la persona corre un reporte de pedidos sin período
- **THEN** ve el aviso con "Filtrar por este mes" a un clic

### Requirement: La pantalla nunca se congela
WHILE una consulta corre, el sistema SHALL:
- mostrar que está calculando y cuánto lleva;
- permitir cancelarla;
- dejar que la persona siga usando la pantalla.

WHEN la persona cancela, el sistema SHALL dejar de calcular y dejar la pantalla como estaba antes de correrla.

#### Scenario: Cancelar
- **WHEN** una consulta lleva 10 segundos y la persona toca "Cancelar"
- **THEN** la consulta se detiene y la pantalla queda como antes

#### Scenario: Muchos registros
- **WHEN** una consulta recorre más de 100.000 registros
- **THEN** la pantalla sigue respondiendo y se puede cancelar

### Requirement: Tiempo máximo con salida clara
IF una consulta supera el tiempo máximo (D-551; recomendado: 30 segundos), THEN el sistema SHALL:
- detenerla;
- decir en lenguaje claro que fue muy grande;
- sugerir cómo acotarla (período, filtro o menos columnas).

Nunca SHALL quedarse cargando sin fin.

#### Scenario: Consulta que no termina
- **WHEN** una consulta pasa el tiempo máximo
- **THEN** la persona ve el mensaje con la sugerencia, no un indicador de carga eterno

### Requirement: Hora del cálculo visible
Cada resultado SHALL mostrar la hora en que se calculó y un botón "Actualizar".

El sistema SHALL NOT guardar resultados de reportes para mostrarlos después (AGENTS.md, «Sin cache extra»; D-551): cumple los tiempos leyendo solo el período y muestra la hora del cálculo.

#### Scenario: Reporte abierto
- **WHEN** el dueño abre un reporte
- **THEN** ve "Calculado hoy a las 10:42 a. m." y el botón "Actualizar"

### Requirement: Consultas lentas registradas
WHEN una consulta tarda más de 5 segundos, se cancela o se detiene por tiempo, el sistema SHALL registrar:
- la empresa;
- la fuente;
- el período;
- los registros leídos;
- la duración;
- el motivo.

El registro SHALL NOT incluir datos personales ni el resultado.

#### Scenario: Consulta lenta
- **WHEN** un reporte tarda 8 segundos
- **THEN** queda un registro con la duración y los registros leídos, sin nombres de clientes
