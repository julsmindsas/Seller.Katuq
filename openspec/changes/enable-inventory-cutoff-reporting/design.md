# Diseño: inventario por fecha de corte

## Context

El saldo actual por sí solo no permite conocer un saldo pasado. La reconstrucción requiere una cantidad ancla confiable y una secuencia completa de movimientos. `inventoryMovement` usa principalmente `fecha`; algunos lectores antiguos esperan `createdAt`. `inventoryProductHistory` no es el ledger vigente y no aporta historia OMS.

## Goals / Non-Goals

**Goals:**

- Una sola consulta para pantalla y exportación.
- Resultado reproducible para empresa, fecha y filtros iguales.
- Exactitud declarada, no supuesta.
- Soportar períodos certificados y mostrar límites históricos.

**Non-Goals:**

- Contabilidad de costos o valoración monetaria.
- Reparación automática desde el reporte.
- Prometer exactitud anterior a la cobertura.
- Leer otra empresa para completar faltantes.

## Decisions

### 1. Corte con zona horaria explícita

Una fecha sin hora significa fin del día (`23:59:59.999`) en `America/Bogota`. Una fecha con hora se interpreta en la zona declarada. El reporte siempre devuelve el instante UTC equivalente y la zona usada.

### 2. Reconstrucción desde ancla certificada

Para un corte anterior al ancla actual certificada:

```text
saldoCorte = saldoAncla - suma(deltas posteriores al corte y hasta el ancla)
```

También puede avanzarse desde un ancla histórica certificada. Se elige la ruta con cobertura demostrada. Sin ancla o con huecos, el resultado no es certificado.

Una exportación administrada normal de Firestore no basta como ancla: Google advierte que no es una foto exacta del inicio y puede incluir cambios ocurridos durante la operación. El gate aceptable es una exportación PITR con `snapshot-time`, que representa una vista consistente del instante indicado, seguida de verificación de operación completa y restore aislado. Requiere confirmar primero que PITR esté habilitado y que el instante solicitado esté dentro de su ventana. Fuente oficial: https://firebase.google.com/docs/firestore/manage-data/export-import

### 3. La certificación es por fila y global

Cada producto–bodega recibe `certified`, `ambiguous` o `incomplete`, con causas. El reporte global solo es certificado si todas las filas incluidas lo son. No se ocultan filas dudosas para mejorar el indicador.

### 4. Pantalla y exportación comparten el mismo servicio

Filtros, normalización, cálculo y confianza viven en una sola capa de dominio. Angular consume un servicio que extiende `BaseService`; no se hacen cálculos contables distintos en el componente.

### 5. Se extiende la superficie existente

Se reutiliza el módulo/endpoint de inventario o reportes que ya corresponda después de la auditoría de rutas. No se crea sufijo `v2`. La exportación incluye metadatos de certificación además de las cantidades.

El reporte puede leer referencia, nombre y precio únicamente como columnas informativas solicitadas, pero nunca escribe en `products` ni en configuraciones o listas de precios. La valoración monetaria sigue fuera de alcance.

## Output mínimo

- Empresa y fecha/hora de corte.
- Producto: docId, referencia y nombre.
- Bodega: business code y nombre.
- Cantidad al corte.
- Estado de confianza y causas.
- Ancla usada, rango de movimientos y fecha mínima certificable.
- Totales separados por confianza; nunca mezclar ambiguos en un “total certificado”.

## Migration Plan

1. Definir la fecha inicial certificable desde los gates del ledger.
2. Confirmar PITR y capturar una exportación con `snapshot-time` en una ventana aprobada.
3. Construir fixtures con saldo ancla y movimientos completos/incompletos.
4. Implementar consulta en modo interno y comparar contra reconstrucción manual.
5. Habilitar vista para OMS con etiqueta de confianza; todavía sin uso contable oficial.
6. Validar cortes conocidos con operación OMS.
7. Habilitar exportación usando el mismo servicio.
8. Repetir validación en Almacén Bombas antes de otros comercios.

## Rollback

La capacidad es de lectura. Si se detecta una diferencia, se apaga la vista/exportación nueva sin alterar saldos ni movimientos. Los archivos ya generados conservan sus metadatos de confianza para no aparentar certificación posterior.

## Risks / Trade-offs

- **Movimiento posterior sin fecha canónica** → fila incompleta, no deducción silenciosa.
- **Cantidad ancla ambigua por duplicados** → fila ambigua y bloqueo de certificación.
- **Exportaciones pesadas** → consulta paginada y generación por lotes; sin cache nuevo.
- **Usuario ignora la advertencia** → estado de confianza visible en pantalla y dentro del archivo.

## Open Questions

Ninguna para el contrato. La primera fecha certificable se obtiene de la evidencia del ledger, no se fija por conveniencia.
