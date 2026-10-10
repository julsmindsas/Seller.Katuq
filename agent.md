# agent.md

Entrada de compatibilidad para agentes que consultan este nombre de archivo.

La guía compartida del repositorio está en [AGENTS.md](AGENTS.md). Leerla completa antes de trabajar; allí están las políticas operativas, SDD/OpenSpec, seguridad, arquitectura, inventario y seguimiento en ClickUp.

Mantener las reglas comunes en `AGENTS.md`, sin duplicarlas aquí ni en `CLAUDE.md`.

**Diseño:** toda pantalla nueva o modernizada sigue la "Regla de diseño Katuq" de [AGENTS.md](AGENTS.md#regla-de-diseño-katuq-pantallas-nuevas-y-modernizadas-d-398-d-399-d-400). Las públicas usan `shared/components/publica/` y las de lista o configuración, `shared/styles/_config-pagina.scss`. No se permiten gradientes ni primarios paralelos, y modernizar cambia solo la presentación.
