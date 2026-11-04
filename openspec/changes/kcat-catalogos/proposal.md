> **Estado:** borrador — pendiente aprobación de Daniel.
> **Tickets:** 1389 (E1), 1390 (E2), 1391 (E3), 1392 (E5), 1393 (E4), 1394 (E6), 1395 (E7). Categoría «Catálogos (KCAT)».
> **Decisión:** D-630.
> **Origen:** Jairo Arango, 24-25 oct (Spec v3.1 «Catálogos Katuq», tarea ClickUp wdu9v7c7fc); tickets creados por Daniel el 25-oct.
> Esta propuesta es el **paraguas**: fija alcance, orden, dependencias, límites y preguntas. No es para implementar. Cada épica abre su propio cambio OpenSpec (spec, design, tasks) con su aprobación, y el número de decisión de cada una lo asigna quien la registre en `specs/CONTRACT.md`.

## Why

Jairo pide que el **Catálogo por link** (selección dirigida, temporal) y el **Catálogo web** (vitrina permanente en `marca.katuq.com`) lleguen hasta el pedido real, con la misma lógica de precio, stock, impuestos, domicilio y pago que Venta Asistida: «un solo motor, nada se duplica». Son 7 épicas, unas 22 semanas-equipo según el ticket (3+3+4+3+3+3+3, sin validar).

Hoy el comprador de un catálogo por link solo genera una **cotización** y el catálogo web no tiene carrito. Pero Seller ya tiene una **tienda** (sitios de tipo `tienda`) con carrito, checkout, cupones, promociones, cuenta del comprador, carrito y pago abandonado, recoger en tienda y «Avísame». El mayor riesgo del proyecto es **construir una segunda tienda al lado de la primera**. Esta propuesta existe para evitarlo y para ordenar el trabajo antes de abrir la primera épica.

Lectura completa: los 7 tickets con descripción y comentarios (E1 tiene 2 comentarios; E2, E3 y E5 uno cada uno; E4, E6 y E7 ninguno), la Spec v3.1 (19 páginas) y el código de catálogos, sitios y Venta Asistida. Los mockups (PDF y capturas) no se leyeron: son visuales y las descripciones de los tickets ya traen sus tareas.

## Qué ya existe frente a lo que pide cada épica

