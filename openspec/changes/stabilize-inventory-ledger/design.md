# Diseño: saldo operativo y ledger canónico

## Context

El saldo está en `inventory`; el historial moderno se consulta desde `inventoryMovement`. Los escritores no comparten un contrato completo: algunos usan `fecha`, otros lectores esperan `createdAt`; `tipo` puede ser `INGRESO`, `ENTRADA` o `SALIDA`; `tipoMovimiento` mezcla claves, etiquetas y textos dinámicos; `reason` solo está presente en una minoría.

El nodo `katuq-inventory-adjust` ya demuestra el patrón correcto: normaliza producto, valida business code, aplica saldo, movimiento e idempotencia dentro de una transacción. Su enum runtime incluye `fullpi_sync`, mientras el contrato TypeScript aún no lo incluye.

## Goals / Non-Goals

**Goals:**

- Un solo contrato de escritura para todos los orígenes.
- Saldo y movimiento inseparables.
- Motivo consultable y cerrado.
- Lectura compatible mientras se migra la historia.

**Non-Goals:**

- Event sourcing completo.
- Reescritura masiva de documentos históricos.
- Crear una colección ledger adicional.
- Bloquear ventas por stock negativo; esa política no cambia aquí.

## Decisions

### 1. `inventory.cantidad` sigue siendo el saldo operativo de Katuq

Katuq conserva la cantidad vendible/operativa en el registro canónico producto–bodega. Los alias históricos se leen durante compatibilidad, pero toda escritura nueva actualiza el campo canónico y usa producto docId + business code de bodega.

La normalización puede leer `products.identificacion.referencia`, pero el ledger nunca escribe en `products`. Precio base, listas de precios, precios por tipo de cliente, títulos, imágenes, categorías y demás atributos comerciales quedan fuera de la transacción de inventario.

Alternativa descartada: cambiar de inmediato la fuente de verdad a un proveedor externo. Rompería Venta Asistida y otros comercios.

### 2. `inventoryMovement` es el único ledger activo

Todo movimiento nuevo se escribe allí. `inventoryProductHistory` queda congelada, no se borra, y `analyticsInventario` migra a la colección activa. Los endpoints viejos que consultan `createdAt` se adaptan a `fecha` con tolerancia de lectura histórica.

### 3. `reason` es el motivo canónico cerrado existente

Valores permitidos: `sale`, `restock`, `manual_adjustment`, `damaged`, `transfer`, `shopify_sync`, `osmosis_sync`, `fullpi_sync`, `returned`. Se corrige la deriva entre runtime, TypeScript y catálogo de nodos.

`tipo` se deriva del delta (`INGRESO` si es positivo, `SALIDA` si es negativo). `tipoMovimiento` permanece como etiqueta de compatibilidad derivada del contexto; no decide la contabilidad y no recibe textos libres nuevos.

### 4. Una operación contable es una sola transacción

La misma transacción lee el saldo vigente, valida idempotencia, actualiza/crea el inventario canónico y agrega el movimiento con antes/después. En un traslado incluye saldo origen, saldo destino, movimiento de salida y movimiento de ingreso.

Alternativa descartada: guardar movimientos en un batch posterior. Puede fallar después de cambiar el saldo.

### 5. Idempotencia por efecto de negocio

Cada escritor entrega una clave estable que identifica el efecto, no la ejecución técnica. Un reintento devuelve el resultado previo. Los cambios legítimos de cantidad llevan una revisión/operación diferente y no chocan con el efecto inicial.

### 6. La historia se enriquece solo con evidencia

El primer backfill será `--dry-run` y clasificará qué documentos pueden mapearse de forma determinista. Los ambiguos quedan sin `reason` y con reporte; nunca se deduce un motivo solo por el texto.

## Migration Plan

1. Congelar nuevos escritores en `inventoryProductHistory` y mover la analítica a lectura compatible de `inventoryMovement`.
2. Crear el servicio transaccional canónico detrás de una bandera apagada.
3. Migrar un escritor por vez: ajustes/traslados, Venta Asistida/POS, canales, devoluciones, imports y providers.
4. Ejecutar contract tests, integración, E2E y build en cada escritor antes del siguiente.
5. Observar en OMS sombra/canario; repetir en Almacén Bombas y otros tenants según gates.
6. Ejecutar dry-run del enriquecimiento histórico. Cualquier aplicación requiere otro checkpoint y backup.

## Rollback

Cada escritor conserva su ruta anterior mientras dure el canario. Ante doble efecto, saldo sin movimiento o movimiento sin saldo, se apaga la bandera de ese escritor; no se revierte en masa ni se borra evidencia.

## Risks / Trade-offs

- **Contención de transacciones** → transacciones cortas y por producto–bodega/operación; reintentos idempotentes.
- **Lectores dependientes de etiquetas** → campo de compatibilidad derivado durante la migración.
- **Motivos históricos incompletos** → cobertura explícita, sin promesa de exactitud anterior al gate.
- **Cambio transversal** → un escritor sensible por cambio y diff aprobado antes de aplicar.
- **Acoplamiento accidental con productos o precios** → tests de contrato verifican que una operación de inventario solo escriba saldo, movimiento, idempotencia y auditoría permitida.

## Open Questions

Ninguna para el contrato del ledger. Las reglas de cuándo comprometer unidades pertenecen al cambio de ciclo de pedido.
