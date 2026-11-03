> **Estado:** borrador — pendiente aprobación de Daniel.
> **Tickets (categoría «Catálogos (KCAT)», proyecto KLAN, todos Pendiente):**
> - KLAN-E1 `cZWg3igShEdmKuF4XIrv` (nroTicket 1396)
> - KLAN-E2 `DsGyAYppwRksUAYnTCTz` (1399)
> - KLAN-E3 `DqGSoB9vIJl2Roj7Hjjm` (1397)
> - KLAN-E4 `tiJeQrpV6Jmf63Vtqz74` (1398)
>
> **Decisión:** D-633.
> **Origen:** Jairo Arango (Spec «Landings Katuq» v1.1, octubre 2026, con Mockups v1.0 de L1, L3 y L6); tickets creados por Daniel el 25-oct, con Julián y Santiago de apoyo y Jairo como observador. La ampliación de L7 a L10 en KLAN-E4 la aprobó Jairo el 24-oct.
> Esta propuesta es el **paraguas**: fija alcance, orden, dependencias, límites y preguntas. No es para implementar. Cada épica abre su propio cambio OpenSpec (spec, design, tasks) con su aprobación, y el número de decisión de cada una lo asigna quien la registre en `specs/CONTRACT.md`.

## Why

Jairo quiere que un comercio pueda pautar en Meta, Google o TikTok y ver cada peso convertido en pedido o en lead dentro de Katuq. La idea central: **el sector elige el tema visual y el objetivo elige la estructura**. Una landing tiene una página, un objetivo y un solo botón; mide de dónde vino el visitante; y sale con SEO y con lo necesario para que ChatGPT, Perplexity y los resúmenes de Google la citen.

Son 4 épicas, 15 semanas-equipo según los tickets (E1 4, E2 3, E3 3 y E4 5 tras la ampliación; sin validar). Son el anexo de KCAT: usan el mismo motor de catálogo, carrito y checkout, y por eso arrancan solo cuando KCAT-E1 y KCAT-E5 (D-630, todavía en borrador) estén en «Haciendo».

El hallazgo principal: **Seller ya tiene casi toda esta infraestructura**, porque una landing hoy es un sitio de tipo `landing` y los sitios ya miden, atribuyen, reportan al servidor y publican con SEO. El mayor riesgo es construir un segundo sistema de landings (colección propia, endpoints propios, píxel propio) al lado de los sitios. Esta propuesta existe para evitarlo y para decir con exactitud qué falta de verdad.

Lectura completa: los 4 tickets con descripción, comentarios y adjuntos. Comentarios: KLAN-E1 1, KLAN-E2 1, KLAN-E3 1 y KLAN-E4 2 (el segundo es la ampliación L7 a L10, estimación de 4 a 5 semanas). Se leyó la Spec v1.1 (14 páginas, que reemplaza a la v1.0 adjunta en los mismos tickets) y los Mockups (4 páginas, solo el texto; las pantallas son imágenes y no se evaluaron). La spec de KCAT (v3.1) está adjunta en KCAT-E1 y no se releyó: se usó su paraguas D-630.

## Qué ya existe frente a lo que pide cada épica

Verificado en el código de los worktrees (front `wt-front-aws-claude-2`, backend `wt-back-aws-claude-2`). No se leyó ni escribió ninguna base de datos (D-579); el estado de producción no se midió.

