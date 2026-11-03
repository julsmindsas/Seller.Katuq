# Propuesta: Mis Ideas, estados propios y rediseño como Mis Tickets

**Estado: borrador — pendiente aprobación de Daniel**

- **Tickets:** 1442 (rediseño de Mis Ideas) y lo pendiente del 1443 (set propio de estados de idea y migración de las ideas existentes).
- **Decisión:** D-627.
- **Origen:** tickets de Daniel del 2026-10-29 y la nota interna del 1443 del 2026-11-03 (commit bcac8677 en `feature/tickets-aws-claude-2`: contadores traducidos, «Nueva idea» abre `/soporte?tipo=idea`, número legible y adjuntos con estilo).
- **Spec:** `specs/soporte/spec.md`. Tasks: se escriben después de la aprobación.

## Why

Una idea es un ticket con `motivo: 'idea'`, así que hoy solo tiene los estados de Support: Pendiente, Haciendo, Resuelto, Archivado. En el 1443 se arregló el síntoma con una traducción en pantalla (Pendiente se ve «En evaluación», Haciendo «En desarrollo», Resuelto «Implementado», Archivado «No viable»), pero:

1. **El comercio no puede distinguir** una idea recién enviada de una que el equipo ya evaluó o planeó: ambas son «Pendiente». La hoja de ruta que pidió Daniel (Recibida, En evaluación, Planeada, En desarrollo, Implementada, No viable) no se puede expresar.
2. **La traducción vive solo en el front** (`estadoIdea()` en `mis-ideas.component.ts`). El equipo no puede poner «Planeada» y nada del backend entiende el estado de idea.
3. **Mis Ideas se ve distinta a Mis Tickets**: acordeón en lugar de maestro-detalle, tarjetas grandes de contadores, filtros aparte, comentarios con autor «Desconocido», sin respuesta oficial del equipo, sin «me sirve».

## Qué ya existe (verificado, 2026-11-03)

| Pieza | Estado |
|---|---|
| Idea = ticket con `motivo: 'idea'` y `tipoSolicitud: 'idea'` | Existe; `supportSummary.js` ya las cuenta aparte |
| Consecutivo `nroTicket` (D-507) | Existe y la pantalla ya lo muestra |
| Traducción de estados de ticket a estados de idea | Existe solo en el front (bcac8677) |
| Maestro-detalle, píldoras con conteo, buscador, fechas relativas, conversación y adjuntos | Existe en `mis-tickets/` (referencia visual) |
| `resolucion` (texto y versión) escrita solo por el equipo | Existe en el ticket; Mis Tickets la muestra |
| Lista blanca de campos del PUT, con campos solo para el equipo | Existe: `CAMPOS_EDITABLES` y `CAMPOS_SOLO_OPERADOR` en `controllers/errorcenter.js`; el comercio solo agrega comentarios y marca tareas (`escrituraComercio.js`) |
| Estado propio de idea, «me sirve», respuesta oficial destacada | **No existen** |

## What Changes

**1. Estado propio de idea.** Un campo `ideaEstado` en el ticket de la idea, con seis valores: `recibida`, `en_evaluacion`, `planeada`, `en_desarrollo`, `implementada`, `no_viable`. Lo escribe solo el equipo (campo exclusivo del operador, igual que `resolucion`). El comercio nunca lo escribe.

**2. Convivencia con el estado del ticket.** `status` sigue siendo de Support y el tablero no cambia. Reglas:

| `ideaEstado` | `status` que se proyecta |
|---|---|
| Recibida, En evaluación, Planeada | Pendiente |
| En desarrollo | Haciendo |
| Implementada | Resuelto |
| No viable | Archivado |

- Cuando el equipo cambia `ideaEstado`, el backend ajusta `status` según la tabla (y deja su entrada en `historyStatus`). Así el tablero, las métricas (`supportSummary.js`) y las notificaciones actuales siguen funcionando con los mismos cuatro estados.
- Si una idea no tiene `ideaEstado`, el comercio ve el estado derivado de `status` con la misma tabla en sentido inverso (Pendiente a Recibida, Haciendo a En desarrollo, Resuelto a Implementada, Archivado a No viable). Es decir, **la pantalla funciona antes y después de migrar**.
- Si alguien mueve `status` desde el tablero y contradice `ideaEstado` (por ejemplo, pasa a Resuelto una idea que está Planeada), manda lo que se movió último: el backend recalcula `ideaEstado` solo si la contradicción cruza el cierre (Resuelto o Archivado); en otros casos lo deja.
- Las ideas no piden «¿Se resolvió?» (D-328): ese flujo es de incidencias. Hay que verificar en `confirmacionResolucion.js` que una idea en Resuelto no lo dispare.

**3. Migración de las ideas existentes.** Script con `--dry-run` primero, que:
- lista cada idea con su `status` actual y el `ideaEstado` propuesto (Pendiente a Recibida, Haciendo a En desarrollo, Resuelto a Implementada, Archivado a No viable);
- no toca `status`, comentarios, adjuntos ni ningún otro campo, y **nunca borra datos**;
- es idempotente (no pisa un `ideaEstado` ya puesto);
- deja para revisión caso a caso las que Daniel indicó en el 1443: «revisar caso a caso» (por ejemplo, un Pendiente que ya se evaluó y debería ser En evaluación o Planeada), con un informe que Daniel aprueba antes del `--apply`.
Como la lectura deriva el estado cuando falta, la migración no es requisito para que la pantalla funcione; solo fija lo que hoy se infiere.

