# Optimización del Dashboard Katuq con BigQuery

> **Fecha:** 2026-01-14
> **Estado:** Pendiente de implementación
> **Prioridad:** Alta

---

## Problema Actual

El dashboard actual consulta directamente Firestore, lo que causa:
- **Latencia alta:** 3-10 segundos por carga
- **Carga excesiva en BD:** Múltiples queries por cada request
- **Mala experiencia de usuario:** Esperas prolongadas al cargar métricas

---

## Solución Propuesta

Utilizar **BigQuery Materialized Views** para pre-calcular los KPIs del dashboard.

### Arquitectura

```
ACTUAL (Lento):
Angular → Express → Firestore (N queries) → Respuesta 3-10s

OPTIMIZADO:
Angular → Express → BigQuery Materialized Views → Respuesta < 1s
                           ▲
                    Auto-refresh cada 5 min
                           │
                    Firestore → Extension → BigQuery Raw
```

### Configuración Existente

| Componente | Valor |
|------------|-------|
| Dataset BigQuery | `firestore_export` |
| Tabla de pedidos | `orders_raw_changelog` |
| Vista automática | `orders_raw_latest` |
| Extensión | Firebase "Stream Firestore to BigQuery" |

---

## SQL para Crear Materialized Views

### 1. Vista Principal: KPIs Diarios

```sql
-- =====================================================
-- MATERIALIZED VIEW: dashboard_kpis_daily
-- Propósito: KPIs pre-calculados por día y empresa
-- Refresh: Automático cada 5 minutos
-- =====================================================

CREATE MATERIALIZED VIEW `firestore_export.dashboard_kpis_daily`
OPTIONS (
  enable_refresh = true,
  refresh_interval_minutes = 5,
  max_staleness = INTERVAL "10" MINUTE
)
AS
SELECT
  -- Dimensiones
  DATE(TIMESTAMP(JSON_EXTRACT_SCALAR(data, '$.fechaCreacion'))) AS fecha,
  JSON_EXTRACT_SCALAR(data, '$.company') AS company,

  -- KPIs de Pedidos
  COUNT(*) AS total_pedidos,
  COUNTIF(JSON_EXTRACT_SCALAR(data, '$.estadoPago') = 'Aprobado') AS pedidos_aprobados,
  COUNTIF(JSON_EXTRACT_SCALAR(data, '$.estadoPago') = 'Pendiente') AS pedidos_pendientes,
  COUNTIF(JSON_EXTRACT_SCALAR(data, '$.estadoPago') = 'Rechazado') AS pedidos_rechazados,

  -- KPIs de Ventas (solo aprobados)
  SUM(
    CASE WHEN JSON_EXTRACT_SCALAR(data, '$.estadoPago') = 'Aprobado'
    THEN CAST(JSON_EXTRACT_SCALAR(data, '$.subtotal') AS FLOAT64)
    ELSE 0 END
  ) AS ventas_totales,

  -- Ticket Promedio
  AVG(
    CASE WHEN JSON_EXTRACT_SCALAR(data, '$.estadoPago') = 'Aprobado'
    THEN CAST(JSON_EXTRACT_SCALAR(data, '$.subtotal') AS FLOAT64)
    END
  ) AS ticket_promedio,

  -- Descuentos
  SUM(CAST(JSON_EXTRACT_SCALAR(data, '$.totalDescuento') AS FLOAT64)) AS total_descuentos

FROM `firestore_export.orders_raw_changelog`
WHERE operation IN ('CREATE', 'UPDATE', 'IMPORT')
  AND JSON_EXTRACT_SCALAR(data, '$.fechaCreacion') IS NOT NULL
  -- Últimos 6 meses para mantener la view liviana
  AND TIMESTAMP(JSON_EXTRACT_SCALAR(data, '$.fechaCreacion')) >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 180 DAY)
GROUP BY fecha, company;
```

### 2. Vista: Ventas por Canal