| Épica | Ya existe | Falta de verdad |
|---|---|---|
| **E1 motor y L1/L3/L6** (1396) | Sitios de tipo `landing`, `catalogo` y `tienda` (`TIPOS_SITIO`, `controllers/sites.js:67`). Asistente «¿Qué quieres lograr?» con cuatro intenciones que ya mapean a tienda, catálogo y landing de contactos o de negocio (`sitios-lista.component.ts:106-141`); objetivos `vender`, `contactos`, `conocer` (`data/siteTemplates.js:1282`); plantillas por sector; Mi marca. Menú «Landings» (`nav.service.ts:582`, D-546). Bloque `formulario` que crea **prospecto** o cotización con origen de campaña (`siteBlocks.js:920-932`, `controllers/sites.js:1436-1466`; colección `prospects`). Tienda con carrito, checkout y pedido (`crearPedido`, `controllers/sites.js:2881`). Render en servidor (`utils/siteHtml.js`), subdominio de la marca, secciones con fecha desde/hasta (`siteTemporadas.js`), dominio propio (`dominioPropio`, `controllers/sites.js:645`), IA que redacta y edita páginas (`services/sites/paginaDesdeDescripcion.js`, `editarPaginaConIA.js`). | Los tipos **L1, L3 y L6 como secuencias de un solo objetivo y un solo botón**, sin menú y con botón fijo en móvil; la ruta propia `marca.katuq.com/l/{slug}` y el alias `katuq.link/{slug}`; el interruptor «sola» o «dentro del sitio» con redirección 301; bandeja «Leads de landing» con asignación a un comercial y aviso en menos de un minuto; lead magnet con entrega automática; checkbox de consentimiento Ley 1581 con fecha y texto en el formulario de leads (solo existe para el boletín) y fusión de leads repetidos; `source=LANDING` y `landingId` en el pedido; vigencia de la landing completa («oferta terminada»); piloto con Almara. |
| **E2 rastreo** (1399) | **Es la más avanzada.** Captura de utm, identificadores de clic (`gclid`, `fbclid`, `ttclid`, `msclkid`), primer y último toque, y `ref` de WhatsApp (`utils/siteAtribucion.js:17-24`, ticket 1238); llega al lead, la cotización y el pedido (`controllers/sites.js:1445, 1759, 3588`). Conversions API de Meta, conversiones mejoradas de Google y Events API de TikTok desde el servidor, con el mismo identificador de evento para no duplicar (`services/medicionServidor.js:99, 172, 225`, tickets 1240 y `pauta-confiable-sitios`). Eventos en el navegador para GTM, GA4, Meta y TikTok (`utils/siteTienda.js:510-553`, `siteHtml.js:4391-4412`). Aviso de cookies y Consent Mode v2 (`siteHtml.js:3126, 6204`). Eventos en `site_events` (vista, clic, lead, pedido, pago, cita…), baliza `/public/:slug/vista` y `/clic` (`routers/sites.js:293-296`), pantalla de métricas por fuente (`sitios/metricas`, `utils/siteAnalitica.js`) y alertas básicas (`services/sites/metricasConstructor.js`). Los IDs de GTM, GA4, Meta, Google Ads y TikTok se ponen **por sitio** en el editor. Planes: la medición de pauta es solo de pago (`utils/limitesPlan.js:119`). | «Katuq Pixel» como conjunto de eventos propios de la landing (`section_view`, `cta_click`, `checkout_start`, `lead_submit`…) con `landingId` y variante; pantalla **Configuración → Rastreo por comercio** (hoy es por sitio); Microsoft Clarity (no existe); dashboard por landing con desglose por anuncio y variante, periodo anterior y exportación; las tres alertas del ticket (tráfico sin conversión en 48 h, píxel sin eventos en 24 h, landing vencida con tráfico); evento de **lead** server-side; **cifrar los tokens**: hoy `metaConversionsToken`, `ga4ApiSecret` y `tiktokEventsToken` se guardan como texto en el documento del sitio (`siteBlocks.js:1620-1632`) y solo se ocultan en la vista. |
| **E3 SEO y GEO** (1397) | Datos estructurados automáticos: Product y Offer con calificación, FAQPage, Organization u OnlineStore con LocalBusiness si hay dirección, BreadcrumbList y WebSite (`siteHtml.js:5926-6144`, ticket 1255); canonical y `noindex` por página (`siteHtml.js:6948-6953`, `indexable`); `sitemap.xml`, `robots.txt`, `llms.txt` y feed de productos por sitio (`routers/sites.js:154-160`, `controllers/sites.js:1813, 1840, 2169`); velocidad de la tienda en celular (`tienda-celular-y-velocidad`). | Schema `Service` (L4); bloque de **respuesta directa** en las primeras palabras; **hechos citables y fechados** recalculados a diario (RL12); validación del schema que bloquee publicar (RL11); `noindex` por defecto para landings con vigencia (RL10); verificación y lectura de Search Console; robots con control por comercio de los bots de IA (hoy `Allow: /` para todos); presupuesto de peso por plantilla; **medición de visibilidad en IA** (20 a 50 preguntas de referencia por comercio, mensual). |
| **E4 fase 2** (1398) | Agenda y citas (`siteAgenda.js`, `servicios-y-agenda`); «Avísame cuando llegue» y cupones de la tienda (`siteCupones.js`, `tienda-cupones-y-retiro`); reseñas (`siteResenas.js`, `tienda-resenas-compradores`); temporadas con fechas; dominio propio; modo agencia (`modo-agencia-sitios`). | Los tipos L2, L4, L5, L7, L8, L9 y L10; A/B de una sola variable con ganador al 95 %; verificación del certificado y CNAME del dominio propio (hoy se acepta el dominio, falta comprobar que todo el flujo cumple lo del ticket); Clarity; **KAI Campañas**; plantillas de campaña recurrente; landings de vendedor con `?v=` (depende de KCAT-E2.4 y E4.6). |

