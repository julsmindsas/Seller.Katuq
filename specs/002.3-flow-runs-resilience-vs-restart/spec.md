# Spec 002.3 — Resiliencia de `flow_runs` vs reinicios del backend (zombies)

> Estado: **draft — in-review**
> Fecha: 2026-05-13
> Padre: [[002-flows-osmosis-shopify-marco]]
> Bloqueado por: 002.2 (necesita captura de errores para no enmascarar zombies como otros fallos)

## 1. Contexto / Por qué

Causa raíz del "se escrachan los crones" (queja del usuario, ratificada con datos):
- 25/200 runs sample marcados como `failed` con código `BACKEND_RESTART`:
  ```json
  {
    "code": "BACKEND_RESTART",
    "message": "Run marcado como zombie por runCleanupService — el backend probablemente reinició mientras se ejecutaba.",
    "retryable": false
  }
  ```
- Cron `flowRunZombieCleanup` corre cada 30min y barre runs colgados.
- **Window de 30min entre crash y detección** = ventana ciega operativa enorme.
- `retryable: false` actual → no se reintenta automáticamente, hay que correrlo a mano.

El backend se recicla por: deploys, OOM, timeouts de Cloud Functions, scaling. Es **inevitable** que pase. La solución no es "evitar reinicios", es "tolerarlos".

## 2. Objetivo de negocio

Cero ventanas ciegas operativas mayores a 5 minutos. Reintento automático de runs zombies. Capacidad de reanudar desde checkpoint en lugar de re-ejecutar desde cero (importante para flows largos como `cereza-products-to-shopify` que itera sobre 8,000+ productos).

## 3. User stories

- **US-1.** Como **operador**, quiero que un crash del backend no me deje un pedido sin pushear a Cereza por más de 5 minutos.
- **US-2.** Como **dev**, quiero que un flow largo no tenga que re-procesar 8,000 productos solo porque el último crashed durante el item #7,500.
- **US-3.** Como **agente IA debugging**, quiero distinguir un fallo real del flow de un zombie por restart.

## 4. Criterios de aceptación EARS

### Detección
- **AC-01.** WHILE un `flow_run` está `status: 'running'`, THE system SHALL actualizar `lastHeartbeatAt` cada 30s desde el flowEngine.
- **AC-02.** IF `lastHeartbeatAt` es más antiguo que 3 minutos, THEN THE system SHALL marcar el run como `status: 'zombie'` (NO como `failed` directo).
- **AC-03.** THE system SHALL ejecutar el detector de zombies cada 1 minuto (no cada 30 — reducción de window).

### Reintento
- **AC-04.** WHEN un run pasa a `status: 'zombie'` por primera vez, THE system SHALL crear un nuevo run hijo con `parentRunId` apuntando al zombie y `attempt = 2`.
- **AC-05.** IF `attempt >= 3`, THEN THE system SHALL NO reintentar más y marcar como `status: 'failed'` con código `MAX_ATTEMPTS_EXCEEDED`.
- **AC-06.** WHEN se reintenta, THE system SHALL preservar `triggerData` original y `varsSnapshot` del run zombie.

### Checkpoint y reanudación (estructural)
- **AC-07.** WHEN un nodo termina con `status: 'success'`, THE system SHALL persistir su output en `nodeStates[id].outputs` y un `nodeStates[id].checkpointAt` con timestamp.
- **AC-08.** WHEN se reintenta un zombie, THE system SHALL reanudar desde el primer nodo con `status !== 'success'` (saltar nodos ya completados).
- **AC-09.** THE system SHALL respetar dependencias del DAG: no reanuda un nodo cuyas dependencias no estén `success` en el run actual o el padre.

### Idempotencia
- **AC-10.** WHEN un nodo se ejecuta como reanudación, THE system SHALL pasarle un flag `isResume: true` en `ctx`. Los nodos que tengan side effects externos (push a Osmosis, descuento de inventario) SHALL respetar este flag y NO duplicar la operación si ya se hizo (verificación por idempotency key persistida).

## 5. Requisitos no funcionales

### 5.1 Performance
- Heartbeat cada 30s agrega 1 write/30s por run activo. Con 100 runs concurrentes = 100/30 = 3.3 writes/s. Aceptable.
- Detección cada 1min en lugar de 30min implica 30x más invocaciones del cleanup. Aceptable porque la query `where('status','==','running').where('lastHeartbeatAt','<', cutoff)` es cheap.

### 5.2 Observabilidad
- Métrica nueva: `flow_runs_zombies_detected_per_hour`.
- Métrica nueva: `flow_runs_resumed_from_checkpoint`.
- Log estructurado al detectar zombie: `[FlowRunCleanup] Zombie detected: runId={x}, flowId={y}, attempt={n}, lastHeartbeatAge={s}s`.

