# CLAUDE.md

Instrucciones para Claude Code en Seller.Katuq.

La guía compartida está en [AGENTS.md](AGENTS.md). Leerla completa y seguir su orden de inicio, metodología SDD/OpenSpec, arquitectura y guardarraíles. Las reglas comunes se mantienen allí, evitando copias divergentes.

@AGENTS.md

**Base de datos (desde el 1-nov-2026, D-579):** los datos de Katuq viven en PostgreSQL (`katuq-db`), no en Firestore. El Firestore de `julsmind-katuq` quedó congelado y no se usa para leer, corregir ni correr scripts. Antes de tocar datos, consultas, índices o scripts, leer la sección «Base de datos» de `AGENTS.md` y el `CLAUDE.md` del backend.

**Diseño:** toda pantalla nueva o modernizada sigue la "Regla de diseño Katuq" de `AGENTS.md`: bases `shared/components/publica/` y `shared/styles/_config-pagina.scss`, sin gradientes ni primarios paralelos, y cambios solo de presentación. Al rediseñar, tener en cuenta las trampas de CSS global descritas allí.

**Inglés siempre (7-nov-2026):** todo lo que se desarrolle lleva español e inglés en el mismo cambio, sin excepciones: ningún texto visible se sube sin su traducción al inglés. Reglas, cómo se hace y verificación en la sección [«Inglés siempre»](AGENTS.md#inglés-siempre-todo-lo-nuevo-se-entrega-traducido-regla-del-7-nov-2026) de `AGENTS.md`.

Las instrucciones específicas de subdirectorios complementan la guía dentro de su alcance. La memoria personal de Claude aporta contexto; las decisiones compartidas se consultan en `specs/CONTRACT.md`.