| Épica | Ya existe (verificado en código) | Falta de verdad |
|---|---|---|
| **E1 motor** (1389) | Venta Asistida calcula precio, IVA, domicilio y pago **dentro del componente**: `crear-ventas.component.ts` tiene 5.641 líneas. No existe `PricingService`, `StockService` ni `OrderService` de catálogo. Ya hay un `CartService` (`shared/services/cart.service.ts`) que es del POS: el nombre del ticket choca. Precio por tipo de cliente: `precioParaCliente` (`functions/utils/vitrinaProducto.js:138`) y `preciosDeSesion` de la tienda. La tienda ya crea pedidos con `crearPedido` (`controllers/sites.js:2881`, `typeOrder: "E-commerce"`, `estadoPago: "Pendiente"`, canal «Tienda en línea», `utils/siteOrden.js:342`). | Extraer la lógica sin cambio visible; campos `source`, `catalogId`, `sellerId`, `checkoutMethod`, `utm` en el pedido; API pública del catálogo; pestaña «Catálogo» en el producto; eventos. |
| **E2 por link** (1390) | `/cotizaciones/catalogos` (lista, detalle, link `/cat/{token}`, hasta 200 productos, vistas, solicitudes), `controllers/catalogos.js` y `/v1/catalogos/*`; página pública Angular `catalogo-publico`. La solicitud entra como cotización por `cotizaciones.create`. Colección `catalogos`. | Selección por árbol de categorías, destinatario y lista de precios, checkout de 4 pasos, resultado Pedido, QR, `?v=`, URL corta, OG, migración de los 5 catálogos de Almara sin romper links. |
| **E3 web** (1391) | `/sitios/catalogos` = lista de sitios de tipo `catalogo` (asistente, plantillas por sector, subdominio, Mi marca). Las páginas públicas de sitios salen del servidor (`utils/siteHtml.js`, ya con SEO). La **tienda** ya tiene carrito, checkout, cupones, promociones, retiro, cuenta del comprador y seguimiento (`tienda-cuenta-comprador`, `tienda-cupones-y-retiro`, `tienda-promociones-automaticas`). Los productos entran hoy por el canal «Página Web». | Decidir si «Catálogo web» es una **configuración del sitio tipo `catalogo`/`tienda` actual** o algo nuevo (ver Preguntas 1 y 2). Reseña, secciones fijas, canal «Catálogo web», panel por pestañas, piloto Almara. |
| **E5 temas** (1392) | Las plantillas del asistente (`data/siteTemplates.js`), una plantilla «Producto único» (backend `plantilla-tienda-un-producto`) y `tienda-celular-y-velocidad`. | Esquema `theme`, detección de modo por tamaño, 5 modos × 5 temas, temas nuevos. |
| **E4 medición y KAI** (1393) | `site_events` y métricas de sitios, reporte semanal de KAI, `tienda-carrito-abandonado`, `tienda-pago-abandonado`, Opttia/ADK para la IA (D-257). | Dashboard por catálogo y vendedor, plantillas de seguimiento, KAI que toma el pedido (texto y voz), links por vendedor. E4.3 **ya existe** en la tienda. |
| **E6 comprador** (1394) | «Avísame cuando llegue», favoritos y «Mis pedidos» en la tienda; tabla de cantidades y cantidad mínima en Venta Asistida. | Link de carrito prearmado, volver a pedir, promesa de entrega, cuotas visibles, mensaje de regalo, comprobante. |
| **E7 comercio** (1395) | Estados de pago `Pendiente` → `PreAprobado` → `Aprobado` ya existen (`list.component.ts:1443`); factura electrónica; CRM de leads. | Bandeja de pre-aprobación, asignación de comercial, reserva al pre-aprobar, duplicados, envío masivo, reporte por fuente. |

## Orden y fases

Orden de Jairo: **E1 → E2 → E3 → E5 → E4 → E6 → E7**. Cada épica es una fase con su propio cambio OpenSpec, que se abre **al empezarla** y no antes. Sugerencia de nombres: `kcat-e1-motor-compartido`, `kcat-e2-catalogo-por-link`, `kcat-e3-catalogo-web`, `kcat-e5-temas-y-modos`, `kcat-e4-medicion-y-kai`, `kcat-e6-experiencia-comprador`, `kcat-e7-experiencia-comercio`.

- E1 es la base y lo más delicado: sale **primero con Venta Asistida sin cambio visible** y con la prueba de regresión del ticket (10 carritos reales de Almara, mismos totales).
- E2 antes que E3 porque el catálogo por link ya tiene tráfico real y valida el checkout con menos riesgo.
- E5 y E4 dependen de que E2 y E3 estén publicados. E6 y E7 dependen de E1.12 (estados) y E1.9 (eventos).
- Cada fase se corta en cambios chicos: en módulos sensibles (pedidos, inventario, consecutivos), **un cambio a la vez, con su diff aprobado**.

## Alcance de este paraguas

Incluye: el orden, las dependencias entre épicas, los límites que todas respetan, las decisiones que hay que tomar antes de E1 y la lista de preguntas. No incluye código, ni `design.md`, ni `tasks.md`.

## No-goals (lo que no debe pasar)

