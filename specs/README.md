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
| 001 | osmosis-webhook-inbound | spec en revisión | Webhook entrante de Osmosis (Cereza) para estados de órdenes y actualizaciones de productos |

## Cómo crear una nueva spec

1. Asigna el siguiente `NNN` libre.
2. `mkdir specs/NNN-mi-feature && cp templates/spec.template.md specs/NNN-mi-feature/spec.md`.
3. Rellena la spec **sin elegir tecnología**. Marca preguntas con `[NEEDS CLARIFICATION]`.
4. Pide review humano. Solo cuando esté aprobada, copia `plan.template.md` y arranca Fase 2.
5. Añade la fila a la tabla de arriba y referencia en `CONTRACT.md`.
