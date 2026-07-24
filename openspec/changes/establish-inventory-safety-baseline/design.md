# Diseño: línea base y despliegue seguro de inventario

## Context

Katuq es multi-tenant y su inventario participa en Venta Asistida, pedidos, logística, Shopify, Cereza/Osmosis y Fullpi. La auditoría del 2026-07-22 confirmó tres clases de deuda: identidad duplicada producto–bodega, movimientos con contrato inconsistente y estados de integración que pueden aparentar éxito sin demostrar el efecto real.

El sistema ya dispone de `/v1/inventory/diagnostico`, `/v1/inventory/reparar` e `inventory_audit`. Esta propuesta usa únicamente la parte diagnóstica. El endpoint de reparación queda fuera y no se invoca durante la línea base.

## Goals / Non-Goals

**Goals:**

- Obtener una foto repetible y explicable por empresa.
- Separar “saldo observado” de “saldo certificado”.
- Detectar riesgos antes de tocar escritores.
- Habilitar cambios posteriores de forma reversible y tenant-aware.

**Non-Goals:**

- Resolver automáticamente qué duplicado histórico “gana”.
- Crear otra fuente de verdad.
- Ejecutar limpieza, backfill o cambio masivo.
- Introducir una capa de caché.

## Decisions

### 1. La identidad de comparación es empresa + producto normalizado + business code de bodega

Se construye un mapa referencia→docId desde `products.identificacion.referencia`. Cada `inventory.productoId` se normaliza con ese mapa y la bodega se valida contra `warehouses.idBodega`. El Firestore doc ID de una bodega nunca se acepta como `idBodega` canónico.

Alternativa descartada: sumar documentos crudos. Infla el consolidado cuando coexisten referencia y docId para el mismo producto.

### 2. Los duplicados con cantidades distintas son ambigüedad, no una suma ni una corrección

El reporte conserva los documentos origen y muestra el saldo que consume hoy el camino auditado. Si dos candidatos normalizados discrepan, el resultado se marca `ambiguous`; no se escoge silenciosamente máximo, mínimo o suma.

Alternativa descartada: generalizar el `MAX-WINS` temporal de D-026. Fue una defensa de lectura para un caso concreto, no una regla contable.

### 3. La conciliación usa cuatro evidencias separadas

Por producto–bodega se presentan: saldo observado en `inventory`, variación respaldada por `inventoryMovement`, efecto esperado por pedidos y estado del proveedor en `integrations.<provider>`. Una diferencia se reporta; no se compensa por suposición.

### 4. Se reutilizan capacidades existentes sin introducir escrituras en la línea base

El cálculo vive detrás del diagnóstico actual. La ejecución de Gate 0 es estrictamente read-only: sus metadatos, corte y resultados se guardan en el manifiesto del respaldo y en la evidencia OpenSpec, no en Firestore. Si más adelante se requiere auditoría persistida, será una operación separada y explícita que solo podrá escribir metadatos en `inventory_audit`. No se crea colección nueva ni endpoint `v2`. Las consultas siempre filtran por `company` o `companyId`, según el contrato de cada colección.

La colección `products` se consulta únicamente para resolver identidad, referencia y nombre. Esta fase no escribe productos ni toca estructuras de precio. Un producto faltante se reporta como inconsistencia; no se crea ni se corrige desde inventarios.

### 5. Todo cambio posterior inicia en sombra

Las banderas se guardan en configuración existente por empresa, con alcance opcional por bodega/canal, responsable y fecha de retiro. `shadow` calcula y compara; `canary` permite una cohorte; `active` amplía; `off` corta inmediatamente.

## Rollout gates

1. **Gate 0 — preparación:** export de infraestructura + respaldo lógico por empresa, manifiesto con conteos e integridad, restauración de muestra en ambiente aislado, flags `off`, corte probado y baseline capturado. Si hubo movimientos después del corte, el respaldo se repite justo antes de la ventana.
2. **Gate 1 — OMS sombra:** al menos un ciclo completo de cada cron relevante y tres conciliaciones diarias, sin escrituras de inventario por la nueva lógica.
3. **Gate 2 — OMS canario:** una bodega o cohorte pequeña y un escritor por vez.
4. **Gate 3 — OMS completo:** cero doble descuento, cero saldo sin movimiento, cero movimiento sin saldo y ningún despacho exitoso sin ID externo durante la ventana acordada.
5. **Gate 4 — Almacén Bombas:** repetir sombra y canario; capacidades Cereza/Shopify permanecen apagadas si no aplican.
6. **Gate 5 — otros comercios:** promoción individual, nunca global.

## Risks / Trade-offs

- **Historia incompleta produce falsos exactos** → niveles de confianza obligatorios y fecha mínima certificable.
- **Consultas costosas en OMS** → paginación, lotes y métricas de duración; sin escaneo cross-tenant.
- **Bandera olvidada** → dueño y fecha de retiro obligatorios, según Artículo XII.
- **Un canario altera producción** → un solo escritor por vez y rollback inmediato al camino anterior.

## Migration Plan

Esta propuesta no migra datos. Primero se despliega el cálculo de solo lectura, luego se captura evidencia. Cualquier reparación descubierta deberá tener su propio cambio OpenSpec, `--dry-run`, conteos antes/después, backup y aprobación explícita.

## Open Questions

Ninguna pregunta pendiente cambia esta fase: por definición observa y no corrige.
