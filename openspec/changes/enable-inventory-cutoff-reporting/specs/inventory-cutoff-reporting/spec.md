# Delta: inventory-cutoff-reporting

## ADDED Requirements

### Requirement: Consulta por instante de corte
THE system SHALL permitir consultar inventario para una empresa en una fecha y hora de corte explícitas.

#### Scenario: Fecha sin hora
- **GIVEN** una fecha de corte `2026-07-21` sin hora
- **WHEN** se ejecuta el reporte
- **THEN** se calcula al final de ese día en `America/Bogota` y se informa el instante usado

### Requirement: Reconstrucción basada en evidencia completa
THE system SHALL calcular el saldo de corte únicamente desde una cantidad ancla identificada y los movimientos necesarios para recorrer el período.

#### Scenario: Ancla y movimientos completos
- **GIVEN** un saldo ancla certificado y todos los movimientos posteriores al corte
- **WHEN** se reconstruye el saldo
- **THEN** la cantidad resultante se marca certificada y es reproducible

#### Scenario: Falta un tramo de movimientos
- **GIVEN** una ancla válida pero cobertura incompleta dentro del período
- **WHEN** se reconstruye
- **THEN** el resultado se marca incompleto y explica el tramo faltante

### Requirement: Identidad normalizada antes de consolidar
THE system SHALL normalizar producto y validar business code de bodega antes de agrupar cantidades o movimientos.

#### Scenario: Registros legacy del mismo producto
- **GIVEN** documentos por referencia y por identificador que representan el mismo producto–bodega
- **WHEN** se genera el corte
- **THEN** no se cuentan como dos productos distintos y cualquier diferencia queda marcada como ambigua

### Requirement: Confianza visible por fila y reporte
THE system SHALL mostrar para cada fila y para el reporte completo si el resultado es certificado, ambiguo o incompleto, junto con las causas.

#### Scenario: Una fila ambigua
- **GIVEN** un reporte con diez filas certificadas y una ambigua
- **WHEN** se presenta el resultado
- **THEN** el reporte global no se rotula como totalmente certificado

### Requirement: Pantalla y exportación coherentes
WHEN se usan la misma empresa, corte y filtros, THE system SHALL producir las mismas cantidades y estados de confianza en pantalla y en el archivo exportado.

#### Scenario: Exportar una vista filtrada
- **GIVEN** una vista por una bodega y fecha de corte
- **WHEN** el usuario exporta
- **THEN** el archivo contiene las mismas filas, cantidades, confianza y metadatos del corte

### Requirement: Historia faltante no se inventa
THE system MUST NOT completar movimientos, motivos, bodegas o cantidades históricas mediante supuestos para presentar un resultado exacto.

#### Scenario: Fecha anterior al inicio certificable
- **GIVEN** un corte anterior a la primera fecha con cobertura demostrada
- **WHEN** se solicita
- **THEN** el sistema lo entrega como no certificado o lo bloquea con explicación, pero no lo presenta como exacto

### Requirement: Reporte sin efectos operativos
THE system MUST NOT cambiar inventario, movimientos, pedidos, integraciones, productos, precios o listas de precios al consultar o exportar una fecha de corte.

#### Scenario: Exportaciones repetidas
- **GIVEN** los mismos datos y filtros
- **WHEN** se exporta varias veces
- **THEN** no cambia ningún saldo ni estado operativo

#### Scenario: Reporte muestra datos del producto
- **GIVEN** una exportación que incluye referencia, nombre o precio informativo
- **WHEN** se genera el archivo
- **THEN** esos datos se leen sin modificar el producto ni su configuración de precios
