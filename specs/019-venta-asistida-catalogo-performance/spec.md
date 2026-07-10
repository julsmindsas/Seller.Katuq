# Spec 019 — Performance del catálogo de productos en venta asistida

> Estado: **approved** (2026-07-02 — D-069)
> Autor(es): Claude + usuario
> Última actualización: 2026-07-02
> Acompaña: `findings.md` (medición real contra producción)

## 1. Contexto / Por qué
El paso de catálogo (step 2) de venta asistida está reportado por el usuario como "extremadísimamente lento". Se validó con medición real contra producción (ver `findings.md`): para una empresa con 1.446 productos en una bodega, cada carga del catálogo tarda **~24 segundos**; para una empresa con 8.228 productos, **~87 segundos**. El tiempo crece con el tamaño del catálogo de la bodega, sin importar si el vendedor solo quiere ver la primera página o buscar/filtrar. Esto bloquea la venta misma — un vendedor no puede cobrar mientras espera a que cargue el catálogo.

## 2. Objetivo de negocio
Un vendedor abre el catálogo de venta asistida (o busca/filtra dentro de él) y ve resultados en un tiempo acotado, **independiente de cuántos productos tenga la bodega de su empresa**. El tiempo de respuesta deja de crecer con el tamaño del catálogo.

## 3. User stories
- Como **vendedor** quiero que el catálogo de venta asistida cargue rápido para no hacer esperar al cliente (en tienda o por teléfono) mientras armo el pedido.
- Como **vendedor** quiero que buscar o filtrar por categoría/subcategoría responda rápido, sin importar cuántos productos tenga mi empresa.
- Como **comerciante con catálogo grande** (miles de productos) quiero que el sistema funcione igual de bien que para un comerciante con catálogo chico.

## 4. Criterios de aceptación (notación EARS)

- **AC-01** — WHEN un vendedor abre el catálogo de venta asistida para una bodega THE system SHALL devolver la primera página de resultados sin necesidad de leer el catálogo completo de esa bodega.
- **AC-02** — WHEN un vendedor aplica un término de búsqueda o un filtro (categoría/subcategoría, ciudad, género, ocasión) THE system SHALL aplicar el filtro sin escanear en memoria el catálogo completo de la bodega.
- **AC-03** — WHILE el catálogo de una bodega crece en número de productos THE system SHALL mantener el tiempo de respuesta dentro del presupuesto de latencia definido (ver NFR 5.1), sin degradación proporcional al tamaño del catálogo.
- **AC-04** — THE system SHALL preservar el comportamiento funcional actual del catálogo: filtros existentes (búsqueda, categoría/subcategoría — D-068 —, ciudad, género, ocasión), cantidad disponible por producto, inclusión de productos no inventariables, y deduplicación de registros de inventario legacy/sync para el mismo producto+bodega (regla crítica del proyecto, ver `CLAUDE.md`). Este es un fix de rendimiento, no un cambio de funcionalidad visible.
- **AC-05** — IF el mismo endpoint de catálogo paginado es consumido por otra superficie además de venta asistida (a confirmar en plan, ver `findings.md`) THEN THE system SHALL beneficiar a esa superficie con la misma corrección, sin regresiones.
- **AC-06** — THE system SHALL seguir usando `idBodega` (código de negocio) para resolver inventario — nunca Firestore doc ID — conforme a la convención crítica ya vigente del proyecto.

## 5. Requisitos no funcionales

### 5.1 Performance
- Presupuesto de latencia objetivo: **p95 ≤ 2s** para la primera página del catálogo, independiente del tamaño de la bodega (D-069).
- El tiempo de respuesta NO debe crecer linealmente con el número de productos de la bodega (hoy sí crece: ~24s para 1.446 productos, ~87s para 8.228 — ver `findings.md`).

### 5.2 Seguridad
- Sin cambios de superficie de autenticación/autorización. Sigue filtrando estrictamente por `company` (multi-tenancy) y por bodega.

### 5.3 Observabilidad
- El endpoint debe loguear tiempo de respuesta y cantidad de registros leídos por request, para poder verificar la mejora con datos reales (mismo patrón de medición usado en `findings.md`).

### 5.4 Accesibilidad
- No aplica (no cambia UI).

### 5.5 Resiliencia
- La corrección es de solo-lectura (no debe introducir escrituras nuevas ni cambiar cómo se persiste inventario/pedidos). Cualquier cambio de estrategia de conteo/paginación debe degradar de forma segura (nunca mostrar menos productos de los que realmente existen).

## 6. Out of scope (explícito)
- Cálculo de impuestos/IVA (spec 010, en curso — no se toca).
- Lógica de creación/edición de pedidos o escritura de inventario (`inventoryService.js`).
- El filtro de categoría/subcategoría en sí mismo (D-068, ya implementado y pendiente de validación manual) — esta spec solo cambia *cómo* se obtienen y paginan los datos, no *qué* filtros existen.
- Rediseño del módulo POS2 (si comparte el endpoint, se beneficia del fix, pero no se le agregan features).

## 7. Dependencias
- `[[010-venta-asistida-impuestos-congruencia]]` — mismo módulo (venta asistida), sin solapamiento de código de cálculo.
- D-068 (`CONTRACT.md`) — filtro de categoría/subcategoría recién implementado sobre el mismo endpoint; esta spec no lo revierte.

## 8. [NEEDS CLARIFICATION] — RESUELTO 2026-07-02 (D-069, continuación)

- [x] **Q-01** — Presupuesto de latencia: **p95 ≤ 2s** para la primera página del catálogo, sin importar el tamaño de la bodega.
- [x] **Q-02** — El conteo total de páginas/productos **puede pasar a ser aproximado** (no exacto en tiempo real) si eso permite paginar de verdad contra la base de datos en vez de en memoria. El vendedor necesita navegar/buscar rápido, no un total exacto.
- [x] **Q-03** — Resuelta en `findings.md` §Alcance: **solo venta asistida** (`EcomerceProductsComponent`) consume este endpoint. POS2 usa un camino completamente distinto (`InventarioService.obtenerInventarioPorBodega`). Sin riesgo cross-superficie.
- [x] **Q-04** — **Reemplazo directo**, sin flag ni convivencia de dos rutas — es una operación de solo lectura, riesgo acotado (no toca escritura de inventario/pedidos).

## 9. Riesgos identificados
- R-01: Cambiar de "traer todo y paginar en memoria" a "paginar contra la base de datos" puede cambiar cómo se calcula el conteo total de páginas mostrado en la UI — validar que no rompa la experiencia de paginación.
- R-02: Si se decide cachear o limitar lecturas, existe riesgo de mostrar cantidad disponible desactualizada — debe seguir siendo lectura fresca de inventario, solo más eficiente.
- R-03: El mismo endpoint puede ser usado por más de una superficie (venta asistida, posiblemente POS2) — un fix mal alcanzado podría arreglar una y regresar otra.

## 10. Métricas de éxito post-launch
- Tiempo de respuesta p50/p95 del endpoint de catálogo paginado, medido para al menos 2 empresas de catálogo grande (ALMARA FELICIDAD, OH MY STORE) antes/después — objetivo: reducción de orden de magnitud (de ~24-87s a segundos).
- Reporte cualitativo del usuario confirmando que la venta asistida ya no se siente lenta.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren al menos performance, seguridad, observabilidad.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto.