```sql
-- =====================================================
-- MATERIALIZED VIEW: ventas_por_canal
-- Propósito: Ticket promedio y ventas por canal de venta
-- =====================================================

CREATE MATERIALIZED VIEW `firestore_export.ventas_por_canal`
OPTIONS (
  enable_refresh = true,
  refresh_interval_minutes = 10
)
AS
SELECT
  DATE(TIMESTAMP(JSON_EXTRACT_SCALAR(data, '$.fechaCreacion'))) AS fecha,
  JSON_EXTRACT_SCALAR(data, '$.company') AS company,
  COALESCE(JSON_EXTRACT_SCALAR(data, '$.canal'), 'Web') AS canal,

  COUNT(*) AS total_pedidos,
  COUNTIF(JSON_EXTRACT_SCALAR(data, '$.estadoPago') = 'Aprobado') AS pedidos_aprobados,

  SUM(
    CASE WHEN JSON_EXTRACT_SCALAR(data, '$.estadoPago') = 'Aprobado'
    THEN CAST(JSON_EXTRACT_SCALAR(data, '$.subtotal') AS FLOAT64)
    ELSE 0 END
  ) AS ventas,

  AVG(
    CASE WHEN JSON_EXTRACT_SCALAR(data, '$.estadoPago') = 'Aprobado'
    THEN CAST(JSON_EXTRACT_SCALAR(data, '$.subtotal') AS FLOAT64)
    END
  ) AS ticket_promedio

FROM `firestore_export.orders_raw_changelog`
WHERE operation IN ('CREATE', 'UPDATE', 'IMPORT')
  AND JSON_EXTRACT_SCALAR(data, '$.estadoPago') IS NOT NULL
  AND TIMESTAMP(JSON_EXTRACT_SCALAR(data, '$.fechaCreacion')) >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 180 DAY)
GROUP BY fecha, company, canal;
```

### 3. Vista: Ventas por Vendedor

```sql
-- =====================================================
-- MATERIALIZED VIEW: ventas_por_vendedor
-- Propósito: Performance de vendedores
-- =====================================================

CREATE MATERIALIZED VIEW `firestore_export.ventas_por_vendedor`
OPTIONS (
  enable_refresh = true,
  refresh_interval_minutes = 15
)
AS
SELECT
  DATE(TIMESTAMP(JSON_EXTRACT_SCALAR(data, '$.fechaCreacion'))) AS fecha,
  JSON_EXTRACT_SCALAR(data, '$.company') AS company,
  COALESCE(
    JSON_EXTRACT_SCALAR(data, '$.asesorAsignado.email'),
    JSON_EXTRACT_SCALAR(data, '$.asesorAsignado'),
    'Sin asignar'
  ) AS vendedor,

  COUNT(*) AS total_pedidos,

  SUM(
    CASE WHEN JSON_EXTRACT_SCALAR(data, '$.estadoPago') = 'Aprobado'
    THEN CAST(JSON_EXTRACT_SCALAR(data, '$.subtotal') AS FLOAT64)
    ELSE 0 END
  ) AS ventas,

  AVG(
    CASE WHEN JSON_EXTRACT_SCALAR(data, '$.estadoPago') = 'Aprobado'
    THEN CAST(JSON_EXTRACT_SCALAR(data, '$.subtotal') AS FLOAT64)
    END
  ) AS ticket_promedio

FROM `firestore_export.orders_raw_changelog`
WHERE operation IN ('CREATE', 'UPDATE', 'IMPORT')
  AND TIMESTAMP(JSON_EXTRACT_SCALAR(data, '$.fechaCreacion')) >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 180 DAY)
GROUP BY fecha, company, vendedor;
```

### 4. Vista: Métodos de Pago

```sql
-- =====================================================
-- MATERIALIZED VIEW: metodos_pago_stats
-- Propósito: Distribución de métodos de pago
-- =====================================================

CREATE MATERIALIZED VIEW `firestore_export.metodos_pago_stats`
OPTIONS (
  enable_refresh = true,
  refresh_interval_minutes = 15
)
AS
SELECT
  DATE(TIMESTAMP(JSON_EXTRACT_SCALAR(data, '$.fechaCreacion'))) AS fecha,
  JSON_EXTRACT_SCALAR(data, '$.company') AS company,
  COALESCE(JSON_EXTRACT_SCALAR(data, '$.formaDePago'), 'No especificado') AS metodo_pago,

  COUNT(*) AS cantidad,

  SUM(CAST(JSON_EXTRACT_SCALAR(data, '$.subtotal') AS FLOAT64)) AS monto_total

FROM `firestore_export.orders_raw_changelog`
WHERE operation IN ('CREATE', 'UPDATE', 'IMPORT')
  AND JSON_EXTRACT_SCALAR(data, '$.estadoPago') = 'Aprobado'
  AND TIMESTAMP(JSON_EXTRACT_SCALAR(data, '$.fechaCreacion')) >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 180 DAY)
GROUP BY fecha, company, metodo_pago;
```

---

## Endpoint Express para BigQuery

Crear archivo: `katuq_admin_back_firebase/functions/controllers/dashboard-bigquery.js`

