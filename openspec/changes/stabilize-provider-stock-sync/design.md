# Diseño: proyección de stock externo y publicación Shopify

## Context

El sync Osmosis agrupa `stock[]` por `storage_code` y hoy puede hacer `set` absoluto sobre `inventory`. Los storage OMS verificados son `1`, `1A`, `1B` y `51`, mapeados mediante `warehouses.osmosisStorageCode` (D-110). Fullpi usa el mismo ajuste genérico con `reason = fullpi_sync` y permanece sujeto a su gate.

El flow periódico hacia Shopify usa una ventana limitada del catálogo y filtra `onlyWithStock`; eso puede omitir productos viejos y el cambio de positivo a cero. También hay crones dinámicos cuyos handlers son no-op.

Topología productiva verificada para OH MY STORE el 2026-07-22:

| Flow activo | Frecuencia | Nodos que escriben fuera de inventario | Nodo de stock |
|---|---:|---|---|
| `cereza-products-to-shopify-a5156643` | 5 min | `katuq-product-upsert`, `shopify-product-upsert`, `shopify-pricelist-sync` | `shopify-inventory-adjust` |
| `katuq-web-to-shopify` | 10 min | `shopify-product-upsert` | `shopify-inventory-adjust` |

El primero procesa productos Cereza y el segundo excluye `integrations.osmosis` para cubrir productos no-Cereza. Hoy son los únicos flows encontrados con los nodos Shopify de producto, precio o inventario.

## Goals / Non-Goals

**Goals:**

- Evitar reaparición silenciosa de unidades comprometidas.
- Comparar el modelo propuesto antes de aplicarlo.
- Garantizar cobertura completa, cero incluido, al publicar Shopify.
- Hacer observables trabajo real, no-op y fallo.

**Non-Goals:**

- Hacer de Cereza la fuente universal de todos los tenants.
- Crear otra base de stock.
- Cambiar de inmediato la UI de inventarios.
- Activar providers sin configuración explícita.

## Decisions

### 1. El snapshot externo se conserva como evidencia, no como verdad operativa automática

Durante sombra se calcula:

```text
physicalObserved = cantidad informada por proveedor
localUnacknowledged = compromisos Katuq aún no reconocidos por ese proveedor
projectedAvailable = max(0, physicalObserved - localUnacknowledged)
```

`inventory.cantidad` no cambia por esta fórmula hasta superar el gate. La evidencia y comparación se guardan en `inventory_audit`, sin colección nueva.

### 2. Reconocimiento del proveedor evita doble resta

Un compromiso deja de ser “no reconocido” cuando existe evidencia externa suficiente según el adaptador: orden aceptada/identificada y snapshot posterior al watermark acordado. La fórmula y el saldo actual se comparan en sombra; ninguna heurística se activa sin muestra validada.

Alternativa descartada: restar todos los pedidos abiertos de cada snapshot. Puede descontar dos veces cuando el WMS ya reservó esas unidades.

### 3. Mapping declarativo y tenant-aware

Cada adaptador resuelve códigos externos contra configuración y `warehouses` de la misma empresa. Un código desconocido genera auditoría y no altera una bodega por defecto. Las diferencias quedan detrás del adapter, no en la UI.

### 4. Publicación Shopify aislada de catálogo y precios

Shopify recibe la cantidad operativa/proyectada aprobada por producto y ubicación mediante un camino exclusivo de stock. El barrido usa cursor estable, cubre el catálogo completo, incluye cero y mantiene checkpoint en configuración/estado existente. Un catch-up retoma desde el último punto confirmado.

La operación de publicación solo actualiza el nivel de inventario de la ubicación. No usa endpoints de creación/actualización de producto y no escribe precio, compare-at price, título, imágenes, variantes, colecciones ni estado comercial en Shopify.

No se reutiliza el recorrido completo de los dos flows mixtos ni se incrementan sus límites para “aprovecharlos”: hacerlo ejecutaría también producto, imágenes y, en el flow Cereza, listas de precios. Los flows actuales siguen con su contrato vigente; el publicador de stock se habilita y corta de manera independiente.

### 5. Resultado del cron con evidencia

Cada ejecución informa rango/cursor, leídos, elegibles, publicados, omitidos con causa, errores y siguiente cursor. Un handler no implementado no puede responder `success`; se marca bloqueado/no configurado. Un no-op legítimo requiere demostrar que se examinó el rango y no había cambios.

### 6. Inventario y catálogo se mantienen separados

El adaptador de stock puede leer la identidad/SKU del producto, pero no invoca el upsert de catálogo. Si no puede resolver un producto, registra el caso y omite la cantidad. La importación o sincronización de maestros, incluyendo precios, queda fuera de este cambio.

## Migration Plan

1. Congelar una copia auditable de los grafos/configuraciones actuales y agregar pruebas que detecten escrituras de producto o precio desde el camino nuevo.
2. Deshabilitar como candidatos de activación los handlers no-op y el draft inseguro; conservar evidencia.
3. Agregar cálculo sombra de provider stock sin cambiar `inventory.cantidad`.
4. Observar OMS durante ciclos completos, separando bodegas 1/1A/1B/51 y pedidos aceptados/no aceptados.
5. Validar con muestra manual que el reconocimiento no duplica reservas.
6. Canario de ingestión en una bodega OMS, con kill switch.
7. Implementar publicación Shopify de stock aislada, con cero y cursor; primero comparar payloads, luego una cohorte.
8. Solo después promover OMS. Almacén Bombas y otros tenants repiten sombra con sus providers reales.

## Rollback

Ingestión y publicación tienen banderas independientes por empresa/bodega. Ante divergencia, se apaga el escritor nuevo; se conserva `inventory.cantidad` anterior y el checkpoint para diagnóstico. No se ejecutan correcciones masivas automáticas.

## Risks / Trade-offs

- **Watermark incorrecto** → validación sombra por pedido y bodega antes de activar.
- **Catálogo grande** → cursor y lotes; nunca “primeras N páginas” como cobertura total.
- **Cero omitido históricamente** → dry-run de impacto y canario Shopify antes de publicar.
- **Cron duplicado por procesos PM2** → comprobar unicidad de scheduler antes de culpar o ajustar frecuencia.
- **Reutilización accidental de un sync de catálogo** → contract tests verifican que las únicas mutaciones externas sean niveles de inventario.

## Open Questions

Ninguna pregunta bloquea el modo sombra. El criterio exacto de reconocimiento por provider se aprueba con evidencia antes de su canario y se documenta en el cambio de implementación correspondiente.