1. **Duplicar la tienda (sitios).** No se construye un segundo carrito, checkout, cupones, cuenta del comprador, carrito abandonado ni página pública si la tienda ya lo hace. Si el catálogo web necesita una función que la tienda tiene, se reutiliza o se extrae a un servicio compartido, nunca se copia.
2. **Escribir precios o inventario desde el catálogo (D-134 y `openspec/config.yaml`).** El catálogo **lee** `products`, precios, tipos de cliente y existencias. Su write-set: `catalogos` (o el sitio), eventos de analítica, prospectos y pedidos creados por el camino existente. Queda prohibido escribir `products`, variantes, categorías, precios por cliente, listas de precios, `inventory`, `inventoryMovement` y Shopify. La pestaña «Catálogo» del producto (E1.7) y las categorías con imagen y slug (E1.8) **escriben el maestro de productos**: son una excepción que pide propuesta y aprobación propias, no entra en este paraguas.
3. **Crear endpoints, módulos o colecciones «v2» sin aprobación** (`openspec/config.yaml`). La Spec §8 propone `companies/{id}/catalogs` y `catalogEvents`, y §9 un árbol `/public/catalogs/*`. Ninguno se crea hasta que Daniel lo apruebe en la épica correspondiente; la alternativa por defecto es ampliar `catalogos` y `sites` y reutilizar `site_events`.
4. **Cambiar cuándo se mueve el inventario.** Los pedidos de catálogo entran por el camino de pedidos de hoy. La reserva «al pre-aprobar» (E1.12, E7.3) cambia la regla de D-204 (la tienda descuenta al crear) y toca `inventoryService.js`: queda fuera de este paraguas y exige su propia propuesta.
5. **Que el comercio note un salto.** Los 5 catálogos de Almara y los links `/cat/{hash}` siguen funcionando el día del despliegue; un catálogo web ya creado se ve igual hasta que el comercio cambie de tema.
6. **Tocar «Mis sitios», Landings o Katuq Página Web.** El catálogo web no es página web.
7. **Llamar modelos de IA directo o usar Genkit.** KAI va por Opttia/ADK (D-257).

## Dependencias entre épicas

E2 y E3 dependen de E1 (servicios, API pública, campos del pedido). E5 depende de E3 y se aplica también a E2. E4 depende de E1.9 y de E2/E3 publicados. E6 y E7 dependen de E1.12. E7.10 depende de Facturación electrónica y de D-625 (`facturar-desde-pendiente`, abierta). E1.14 depende de las notificaciones unificadas de pedido (`orderNotificationService`).

## Riesgos sobre módulos sensibles

- **Pedidos y pagos:** crear pedidos públicos y un webhook de pago por catálogo abre un endpoint que cualquiera puede llamar. Hereda los frenos de la tienda (`pedidoLimiter`, solo productos publicados, HMAC y reconciliación de `tienda-pago-abandonado`). Sin ellos, un script llena Pedidos de basura.
- **Inventario:** el pedido de catálogo descuenta por la regla vigente; si E1.12 o E7.3 cambian esa regla, afecta POS, ventas, fulfillment y los flows de Shopify de OH MY STORE. `PreAprobado` alimenta `is_paid` hacia Cereza y Shopify (ver `facturar-desde-pendiente`): un pedido de catálogo pre-aprobado no puede salir como «pagado» por error.
- **Extraer el motor de Venta Asistida:** `crear-ventas.component.ts` (5.641 líneas) es la pantalla que más vende. Una regresión silenciosa en IVA o domicilio afecta a todos los comercios. Por eso la prueba de 10 carritos va **antes** de mover una sola línea.
- **Consecutivos:** `nroPedido` se sigue generando por el camino existente; ninguna épica crea consecutivos nuevos.
- **Multi-tenancy y datos personales:** la API pública resuelve la empresa por catálogo; el comprador anónimo no puede leer otra empresa ni ver precios de otra lista. Consentimiento Ley 1581 antes de guardar contactos o de recordatorios.
- **IA (KAI):** nunca cambia precios ni descuentos y pide «sí» explícito antes de crear el pedido (guardarraíles de E4.5).
- **Diseño:** pantallas del panel con `config-pagina` y design-system (acento `#5F3FE0`, sin gradientes); los temas públicos de comprador son del comercio (Mi marca) y se justifican aparte.