```javascript
const { BigQuery } = require('@google-cloud/bigquery');

const bigquery = new BigQuery();
const DATASET = 'firestore_export';

/**
 * GET /v1/analytics/dashboard-core
 * Endpoint optimizado usando Materialized Views
 */
async function getDashboardCore(req, res) {
  try {
    const { company, fechaInicio, fechaFin } = req.query;

    if (!company || !fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Parámetros requeridos: company, fechaInicio, fechaFin' });
    }

    console.log(`📊 BigQuery Dashboard Core: ${company} | ${fechaInicio} - ${fechaFin}`);
    const startTime = Date.now();

    // Query a Materialized View (sub-second response)
    const query = `
      WITH kpis AS (
        SELECT
          SUM(total_pedidos) AS totalPedidos,
          SUM(pedidos_aprobados) AS pedidosAprobados,
          SUM(ventas_totales) AS ventasTotales,
          AVG(ticket_promedio) AS ticketPromedio
        FROM \`${DATASET}.dashboard_kpis_daily\`
        WHERE company = @company
          AND fecha BETWEEN @fechaInicio AND @fechaFin
      ),
      ventas_periodo AS (
        SELECT
          fecha,
          SUM(ventas_totales) AS ventas,
          SUM(total_pedidos) AS pedidos
        FROM \`${DATASET}.dashboard_kpis_daily\`
        WHERE company = @company
          AND fecha BETWEEN @fechaInicio AND @fechaFin
        GROUP BY fecha
        ORDER BY fecha
      ),
      canales AS (
        SELECT
          canal,
          SUM(ventas) AS ventas,
          SUM(pedidos_aprobados) AS pedidos,
          AVG(ticket_promedio) AS ticketPromedio
        FROM \`${DATASET}.ventas_por_canal\`
        WHERE company = @company
          AND fecha BETWEEN @fechaInicio AND @fechaFin
        GROUP BY canal
        ORDER BY ventas DESC
      ),
      vendedores AS (
        SELECT
          vendedor,
          SUM(ventas) AS ventas,
          SUM(total_pedidos) AS pedidos,
          AVG(ticket_promedio) AS ticketPromedio
        FROM \`${DATASET}.ventas_por_vendedor\`
        WHERE company = @company
          AND fecha BETWEEN @fechaInicio AND @fechaFin
        GROUP BY vendedor
        ORDER BY ventas DESC
        LIMIT 10
      )
      SELECT
        (SELECT TO_JSON_STRING(kpis) FROM kpis) AS kpis,
        (SELECT TO_JSON_STRING(ARRAY_AGG(STRUCT(fecha, ventas, pedidos))) FROM ventas_periodo) AS ventasPorPeriodo,
        (SELECT TO_JSON_STRING(ARRAY_AGG(STRUCT(canal, ventas, pedidos, ticketPromedio))) FROM canales) AS ticketPromedioPorCanal,
        (SELECT TO_JSON_STRING(ARRAY_AGG(STRUCT(vendedor, ventas, pedidos, ticketPromedio))) FROM vendedores) AS ticketPromedioPorVendedor
    `;

    const [rows] = await bigquery.query({
      query,
      params: { company, fechaInicio, fechaFin },
      location: 'US', // Ajustar según tu región
    });

    const result = rows[0];
    const queryTime = Date.now() - startTime;

    console.log(`✅ BigQuery response in ${queryTime}ms`);

    res.json({
      periodo: { inicio: fechaInicio, fin: fechaFin },
      kpis: JSON.parse(result.kpis || '{}'),
      ventasPorPeriodo: JSON.parse(result.ventasPorPeriodo || '[]'),
      ticketPromedioPorCanal: JSON.parse(result.ticketPromedioPorCanal || '[]'),
      ticketPromedioPorVendedor: JSON.parse(result.ticketPromedioPorVendedor || '[]'),
      _meta: {
        source: 'bigquery_materialized_views',
        queryTimeMs: queryTime
      }
    });

  } catch (error) {
    console.error('❌ BigQuery Error:', error);
    res.status(500).json({
      error: 'Error consultando BigQuery',
      details: error.message
    });
  }
}

/**
 * GET /v1/analytics/dashboard-details
 * Datos detallados: top productos, categorías, métodos de pago
 */
