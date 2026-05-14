# Spec 002.2 — Captura de errores en `nodeStates` de `flow_runs`

> Estado: **draft — in-review**
> Fecha: 2026-05-13
> Padre: [[002-flows-osmosis-shopify-marco]]
> Bloquea: 002.3, 002.4, 002.6 (sin esto cualquier debug es ciego)

## 1. Contexto / Por qué

Auditoría 2026-05-13 contra Firestore real:
- 200 runs muestreados de OH MY STORE: 145 `success` + 30 `partial` + 25 `failed` = **27.5% problemáticos**.
- De los `failed`, la mayoría tiene `errors: []` vacío.
- Verificación ejecutiva: corrí `flowEngine.startRun('shopify-orders-to-cereza-7e6ab5a3', ...)` con payload Shopify simulado. Resultado:
  - `trigger`: success
  - `mapper`: **failed** ← murió el flow
  - `product-resolver`, `persist`, `osmosis`: pending
- Inspeccioné `nodeStates.mapper`:
  ```json
  { "startedAt": "...", "attempt": 1, "status": "failed", "finishedAt": "..." }
  ```
- **`error` no existe**. Solo `status: 'failed'` y los timestamps.

→ Es imposible debuggear flows. Cualquier sub-spec posterior (fix bodega, migración inglés, resiliencia) requiere primero esta capacidad.

## 2. Objetivo de negocio

Cualquier nodo que falle deja un mensaje útil en Firestore para que developer u operador pueda diagnosticar sin re-ejecutar.

## 3. User stories

- **US-1.** Como **dev**, quiero ver `error.message` y `error.stack` en `nodeStates[id]` cuando inspecciono un run failed, para corregir sin tener que re-ejecutar.
- **US-2.** Como **operador**, quiero ver una lista plana de errores recientes con `flowId`, `nodeId`, `error.message`, fecha, para detectar patrones operativos.
- **US-3.** Como **agente IA debuggeando**, quiero que `flow_runs.errors[]` contenga al menos una entrada por cada nodo failed con timestamp y nodeId, para no leer toda la spec de nodos.

## 4. Criterios de aceptación EARS

- **AC-01.** WHEN un nodo lanza una excepción durante su ejecución, THE system SHALL guardar en `flow_runs.{runId}.nodeStates.{nodeId}.error` un objeto con: `code` (string), `message` (string), `stack` (string truncado a 2000 chars), `name` (constructor de la excepción), `timestamp` (ISO).
- **AC-02.** WHEN un nodo falla, THE system SHALL agregar también una entrada a `flow_runs.{runId}.errors[]` con: `nodeId`, `code`, `message` (sin stack), `timestamp`, `attempt`.
- **AC-03.** WHEN el error es retryable (`error.retryable: true`) y el flow tiene política de retry, THE system SHALL preservar errors de intentos anteriores en `nodeStates.{nodeId}.errorHistory[]` antes de retry.
- **AC-04.** IF la excepción no tiene `code`, THEN THE system SHALL asignar `code: 'UNKNOWN'`.
- **AC-05.** IF la excepción es un `TypeError` o `ReferenceError` (probable bug en template del mapper), THEN THE system SHALL incluir la línea/columna del stack si está disponible.
- **AC-06.** WHILE un nodo está en `status: 'failed'`, THE system SHALL siempre tener `error` no nulo en su nodeState.
- **AC-07.** THE system SHALL NO loguear datos sensibles (tokens, passwords, secrets) en el campo `error.message` ni `error.stack` — sanitizar via lista de keys conocidas (`webhookSecret`, `clientSecret`, `Authorization`).

## 5. Requisitos no funcionales

### 5.1 Performance
- La captura del error agrega ≤10ms al tiempo de ejecución del nodo.
- El stack truncado (max 2000 chars) evita docs Firestore obesos.

### 5.2 Observabilidad
- Console log estructurado: `[FlowEngine] Node failed: flowId={x}, nodeId={y}, code={z}, message={...}` para correlación con logs Cloud Functions.

### 5.3 Compat
- Runs viejos (sin `error`) siguen siendo legibles. Lectores deben tolerar ausencia.

### 5.4 Seguridad
- Sanitizar secrets antes de persistir.

## 6. Out of scope

- Alertas Slack / email cuando hay errores.
- Dashboard de errores agregados.
- Reintentos automáticos (eso es 002.3).
- Captura de errores transversales (cron scheduler, webhook handler) — solo nodos.

## 7. Implementación propuesta (no es código final, es la dirección)

### Ubicación del cambio
`functions/services/flows/flowEngine.js` (asumiendo que ahí vive el ejecutor de nodos). Verificar antes.

### Patrón
```js
async function _executeNodeSafe(node, ctx) {
  try {
    const result = await node.execute(ctx);
    nodeState.status = 'success';
    nodeState.finishedAt = new Date().toISOString();
    return result;
  } catch (e) {
    const sanitized = _sanitizeErrorForStorage(e);
    nodeState.error = {
      code: e.code || 'UNKNOWN',
      message: sanitized.message,
      stack: sanitized.stack?.substring(0, 2000),
      name: e.constructor.name,
      timestamp: new Date().toISOString(),
    };
    nodeState.status = 'failed';
    nodeState.finishedAt = new Date().toISOString();
    runErrors.push({
      nodeId: node.id,
      code: nodeState.error.code,
      message: nodeState.error.message,
      timestamp: nodeState.error.timestamp,
      attempt: nodeState.attempt,
    });
    console.error(`[FlowEngine] Node failed: flow=${ctx.flowId}, node=${node.id}, code=${nodeState.error.code}: ${nodeState.error.message}`);
    throw e;  // re-lanzar para que el flow reaccione
  }
}

function _sanitizeErrorForStorage(e) {
  const SENSITIVE = ['webhookSecret', 'clientSecret', 'Authorization', 'apiToken', 'apiKey', 'access_token'];
  const sanitize = (str) => {
    if (typeof str !== 'string') return str;
    let out = str;
    for (const k of SENSITIVE) {
      out = out.replace(new RegExp(`(${k}["'\\s:=]+)([^"'\\s,]+)`, 'gi'), '$1<REDACTED>');
    }
    return out;
  };
  return { message: sanitize(e.message), stack: sanitize(e.stack) };
}
```

## 8. Plan de validación

1. Después del cambio, ejecutar `flowEngine.startRun('shopify-orders-to-cereza-7e6ab5a3', ...)` con el mismo payload del runbook §2.
2. Inspeccionar `nodeStates.mapper.error` — debe estar lleno con `code`, `message`, `stack`.
3. Inspeccionar `flow_runs.{runId}.errors[]` — debe tener al menos 1 entrada con `nodeId: 'mapper'`.
4. Probar AC-07: forzar excepción con `Authorization: Bearer abc123` en el message — verificar que aparece como `<REDACTED>`.

## 9. Dependencias

- Acceso al código de `flowEngine.js`. Si no es ese el archivo, primero localizarlo (grep `executeNode` o `runNode`).

## 10. Métricas de éxito

- **M-01.** Post-deploy, 0% de runs `failed` con `errors: []` vacío (medido sobre 100 runs).
- **M-02.** Tiempo medio de diagnóstico de un flow failed reducido de "imposible" a <5min.
- **M-03.** Cero secrets filtrados en `error.message` o `error.stack` (auditoría manual de muestra).
