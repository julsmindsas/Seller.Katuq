## ADDED Requirements

### Requirement: Reportes en español de negocio
El sistema SHALL mostrar solo textos en español de negocio en todas las pantallas de Reportes y en lo que se exporta:
- inicio de Reportes;
- constructor;
- vista de un reporte;
- enlace público;
- archivos exportados.

El sistema SHALL NOT mostrar términos en inglés ni nombres internos:
- códigos de fuente (`orders`);
- tipos de gráfico (BAR, table, pivot, kpi);
- funciones (sum, avg, count);
- granularidades (day, month);
- siglas de integración o de documento (WO, FV, CxC);
- opciones técnicas (persistLines, bucket, aging).

#### Scenario: Tarjeta de un reporte guardado
- **WHEN** el dueño ve un reporte guardado de pedidos en barras
- **THEN** la tarjeta dice "Pedidos · Barras" y no "orders · bar"

#### Scenario: Encabezados de una tabla
- **WHEN** un reporte agrupa por mes y suma el total de los pedidos
- **THEN** los encabezados dicen "Mes" y "Total de pedidos", sin la función ni la granularidad en inglés entre paréntesis

#### Scenario: Archivo exportado
- **WHEN** se exporta a Excel un reporte con tabla dinámica y gráfico
- **THEN** las hojas se llaman en español ("Datos", "Gráficas", "Tabla dinámica")

#### Scenario: Revisión de aceptación
- **WHEN** se recorren todas las pantallas de Reportes con la lista de términos prohibidos
- **THEN** ninguno aparece

### Requirement: Nombres del constructor
El constructor SHALL usar estos nombres:

| Elemento | Nombre |
|---|---|
| De dónde salen los datos | Información de |
| Campos para agrupar | Datos para agrupar |
| Campos para medir | Datos para medir |
| Filas | Agrupar por |
| Columnas | Comparar por |
| Valores | Qué medir |
| Medida calculada | + Fórmula |
| Tipos de vista | Tabla, Tabla dinámica, Barras, Líneas, Torta, Indicador |
| Funciones | Suma, Promedio, Conteo, Conteo sin repetir, Mínimo, Máximo |
| Granularidad | Día, Semana, Mes, Trimestre, Año |

#### Scenario: Elegir cómo se suma
- **WHEN** la persona abre la lista de funciones de un dato
- **THEN** ve "Suma, Promedio, Conteo…" y no "sum, avg, count"

### Requirement: Las fórmulas guardadas siguen funcionando
WHEN cambian los nombres visibles de columnas y funciones, el sistema SHALL calcular cada fórmula ya guardada con el mismo resultado que antes y SHALL mostrarla con los nombres nuevos.

#### Scenario: Fórmula vieja
- **WHEN** se abre un reporte guardado con la fórmula "[Total Pedido (sum)] / [Pedidos (count)]"
- **THEN** da el mismo valor que antes del cambio y se lee "[Total de pedidos (Suma)] / [Pedidos (Conteo)]"

### Requirement: Fechas rápidas y comparación
El selector de período SHALL ofrecer estas opciones, todas en hora de Colombia y con la semana de lunes a domingo:
- Hoy;
- Ayer;
- Esta semana;
- Este mes;
- Mes anterior;
- Últimos 30 días;
- Este año;
- Personalizado.

El selector de comparación SHALL ofrecer:
- Sin comparación;
- Período anterior, con la definición del diccionario de métricas;
- Mismo período del año pasado.

#### Scenario: Este mes
- **WHEN** el 23 de octubre la persona elige "Este mes"
- **THEN** el reporte cubre del 1 al 23 de octubre y lo dice en el subtítulo

#### Scenario: Comparar con el año pasado
- **WHEN** la persona elige "Este mes" y "Mismo período del año pasado"
- **THEN** se compara contra el 1 al 23 de octubre del año anterior

### Requirement: Plantillas en lenguaje de negocio
Cada plantilla SHALL tener:
- un título en forma de pregunta o de beneficio;
- una frase de para qué sirve;
- un ícono visible;
- un tema: Ventas, Productos, Clientes, Cartera o Inventario.

Las plantillas SHALL mostrarse agrupadas por tema.

IF la empresa no puede correr una plantilla porque le falta una integración, THEN el sistema SHALL NOT ofrecerla como disponible. En su lugar SHALL decir qué se necesita. Nunca SHALL abrir un constructor vacío.

Toda empresa con pedidos SHALL ver al menos plantillas de ventas por mes, por canal, por vendedor, por forma de pago y por ciudad.

#### Scenario: Cartera por antigüedad
- **WHEN** la persona ve la plantilla de cartera por antigüedad
- **THEN** se llama "¿Quién te debe y desde cuándo?" y explica en una frase qué muestra

#### Scenario: Empresa sin integración contable
- **WHEN** una empresa sin World Office entra a Reportes
- **THEN** no ve como disponibles las plantillas que dependen de esa integración, y sí ve las de pedidos

### Requirement: Reportes guardados reconocibles
Al guardar un reporte sin nombre, el sistema SHALL ponerle un nombre automático que describa qué mide, cómo agrupa y qué período cubre (por ejemplo, "Ventas por mes · 2026").

Cada reporte guardado SHALL mostrar:
- la fecha de su última actualización, en formato día/mes/año;
- si es favorito, para fijarlo arriba;
- ningún dato técnico.

#### Scenario: Dos reportes sin nombre
- **WHEN** la persona guarda dos reportes sin escribir nombre
- **THEN** cada uno queda con un nombre que lo describe, y ninguno se llama "Nuevo reporte"

### Requirement: Vista anterior explicada
WHILE exista la "Vista clásica", el sistema SHALL decir junto a ella, en una frase, qué muestra y en qué se diferencia de los reportes.

WHEN el tablero gerencial cubra sus indicadores, la vista anterior SHALL retirarse.

#### Scenario: Botón explicado
- **WHEN** el dueño ve el botón de la vista anterior
- **THEN** entiende, sin abrirla, qué encuentra allí

### Requirement: Ayuda en contexto
El sistema SHALL ofrecer:
- un recorrido guiado la primera vez que una persona abre el constructor, que se puede saltar y repetir;
- un "¿Qué es esto?" en cada zona y en cada dato;
- un ejemplo precargado en el estado vacío;
- WHERE exista el video de ayuda, un enlace a él.

#### Scenario: Primera visita
- **WHEN** una persona abre el constructor por primera vez
- **THEN** ve el recorrido guiado, y si lo salta no vuelve a salir solo
