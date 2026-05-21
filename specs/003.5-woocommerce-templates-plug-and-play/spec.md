# Spec 003.5 — WooCommerce: templates plug-and-play en `/flows`

> Estado: **draft** (2026-05-20)
> Sub-spec hija de [[003-woocommerce-360-marco]]. Bloquea 003.6. Depende de 003.4.

## 1. Contexto / Por qué

El goal del usuario exige "FACIIIIIL" — el comerciante NO debe construir un flow desde cero (arrastrar nodos, configurar expresiones, conectar edges). La colección `flow_templates` ya existe en backend y el componente `flow-templates/` ya existe en frontend (Seller.Katuq/src/app/components/flows/flow-templates/). Esta spec materializa 3 templates Woo listos para instanciar de un click, con 2-4 inputs configurables por el comerciante, sin exponer jamás terminología técnica.

## 2. Objetivo de negocio

Un comerciante con WooCommerce ya configurado en `/integrations` puede activar la sincronización completa en ≤ 3 clicks: "Crear desde plantilla" → elegir "Sincronizar productos WooCommerce" → click "Activar". El flow queda corriendo en ≤ 2 segundos sin que el comerciante toque ni un nodo.

## 3. User stories

- Como **comerciante**, quiero **ver una lista de plantillas listas para WooCommerce con nombres claros** (no "shopify-orders-to-cereza-7e6ab5a3"), para entender qué hace cada una antes de activarla.
- Como **comerciante**, quiero **configurar solo lo esencial (cada cuánto sincronizar + en qué bodega)**, no aprender qué es un cron expression.
- Como **comerciante**, quiero **pausar una sincronización con un toggle** sin saber qué es un trigger binding.
- Como **operador Katuq**, quiero **agregar plantillas nuevas sin tocar código del frontend**, modificando solo `flow_templates` collection.

## 4. Criterios de aceptación (notación EARS)

- **AC-003.5-01.** THE `flow_templates` collection SHALL contener 3 docs WooCommerce seedeados: `woo-sync-products-to-katuq`, `woo-orders-to-katuq`, `woo-stock-katuq-to-woo` (este último opcional, fase 2).
- **AC-003.5-02.** WHEN un comerciante abre `/flows` y hace click en "Crear desde plantilla", THE UI SHALL mostrar el catálogo filtrable por proveedor con chip "WooCommerce" + cards con `displayName + iconLogo + descripcionAmigable + listaInputs`.
- **AC-003.5-03.** THE template `woo-sync-products-to-katuq` SHALL exponer 2 inputs configurables al usuario: `intervaloMinutos` (slider 5/15/30/60, default 15) + `bodegaDestino` (picker activas, requerido).
- **AC-003.5-04.** THE template `woo-orders-to-katuq` SHALL exponer 2 inputs: `estadoInicialPedido` (picker de estados Katuq, default `'PreAprobado'`) + `crearClienteNuevo` (toggle, default `true`).
- **AC-003.5-05.** WHEN el comerciante hace click en "Activar" sobre una plantilla, THE system SHALL: (1) clonar el template a un nuevo `flow_doc` con `flowId` único `{templateBase}-{companyHash}`, (2) crear `flow_trigger_binding` con `kind` correcto (`cron` o `webhook`), (3) invocar `cronService.loadDynamicJobsFromFirestore()` o equivalente para hot-reload, (4) responder al frontend con `{success: true, flowId, bindingId}` en ≤ 2s.
- **AC-003.5-06.** WHEN el comerciante hace click en "Pausar" sobre un flow instanciado desde template, THE system SHALL setear `flow_trigger_binding.status = 'inactive'` + parar el cron in-memory (si aplica) sin disparar nuevos ticks.
- **AC-003.5-07.** THE UI de templates SHALL usar exclusivamente vocabulario amigable: "sincronización", "pedido", "producto", "stock", "cada cuánto", "activar", "pausar". PROHIBIDO: "trigger", "nodo", "expression", "binding", "cron expression", "$companyConfig", "execution context".
- **AC-003.5-08.** WHEN el comerciante intenta activar un template y NO tiene WooCommerce configurada en `/integrations`, THE UI SHALL mostrar modal "Conectá tu tienda WooCommerce en /integrations primero" con botón "Ir a /integrations" (cierra modal de templates).
- **AC-003.5-09.** WHEN una plantilla genera un cron flow binding, THE cron SHALL aparecer en `cronService.getCronsHealth().inMemorySchedulers.flowCronJobsCount` con incremento de 1 inmediatamente.
- **AC-003.5-10.** THE catálogo de templates SHALL leer de Firestore en runtime (`flow_templates` collection) — agregar/quitar plantillas NUNCA requiere cambios en código UI (Art VI).