## Cómo se verifica el paraguas

Cada épica cierra con el criterio de aceptación de su ticket más estos comunes: build sin errores; contract test del write-set (no se escribe `products`, precios, listas ni inventario desde el catálogo); mismo total que Venta Asistida para el mismo carrito y ciudad; nota de versión (D-567) cuando el comercio vea el cambio.

## Preguntas para Daniel

1. **¿«Catálogo web» es el sitio actual con carrito, o un producto distinto?** La tienda (tipo `tienda`) ya hace casi todo lo de E3.5. Mi propuesta: el catálogo web es una **configuración del sitio existente** (reseña, secciones, canal, panel), no una tienda paralela. ¿Se acepta?
2. **¿Qué pasa con las tiendas actuales cuando exista «Catálogo web»?** ¿Conviven, se migran o el catálogo web solo sustituye al tipo `catalogo`?
3. **¿Quién escribe el maestro de productos?** E1.7 y E1.8 (pestaña Catálogo, categorías) escriben `products`. ¿Se aprueba como excepción a D-134 con propuesta aparte, o se guardan esos datos fuera del producto?
4. **Colecciones nuevas:** ¿se aprueba `catalogs` y `catalogEvents` de la Spec §8, o se amplía `catalogos`/`sites` y se reutiliza `site_events`?
5. **Reserva de stock al pre-aprobar (E7.3):** contradice D-204 (la tienda descuenta al crear). ¿Se hace como propuesta propia de inventario, un cambio a la vez, o se descarta?
6. **Validar las estimaciones.** E1 (3 semanas) supone que extraer el motor no frena los arreglos de «Pantalla 2 - Catálogo de Productos». ¿Quién la valida y qué pasa si la estimación crece?
7. **Piloto:** ¿Almara es el único comercio, y se encienden por bandera de empresa (D-505) con kill switch independiente, como las demás funciones nuevas?
8. **Nombre del servicio:** `CartService` ya es del POS. ¿Se renombra el nuevo (por ejemplo `CatalogCartService`)?

## Preguntas para Jairo

1. **Precios (RN14):** el ticket habla de «Sistema de Precios v7.0» y «lista Público». El código hoy resuelve precio por **tipo de cliente** (`precioParaCliente`, `configuracionPrecios`), no por listas con nombre. ¿Qué es exactamente la lista «Público»: el tipo de cliente que marca `esPrecioBase`? ¿Y «Mayorista»?
2. **Bodegas por canal:** el ticket dice que existe «Configuración → Bodegas por canal». La tienda usa una sola `tienda.bodegaId` y el pedido por canal usa las bodegas asociadas del canal. ¿Hay que agregar dos canales nuevos al selector, o la tienda sigue con su bodega?
3. **Estados:** el ticket pide un «Pre-aprobado» que ya existe como estado de pago. ¿«Recibido desde catálogo» (Spec §7) es un estado nuevo o basta `Pendiente` con fuente?
4. **Pago online ya confirmado:** el pedido sigue en `Pendiente` hasta la pre-aprobación manual (RN19). ¿Debe reservarse el stock de inmediato (E7.3) y el cliente ve «pago recibido»? Hoy la tienda concilia el pago y avanza el pedido.
5. **Prioridad real:** E4 a E7 son fases 2 y 3. ¿Se puede adelantar de E6 el **link de carrito prearmado** (la «jugada TAT») sin esperar a E4 y E5?
6. **Dominio y SEO del catálogo web:** SSR y sitemap por subdominio ya existen en los sitios del servidor. ¿Se espera algo adicional al `marca.katuq.com` de hoy?

## Impact (del paraguas)

Solo documentación: `openspec/changes/kcat-catalogos/proposal.md` y `specs/catalogos/spec.md`. Sin código, sin datos, sin endpoints. Cuando se apruebe, se registra D-630 en `specs/CONTRACT.md` y se abre el cambio de E1.
