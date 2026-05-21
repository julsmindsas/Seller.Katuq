# Spec 004 — Documentación de `/flows` orientada al comerciante final

> Estado: **draft** (2026-05-20)
> Sub-spec independiente, vinculada al goal del marco 003. Depende de 003.5 done.

## 1. Contexto / Por qué

Las 3 docs existentes de `/flows` (`LEEME-KATUQ-FLOWS.md`, `GUIA-COMPLETA-KATUQ-FLOWS.md` 776 LOC, `COMO-FUNCIONA-VISUAL.md` 637 LOC) son técnicas — pensadas para desarrolladores del equipo. Un comerciante real no entiende "trigger node", "expression engine", "binding", "topological sort BFS". Sin una guía no-técnica el goal "FACIIIIIL" no se cumple aunque la UI lo permita.

## 2. Objetivo de negocio

Una guía PDF/Markdown publicable, leíble por un comerciante sin background técnico, que cubre el journey completo: "conectar mi tienda → activar una sincronización → cómo sé que está funcionando → qué hacer si algo falla". Reduce tickets de soporte de tipo "no entiendo cómo usar /flows".

## 3. User stories

- Como **comerciante recién registrado**, quiero **leer una guía corta con capturas** para conectar mi tienda WooCommerce sin pedir ayuda al equipo.
- Como **comerciante con flujo activo**, quiero **saber dónde ver si la sincronización está corriendo bien** o si hay un error, sin entrar a consola técnica.
- Como **comerciante que quiere pausar la sincronización mientras hago cambios masivos**, quiero **un botón claro de pausar/reactivar**, sin temer romper nada.

## 4. Criterios de aceptación (notación EARS)

- **AC-004-01.** THE doc `USER-GUIDE-FLOWS.md` SHALL contener exclusivamente vocabulario amigable. PROHIBIDO: trigger, nodo, expression, binding, execution context, cron expression, `$companyConfig`, BFS, runtime, hook, callback, mutex, idempotencia (excepto en glosario opcional final).
- **AC-004-02.** THE doc SHALL estar estructurado en 5 secciones: (1) Conectá tu tienda en 3 pasos, (2) Activá una sincronización desde plantilla, (3) Cómo sé que está funcionando, (4) Pausar o cambiar la sincronización, (5) Preguntas frecuentes.
- **AC-004-03.** THE doc SHALL incluir al menos 10 capturas de pantalla referenciadas (paths en `assets/user-guide-flows/screen-NN.png` — placeholders en MVP, reemplazables por diseño).
- **AC-004-04.** THE sección "Preguntas frecuentes" SHALL cubrir mínimo 8 preguntas: por qué no veo mis productos, cómo cambio cada cuánto sincroniza, cómo pauso temporalmente, qué pasa si borro un producto en mi tienda, qué pasa si mi internet se cae, dónde veo los errores, cómo agrego una nueva sincronización, cómo elimino una sincronización.
- **AC-004-05.** THE doc SHALL ser ≤ 5 páginas (impreso) y ≤ 2000 palabras. Si excede, se parte en sub-docs por sección.
- **AC-004-06.** THE doc SHALL mencionar específicamente WooCommerce como ejemplo principal pero usar lenguaje que aplique a Shopify, Osmosis y futuros proveedores sin reescribir (Art VI).
- **AC-004-07.** THE doc SHALL incluir un FAQ "¿Algo se rompió y no puedo arreglarlo?" con CTA "Escribinos a soporte@katuq.com con el ID que aparece en la pantalla de error" (no pedir al comerciante que copie stack traces).

## 5. Requisitos no funcionales

### 5.1 Accesibilidad
- Lenguaje claro, párrafos cortos (≤ 5 líneas).
- Capturas con `alt` descriptivo.
- Versiones publicables: Markdown (Notion/GitBook) + PDF generable.

### 5.2 Mantenibilidad
- Doc en `specs/004-user-docs-flows/USER-GUIDE-FLOWS.md` (parte del repo).
- Cuando UI cambia, doc se actualiza en mismo PR (gate en CI: si frontend de templates cambia y este archivo no, warning).

## 6. Out of scope (explícito)

- Tutorial en video.
- Traducción a otros idiomas (MVP español Colombia).
- Documentación técnica avanzada (eso vive en GUIA-COMPLETA-KATUQ-FLOWS.md).
- Onboarding gamificado / tour interactivo en producto (deuda futura).

## 7. Dependencias

- **003.5 done** — templates plug-and-play visibles en UI, con vocabulario amigable validado (T-11 audit).
- **003.1 done** — `/integrations` form con info-box y URL webhook.
- Diseño / marketing: capturas reales para reemplazar placeholders (deuda separada, no bloquea publicación MVP).

## 8. [NEEDS CLARIFICATION]

- [ ] **Q-004-01**: ¿la doc va publicada en `docs.katuq.com` (público), en help-center embebido en app, o solo en Notion del equipo? Default propuesto: **markdown en repo + publicación a help-center embebido** (link "?" en `/flows`).
- [ ] **Q-004-02**: ¿la doc reemplaza `LEEME-KATUQ-FLOWS.md` o coexiste? Default propuesto: **coexisten** — LEEME es para devs (mantener), USER-GUIDE es para comerciantes.

## 9. Riesgos identificados

- **R-004-01** (Bajo): doc se vuelve outdated cuando UI cambia. Mitigación: gate CI que detecta cambios en `flow-templates/*.html` sin actualización en USER-GUIDE.
- **R-004-02** (Bajo): vocabulario amigable interpretable de varias formas (ej. "sincronización" vs "conexión"). Mitigación: glossary opcional final + revisión con piloto.

## 10. Métricas de éxito post-launch

- **M-004-01**: 0 tickets de soporte con palabras "no entiendo cómo" relacionadas a /flows en 60 días post-publicación.
- **M-004-02**: ≥ 80% de comerciantes piloto reportan en encuesta que la guía les sirvió.
- **M-004-03**: doc ≤ 2000 palabras (auditable con `wc -w`).