## Orden y fases

Orden de Jairo: **E1 → E2 → E3 → E4**, cada una con su propio cambio OpenSpec, que se abre al empezarla. Sugerencia de nombres: `klan-e1-motor-y-tipos`, `klan-e2-rastreo`, `klan-e3-seo-y-geo`, `klan-e4-fase-2`.

- **E1** sale con L3 y L6 (no necesitan carrito) y con L1 sobre el checkout que la tienda ya tiene; el checkout «de 4 pasos» de KCAT llega cuando KCAT-E1 y E5 estén listos. Es una propuesta de este paraguas; el ticket dice que E1 espera a KCAT (pregunta 2).
- **E2** va después de E1 porque necesita el `landingId` en lead y pedido. Su primera parte (cifrar tokens, Rastreo por comercio) puede ir antes sin esperar.
- **E3** necesita las landings publicadas (E1). El bloque de respuesta directa y los hechos citables dependen de datos de pedidos y reseñas reales.
- **E4** no arranca hasta cerrar E1, E2 y E3. Fase 3 (L11 a L14) queda anotada, sin ticket.
- Funciones nuevas apagadas por defecto, por empresa (D-505), con kill switch propio y piloto en Almara. Un cambio a la vez cuando se toque el pedido (`orders`).

## Alcance de este paraguas

Incluye el orden, las dependencias, los límites y las preguntas. No incluye código, `design.md` ni `tasks.md`.

## No-goals

1. **Duplicar los sitios.** Una landing es un sitio de tipo `landing` con más secciones y reglas; no se crea la colección `landings` de la spec §9, ni otro editor, ni otro render. El «Katuq Pixel» es la baliza y los `site_events` de hoy ampliados.
2. **Endpoints, colecciones o módulos «v2» sin aprobación** (`openspec/config.yaml`). La spec §10 propone `/public/landings`, `/public/leads` y `/public/events`; hoy sus equivalentes son `/v1/sites/public/:slug/lead`, `/vista` y `/clic`. Las colecciones `leads`, `settings/tracking` y `events` de la spec §9 equivalen a `prospects`, la analítica del sitio y `site_events`. Ninguna nueva se crea hasta que Daniel la apruebe.
3. **Escribir productos, precios o inventario (D-134).** La landing lee. Precio, tachado, stock y vigencia salen del motor y **no se escriben a mano** (RL02). Quedan fuera la pestaña de producto «Landing» y las categorías con slug, que escriben el maestro de productos.
4. **Cambiar cuándo se mueve el inventario.** Los pedidos de landing usan el camino de pedidos de la tienda; la reserva al pre-aprobar queda fuera (ver D-630).
5. **Tocar Katuq Página Web o Mis sitios** más allá de agregar tipos y reglas, ni **cambiar la medición de Katuq mismo** (`pauta-hasta-el-pago` es el embudo de Julsmind, otro frente).
6. **Contadores o escasez inventados.** Si el dato no sale del motor, no se muestra.
7. **Llamar modelos de IA directo** o usar Genkit: KAI va por Opttia/ADK (D-257).

## Dependencias

E1 depende de KCAT-E1 (motor y checkout) y KCAT-E5 (temas × modos), ambos en borrador (D-630); la asignación del comercial del lead usa la lógica de KCAT-E7.2. E2 depende de E1 y de `/public/events` de KCAT-E1.9. E3 depende de E1. E4 depende de E1, E2 y E3; sus landings de vendedor, L5 y L9 dependen de KCAT-E2.4, E6.4 y E6. KCOM-E1.6 y E4.8 (D-632) guardan el origen de anuncios de los chats y lo pasan al pedido con la misma estructura de E2.

## Riesgos sobre módulos sensibles

