# Spec 020 — Índice de categoría para filtrado rápido en venta asistida

> Estado: **approved** (2026-07-02 — D-072)
> Autor(es): Claude + usuario
> Última actualización: 2026-07-02
> Acompaña: `findings.md`

## 1. Contexto / Por qué
Spec 019 dejó documentado (findings.md) que el filtro de categoría/subcategoría en venta asistida puede tardar hasta ~30s cuando la categoría elegida tiene pocos o ningún producto — porque no existe ningún índice de categoría en la base de datos: el sistema tiene que revisar productos uno por uno para saber si califican. El usuario pidió resolver esto de fondo, no solo documentarlo como limitación aceptada.

## 2. Objetivo de negocio
Filtrar por categoría o subcategoría en venta asistida responde rápido (mismo presupuesto que el resto del catálogo, spec 019: p95 ≤ 2s), sin importar cuántos productos tenga esa categoría — incluyendo el caso real y común de categorías con 0-3 productos.

## 3. User stories
- Como **vendedor** quiero que filtrar por categoría responda tan rápido como navegar sin filtro, para no hacer esperar al cliente.
- Como **comerciante** con un catálogo poco clasificado (la mayoría de productos sin categoría) quiero que el sistema no se vuelva lento solo por eso.

## 4. Criterios de aceptación (notación EARS)

- **AC-01** — WHEN un vendedor filtra por categoría o subcategoría THE system SHALL responder sin recorrer productos que no pertenecen a esa categoría (consulta indexada, no escaneo en memoria).
- **AC-02** — THE system SHALL mantener el comportamiento jerárquico ya existente (D-068): seleccionar una categoría principal incluye productos de esa categoría y de todas sus subcategorías.
- **AC-03** — WHEN un producto se crea o edita (por cualquier vía: formulario manual, sincronización con Osmosis/Cereza, importación WooCommerce/Shopify, importación masiva de onboarding, quickstart de demo) THE system SHALL mantener actualizado el índice de categoría de ese producto de forma consistente, sin importar la vía de escritura.
- **AC-04** — THE system SHALL normalizar el índice de categoría a una sola forma canónica (array de labels en minúscula), independientemente de las al menos 5 formas distintas hoy existentes en el campo `categorias` crudo (objeto único, array sin label, string plano, string vacío, objeto doble-anidado — ver `findings.md`).
- **AC-05** — WHEN se ejecuta el backfill sobre productos existentes THE system SHALL calcular el índice a partir del campo `categorias` actual de cada producto sin modificar ni perder ese campo original.
- **AC-06** — IF un producto no tiene categoría asignada (o el campo no se puede interpretar) THEN THE system SHALL indexarlo como "sin categoría" (array vacío), sin error ni bloqueo del resto de la operación.
- **AC-07** — THE system SHALL preservar el comportamiento actual para el resto de filtros de venta asistida (búsqueda, ciudad, género, ocasión) — esta spec solo toca la resolución de categoría.

## 5. Requisitos no funcionales

### 5.1 Performance
- Filtrar por categoría (cualquier selectividad, incluida una categoría con 0-3 productos reales) cumple el mismo presupuesto de spec 019: p95 ≤ 2s.

### 5.2 Seguridad
- Sin cambios de superficie — el índice es un campo derivado, de solo lectura para el resto del sistema, filtrado siempre junto con `company`.

### 5.3 Observabilidad
- El backfill debe loguear cuántos productos se indexaron, cuántos quedaron "sin categoría", y cuántos tuvieron una forma de `categorias` no reconocida (para detectar una 6ª forma no contemplada).

### 5.4 Resiliencia
- Backfill idempotente (correrlo dos veces da el mismo resultado) y con modo `--dry-run` antes de escribir en producción (política del proyecto, ver `feedback_db_caution_zero_write`).
- Ningún escritor existente (Osmosis sync, WooCommerce, Shopify, onboarding, quickstart, formulario manual) debe quedar sin actualizar el índice tras esta spec — de lo contrario, productos nuevos quedarían con índice desactualizado silenciosamente.

## 6. Out of scope (explícito)
- Corregir las inconsistencias de forma del campo `categorias` CRUDO en sí mismo (seguirá teniendo sus ≥5 formas distintas) — esta spec solo agrega un campo derivado normalizado adicional, no migra el campo original.
- Resolver el caso de múltiples categorías por producto vía WooCommerce full-catalog-import (`exposicion.categorias`, array de nombres) más allá de incluirlo en el índice como corresponda — no se rediseña el modelo de categorías de WooCommerce.
- Activar los filtros hoy decorativos de Tiempos de entrega/Exposición/Precio en venta asistida (decisión explícita del usuario: no por ahora).
- Mejorar la clasificación real de categorías de ningún comercio (es un problema de captura de datos del negocio, no técnico).

## 7. Dependencias
- `[[019-venta-asistida-catalogo-performance]]` — mismo módulo, el índice se consume en `handleBodegaPagination`/`buildProductQuery`.
- D-068 (`CONTRACT.md`) — filtro de categoría/subcategoría, jerarquía padre-incluye-hijos a preservar.

## 8. [NEEDS CLARIFICATION] — RESUELTO 2026-07-02 (D-072, continuación, opciones recomendadas aprobadas)
- [x] **Q-01** — Campo `categoriasIndex: string[]` (labels en minúscula, incluye el label propio; vacío si no tiene categoría).
- [x] **Q-02** — Se actualizan los **11 sitios activos** (todos, incluido WooCommerce/Shopify auto-create y quickstart demo) — evita índice desactualizado silencioso en cualquier vía de creación de producto.
- [x] **Q-03** — Backfill contra **todas las empresas de producción** en una sola pasada (aditivo, bajo riesgo, con `--dry-run` primero por NFR 5.4).
- [x] **Q-04** — Chunking de `array-contains-any`/`in` a 30 valores cuando una categoría tenga más de 30 subcategorías reales — aceptado, mismo patrón ya usado en `productStockHelper.js`.

## 9. Riesgos identificados
- R-01: Si se deja algún sitio de escritura sin actualizar (de los ~11 encontrados), productos nuevos de esa vía quedarán con índice desactualizado de forma silenciosa — mitigar con el log de observabilidad (NFR 5.3) y una auditoría periódica simple.
- R-02: El backfill toca TODOS los productos de TODAS las empresas — alto volumen, requiere `--dry-run` y ejecución por lotes (mismo patrón de scripts ya usados en el proyecto).

## 10. Métricas de éxito post-launch
- Tiempo de respuesta del filtro de categoría (p50/p95) medido contra los mismos casos reales de spec 019 (categoría con 0, 1 y varios productos) antes/después.
- % de productos con `categoriasIndex` poblado vs. total, por empresa, tras el backfill.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren al menos performance, seguridad, observabilidad.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto.
