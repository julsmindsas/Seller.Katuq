# Delta: inventory-rollout-safety

## ADDED Requirements

### Requirement: Activación apagada por defecto
THE system SHALL mantener apagado por defecto todo comportamiento nuevo que pueda cambiar cantidades o estados operativos.

#### Scenario: Despliegue inicial
- **GIVEN** una capacidad nueva desplegada sin configuración explícita para una empresa
- **WHEN** procesa tráfico real
- **THEN** conserva el comportamiento anterior y solo puede observar en modo sombra

### Requirement: Alcance de activación por comercio
THE system SHALL permitir habilitar o cortar una capacidad por empresa y, cuando aplique, por bodega o canal, sin afectar otros comercios.

#### Scenario: Canario en una bodega de OMS
- **GIVEN** una capacidad habilitada solo para una bodega de OH MY STORE
- **WHEN** operan otras bodegas o empresas
- **THEN** continúan por el camino anterior

### Requirement: Corte inmediato y trazable
THE system SHALL ofrecer un mecanismo de corte que detenga el comportamiento nuevo sin borrar evidencia y SHALL registrar quién lo accionó y por qué.

#### Scenario: Se detecta doble descuento
- **GIVEN** evidencia de un doble descuento durante el canario
- **WHEN** el responsable activa el corte
- **THEN** las operaciones siguientes usan el camino anterior y la incidencia queda trazable

### Requirement: Promoción mediante gates verificables
THE system SHALL NOT promover una capacidad de sombra a canario, ni de canario a alcance completo, si no cumple los criterios definidos para la empresa piloto.

#### Scenario: Movimiento sin cambio de saldo
- **GIVEN** al menos un movimiento nuevo sin el cambio de saldo correspondiente
- **WHEN** se evalúa el gate
- **THEN** la promoción se bloquea

#### Scenario: OMS supera el gate
- **GIVEN** evidencia completa del período de observación y ningún criterio de rollback
- **WHEN** el responsable aprueba la promoción
- **THEN** la capacidad puede ampliarse únicamente al siguiente alcance definido

### Requirement: Secuencia multi-tenant conservadora
THE system SHALL validar primero OH MY STORE, después Almacén Bombas y finalmente los demás comercios de forma individual.

#### Scenario: Capacidad específica de Cereza
- **GIVEN** una capacidad necesaria para OH MY STORE pero no configurada para Almacén Bombas
- **WHEN** Almacén Bombas entra al programa
- **THEN** esa capacidad permanece apagada
