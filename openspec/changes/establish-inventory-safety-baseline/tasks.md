# Tasks

## 0. Barreras antes de tocar cantidades

- [x] 0.1 Registrar la evidencia read-only del 2026-07-22: `inventoryMovement` activo (23.122 global / 1.668 OMS), `inventoryProductHistory` legado (1.670 global, último 2025-05-02 / 0 OMS) e `inventory_movements` vacío globalmente.
- [x] 0.2 Replicar en `CLAUDE.md` y `openspec/config.yaml` del backend el write-set cerrado: inventario no escribe `products`, precios, listas de precios ni catálogo; Shopify stock solo muta `InventoryLevel`.
- [x] 0.3 Proteger `POST /v1/inventory/reparar` con `auth`, convertirlo en dry-run por defecto y bloquear aplicación sin confirmación explícita y evidencia vigente de Gate 0.
- [x] 0.4 Agregar contract tests que fallen si reparación queda sin auth, si el modo por defecto escribe o si inventario intenta escribir productos/precios.

## 1. Respaldo recuperable

- [x] 1.1 Crear script lógico read-only con `--company` obligatorio para saldos, ledger, barreras de idempotencia, fallas, bodegas, canales/asociaciones, proyección mínima de pedidos, configuración pública de integraciones y grafos/bindings de flows; excluir clientes, secretos, tokens embebidos en URLs, correos operativos y datos de precios.
- [x] 1.2 Generar manifiesto con proyecto, empresa, corte UTC, colección, conteo, hash y última fecha; fallar si alguna consulta queda incompleta.
- [x] 1.3 Crear verificador de restauración únicamente para Firestore Emulator/proyecto aislado y probar una muestra con conteos y hashes equivalentes.
- [ ] 1.4 Documentar y ejecutar, en la ventana autorizada, export administrado de Firestore; guardar URI/fecha y repetir el corte si hubo movimientos posteriores.

## 2. Conciliación de solo lectura

- [x] 2.1 Extraer un motor puro que normalice referencia→docId, valide `idBodega` business code y preserve todos los candidatos duplicados sin sumarlos ni escoger ganador silencioso.
- [x] 2.2 Extender `/v1/inventory/diagnostico` con paginación y cuatro evidencias separadas: saldo, ledger activo, efecto de pedidos y proveedor; clasificar `reliable | ambiguous | incomplete` con causas.
- [x] 2.3 Reportar cobertura temporal, campos históricos faltantes y estado de colecciones legacy; limitar payload sin ocultar los conteos totales.
- [x] 2.4 Mantener la línea base estrictamente read-only, registrar corte y metadatos fuera de Firestore, y agregar contract tests que bloquean escrituras y exigen aislamiento por empresa en cada colección consultada.

## 3. Validación de Gate 0 y Gate 1

- [x] 3.1 Tests: duplicado docId/referencia, cantidades discordantes, bodega docId, producto fantasma, aislamiento multi-tenant e historia incompleta.
- [ ] 3.2 `node --check`, contract tests, arranque local y OpenSpec strict limpios; revisar diff del módulo sensible antes de aplicar cada cambio.
- [x] 3.3 Ejecutar baseline read-only de OMS tres veces cubriendo ciclos completos de sus crones; comparar resultados y volumen de lecturas, sin activar escritor nuevo.
- [ ] 3.4 Repetir baseline read-only para Almacén Bombas, sin capacidades Cereza/Shopify que no le correspondan.
- [x] 3.5 Adjuntar evidencia y gates a la tarea maestra de ClickUp; no abrir canario hasta aprobar respaldo, restore y baseline.

## 4. Operación OMS

- [x] 4.1 Definir runbook con PITR `snapshot-time`, backup fresco, orden de despliegue, análisis local de bodega candidata, criterios de aborto y rollback a legacy.
- [ ] 4.2 Ejecutar Gate 0 y sombra OMS únicamente en ventana y con aprobación explícita.
