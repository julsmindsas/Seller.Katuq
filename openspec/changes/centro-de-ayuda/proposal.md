# Centro de ayuda: base de conocimiento, Opttia que responde y «Qué hay de nuevo»

**Estado:** borrador — pendiente aprobación de Daniel
**Tickets:** 1441 (1/5), 1440 (2/5), 1439 (3/5), 1438 (4/5), 1437 (5/5) · **Decisión:** D-628 (por registrar en `specs/CONTRACT.md`)
**Origen:** tickets creados por Daniel el 2026-10-29 (18:33 UTC) por MCP. Los cinco llegaron con 0 comentarios, sin adjuntos y sin tickets relacionados.

## Por qué

Katuq no tiene dónde explicar cómo funciona la plataforma. Hoy el comercio escribe a soporte (117 tickets resueltos según el ticket 1441) o le pregunta a Opttia, que solo conoce los documentos de marca de cada comercio, no la plataforma. Se pide una base de conocimiento única que alimente cuatro cosas: un centro de ayuda dentro del Seller, un bloque en el panel de Opttia, las respuestas de Opttia y un sitio público indexable. Opttia además redacta borradores de artículos y de novedades; una persona los aprueba.

## Qué ya existe (leído el 2026-11-03, sin consultar datos, D-579)

| Pieza | Dónde | Qué cubre |
|-------|-------|-----------|
| Conocimiento **por empresa** | backend `services/brandKnowledge.js`, `brandKnowledgeCore.js` (BM25 léxico, 3 fragmentos) y herramienta MCP `search_company_brand_knowledge`; permiso `marca.view` (`opttiaAccessPolicy.js:5`) | PDF/TXT de políticas del propio comercio (3 documentos, 20 en premium, 5 MB). **No es la base global ni tiene editor, tipos, estados ni visibilidad.** Se reutiliza su ranking y su patrón de aislamiento por empresa. |
| Chat básico de Opttia | `kai/adk_agent/endpoints/katuq_basic_chat_endpoint.py:45-68` | Consulta solo el MCP de la empresa, cita el documento, máximo cuatro consultas. No conoce la plataforma ni ofrece abrir un ticket cuando no sabe. |
| Panel de Opttia | `shared/components/floating-button/floating-button.component.html` | «Consulta rápida», «Opttia completa» y «Soporte y seguimiento» (Contactar soporte, Mis tickets, Mis ideas). **No hay bloque «Centro de ayuda».** |
| Soporte | `components/soporte/` (Mis tickets, Mis ideas); una idea es un ticket con `motivo: 'idea'` (`opinar-modal.component.ts:20`); el ticket resuelto guarda texto y versión de la resolución (`confirmacion-resolucion-ticket`) | La procedencia (ticket, idea, versión) ya existe como dato. |
| **Notas de versión (D-567, ticket 1377)** | `notas-version.json` en la raíz, `update-version.js:162-209`, `src/assets/version.json` (`version`, `publicada`, `notas`), `version-check.service.ts`, `aviso-actualizacion` | Ver abajo: cubre una parte de 5/5. |
| Novedad de una sola vez | `shared/services/novedades.service.ts` (D-546, catálogo estático, «visto» en `localStorage`) y `novedad-modal` | Una ventana por anuncio; no es un historial. |
| Versión en el menú | `sidebar.component.html:451`, un `<span class="version-badge">` sin clic | El clic que pide 5/5 no existe. |

No hay en el código ninguna pantalla, ruta ni colección de «centro de ayuda» (la única coincidencia es una clave de traducción sin uso, `Knowledgebase`, `es.json:432`).

### ¿D-567 cubre parte de 5/5? Sí, la entrada de datos, no el resto

D-567 ya resuelve: quien sube un cambio visible escribe una nota en lenguaje del comercio (`NUEVO`/`MEJORA`/`CORRIGE`), el build la empaqueta en `version.json` solo si es posterior a la última publicación y el comercio la ve una vez al cargar la versión. **Esta propuesta no la reemplaza: la usa como fuente.** Lo que D-567 no hace y 5/5 pide: agrupar por módulo, pasar por aprobación, enlazar cada punto a su artículo y a la idea de origen, avisar a quien propuso la idea, conservar el historial por versión (`version.json` solo trae la última), mostrarlo en el centro (interno y público), avisar en el panel de Opttia y abrirlo desde el número de versión del menú. Las notas no traen módulo ni versión propia; ver pregunta 3.

## Fases (en este orden; cada una se aprueba y se publica por separado)

1. **Base de conocimiento y editor (1441).** Modelo del ticket, dos capas (global y por empresa), editor para súper admin con bandeja de borradores, historial de versiones, y 20-30 artículos iniciales en borrador a partir de los tickets resueltos (corrida única, con `--dry-run` primero).
2. **Centro de ayuda y sitio público (1440).** Bloque en el panel de Opttia, página `/ayuda` con buscador, categorías y «¿Te sirvió?», sugerencias al crear un ticket y sitio público de la capa global (`ayuda.katuq.com`).
3. **Opttia responde (1439).** Herramienta de solo lectura que busca en global + capa de la empresa, cita con enlace, no inventa y ofrece abrir un ticket; «¿Cómo funciona esto?»; registro de preguntas sin respuesta y métricas.
4. **Artículos automáticos (1438).** Borradores desde ticket resuelto, idea implementada, preguntas repetidas y versión nueva, con anonimización obligatoria y marca «Por revisar». La fuente «uso de módulos» queda fuera de esta entrega (pregunta 5).
5. **Qué hay de nuevo (1437).** Nota de versión redactada desde `notas-version.json`, aprobada y enlazada; sección interna y pública, aviso en el panel y clic en la versión del menú.

## Enfoque propuesto (a aprobar; el detalle va en `design.md`)