### 5.3 Compat
- Runs viejos (sin `lastHeartbeatAt`, sin `checkpointAt`) siguen siendo procesados por el cleanup actual (a 30min). Política de transición: 7 días después de deploy, considerar safe eliminar el cleanup viejo.

## 6. Out of scope

- Migración a Pub/Sub para eliminar el problema en raíz (es opción C de la propuesta original, queda como deuda técnica futura).
- UI para que operadores vean zombies en tiempo real (eso es 002.2 + dashboard separado).
- Cambio del modelo de ejecución (sigue siendo in-memory en Cloud Functions).

## 7. Plan de implementación

### Fase 1 — Heartbeat
- Modificar `flowEngine.startRun` para arrancar timer de heartbeat:
  ```js
  const heartbeat = setInterval(async () => {
    await db.collection('flow_runs').doc(runId).update({ lastHeartbeatAt: FieldValue.serverTimestamp() });
  }, 30000);
  ```
- Limpiar el timer en cualquier exit path (success, partial, failed, exception).

### Fase 2 — Detector mejorado
- Reemplazar `flowRunZombieCleanup` actual:
  - Cron `*/1 * * * *` (cada 1min).
  - Query: `where('status', '==', 'running').where('lastHeartbeatAt', '<', cutoff_3min)`.
  - Para cada zombie: marcar `status: 'zombie'`, NO crear `errors[].push({code: BACKEND_RESTART})` todavía. Eso es trabajo del retry handler.

### Fase 3 — Retry handler
- Nuevo cron `*/1 * * * *` (puede ser el mismo del detector, en pasada 2).
- Query: `where('status', '==', 'zombie').where('attempt', '<', 3)`.
- Para cada zombie:
  - Crear nuevo `flow_run` con `parentRunId`, `attempt + 1`.
  - Copiar `triggerData`, `varsSnapshot`, `nodeStates` (los `success` ya están).
  - Llamar `flowEngine.resumeRun(newRunId)` que reanuda desde primer nodo no-success.

### Fase 4 — Checkpoint
- Modificar handler de cada nodo en flowEngine para persistir `outputs` + `checkpointAt` después de cada success.
- `flowEngine.resumeRun` lee nodeStates, encuentra el primer nodo no-success que tenga todas sus deps en success, ejecuta desde ahí.
- Pasar `ctx.isResume = true` a cada nodo. Los nodos con side effects externos (osmosis-order-create, katuq-inventory-adjust) deben verificar idempotency key.

### Fase 5 — Validación
- Test: ejecutar `flowEngine.startRun` con un flow de 5 nodos. Mid-run, matar el process (simular crash).
- Verificar:
  1. En <5 min, el run aparece como zombie.
  2. En <1 min después, hay un retry run con `attempt: 2` ejecutándose.
  3. El retry run NO re-ejecuta los nodos que ya estaban en success.
  4. Total time end-to-end ≤ 6 min desde crash a recuperación.

## 8. Dependencias

- **002.2** (captura errores) ya implementada para que el detector no confunda zombies con otros tipos de fallo.
- Acceso al código de `services/flows/flowEngine.js` y al cron `flowRunZombieCleanup` (verificar ubicación con grep).

## 9. Riesgos

- **R-01.** Si dos detectores corren en paralelo (race), el mismo zombie puede dispararse 2 veces. Mitigación: claim atómico via transacción (`runCheckedUpdate({status:'zombie'})` solo si `status:'running'`).
- **R-02.** Reanudación desde checkpoint puede fallar si el side effect del nodo previo NO fue idempotente y se ejecutó parcialmente (ej. push a Osmosis devolvió 200 pero el handler murió antes de marcar success). Necesita validación caso a caso por tipo de nodo.
- **R-03.** Nodos custom sin soporte de `isResume` pueden re-ejecutar side effects. Política: durante migración, marcar nodos NO-resumibles con flag `nodeSpec.resumable: false` y para esos siempre re-ejecutar desde cero.
- **R-04.** Cron cada 1min puede chocar con quotas de Cloud Functions. Verificar.

## 10. Métricas de éxito

- **M-01.** Tiempo medio "crash → recuperación" reducido de 30+ min a ≤ 5 min.
- **M-02.** % de runs que terminan en `success` (no zombie) sube de 72.5% actual a ≥ 95%.
- **M-03.** Cero side effects duplicados (push de orden duplicado, descuento de stock doble) en 30 días post-deploy. Medido via auditoría de `inventory_movements` y `osmosis_orders` push count.
- **M-04.** Ningún operador reporta "el cron se trabó" en 30 días.