async function getDashboardDetails(req, res) {
  try {
    const { company, fechaInicio, fechaFin } = req.query;

    if (!company || !fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Parámetros requeridos: company, fechaInicio, fechaFin' });
    }

    console.log(`📊 BigQuery Dashboard Details: ${company} | ${fechaInicio} - ${fechaFin}`);
    const startTime = Date.now();

    const query = `
      WITH metodos_pago AS (
        SELECT
          metodo_pago AS metodo,
          SUM(cantidad) AS cantidad,
          SUM(monto_total) AS monto
        FROM \`${DATASET}.metodos_pago_stats\`
        WHERE company = @company
          AND fecha BETWEEN @fechaInicio AND @fechaFin
        GROUP BY metodo_pago
        ORDER BY cantidad DESC
      )
      SELECT
        (SELECT TO_JSON_STRING(ARRAY_AGG(STRUCT(metodo, cantidad, monto))) FROM metodos_pago) AS metodosPago
    `;

    const [rows] = await bigquery.query({
      query,
      params: { company, fechaInicio, fechaFin },
      location: 'US',
    });

    const result = rows[0];
    const queryTime = Date.now() - startTime;

    console.log(`✅ BigQuery Details response in ${queryTime}ms`);

    res.json({
      metodosPago: JSON.parse(result.metodosPago || '[]'),
      _meta: {
        source: 'bigquery_materialized_views',
        queryTimeMs: queryTime
      }
    });

  } catch (error) {
    console.error('❌ BigQuery Error:', error);
    res.status(500).json({
      error: 'Error consultando BigQuery',
      details: error.message
    });
  }
}

module.exports = { getDashboardCore, getDashboardDetails };
```

---

## Dependencia Requerida

Agregar al `package.json` del backend:

```bash
npm install @google-cloud/bigquery
```

---

## Configuración de Rutas

Agregar en el router de Express:

```javascript
const { getDashboardCore, getDashboardDetails } = require('./controllers/dashboard-bigquery');

// Rutas BigQuery optimizadas
router.get('/v1/analytics/dashboard-core-bq', getDashboardCore);
router.get('/v1/analytics/dashboard-details-bq', getDashboardDetails);
```

---

## Resultados Esperados

| Métrica | Antes (Firestore) | Después (BigQuery MV) |
|---------|-------------------|----------------------|
| **Latencia** | 3-10 segundos | **< 1 segundo** |
| **Carga BD** | N queries por request | 1 query optimizada |
| **Costo** | Alto (lecturas Firestore) | Bajo (~$5-20/mes) |
| **Datos** | Tiempo real | 5 min de delay (aceptable) |

---

## Costos Estimados BigQuery

| Componente | Costo Mensual |
|------------|---------------|
| Streaming inserts (extensión) | ~$10-30 |
| Materialized Views refresh | ~$5-15 |
| Queries | ~$5-20 |
| **Total estimado** | **~$20-65/mes** |

---

## Checklist de Implementación

- [ ] Ejecutar SQL de `dashboard_kpis_daily` en BigQuery Console
- [ ] Ejecutar SQL de `ventas_por_canal` en BigQuery Console
- [ ] Ejecutar SQL de `ventas_por_vendedor` en BigQuery Console
- [ ] Ejecutar SQL de `metodos_pago_stats` en BigQuery Console
- [ ] Verificar que las views se crearon correctamente
- [ ] Instalar `@google-cloud/bigquery` en el backend
- [ ] Crear archivo `dashboard-bigquery.js` con los endpoints
- [ ] Agregar rutas al router de Express
- [ ] Probar endpoints con Postman/curl
- [ ] Actualizar el frontend `AnalyticsService` para usar nuevos endpoints
- [ ] Monitorear performance y ajustar refresh intervals si es necesario

---

## Opciones Futuras de Optimización

### 1. BigQuery BI Engine (Latencia < 100ms)
- Costo adicional: ~$40/mes (1GB reservación)
- Habilita caché in-memory para queries frecuentes

### 2. Tinybird (APIs Real-Time)
- Alternativa para latencia < 50ms
- Ideal si se requiere alta concurrencia (miles de usuarios)
- Costo: $0-400/mes dependiendo del plan

### 3. BigQuery Continuous Queries (Preview)
- Procesamiento en streaming real-time
- Integración con Vertex AI/Gemini para ML
- Disponible en preview público 2024/2025

---

## Referencias

- [BigQuery Materialized Views](https://cloud.google.com/bigquery/docs/materialized-views-intro)
- [BigQuery BI Engine](https://cloud.google.com/bigquery/docs/bi-engine-intro)
- [Stream Firestore to BigQuery Extension](https://extensions.dev/extensions/firebase/firestore-bigquery-export)
- [BigQuery Continuous Queries](https://cloud.google.com/blog/products/data-analytics/bigquery-continuous-queries-makes-data-analysis-real-time)
- [Tinybird Real-Time Analytics](https://www.tinybird.co)
