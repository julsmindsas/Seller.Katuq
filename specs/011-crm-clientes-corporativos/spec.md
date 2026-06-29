# Spec 011 — CRM de Clientes Corporativos (lista propia)

> Estado: **approved** (clarifications resueltas 2026-06-29)
> Autor(es): jnavarrog + Claude
> Última actualización: 2026-06-29

## 1. Contexto / Por qué
Hoy el CRM (kanban en `/crm`) se alimenta de los **clientes normales** (`entityType: 'client'`, colección `/v1/clients`), que son personas/clientes que **ya compraron**. Eso no sirve como pipeline de oportunidades: un comprador no es un prospecto. El comercio necesita trabajar **clientes corporativos nuevos** (prospectos B2B) en el CRM. La decisión es: **el CRM deja de alimentarse de los clientes normales y pasa a alimentarse de una lista nueva y propia de clientes corporativos.** El CRM se comporta **exactamente igual que hoy**; solo cambia su fuente de datos.

## 2. Objetivo de negocio
El comercio mantiene una **lista propia de clientes corporativos** (prospectos B2B), independiente de la de clientes habituales, y la trabaja en el CRM con el mismo flujo/kanban actual. Medible: un usuario crea un cliente corporativo, lo ve en su lista dedicada, y lo ve como tarjeta en el kanban del CRM. Ningún cliente normal aparece ya en el CRM.

## 3. User stories
- Como **vendedor B2B** quiero **registrar empresas prospecto en una lista aparte** para **gestionarlas como oportunidades sin ensuciar mi lista de clientes que ya compraron**.
- Como **vendedor B2B** quiero que **esos prospectos alimenten el CRM/kanban** para **moverlos por etapas comerciales (contacto → propuesta → cierre)**.
- Como **gerente comercial** quiero **ver el pipeline corporativo separado** del de clientes naturales para **medir la conversión B2B de forma limpia**.

## 4. Criterios de aceptación (notación EARS)

- THE system SHALL almacenar los clientes corporativos en una **lista/colección propia**, separada de la de clientes habituales.
- WHEN un usuario crea un cliente corporativo THE system SHALL usar el **mismo formulario de crear cliente** existente (con todos los tipos de documento) más un campo de **etiquetas** equivalente al del módulo de clientes, y guardarlo en la lista corporativa **sin** crearlo ni modificarlo en `/v1/clients`.
- THE system SHALL exponer una **pantalla de listado** de clientes corporativos (búsqueda, filtros básicos, crear/editar) independiente del listado de clientes habituales, accesible bajo el menú **Clientes**.
- THE CRM SHALL alimentar su pipeline **únicamente** desde la lista corporativa.
- THE CRM SHALL dejar de mostrar los clientes normales (`/v1/clients`): ningún cliente habitual aparece ya en el kanban.
- THE pipeline corporativo SHALL usar las **mismas etapas** que hoy usa el pipeline de clientes (nuevo → contactado → calificado → propuesta → negociación → convertido → perdido).
- WHEN un cliente corporativo se mueve de etapa en el kanban THE system SHALL persistir la nueva etapa contra el registro corporativo (mismo comportamiento actual).
- THE system SHALL aislar los datos por `companyId` (multi-tenant): un tenant solo ve sus clientes corporativos.
- IF un cliente corporativo se elimina o desactiva THEN THE system SHALL retirarlo del pipeline sin afectar otras listas.

## 5. Requisitos no funcionales

### 5.1 Performance
- El listado corporativo carga p95 ≤ 1.5 s para ≤ 500 registros; el kanban refleja altas/cambios sin recargar la página.

### 5.2 Seguridad
- Todos los endpoints pasan por el auth middleware existente; queries filtradas por `companyId`. Sin `HttpClient` directo en componentes (usar servicio Angular para que el interceptor agregue headers).

### 5.3 Observabilidad
- Auditoría de creación/cambio de etapa en colección de auditoría (no `console.log`).

### 5.4 Accesibilidad
- Formulario y listado navegables por teclado; estilo plano con `border-left` de acento (sin gradientes), coherente con el resto del CRM.

### 5.5 Resiliencia
- Crear/editar corporativo es idempotente por identificador (NIT/documento de la empresa); evitar duplicados.

## 6. Out of scope (explícito)
- NO se toca la colección ni la UI de clientes habituales (`/v1/clients`, `ventas/clienteslista`) — salvo **reusar** su formulario de creación.
- NO se migran clientes existentes a corporativos.
- NO se modifica el pipeline `company` (empresas-tenant de Katuq).
- NO inventario, NO pedidos, NO facturación.
- NO importación masiva en esta fase (se evalúa en sub-spec posterior).
- NO lógica de "convertir" un corporativo en cliente real: el CRM se comporta igual que hoy, solo se mueve de etapa.

## 7. Dependencias
- Módulo CRM activo (`components/crm`, `/v1/crm`).
- Backend `katuq_admin_back_firebase` (repo separado) para la colección y endpoints corporativos.
- Reúso potencial del eje `entityType` del CRM (decisión a resolver en `plan.md`).

## 8. Clarifications resueltas (2026-06-29)
- [x] **Q-01 — Modelo/formulario.** Reusar el **mismo formulario de crear cliente** existente (todos los tipos de documento) y **agregar campo de etiquetas** equivalente al del módulo de clientes (`crear cliente`).
- [x] **Q-02 — Arquitectura.** Nuevo `entityType: 'corporate'` reusando el kanban y servicio del CRM actual (no un CRM aparte). El CRM se comporta igual que hoy; cambia la fuente.
- [x] **Q-03 — Etapas.** Reusar las etapas del pipeline `client` actual.
- [x] **Q-04 — Menú.** Bajo **Clientes**, nueva entrada "Clientes corporativos".
- [x] **Q-05 — Conversión.** No aplica en esta fase. El CRM solo mueve de etapa, igual que hoy.

## 9. Riesgos identificados
- R-01: Confundir el nuevo `entityType:'corporate'` con el `company` (tenant) existente del CRM → ensuciar el Pipeline Empresas de la plataforma. Mitigación: nombre/segmentación explícita y filtros por entityType.
- R-02: Duplicar lógica de listado/kanban en vez de reusar → deuda. Mitigación: reusar `crm-list` parametrizado por entityType.
- R-03: Backend en repo separado → coordinación de endpoints antes del frontend.

## 10. Métricas de éxito post-launch
- ≥ 1 tenant creando clientes corporativos y moviéndolos en el kanban en la primera semana.
- 0 registros corporativos filtrándose a la lista de clientes habituales (verificable por colección).

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren al menos performance, seguridad, observabilidad.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto.
