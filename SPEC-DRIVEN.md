# Spec-Driven Development en Seller.Katuq

> Manual canon. Si algo en este documento contradice una práctica de equipo, gana este documento hasta que se actualice.
> Versión: 1.0 — 2026-05-13.
> Idioma de trabajo: español. Idioma de identifiers/código: inglés.

## 1. ¿Por qué SDD y por qué ahora?

En Seller.Katuq nos pasa una cosa concreta: **"siempre pasan cosas"** con `/flows` y la integración Cereza/Osmosis. La causa raíz no es el código, son los **requisitos no especificados que descubrimos tarde**: estados que Cereza nos manda y no esperábamos, campos de producto que mutan, cancelaciones que llegan por canales distintos, asunciones implícitas en webhooks.

**Spec-Driven Development (SDD)** invierte la jerarquía clásica:

> *"Las especificaciones no sirven al código; el código sirve a las especificaciones."*  — GitHub Spec-Kit.

La spec deja de ser un documento que se desincroniza y pasa a ser **la fuente de verdad ejecutable** desde la cual derivamos plan, tareas y código. Cuando algo cambia, se cambia en la spec primero y el cambio se propaga.

### SDD vs alternativas

| | SDD | TDD | Documentation-Driven | Vibe Coding |
|---|---|---|---|---|
| Fuente de verdad | Spec versionada | Test que falla | Doc humano | Prompt suelto |
| Captura intent + arquitectura + NFRs | Sí | No (solo behavior unitario) | Parcial | No |
| Pensado para agentes IA | Sí | No nativamente | No | Sí (sin garantías) |
| Apto para producción | Sí | Sí | Parcial | No |

TDD sigue siendo válido **dentro** de SDD: los tests son una salida del plan, no la entrada.

## 2. Convenciones de este repositorio

```
Seller.Katuq/
├── SPEC-DRIVEN.md                ← este manual (canon)
├── specs/
│   ├── README.md                 ← índice de specs
│   ├── constitution.md           ← principios inmutables del proyecto
│   ├── CONTRACT.md               ← contrato vivo: roadmap + decisiones
│   ├── templates/
│   │   ├── spec.template.md
│   │   ├── plan.template.md
│   │   └── tasks.template.md
│   └── NNN-slug/                 ← una carpeta por feature
│       ├── spec.md               ← qué y por qué
│       ├── plan.md               ← cómo (stack, contratos, fases)
│       ├── tasks.md              ← pasos atómicos paralelizables
│       ├── data-model.md         ← entidades (si aplica)
│       └── contracts/            ← schemas de API/eventos
```

Reglas del esquema:
- `NNN` es entero monotónico de 3 dígitos (`001`, `002`, …). No se reusa, no se renumera.
- `slug` en kebab-case en inglés, ≤ 5 palabras (`osmosis-webhook-inbound`).
- Una feature = un directorio. No mezclamos features en un solo spec.
- Las specs viven en el repo. Nunca en Notion/Drive sueltos. Si no está en git, no existe.

## 3. Flujo de trabajo (las 4 fases)

### Fase 0 — `constitution`
Existe un solo `constitution.md` en `/specs/`. Recoge principios técnicos y de negocio inmutables (estilo Angular, política de testing, accesibilidad, performance, restricciones de seguridad, no acoplar UI a un proveedor concreto, etc.). Cualquier plan que viole un artículo de la constitución se rechaza o el artículo se modifica explícitamente.

### Fase 1 — `spec` (qué y por qué)
**Entrada:** descripción de negocio en lenguaje natural.
**Salida:** `specs/NNN-slug/spec.md` siguiendo plantilla.
**Contiene:**
- Contexto y problema.
- User stories con valor explícito.
- Criterios de aceptación medibles (notación EARS, ver §5).
- Requisitos no funcionales (performance, seguridad, observabilidad, accesibilidad).
- Out of scope explícito.
- Bloque `[NEEDS CLARIFICATION]` con preguntas abiertas.

**Prohibido en la spec:** elecciones tecnológicas, nombres de librerías, detalles de implementación. Si te ves escribiendo "RxJS BehaviorSubject" en una spec, eso pertenece al plan.

**Checkpoint humano:** la spec se aprueba antes de planear. Sin aprobación → no hay plan.

### Fase 2 — `plan` (cómo)
**Entrada:** spec aprobada + constitución.
**Salida:** `plan.md`, opcionalmente `data-model.md`, `contracts/`, `research.md`.
**Contiene:**
- Decisiones técnicas con rationale trazable a un requisito.
- Stack y librerías.
- Contratos de API/eventos (schemas, status codes, idempotencia, retries).
- Estrategia de testing (orden: contract → integration → e2e → unit).
- Fases de implementación con prerequisitos.
- Verificación contra cada artículo de la constitución (gate).

**Checkpoint humano:** el plan se aprueba antes de tasks.