## 5. Requisitos no funcionales

### 5.1 Performance
- Activación de template: ≤ 2s p95 (clonar + crear binding + reload cronService).
- Carga del catálogo de templates: ≤ 500ms con hasta 50 templates.

### 5.2 Seguridad
- Crear flows desde template requiere permiso `flows:create` (mismo que crear flow manual).
- Templates en `flow_templates` collection son read-only para usuarios; solo super-admins pueden editar.

### 5.3 Observabilidad
- Log estructurado al activar template: `{templateId, companyId, generatedFlowId, bindingId, inputsConfig}`.
- Métrica: `wc_templates_activated_per_day` por templateId.

### 5.4 Accesibilidad (UI)
- Catálogo de templates: cards navegables por teclado, foco visible, descripción en `aria-label`.
- Modal de configuración: WCAG AA, contrast ≥ 4.5:1, mensajes de error con `role="alert"`.

### 5.5 Resiliencia
- Si `cronService.loadDynamicJobsFromFirestore()` falla post-activación, el template queda creado pero `flow_trigger_binding.status = 'pending-reload'`. Cron tick siguiente del cleanup (002.9) lo reactiva.
- Si Firestore falla al clonar, retornar error friendly al usuario sin dejar estado parcial.

## 6. Out of scope (explícito)

- Editor visual para CREAR templates nuevos (super-admins lo hacen via script `seed-woocommerce-templates.js` o Firestore admin).
- Marketplace de templates entre tenants.
- Templates compuestos / multi-paso con UI guiada (el MVP usa 1 modal de 2-4 inputs).
- Versionado de templates (si template cambia, flows ya instanciados NO se actualizan automáticamente — son snapshots).

## 7. Dependencias

- **003.4 done** — los 10 nodos WC necesarios para que los templates funcionen al instanciarse.
- **002.9 done** — `cronService.loadDynamicJobsFromFirestore` + hot-reload.
- **002.7 done** — `$companyConfig.woocommerce` resuelto en runtime para los nodos.
- Componente `Seller.Katuq/src/app/components/flows/flow-templates/` (existente — verificar API).
- Backend `flowsController.js` con CRUD de `flow_templates` (existente, verificar endpoint exacto para "instanciar template").

## 8. [NEEDS CLARIFICATION]

- [ ] **Q-003.5-01** (heredada Q-WOO-05): ¿los 3 templates van en `flow_templates` como docs separados o como array? Default propuesto: **docs separados**, cada uno con `templateId = docId`, `provider: 'woocommerce'`, `displayNameAmigable: '...'`, `descripcionAmigable: '...'`, `inputs: [...]`, `flowSpec: {...}` (el spec del flow a clonar). Consistente con cómo se manejan colecciones grandes.
- [ ] **Q-003.5-02**: ¿el endpoint de "instanciar template" es `POST /v1/flow-templates/:id/instantiate` o se reusa `POST /v1/flows` con `templateId` en body? Verificar contra Shopify si tiene templates instalables (puede no tener — investigar antes del plan).
- [ ] **Q-003.5-03**: para el template `woo-orders-to-katuq` con trigger webhook, ¿el endpoint de webhook se autoregistra en WooCommerce vía API al activar template, o el comerciante debe seguir pegando URL manual? Default MVP: **manual** (consistente con 003.1 D-019); auto-registro fase 2.

## 9. Riesgos identificados

- **R-003.5-01** (Medio): componente `flow-templates/` puede no soportar filtros por proveedor ni inputs dinámicos. Mitigación: leer código antes del plan; si falta, extender (NO crear componente nuevo).
- **R-003.5-02** (Medio): "instanciar template" genera flow + binding pero no garantiza atomicidad si Firestore falla a mitad. Mitigación: usar `db.runTransaction` para crear ambos docs en una transacción.
- **R-003.5-03** (Bajo): vocabulario amigable puede entrar en conflicto con strings ya hardcoded en otros lugares del UI. Mitigación: usar i18n key namespace `flows.templates.*` para nuevos strings.

## 10. Métricas de éxito post-launch

- **M-003.5-01**: tasa de activación de template ≥ 80% del total de comerciantes que abren el catálogo de templates Woo (medible primer mes).
- **M-003.5-02**: 0 reportes de soporte sobre "no entiendo qué es un trigger" o jerga técnica relacionada (auditable en tickets).
- **M-003.5-03**: tiempo p95 entre "comerciante completa /integrations" y "comerciante activa primer template" ≤ 5 minutos.
- **M-003.5-04**: 0 templates con código `if (provider === 'woocommerce')` en UI (Art VI sostenido).

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad, accesibilidad, resiliencia.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto antes de plan.md.
