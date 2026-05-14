# Spec 002.9 — Catchup de crones de flow al boot del backend (EC2/PM2)

> Estado: **draft — in-review**
> Fecha: 2026-05-13
> Padre: [[002-flows-osmosis-shopify-marco]]
> Goal: que un cron de flow programado en `/flows` corra realmente cada N minutos sin gaps cuando PM2 reinicia el proceso.

## 1. Por qué

Diagnóstico operativo (2026-05-13) sobre `cereza-orders-status-pull-rdoavk0b` (cron `*/30`):
- Frecuencia esperada: cada 30 min.
- Frecuencia real observada en últimas 30h: gaps de 2h, 3h, 5h, 6h.
- Tasa éxito **cuando corre**: 96/100. **Cuando NO corre**: el tick se pierde para siempre.

**Causa raíz** (verificada — backend en EC2 + PM2 con `autorestart: true`, NO Cloud Functions):
1. Proceso muere (deploy, OOM tras `max_memory_restart: 8G`, crash).
2. PM2 lo levanta de nuevo en ~5-30s.
3. Boot completo (cargar nodos, init crones, sync bindings) tarda otros ~10-60s.
4. **Durante ~30-90s ningún `node-cron` job está registrado** en memoria.
5. Si un cron tenía que disparar en esa ventana, se pierde sin recuperación.

`flow_trigger_bindings` no guarda historial de tics — el dispatcher no sabe cuándo fue el último disparo, así que al boot empieza desde cero como si recién se hubiera registrado el cron.

## 2. Objetivo de negocio

Un cron `*/30` configurado en `/flows` corre realmente cada 30 minutos en producción, **incluyendo** ventanas donde el backend se reinició. Cero ticks perdidos.

## 3. Criterios EARS

- **AC-01.** WHEN el dispatcher (`initFlowCronDispatcherJob`) dispara un cron de flow, THE system SHALL persistir `lastTriggeredAt` (ISO timestamp) en el doc del binding antes de invocar `flowEngine.startRun`.
- **AC-02.** THE binding doc SHALL incluir además `lastDispatchSource` (`'normal' | 'catchup'`) y `totalDispatches` (counter).
- **AC-03.** WHEN el backend arranca, THE system SHALL ejecutar `_catchupMissedTicks()` que recorre todos los bindings `kind='cron', status='active'` y para cada uno calcula el "next expected tick" desde `lastTriggeredAt` con base en `cronExpression`.
- **AC-04.** IF el `next expected tick` calculado es anterior a `now`, THEN THE system SHALL disparar UNA SOLA ejecución catchup (no múltiples — solo recuperar el último tick perdido) con `triggeredBy: 'catchup-after-restart'`.
- **AC-05.** WHEN se dispara un catchup, THE system SHALL marcar `lastDispatchSource: 'catchup'` y registrar en log.
- **AC-06.** THE system SHALL exponer endpoint `GET /v1/health/crons` (autenticado) que devuelva por cada binding cron activo:
  - `flowId`, `cronExpression`, `lastTriggeredAt`, `expectedNextTick`, `secondsLate` (positive si está atrasado), `totalDispatches`.
- **AC-07.** IF `lastTriggeredAt` está más de `2 * intervalo_esperado` atrás (ej. cron `*/30` y `lastTriggeredAt` hace > 60min), THEN THE system SHALL marcar `health: 'stale'` en el endpoint y emitir warn en logs.
- **AC-08.** WHILE el dispatcher está sincronizando bindings (cada 30s), THE system SHALL NO disparar más de UN catchup por binding por ciclo.

## 4. Out of scope

- Catchup de TODOS los ticks perdidos (si el cron fue `*/5` y estuvo down 2h, NO disparar 24 veces — solo una). Comportamiento deliberado: catchup es para no perder UNA corrida, no para procesar backlog masivo.
- Health UI Angular — solo endpoint REST. Frontend puede consumirlo.
- Detectar y prevenir crashes del proceso (eso es 002.3 / monitoring infra separado).

## 5. Plan

1. Modificar `cronService.initFlowCronDispatcherJob` callback:
   - Antes de `flowEngine.startRun`, hacer `binding.update({ lastTriggeredAt: serverTimestamp(), totalDispatches: increment(1), lastDispatchSource: 'normal' })`.
2. Crear función `cronService._catchupMissedTicks()`:
   - Lee `flow_trigger_bindings.where('kind','==','cron').where('status','==','active')`.
   - Para cada binding: calcula `nextExpected = cronParser.parseExpression(cronExpression).prev()` desde `lastTriggeredAt`.
   - Si `nextExpected < now AND nextExpected > lastTriggeredAt`, dispara catchup.
3. Llamar `_catchupMissedTicks` desde el `init` de `cronService` después de `loadDynamicJobsFromFirestore`.
4. Crear `controllers/cronHealthController.js` + ruta `GET /v1/health/crons`.
5. Validar contra el binding real `cereza-orders-status-pull-rdoavk0b`.

## 6. Riesgos

- **R-01.** Si `cron-parser` no está instalado, hay que validar parsing manual. Mitigación: ya está como dep (lo usa `node-cron`).
- **R-02.** Catchup masivo si la diferencia es muy grande (ej. backend down 2 días) → con AC-04 solo dispara una. Bien.
- **R-03.** Race entre catchup y siguiente tick natural si el restart fue justo antes del tick natural → resultado: dos ejecuciones cercanas. Mitigación: aceptable (mejor 2 ejecuciones que 0).
- **R-04.** Si `lastTriggeredAt` no existe para bindings legacy, asumir `now` (no disparar catchup en el primer boot post-deploy).

## 7. Métricas de éxito

- M-01. Tras deploy: en 7 días, gap máximo entre ticks reales y esperados ≤ 1 ciclo (ej. */30 → max 60min).
- M-02. Endpoint `/v1/health/crons` muestra `health: 'ok'` para los 4 bindings activos en condiciones normales.
- M-03. `cereza-orders-status-pull` tiene tasa de ejecución ≥ 95% en 24h (medido como ticks reales / ticks esperados).
