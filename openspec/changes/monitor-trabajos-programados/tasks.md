# Tareas — Monitoreo de trabajos programados

Orden deliberado: la evidencia primero, la pantalla al final. Cada tarea de código cierra con build sin errores; no se avanza con el build roto. Leer los archivos afectados antes de editarlos.

## Fase 1 — Evidencia (backend)

- [ ] **1.1** Leer `functions/services/cronService.js` y el punto donde se escribe `flow_runs`, y documentar en un párrafo dónde engancha el latido en cada uno. Sin editar nada todavía.
- [ ] **1.2** Escribir `functions/services/monitoring/jobHeartbeat.js` con `conLatido({ jobId, jobKind, company }, fn)`: abre evidencia, ejecuta `fn` sin tocarlo, cierra con desenlace, y **vuelve a lanzar** cualquier excepción del cuerpo. Escritura de evidencia en `try/catch` que traga el error (R5), siguiendo el patrón de `shadowAuditService`.
- [ ] **1.3** Prueba unitaria de `jobHeartbeat`: que el valor de retorno del cuerpo pase intacto; que una excepción del cuerpo se relance tal cual; que un fallo de Firestore **no** tumbe el trabajo; que una ejecución sin cerrar quede como `interrumpido` (R4, R5).
- [ ] **1.4** Instrumentar **solo los trabajos de baja frecuencia** (cadencia ≥ 5 min): `woReceivablesSync`, `siigoMappingValidation`, `satisfactionSurveyPromoter`, `full-inventory-sync`, `osmosis-order-sync`. Un cambio a la vez, con diff antes de aplicar.
- [ ] **1.5** Registrar **cuáles** ítems se desviaron al error port en las corridas que terminan `partial`, y por qué (R3). El motivo de las corridas `failed` **ya se persiste** en `statusReason`, `errors[]` y `nodeStates` — verificado el 12-ago; ahí no hay nada que agregar, solo exponerlo en la fase 3.
- [ ] **1.6** **Medir el volumen real** de escritura tras 24 h con lo anterior encendido, y decidir con ese número si los trabajos de alta frecuencia van con latido por corrida o resumido por hora. No decidir por anticipado.
- [ ] **1.7** Instrumentar los de alta frecuencia según lo que diga 1.6.
- [ ] **1.8** **Módulo sensible — un cambio a la vez, diff y aprobación explícita antes de aplicar:** instrumentar el nodo `katuq-inventory-observe` en su borde, sin entrar en `dailyObservationService`.

## Fase 2 — Contratos de aislamiento

- [ ] **2.1** Contract test del write-set: ejecutar la instrumentación completa sobre un trabajo de inventario y **fallar** si se escribe `products`, catálogo, precios, listas de precios, `inventory` o `inventoryMovement` (R22).
- [ ] **2.2** Prueba de equivalencia: un trabajo instrumentado produce **exactamente el mismo conjunto de escrituras** que sin instrumentar (R21, R23).
- [ ] **2.3** Declarar ambas pruebas en `package.json` y verificar que corren en el servidor antes de cualquier despliegue.

## Fase 3 — Catálogo y consulta

- [ ] **3.1** Escribir el catálogo declarado de trabajos con `tipo`, `cadencia` y `toleranciaMin`, marcando `reactivo` a `shopify-orders-to-cereza-7e6ab5a3` y `woo-orders-to-katuq-a786f1a8` para evitar el falso rojo (R8).
- [ ] **3.2** Servicio de consolidado: última corrida, desenlace, contadores de ventana, cálculo de `ausente` (R7) y marca de `no declarado` (R9). Devuelve `indeterminado` ante lectura fallida, nunca `sano` (R13).
- [ ] **3.3** Prueba del cálculo de ausencia: periódico vencido → `ausente`; periódico dentro de tolerancia → `sano`; reactivo callado un mes → `sano`; trabajo sin declarar → `no declarado`.
- [ ] **3.4** `GET /v1/monitor/trabajos` en router nuevo, con el middleware de superadmin ya existente. **Nunca quitar el middleware de auth, ni "temporalmente".**
- [ ] **3.5** Prueba de que el endpoint responde 401/403 sin token de superadministrador (R12).
- [ ] **3.6** Verificar si el consolidado necesita índice compuesto en Firestore. Si lo necesita: crearlo con Firebase CLI usando un archivo con **solo los índices nuevos**, y **nunca `--force`**.

## Fase 4 — Pantalla (frontend)

- [ ] **4.1** `MonitorTrabajosService extends BaseService` con el método de consulta. Nunca `HttpClient` directo en componentes.
- [ ] **4.2** Módulo lazy-loaded `monitor-trabajos` colgado de `/superadmin`, protegido por `AdminGuard`.
- [ ] **4.3** Componente `resumen`: la tira de cifras (sanos, ausentes, con fallos, sin visibilidad).
- [ ] **4.4** Componente `lista-trabajos`: tabla con última corrida, cadencia esperada, resultado y si es observable (R16). Estado codificado en forma además de color (R15).
- [ ] **4.5** Componente `incidencias`: fallidas, parciales e interrumpidas, **con su motivo** — que es lo que hoy no existe.
- [ ] **4.6** Sello del instante de lectura, visible (R18).
- [ ] **4.7** Aplicar tokens de `openspec/specs/design-system/spec.md`. Verificar que no aparezca ninguno de los primaries prohibidos.
- [ ] **4.8** Revisar en pantalla angosta: la tabla desplaza dentro de su contenedor, el cuerpo de la página no se va de lado.
- [ ] **4.9** Agregar la entrada al menú de superadmin en `NavService`.

## Fase 5 — Cierre

- [ ] **5.1** Barrida de retención a 30 días para los documentos de latido, dentro del cron de limpieza existente. **`--dry-run` primero**, y verificar que no toca ningún otro `type` de `integration_audit`.
- [ ] **5.2** Verificación contra producción: que los ocho trabajos hoy ciegos aparezcan con evidencia real, y que un trabajo apagado a propósito se muestre `ausente` dentro de su tolerancia.
- [ ] **5.3** Registrar la decisión como D-XXX en `/specs/CONTRACT.md` con fecha, alcance y razón.
- [ ] **5.4** `openspec validate --changes --strict` en verde y archivar la propuesta.
