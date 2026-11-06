## ADDED Requirements

### Requirement: Tablero con secciones claras
El tablero de plataforma SHALL organizar las métricas en secciones: Ingresos, Base de comercios, Actividad, Adopción, Salud y Soporte. Cada sección SHALL mostrar su universo («comercios reales»), la fecha de cálculo y la versión de la regla, con la jerarquía cifras clave, tendencia y tabla. Las 6 tarjetas de D-277 se conservan como cifras clave y adoptan las definiciones nuevas.

#### Scenario: Primera vista
- **WHEN** el Super Administrador abre el tablero
- **THEN** ve las cifras clave de cada sección con universo y fecha, antes de cualquier tabla

### Requirement: Legibilidad
Cada sección SHALL mostrar como máximo [6] cifras clave. Los montos SHALL mostrarse en COP con separador de miles, las fechas en hora de Colombia, lo desconocido como «—» y los rótulos en español.

#### Scenario: Formato
- **WHEN** el cobrado del mes es 12 345 678 pesos
- **THEN** se muestra en COP con separador de miles y la fecha de corte en hora de Colombia

### Requirement: Cifras de ingresos
La sección Ingresos SHALL mostrar contratado (estimado), cobrado del mes, brecha entre ambos, por cobrar y mora con las definiciones de `platform-billing-truth`.

#### Scenario: Brecha
- **WHEN** el contratado es mayor que el cobrado
- **THEN** la brecha y la mora se muestran con su cifra y rótulo, sin llamarlas «ingreso»

### Requirement: Cifras de base de comercios
La sección Base SHALL mostrar altas por mes, comercios activos por estado de ciclo, conversión a pago por cohorte y bajas, con el origen de la fecha de alta, según `platform-metrics-formulas`. El tablero SHALL excluir de «en riesgo» y «sin movimiento» a los comercios con menos días de alta que [30 días, por confirmar], clasificándolos «nuevos».

#### Scenario: Alta reciente
- **WHEN** un comercio se creó hace dos días y no tiene pedidos
- **THEN** no cuenta como «en riesgo» ni «sin movimiento»

### Requirement: Cifras de actividad
La sección Actividad SHALL mostrar comercios con venta en 30 días, GMV por mes oficial, comercios que ingresaron en 7 y 30 días y pedidos por canal. «Ingresó» SHALL rotularse ingreso a la plataforma, no uso.

#### Scenario: Ingreso sin uso
- **WHEN** un comercio ingresó pero no registró actividad de uso
- **THEN** cuenta en «ingresaron» y no en «con uso»

### Requirement: Tendencias con gráficos
El tablero SHALL mostrar con gráficos los últimos 12 meses de contratado, cobrado, altas y bajas, y GMV. Cada mes SHALL mostrarse: con snapshot, su valor; sin snapshot pero reconstruible, su valor «reconstruido»; no reconstruible, «sin dato». Nunca cero.

#### Scenario: Historia incompleta
- **WHEN** solo hay tres meses de snapshots y los anteriores son reconstruibles
- **THEN** tres meses muestran valor, los demás «reconstruido»

### Requirement: Tabla de comercios legible
La tabla SHALL permitir ordenar por cualquier columna, filtrar por segmento, estado y tipo de cuenta, y buscar por nombre. SHALL mostrar último pago aprobado y último ingreso con fecha. La paginación y el filtrado SHALL funcionar con todas las empresas sin traer datos innecesarios.

#### Scenario: Ordenar por último pago
- **WHEN** el Super Administrador ordena por último pago
- **THEN** los comercios sin pagos quedan al final rotulados «sin pagos»

### Requirement: Cuentas excluidas visibles
El tablero SHALL ofrecer una vista de cuentas excluidas con tipo, motivo y si el tipo es confirmado o deducido, con la posibilidad de corregirlo.

#### Scenario: Revisar excluidas
- **WHEN** el Super Administrador abre «Cuentas excluidas»
- **THEN** ve cada cuenta con tipo, motivo y estado de confirmación

### Requirement: Vista secundaria por entrega
La vista «por entrega» SHALL rotularse y mantenerse separada de las cifras oficiales.

#### Scenario: Cuadrar con el comercio
- **WHEN** se activa «por entrega»
- **THEN** sus cifras llevan el rótulo y las oficiales no cambian

### Requirement: Exportaciones coherentes
La exportación a CSV o PDF SHALL contener las mismas cifras, universo, fecha de cálculo y versión de regla que la pantalla, y rotular los pagos manuales.

#### Scenario: Exportar
- **WHEN** se exporta la tabla filtrada
- **THEN** el archivo contiene las filas filtradas y el pie con universo, fecha y versión

### Requirement: Diseño Katuq
Las pantallas SHALL seguir el diseño Katuq vigente (`openspec/specs/design-system/spec.md` y la regla de diseño de `AGENTS.md`): plano, sin gradientes ni primarios paralelos, estados vacíos con ícono, título y texto corto, foco visible por teclado y gráficos con los componentes compartidos. Los conteos de gradientes y primarios prohibidos del módulo no SHALL subir.

#### Scenario: Revisión de diseño
- **WHEN** se cuentan gradientes y primarios prohibidos del módulo tocado
- **THEN** no suben respecto a antes del cambio

### Requirement: Responsive y accesibilidad
El tablero SHALL verse sin scroll horizontal en 1440 y 390 px, con la tabla convertida en tarjetas en móvil. La información SHALL NOT depender solo del color. Los gráficos SHALL ofrecer sus valores en tabla o texto. El contraste SHALL cumplir WCAG 2.1 AA.

#### Scenario: Celular
- **WHEN** se abre el tablero en 390 px
- **THEN** no hay scroll horizontal ni texto invisible, y cada comercio es una tarjeta

### Requirement: Rendimiento percibido
Las cifras clave SHALL mostrarse sin esperar a las secciones pesadas y cada sección SHALL indicar su carga o su fallo individual. IF una sección falla, THEN las demás SHALL seguir visibles.

#### Scenario: Falla una sección
- **WHEN** el cálculo de adopción falla
- **THEN** esa sección muestra el error y el resto se ve normal