### Fase 3 — `tasks` (los pasos)
**Entrada:** plan aprobado.
**Salida:** `tasks.md` con tareas atómicas.
**Reglas:**
- Una tarea = una unidad shippable independientemente.
- Cada tarea: input, output esperado, criterio de éxito, dependencias.
- Marca `[P]` si la tarea es paralelizable (no toca los mismos archivos que otra `[P]`).
- Una tarea por endpoint, por entidad, por contrato. Granularidad fina.

**Checkpoint humano:** las tasks se aprueban antes de implementar.

### Fase 4 — `implement`
Se ejecutan las tasks respetando dependencias y gates. El agente (Claude/dev) puede paralelizar tareas `[P]`. Cualquier desvío del plan se registra en `CONTRACT.md` como decisión y se actualiza la spec si corresponde.

## 4. El contrato vivo (`CONTRACT.md`)

`/specs/CONTRACT.md` es **el contrato vivo del equipo**. Su propósito:
1. **No perder trabajo entre sesiones**: cada decisión que tomamos queda escrita.
2. **Roadmap visible**: lista priorizada de specs futuras.
3. **Registro de cambios de alcance**: si en mitad de implementación cambia algo, queda asentado.
4. **Riesgos abiertos**: lo que sabemos que no sabemos.

Se actualiza al final de cada sesión sustantiva. Es el primer archivo que se lee al retomar trabajo.

## 5. Notación EARS para criterios de aceptación

EARS = Easy Approach to Requirements Syntax. Cinco patrones que eliminan ambigüedad:

| Patrón | Forma | Cuándo usar |
|---|---|---|
| Ubiquitous | `THE system SHALL <respuesta>` | Comportamiento siempre verdadero |
| Event-driven | `WHEN <trigger> THE system SHALL <respuesta>` | Reacción a evento puntual |
| State-driven | `WHILE <estado> THE system SHALL <comportamiento>` | Comportamiento durante un estado |
| Unwanted | `IF <condición indeseada> THEN THE system SHALL <respuesta>` | Manejo de error/excepción |
| Optional | `WHERE <feature presente> THE system SHALL <respuesta>` | Capacidades condicionales |

Ejemplo aplicado a webhook Osmosis:
> WHEN Osmosis envía un POST a `/webhooks/osmosis/orders` con firma válida, THE system SHALL responder 2xx en menos de 3s y persistir el evento crudo antes de procesar.
> IF la firma del webhook no valida, THEN THE system SHALL responder 401 y NO persistir el evento.
> WHILE el evento está siendo procesado, THE system SHALL marcarlo como `processing` para evitar doble-procesamiento ante reintentos de Osmosis.

## 6. Guardarraíles (qué SDD nos prohíbe hacer)

1. No abrir PR de feature sin spec. Bug-fixes triviales no requieren spec; cualquier cambio de comportamiento sí.
2. No mezclar fases. Si estás escribiendo el plan y descubres que la spec está incompleta, **vuelves a la spec**, no parches en el plan.
3. No elegir tecnología en la spec.
4. No escribir features especulativas. Todo requisito tiene una user story con valor.
5. No tener specs de >3 páginas. Si pasa, partir en sub-features.
6. No skip de checkpoints humanos.
7. Si Cereza/Osmosis devuelve algo distinto a lo especificado, primero actualizamos spec → plan → código. No "lo arreglamos rápido" en código.

## 7. Cómo trabajamos con Claude Code bajo SDD

- Cada sesión arranca leyendo `CONTRACT.md` y la spec activa.
- Claude **debe preguntar antes de asumir**. Las preguntas se resuelven en `[NEEDS CLARIFICATION]` y luego pasan a la spec.
- Claude propone, el humano aprueba, y la aprobación queda en `CONTRACT.md` con fecha.
- El agente nunca implementa sin tasks aprobadas. Si la urgencia exige saltar el flujo, se registra como excepción en `CONTRACT.md`.

## 8. Glosario

- **Spec**: documento que captura intent + criterios de aceptación + NFRs.
- **Plan**: documento técnico que dice cómo cumplir la spec.
- **Tasks**: descomposición ejecutable del plan.
- **Constitution**: principios inmutables del proyecto.
- **Contract (vivo)**: bitácora de roadmap, decisiones y riesgos.
- **EARS**: notación estándar para criterios de aceptación.
- **Cereza/Osmosis**: proveedor tercero (`https://osmosis-api.guiacereza.tech/api`).
- **Inbound webhook**: petición HTTP que Osmosis envía a Katuq (vs *outbound*: nosotros llamamos a Osmosis).

## 9. Fuentes y lecturas

- GitHub Spec-Kit: https://github.com/github/spec-kit
- Spec-Driven methodology: https://github.com/github/spec-kit/blob/main/spec-driven.md
- GitHub Blog — SDD with AI: https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/
- Microsoft for Developers — SDD with Spec Kit: https://developer.microsoft.com/blog/spec-driven-development-spec-kit
- BCMS — SDD Definitive 2026 Guide: https://thebcms.com/blog/spec-driven-development
- ngconf — SDD para Angular: https://medium.com/ngconf/spec-driven-development-stop-vibe-coding-c42a1f948b26