**4. Rediseño maestro-detalle** como Mis Tickets (ticket 1442): encabezado con migas «Soporte / Mis ideas», subtítulo, refrescar y «+ Nueva idea»; una franja con píldoras con conteo (Todas, Recibidas, En evaluación, Planeadas, En desarrollo, Implementadas, No viables), buscador y selector de fechas; lista a la izquierda (consecutivo, estado, título, fecha relativa, ícono de adjuntos) y detalle a la derecha (Abierta, Propuesta por, Última respuesta, Módulo/Categoría, descripción, adjuntos con vista previa); sección «Conversación» con avatar real del autor, estado vacío y caja de respuesta como en tickets. Se eliminan la tarjeta de filtros aparte y las tres tarjetas grandes. Se reutilizan las clases `cfg-*` y los patrones de `mis-tickets`; sin gradientes ni primarios paralelos. Solo cambia la presentación de lo que ya funciona; el comportamiento nuevo es lo de los puntos 1 a 3 y 5.

**5. «A mí también me sirve» y respuesta del equipo.**
- Botón con contador. Un voto por usuario, se puede quitar. Se guarda en el ticket, pero no por el PUT genérico: el comercio hoy no puede escribir campos nuevos, y con un PUT de copia vieja se pisarían los votos. Se propone **un endpoint propio** (`POST /v1/support/ticket/:id/apoyo`, transaccional, con la empresa de la sesión), y `apoyosIdea` queda fuera de ambas listas de campos escribibles.
- Respuesta oficial del equipo destacada arriba de la conversación. Se propone reutilizar `resolucion` (texto y versión opcional), que ya es solo del equipo y ya llega a la pantalla; no se crea un campo nuevo.
- Al pasar a Implementada, si la `resolucion` trae versión, se enlaza a las novedades de esa versión. Esa pantalla depende del ticket del Centro de ayuda; mientras no exista, se muestra el texto de la versión sin enlace.

## Write-set declarado

No toca inventario, productos, precios ni Shopify. Escribe solo la colección de tickets de soporte: `ideaEstado`, `apoyosIdea`, `status` e `historyStatus` (este último solo por la proyección). La PUT del comercio sigue limitada a comentarios y tareas. Contract test: el comercio no puede escribir `ideaEstado`, `apoyosIdea` ni `status`, y un ticket que no es idea nunca recibe `ideaEstado`.

## Decisiones que necesito de Daniel

1. **Campo `ideaEstado` en el ticket** (sin colección nueva). ¿Aprobado?
2. **Endpoint de apoyo** (`POST /v1/support/ticket/:id/apoyo`). ¿Aprobado? Es el único endpoint nuevo.
3. **Alcance del «me sirve».** Hoy cada comercio solo ve sus propias ideas, así que los votos serían de los usuarios de la misma empresa. Para priorizar entre comercios haría falta un tablero compartido de ideas, que expone ideas de unos comercios a otros y necesita su propia propuesta. Recomendación: ahora solo por empresa, y el equipo ve el total en Support.
4. **Respuesta oficial en `resolucion`.** ¿Basta, o prefieres un campo aparte?
5. **Ideas en Mis Tickets.** Hoy aparecen también en Mis Tickets (se filtran por empresa y no archivadas). ¿Se dejan, o se ocultan allí cuando exista Mis Ideas completa?
6. **Quién cambia `ideaEstado`:** hay que sumarlo a la app de Support (repositorio y despliegue aparte). Mientras no esté, la migración y la derivación mantienen todo funcionando.

## Fases

1. Backend: `ideaEstado` (campo exclusivo del equipo), proyección a `status`, derivación y pruebas del write-set.
2. Migración con `--dry-run`, informe y `--apply` tras aprobación.
3. Front: rediseño maestro-detalle con los seis estados.
4. «Me sirve» y respuesta oficial.
5. Selector del estado de idea en Support y enlace a novedades.

## No-goals

- No se cambia el set de estados de los tickets normales ni el tablero de Support.
- No hay votación entre comercios, ni ideas públicas, en esta propuesta.
- No se tocan comentarios, adjuntos ni notas internas existentes; no se borra nada.
- No se crean colecciones ni endpoints «v2».

## Riesgos

- **Dos estados que se contradicen.** Mitigación: la tabla de proyección en un solo lugar del backend y el estado derivado cuando falta `ideaEstado`.
- **Rompe el tablero de Support si `status` cambia mal.** Mitigación: solo se usan los cuatro valores actuales; prueba que `supportSummary` cuenta igual antes y después.
- **Notificaciones al comercio.** Pasar a Resuelto o Archivado puede disparar los avisos actuales; hay que confirmar con el notifier cuáles salen para una idea.
- **PUT con copia vieja** pisando votos: por eso el endpoint propio y la lista blanca.
- **Datos en Postgres (D-579).** El script corre contra el backend de desarrollo en `--dry-run` y nunca contra Firestore.
