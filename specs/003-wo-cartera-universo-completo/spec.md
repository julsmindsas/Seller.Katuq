# Spec 003 — WO Cartera: universo de terceros completo

> Estado: **draft**
> Autor(es): Daniel + Claude
> Última actualización: 2026-05-21

## 1. Contexto / Por qué

Cliente **Harmony Lens** detectó que el reporte de cartera (CxC) en Katuq muestra **$1.860.000**, mientras World Office (fuente de verdad) muestra **$1.553.000.000** — pérdida del 99.88% del universo de cartera. La causa raíz es arquitectónica: `woBalancesSyncService` deriva el universo de terceros desde `accounting_documents`, que se sincroniza en modo **incremental** (mes anterior + mes en curso). Cualquier cliente o proveedor sin actividad reciente queda fuera del universo aunque deba millones.

## 2. Objetivo de negocio

Al ejecutar `worldoffice-balances-sync` para una empresa con cartera histórica, el `sum(saldoTotal where esCliente=true)` en `accounting_balances` debe estar a **±1%** del total que el cliente ve en World Office a la misma fecha de corte, sin importar la antigüedad de los documentos.

## 3. User stories

- Como **administrador de cartera de Harmony Lens** quiero **ver el total real de mis CxC (~$1.553M)** para **conciliar contra WO sin perder $1.551M en terceros ocultos**.
- Como **vendedor** quiero **filtrar mi cartera por mis terceros asignados** sin que falten clientes con saldo histórico.
- Como **operador SRE** quiero que **el job `worldoffice-balances-sync` sea independiente de la cadencia de `worldoffice-documents-sync`** para que un fallo o un cambio de modo en uno no afecte al otro.

## 4. Criterios de aceptación (EARS)

- THE system SHALL enumerar el universo de terceros desde World Office (no desde `accounting_documents`).
- WHEN se invoca `worldoffice-balances-sync` THE system SHALL incluir todos los terceros activos del tenant en WO, incluso aquellos sin documentos sincronizados en Firestore.
- WHEN un tercero existe en WO pero no tiene documentos en `accounting_documents` THE system SHALL persistir su saldo en `accounting_balances` con las métricas derivadas (vendedor, primera/última factura, etc.) como `null` en lugar de descartarlo.
- WHILE el sync está en curso THE system SHALL respetar rate limit de WO (500 req/s) usando concurrency configurada (default 8 saldos, 16 terceros).
- IF `worldOfficeProvider.listCustomers()` falla en una página THEN THE system SHALL reintentar con backoff antes de abortar, registrar el error en `accounting_sync_log` y continuar con las páginas siguientes.
- THE system SHALL sumar Comprobantes de Egreso (CE) además de Recibos de Caja (RC) en `montoPagadoHistorico` para que la métrica refleje pagos a proveedores (CxP) y no solo cobranzas (CxC).
- THE system SHALL persistir `docsCE` como contador de Comprobantes de Egreso por tercero.
- WHERE el flag opcional `useMassiveEndpoint: true` está activo THE system SHALL preferir un endpoint masivo de cartera si existe en el tenant (validar contra Swagger del cliente), en lugar de `listCustomers + consultarSaldoCliente`.

## 5. Requisitos no funcionales

### 5.1 Performance
- Para tenants ≤ 5.000 terceros: sync completa en ≤ 15 min con concurrency default.
- Para tenants > 5.000 terceros: documentar tiempo estimado en run log; no romper aunque tarde más.

### 5.2 Seguridad
- `apiToken` WO cifrado con `INTEGRATION_ENCRYPTION_KEY` (sin cambios respecto al actual).
- No loggear el token ni los saldos individuales en stdout — solo agregados.

### 5.3 Observabilidad
- Cada run agrega entrada en `accounting_sync_log` con: `terceros_enumerados`, `persistidos`, `con_saldo`, `errores`, `durationMs`, modo (`listCustomers` vs `fromDocs`).
- Log estructurado con `companyId` para filtrar por empresa.

### 5.5 Resiliencia
- Idempotente: re-ejecutar el job genera el mismo estado en `accounting_balances` (upsert por `${company}_${terceroId}`).
- Si `listCustomers` no está disponible (algún tenant lo bloquea), fallback a la estrategia actual (`fromDocs`) con warning en el log.

## 6. Out of scope (explícito)

- Aging real con `fechaVencimiento` por documento — sigue siendo prorrateado (queda como gap conocido).
- Persistir renglones individuales — spec aparte (Fase 4 del plan).
- Endpoint masivo `consultaCuentasPagar` que mencionó el cliente — se documenta como opcional, no se exige porque el Swagger público no lo confirma.
- Filtro automático por vendedor en el FE — feature del builder, no del backend WO.
- Fecha de corte parametrizable — sub-spec hija (003.1).

## 7. Dependencias

- `worldOfficeProvider.listCustomers()` ya existe (`services/accounting/providers/worldOfficeProvider.js:630`) — solo hay que paginar hasta agotar.
- `_woGetSaldoCliente` ya disponible — sin cambios.
- Builder FE consume `accounting_balances` vía `source-catalog.ts` que replica el schema — agregar `docs_ce` requiere actualizar ambos lados.

## 8. [NEEDS CLARIFICATION]

- [ ] ¿WO `listCustomers` retorna terceros INACTIVOS también? Si sí, ¿filtrar por estado activo o persistir todos? Hipótesis: filtrar `activo=true` para no inflar la colección.
- [ ] ¿Tiempo real de `listCustomers` para Harmony? Necesita dry-run para estimar.

## 9. Riesgos identificados

- **R-01**: Tenants con >50k terceros tardarán >1h en sincronizar. Mitigación: ejecutar fuera de horario laboral + monitoring del log.
- **R-02**: `accounting_balances` puede crecer 10x si antes solo tenía terceros con docs recientes. Mitigación: usar `skipZero: true` por default en cron para no persistir saldos en cero.
- **R-03**: Cambio de comportamiento es backward-incompatible: clientes que esperaban "solo terceros con actividad reciente" verán más datos. Mitigación: comunicar antes de deploy + dry-run primero.

## 10. Métricas de éxito post-launch

- Para Harmony Lens: `sum(saldoTotal where company='HARMONY LENS' AND esCliente=true)` ≈ **$1.553.000.000 ± 1%** (verificar contra reporte WO mismo día).
- Cero pérdida de terceros: `count(accounting_balances)` ≥ `count(distinct tercero.id from accounting_documents)`.
- `montoPagadoHistorico` para proveedores ≠ 0 cuando existan CE asociados.

---

**Checklist de revisión humana antes de aprobar:**
- [x] No hay nombres de librerías/frameworks en la spec.
- [x] Cada criterio EARS es testeable de forma binaria.
- [x] NFRs cubren al menos performance, seguridad, observabilidad.
- [x] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto (pendiente dry-run para R-01).
