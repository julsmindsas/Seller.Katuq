# Seguridad del runtime del servidor

Estado: alcance, diseño y tareas aprobados por Daniel (2026-10-23). Tras recibir resultados, autoriza ejecutar la actualización una sola vez el 23-oct a las 23:00 America/Bogota, directamente en servidor, con verificaciones y reversión. La autorización posterior reemplaza la restricción previa de solo preparación; no autoriza adelantar el corte.

## Historia

Como operador de Katuq, quiero corregir las vulnerabilidades conocidas del runtime en producción preservando la operación de los comercios y la posibilidad de revertir un fallo.

## ADDED Requirements

### Requirement: SupportedRuntime
WHEN se complete la intervención, THE system SHALL ejecutar todos los procesos de su alcance con una versión soportada que incluya las correcciones de seguridad publicadas el 21 de octubre de 2026.

#### Scenario: Final runtime inventory
- **WHEN** se comprueba el resultado de la intervención
- **THEN** cada proceso del alcance acredita una versión efectiva soportada y corregida

### Requirement: VerifiedCandidateAndRollback
BEFORE modificar un proceso activo, THE operator SHALL verificar el origen e integridad del candidato, su compatibilidad con las dependencias desplegadas y la disponibilidad de una reversión acotada.

#### Scenario: Preparation before a live change
- **WHEN** se prepara la sustitución de un proceso activo
- **THEN** candidato, compatibilidad y reversión tienen evidencia verificada antes de aplicar

### Requirement: PreserveBusinessState
WHILE se aplica la actualización, THE system SHALL conservar el código de aplicación desplegado, autenticación, configuración de negocio y datos de negocio; no se autoriza generar pedidos, pagos, movimientos o mensajes de prueba en producción.

#### Scenario: Compatibility tests without business writes
- **WHEN** se prueban el candidato y la reversión
- **THEN** las pruebas no generan escrituras ni mensajes de negocio en producción

### Requirement: SequentialServiceVerification
WHEN se sustituya un servicio, THE operator SHALL verificar su versión efectiva, disponibilidad, ausencia de duplicación de procesos y resultado de comprobaciones de solo lectura antes de continuar.

#### Scenario: Verify before the next service
- **WHEN** termina la sustitución de un servicio
- **THEN** su proceso real y salud se verifican antes de avanzar al siguiente

### Requirement: RestoreOnFailure
IF un servicio no cumple los criterios de salud acordados, THEN THE operator SHALL detener la secuencia, restaurar el servicio afectado e informar del resultado y la exposición restante.

#### Scenario: Unhealthy replacement
- **WHEN** el reemplazo no cumple los criterios de salud
- **THEN** se detiene el avance y se ejecuta la reversión acordada con resultado explícito

### Requirement: PersistentRuntimeSelection
WHEN se cierre la intervención, THE operator SHALL verificar que la configuración persistida no restaure el runtime vulnerable tras un arranque posterior, sin reiniciar el host como prueba.

#### Scenario: Persistent launch verification
- **WHEN** se inspecciona la configuración final de arranque
- **THEN** selecciona el runtime corregido y no se reinicia el host solo para comprobarlo

### Requirement: AuditableEvidence
THE operator SHALL registrar versiones iniciales/finales, procesos cubiertos o excluidos, comprobaciones, incidencias, duración de interrupciones observadas y cualquier riesgo pendiente, sin secretos ni datos personales.

#### Scenario: Review the outcome safely
- **WHEN** se entrega el informe de resultados
- **THEN** diferencia pruebas, operación real y pendientes sin exponer secretos ni datos personales

### Requirement: AuthorizedOneTimeServerExecution
WHEN llegue la ventana autorizada, THE server SHALL ejecutar la intervención una sola vez sin depender del computador del operador, verificando el estado actual antes de cortar y conservando recuperación independiente del ejecutor.

#### Scenario: Execute only the authorized window
- **WHEN** llega el 23 de octubre de 2026 a las 23:00 America/Bogota y pasan los controles
- **THEN** se ejecuta una única intervención en servidor, sin nueva confirmación del alcance aprobado

#### Scenario: Drift or failed prerequisites
- **WHEN** cambian código, dependencias, procesos o configuración respecto del candidato probado, o falta un requisito técnico
- **THEN** se registra el bloqueo y no se inicia el corte

#### Scenario: Executor interrupted
- **WHEN** el ejecutor se interrumpe después de iniciar cambios activos
- **THEN** un mecanismo del servidor independiente del ejecutor intenta la reversión respaldada y conserva su resultado

## Restricciones no funcionales

Intervención secuencial y reversible, de mínimo alcance. Las pruebas de compatibilidad no deben iniciar consumidores de negocio contra datos reales. La ausencia de una intrusión no puede inferirse de los checks de disponibilidad. Se preservan los checkpoints humanos de spec, diseño y tareas; los criterios cuantitativos de observación y reversión se fijarán en el diseño aprobado.
