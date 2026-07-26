# Tasks

## 1. Contrato temporal y exactitud

- [x] 1.1 Definir fecha mínima certificable por empresa/producto-bodega a partir de ancla+ledger; antes de ella responder incompleto, nunca inventar exactitud.
- [x] 1.2 Crear cálculo read-only de saldo a corte desde snapshot vigente y deltas posteriores, con identidad normalizada y fechas canónicas/legacy toleradas.
- [x] 1.3 Tratar duplicados discordantes, movimientos sin fecha/motivo y bodegas inválidas como ambigüedad visible.
- [ ] 1.4 Confirmar PITR de Firestore y capturar un ancla con `snapshot-time` en ventana aprobada; export normal sin snapshot-time no certifica el instante.

## 2. Exportación

- [x] 2.1 Extender el endpoint/export existente con `fechaCorte`, empresa obligatoria, paginación/cursor y metadatos de confianza.
- [x] 2.2 Mantener las columnas operativas actuales y agregar saldo al corte, nivel de confianza, cobertura y causa de inconsistencia.
- [x] 2.3 Garantizar que exportar no escriba inventario, productos, precios, pedidos ni configuración.

## 3. Verificación y entrega

- [ ] 3.1 Fixtures con ancla conocida, ingreso/salida, traslado, reversa, duplicado ambiguo e historia incompleta.
- [ ] 3.2 Comparar corte de hoy contra consolidado canónico y cortes anteriores contra muestras reconstruidas manualmente.
- [ ] 3.3 Validar rendimiento en OMS, export grande y aislamiento multi-tenant; luego actualizar la tarea ClickUp `wdu9v76exg` con alcance real y evidencia.
