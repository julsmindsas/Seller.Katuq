# `/v1/reports` — backend stubs

Estos archivos van al backend Express (repo `katuq_admin_back_firebase/functions/`). Los dejo aquí porque no estoy tocando ese repo desde acá.

## Estructura sugerida

```
katuq_admin_back_firebase/functions/
  ├─ index.js                            (registrar el router)
  ├─ routers/
  │   └─ reports.router.js
  └─ services/
      └─ reports/
          ├─ engine/
          │   ├─ bigquery.engine.js      (genera SQL desde spec)
          │   └─ spec-validator.js       (whitelist contra catálogo)
          ├─ sources/
          │   ├─ index.js                (registry)
          │   ├─ orders.source.js
          │   ├─ products.source.js
          │   ├─ inventory.source.js
          │   └─ clients.source.js
          └─ persistence/
              └─ reports.repository.js   (CRUD Firestore)
```

## Dependencias adicionales

```bash
npm install @google-cloud/bigquery
```

## Variables de entorno

```
BQ_PROJECT=katuq-new
BQ_DATASET=katuq_analytics
```

## Wiring en `index.js`

```js
const reportsRouter = require('./routers/reports.router');
app.use('/v1/reports', reportsRouter);
```

## Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/v1/reports/sources` | Catálogo de fuentes (espejo del frontend) |
| POST | `/v1/reports/query` | Ejecuta una query — body = `ReportSpec` |
| GET | `/v1/reports/list` | Lista reportes guardados del tenant actual |
| GET | `/v1/reports/:id` | Recupera reporte por id |
| POST | `/v1/reports` | Crea reporte (body = `SavedReport`) |
| PUT | `/v1/reports/:id` | Actualiza reporte |
| DELETE | `/v1/reports/:id` | Elimina reporte |

## Multi-tenant

Todas las queries añaden `WHERE company = @company` (o equivalente por source). El `company` se toma del header `company` que el interceptor del frontend envía en cada request — **NO** del body.

## Whitelist de seguridad

El `spec-validator.js` rechaza:
- `source` no registrado en el catálogo
- `dimension`/`measure` no presentes en el catálogo del source
- `filter.field` no whitelisted
- `agg` no permitida para esa medida
- `granularity` no soportada por la dimensión

Esto evita inyección SQL: el engine **NUNCA** concatena strings del request — siempre interpola contra el catálogo.

## Costos BQ

Cada query escanea las vistas `v_*`. Limitar:
- `limit` máximo 10,000 (override en spec-validator)
- Si el spec no incluye filtro de fecha → forzar `date_trunc(fecha_dia, MONTH) >= date_sub(current_date(), interval 12 month)` automáticamente
- Logs de cada query a `reports_audit` collection con `companyId`, `bytesProcessed`, `durationMs`
