# BigQuery — Katuq Analytics

Pipeline Firestore → BigQuery para reportes BI dinámicos (builder estilo Looker Studio).

## Recursos GCP

| Recurso | Nombre |
|---|---|
| Proyecto GCP | `katuq-new` |
| Bucket de backups | `gs://katuq-firestore-backups/` |
| Database Firestore secundaria (restore) | `analytics-restore` (multi-región `nam5`) |
| Dataset BigQuery | `katuq-new:katuq_analytics` (multi-región `US`) |
| Console BQ | https://console.cloud.google.com/bigquery?project=katuq-new |

## Tablas

60 tablas raw cargadas desde Firestore export (formato `DATASTORE_BACKUP`). Lista en `bi-collections.txt` (en working dir local).

## Vistas aplanadas (ver `views.sql`)

Las vistas resuelven la heterogeneidad de los STRUCT del schema raw (cada campo numérico viene como `STRUCT<integer, float, string, entity.valor>` porque distintos documentos tienen distintos tipos):

| Vista | Origen | Descripción |
|---|---|---|
| `v_orders` | `orders` | Pedidos con totales monetarios COALESCEados, fechas parseadas, canal/forma_pago/estado aplanados |
| `v_products` | `products` | Catálogo con precio, stock y disponibilidad aplanados |
| `v_inventory` | `inventory` | Stock por bodega — `bodega_id_norm` unifica `idBodega`/`bodegaId` |
| `v_clients` | `clients` | Clientes con `categoria.nombre` extraído del STRUCT |

## Pipeline de carga

```
[ZIP local 522 MB]
   ↓ unzip → 2.4 GB LevelDB
[backup-total-katuq-20260426/2026-04-26T04_05_58_53505/]
   ↓ gcloud storage cp -r
[gs://katuq-firestore-backups/2026-04-26-full/]
   ↓ gcloud firestore import (1.4M docs, ~10 min)
[Firestore database: analytics-restore]
   ↓ gcloud firestore export --collection-ids=<60 colecciones BI>
[gs://katuq-firestore-backups/2026-04-26-by-kind/all_namespaces/kind_X/]
   ↓ bq load --source_format=DATASTORE_BACKUP (60 jobs paralelos)
[katuq-new:katuq_analytics.<X>]
   ↓ CREATE VIEW (views.sql)
[v_orders, v_products, v_inventory, v_clients]
```

## Recargar las vistas

```bash
bq --project_id=katuq-new query --use_legacy_sql=false < bigquery/views.sql
```

## Uso desde el builder

El motor de reportes (backend `/v1/reports/query`) consume estas vistas. Catálogo de sources mapea cada vista a sus dimensiones/medidas en `services/reports/sources/*.source.js`.

## Pendiente

- [ ] Vistas para las otras 56 tablas (bajo demanda según las pida el builder)
- [ ] Particionamiento por fecha en `v_orders` (tabla materializada en lugar de view) cuando el volumen lo justifique
- [ ] Cron job para refrescar el export Firestore→BQ semanalmente
