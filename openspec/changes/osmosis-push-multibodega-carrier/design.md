# Diseño: push Osmosis multibodega con fallo cerrado

## Context

OH MY STORE tiene storages Cereza `1`, `1A`, `1B` y `51` mapeados en `warehouses.osmosisStorageCode`. El parser legacy solo maneja sufijos numéricos y Cereza ahora exige `carrier_code`. Los dos caminos de push deben compartir la resolución y la misma política de error.

## Goals / Non-Goals

**Goals:** resolver bodega y carrier por empresa, evitar despacho desde una bodega equivocada y hacer visible cualquier bloqueo.

**Non-Goals:** cambiar pull de estados, stock de productos o ciclo completo de inventario del pedido.

El push usa el snapshot de la línea vendida para construir el pedido, pero no actualiza el maestro del producto, sus variantes, precios ni listas de precios.

## Decisions

### 1. Mapping explícito, sin heurística ni default silencioso

Se consulta `warehouses` por `company + idBodega` y se usa `osmosisStorageCode`. Si falta, se detiene el push. No se convierte `BOD-102` en storage `1` ni se extraen dígitos del nombre.

### 2. Carrier obligatorio antes de la llamada

`config.defaultCarrierCode` se resuelve desde la integración de la empresa. Si está vacío, se persiste fallo operativo sin enviar un payload que Cereza ya sabemos que rechazará.

### 3. Un helper compartido para ambos caminos

El servicio de integración y el nodo de flow usan la misma resolución. Puede reutilizar datos durante una sola operación, pero no añade caché global.

### 4. Éxito requiere ID externo

Solo una respuesta válida con identificador Osmosis permite limpiar atención y avanzar el pedido. El error preserva estado previo y habilita retry idempotente.

## Risks / Trade-offs

- **Mapping faltante bloquea un pedido que antes se enviaba por heurística** → es una falla segura y visible; se corrige configuración, no se adivina.
- **Carrier errado** → contract test/probe autorizado antes del canario.
- **Diferencias entre service y flow** → helper compartido y fixtures comunes.

## Migration Plan

1. Confirmar `defaultCarrierCode` con Cereza.
2. Probar mapping 1/1A/1B/51 y casos no mapeados.
3. Desplegar con alcance OMS y corte disponible.
4. Ejecutar un canario autorizado; verificar payload, ID y estado del pedido.
5. Ampliar solo después de evidencia exitosa.

## Open Questions

- Valor válido de `defaultCarrierCode` para OMS. Es bloqueante externo antes del canario.
