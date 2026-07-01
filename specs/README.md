# /specs — Specs canónicas de Seller.Katuq

Este directorio contiene las especificaciones del proyecto bajo la metodología **Spec-Driven Development**. Lee primero `/SPEC-DRIVEN.md` (raíz) si es tu primera vez.

## Estructura

- `constitution.md` — principios técnicos y de negocio inmutables. Lectura obligatoria antes de planear cualquier feature.
- `CONTRACT.md` — **contrato vivo**: roadmap priorizado, decisiones tomadas, cambios de alcance, riesgos abiertos. Es el primer archivo que se abre al empezar una sesión.
- `templates/` — plantillas para nuevas specs, planes y task lists.
- `NNN-slug/` — una carpeta por feature. `NNN` monotónico, `slug` en kebab-case inglés.

## Specs activas

| # | Slug | Estado | Tema |
|---|---|---|---|
| 001 | osmosis-webhook-inbound | approved — pending-validation | Webhook entrante de Osmosis (Cereza) para estados de órdenes y actualizaciones de productos |
| 002 | flows-osmosis-shopify-marco | done | Spec marco del 360 Osmosis-Katuq-Shopify-webhook + 9 sub-specs hijas (002.1..002.9). Sello D-360-CLOSED-V2. |
| 003 | woocommerce-360-marco | **implementación done — pending Emulator validation** | Spec marco del 360 WooCommerce plug-and-play + 7 sub-specs hijas (003.1..003.7 todas implementadas). Goal: cualquier comercio puede integrar Woo "facilísimo". |
| 003.7 | cleanup-legacy-woocommerce | **implementación done** | Audit colecciones legacy + extracción mappers + DEFER refactor importAllProducts por shape incompatible. Ver D-022..D-025. |
| 004 | user-docs-flows | spec + USER-GUIDE-FLOWS.md publicada | Documentación de `/flows` orientada al comerciante final (no técnico). |
| 007 | assisted-sale-step1-customer | **in-review** | Re-arquitectura del Paso 1 (Cliente) de la venta asistida: buscador sin callejones + creación inline + búsqueda performante (por prefijo, sin tocar la base) en móvil y desktop. |
| 012 | siigo-integration-consolidation | draft | Consolidar los 3 caminos de facturación SIIGO en uno solo canónico multi-tenant; matar el legacy del POS con datos de prueba, arreglar nodos de flow rotos y rotar credencial filtrada. Ver D-039 (2026-06-20). Renumerada de 008 → 012 (colisión con cotizaciones-mvp — D-067). |

> Roadmap completo + decisiones D-001..D-067 en `CONTRACT.md`.

## Cómo crear una nueva spec

1. Asigna el siguiente `NNN` libre.
2. `mkdir specs/NNN-mi-feature && cp templates/spec.template.md specs/NNN-mi-feature/spec.md`.
3. Rellena la spec **sin elegir tecnología**. Marca preguntas con `[NEEDS CLARIFICATION]`.
4. Pide review humano. Solo cuando esté aprobada, copia `plan.template.md` y arranca Fase 2.
5. Añade la fila a la tabla de arriba y referencia en `CONTRACT.md`.