- **Dónde vive.** Opción recomendada: una colección `helpArticles` (campos `scope: global|company`, `company`, `status`, `visibility`, `module`, `routes`, `appliesToVersion`, `provenance`) y su historial `helpArticleVersions`. Los datos viven en Postgres por el adaptador (D-579), así que **cada consulta nueva necesita su índice** (`scope`, `status`, `company`, `module`). Opción descartada: archivos en el repositorio, porque no sirven para el editor, la capa por empresa ni el flujo de aprobación. **Las reglas del proyecto exigen aprobación expresa para colecciones nuevas** (pregunta 1).
- **Búsqueda.** Léxica, reutilizando `brandKnowledgeCore.rank`, sobre título, resumen y contenido ya filtrados por visibilidad. Sin embeddings ni motor nuevo (D-257 y «sin capas de cache nuevas»).
- **Cómo la consulta Opttia por el ADK.** Una herramienta MCP nueva, `search_help_center`, de solo lectura, en `tools/` del backend (junto a `searchCompanyBrandKnowledge.js`). El ADK ya habla con Katuq solo por MCP, así que el cambio en `kai/adk_agent` es una línea de instrucción y el nombre de la herramienta; esta propuesta no lo toca. Como `get_company_brand_voice`, no depende de un permiso de módulo del rol (así no se cambian roles por efecto lateral). La empresa sale de la sesión validada (`context.mcpCompany`), nunca del texto. Nace apagada con `featureFlags.centroDeAyuda` por empresa y un interruptor global en `config/feature_flags` (D-385, D-505); no se agrega nada al `.env`.
- **Generación.** `pedirJsonAOpttia` (`services/ai/opttiaJson.js`, camino único de IA no conversacional desde D-257). El texto se anonimiza **antes** de enviarlo al modelo y se revisa **después** de recibirlo.
- **Sitio público.** Un endpoint público que devuelve solo una lista blanca de campos de artículos `global`, `published` y `public`, sin cabeceras de empresa y sin leer la capa por empresa. Sitemap y datos estructurados (`FAQPage`, `HowTo`). Empieza con `noindex` hasta que Daniel lo apruebe.
- **Pantallas.** Seller: `/ayuda` con carga diferida y `AuthGuard`, base `_config-pagina.scss` (D-400) y el estilo de Mis tickets. Súper admin: dentro de `superadmin` con `AdminGuard`. Capa por empresa: pantalla de Configuración para la familia de administradores. HTTP solo con servicios sobre `BaseService`.

## No-goals

- Publicación automática sin aprobación (el ticket la deja "más adelante").
- Traducciones de los artículos (solo español) y buscador semántico.
- Cambiar el cron o el formato de D-567, salvo la adenda opcional de la pregunta 3.
- Tocar pedidos, inventario, pagos o consecutivos. Los tickets se **leen**; no se escriben.
- Capturas o ejemplos con datos reales de comercios, en ninguna capa global.

## Riesgos

- **Fuga entre comercios (el mayor).** La capa global se publica en internet. Control: el artículo global no tiene campo `company`; el publicar corre un escáner (correos, teléfonos, NIT/cédula, números de pedido, nombres de comercios existentes) que bloquea la publicación; las imágenes de un artículo global exigen marcar «sin datos reales»; el endpoint público devuelve una lista blanca; una prueba falla si aparece un campo de la capa por empresa.
- **Inyección en la capa por empresa.** Cada comercio escribe la suya; para Opttia es texto no confiable (como los documentos de marca): no cambia herramientas, permisos ni empresa.
- **HTML enriquecido (XSS).** Se sanea en el servidor al guardar y al publicar; videos solo de dominios permitidos o subidos.
- **Tickets con datos personales.** La carga inicial lee tickets resueltos: se anonimiza antes del modelo, no se guardan los textos originales y la procedencia solo guarda el número.
- **Preguntas de usuarios.** El registro de preguntas sin respuesta puede traer datos personales: se anonimizan, se guarda un hash de la empresa y se fija retención (pregunta 4).
- **Costo del modelo** en la carga inicial y en los disparadores: tope por corrida y por día, y `--dry-run` que solo cuenta.
- **SEO y abuso.** Limitación de tasa en el endpoint público; sin cookies ni registro de IP.

## Diseño y reglas

Tema canónico (`openspec/specs/design-system/spec.md`): acento `#5F3FE0`, plano, sin gradientes ni primarios paralelos; ningún nombre de clase con «p-»; 1440 y 390 px sin scroll horizontal. Textos en `es.json`. Nota de versión al publicar cada fase (D-567). Pruebas nuevas fuera de git (D-566). Este repositorio es público: ni direcciones internas ni llaves.

## Preguntas para Daniel

1. ¿Apruebas las colecciones `helpArticles` y `helpArticleVersions` (recomendado) o prefieres otra ubicación?
2. ¿Ayuda pública en `ayuda.katuq.com` o en una ruta de `katuq.com`? El subdominio exige DNS y certificado: ¿quién lo hace?
3. ¿Se agrega a `notas-version.json` un campo opcional `modulo` (adenda a D-567) para agrupar sin adivinar, o Opttia lo infiere y el súper admin lo corrige?
4. ¿Cuánto se guardan las preguntas sin respuesta (propuesta: 180 días)?
5. «Uso de módulos» (errores frecuentes y abandonos) no tiene hoy telemetría verificada: ¿se deja para una propuesta aparte?
6. Cuando se publica una versión, ¿se avisa a quien propuso la idea o ya basta el correo de «Resolvimos tu ticket»? Hay que verificar si ese aviso sale antes del despliegue.

## Capacidad

Capacidad nueva `centro-de-ayuda` (`specs/centro-de-ayuda/spec.md`).