- **Pedidos.** `source=LANDING`, `landingId`, `variantId` y `utm` son campos nuevos del pedido (módulo sensible): un cambio a la vez, con diff aprobado. Hoy el origen de campaña ya viaja con el pedido; hay que reutilizarlo, no duplicarlo.
- **Inventario.** Solo lectura de stock por canal. «Landing» como canal nuevo de bodegas y medios de pago es configuración por empresa, no tiene que cambiar `inventoryService.js`.
- **Datos personales y consentimiento (Ley 1581).** Hoy el formulario de leads no pide el consentimiento marcado. Un lead guarda nombre y celular: hace falta checkbox con fecha y texto de la política y que los píxeles de terceros no disparen sin permiso (RL06; verificar cómo se comporta hoy con el Consent Mode v2).
- **Secretos.** Cifrar los tokens de Meta, Google y TikTok exige migrar los que ya están en texto (con `--dry-run` primero) y no volver a devolverlos al navegador. Los secretos no entran al `.env` por comercio (D-505).
- **Caché del HTML.** El A/B por `sessionId` y el contenido por `utm_content` chocan con el HTML cacheado (`siteCacheClave.js`): hay que decidir qué varía en el servidor y qué en el navegador.
- **Plan.** Hoy Google Ads, la API de conversiones de Meta y TikTok son solo para planes de pago (`limitesPlan.js:119`); la spec dice que el rastreo server-side está «incluido en Katuq Vende». Hay que aclarar cuál plan es ese.
- **Medición de IA (E3.10).** Consultar ChatGPT, Perplexity y los resúmenes de Google de forma automática depende de sus términos y de costo; no se da por viable.
- **Volumen.** Eventos por visita en una base PostgreSQL (D-579): toda consulta nueva sobre `site_events` necesita su índice y agregados por día; sin lectura masiva en pantalla.
- **Diseño.** El panel con `config-pagina` y el design-system (acento `#5F3FE0`, sin gradientes). El diseño de la landing pública es del comercio (Mi marca) y se justifica aparte.

## Cómo se verifica el paraguas

Cada épica cierra con el criterio de aceptación de su ticket más estos comunes: build sin errores; contract test del write-set (la landing no escribe `products`, precios, listas ni inventario); mismo total que la tienda para el mismo carrito; con consentimiento rechazado no sale ninguna petición a Facebook, Google ni TikTok; nota de versión (D-567) cuando el comercio ve el cambio.

## Preguntas para Daniel

1. **Modelo de datos.** ¿Una landing sigue siendo un `sites` de tipo `landing` con más campos (tipo L1 a L10, modo, vigencia, variante), y los leads siguen en `prospects`, en vez de las colecciones `landings`, `leads`, `events` y `settings/tracking` de la spec §9?
2. **Dependencia de KCAT.** ¿E1 espera a KCAT-E1 y E5, o salen primero L3 y L6 y L1 con el checkout de la tienda de hoy?
3. **Tokens en texto.** ¿Se autoriza cifrarlos y migrar los existentes (con `--dry-run`) como primera tarea de E2?
4. **Rastreo por comercio.** ¿«Configuración → Rastreo» pasa a ser la fuente y cada sitio hereda, o se conserva por sitio?
5. **`katuq.link`.** ¿El dominio del alias ya existe y quién configura el DNS y el certificado?
6. **Consentimiento.** ¿Se aprueba el checkbox obligatorio en todo formulario de lead, y la fusión de leads con el mismo celular en 24 h (RL05)?
7. **Pedido con campos nuevos** (`source`, `landingId`, `variantId`): ¿se aprueba como un solo cambio en `orders`, antes de E1, junto con KCAT?
8. **Search Console.** ¿Se aprueba conectar con Google por OAuth (revisión de la app) o se deja la verificación por meta tag?
9. **Medición de IA.** ¿Se aprueba investigarla antes de construirla y con qué presupuesto?
10. **Dominio propio.** Existe `dominioPropio`; ¿alguien lo ha probado de punta a punta con certificado automático?
11. **Tickets de fase 3** (L11 a L14): ¿se crean cuando termine E4?

## Preguntas para Jairo

1. **«Incluido en Katuq Vende»:** ¿el rastreo server-side va en todos los planes o solo en los de pago, como hoy?
2. **Hechos citables** (pedidos entregados, calificación): ¿el comercio autoriza publicarlos? Se calculan solos y nunca se editan a mano.
3. **Lead magnet «cotizador»:** ¿qué debe calcular y con qué datos?
4. **Landings con vigencia y SEO:** `noindex` por defecto si tienen vigencia (RL10). ¿Confirmado, y qué ve el visitante al vencer?
5. **Catálogo por link:** la intención «Mostrar productos con precio» se enlaza al catálogo que ya existe y no es una landing. ¿Confirmado?
6. **Prioridad:** ¿qué pesa más para la primera venta con pauta de Almara, el rastreo (E2) o la nueva estructura (E1)? E2 ya cubre buena parte de la pauta.
7. **Estimaciones:** E2 (3 semanas) y E3 (3 semanas) parten de cero en el ticket, pero hay mucho hecho; ¿se recalculan?

## Impact (del paraguas)

Solo documentación: `openspec/changes/klan-landings/proposal.md` y `specs/landings/spec.md`. Sin código, sin datos, sin endpoints. Cuando se apruebe, se registra D-633 en `specs/CONTRACT.md` y se abre el cambio de E1.
