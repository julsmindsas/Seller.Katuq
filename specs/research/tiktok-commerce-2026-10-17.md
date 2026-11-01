# Viabilidad de TikTok Shop y ventas en LIVE para Katuq

Fecha de consulta: 2026-10-17. Alcance: investigación documental oficial y lectura del código local. No se accedió a cuentas de TikTok, no se verificaron credenciales de un comercio y no se implementó ni aprobó una integración.

## Resultado

**La integración técnica con TikTok Shop es viable, condicionada al mercado, la habilitación del vendedor y la aprobación de la aplicación.** Permite gestionar ventas realizadas en Shop, incluidas las compras desde un LIVE. Esto debe distinguirse de leer comentarios del directo, interpretar intenciones y responder automáticamente: no se confirmó acceso oficial general a esas capacidades para Katuq.

**Para un comercio que opera únicamente en Colombia no está confirmado el acceso a Shop.** Colombia no figura en la lista oficial de disponibilidad consultada. No se encontró anuncio oficial de lanzamiento local ni fecha confirmada. La ausencia en documentación pública no descarta invitaciones privadas; habría que verificarlas con TikTok y la cuenta concreta. México y Brasil sí aparecen en la documentación oficial, pero ello no habilita automáticamente a una empresa colombiana ni garantiza ventas o despachos hacia Colombia.

## Capacidades y límites

| Necesidad | Evaluación |
|---|---|
| Recibir en Katuq pedidos de TikTok Shop | Viable con autorización de la tienda y permisos de Orders. |
| Recibir pedidos comprados durante un LIVE con Shop | Viable mediante la gestión de pedidos de Shop. Identificar la sesión exacta requiere verificar los campos disponibles para el mercado; no asumir que `room_id` existe en todos. |
| Sincronizar cantidades por SKU y bodega | Existe endpoint oficial dedicado; requiere autorización, mapeo inequívoco y alcance aprobado en Katuq. |
| Publicar catálogo desde Katuq | Hay capacidades de listado de productos; sería alcance independiente del inventario, con aprobación propia. |
| Sincronizar despacho y seguimiento | Contemplado por las APIs de fulfillment; depende del modelo logístico y del mercado. |
| Gestionar cancelaciones y devoluciones | Existen capacidades oficiales; requiere definir estados y responsabilidades antes de implementar. |
| Controlar productos del LIVE o consultar sus métricas | Hay categorías oficiales LIVE Shopping y Livestream Tool; los scopes efectivos dependen de la habilitación de TikTok. No se comprobó acceso para Katuq. |
| Leer todos los comentarios del LIVE, responder y crear pedidos por palabra clave | No confirmado con acceso oficial para Katuq. No se promete como parte del conector de pedidos. |
| Vender desde un LIVE llevando a la tienda de Katuq | Alternativa propuesta para Colombia: enlace del perfil cuando esté habilitado, con compra en la web. No equivale al checkout nativo de Shop. |

El endpoint `Update Inventory` usa el permiso amplio `seller.product.write`, aunque la operación documentada actualiza cantidades. El permiso por sí solo no delimita lo que hace nuestro código: cualquier futura implementación deberá restringir las llamadas y probar el write-set. Las reglas actuales de Katuq enumeran InventoryLevel de Shopify, por lo que la autorización para escribir cantidades en TikTok debe quedar explícita en una propuesta aprobada; este informe no la concede.

## Condiciones de acceso

Hay dos habilitaciones distintas:

1. **El comercio:** tienda aprobada en un mercado admitido, verificación comercial, bancaria y operativa según el país, y autorización de acceso a Katuq. No se verificó la elegibilidad de ningún comercio concreto.
2. **Katuq como aplicación:** alta en TikTok Shop Partner Center, elección de categoría y mercados, permisos, pruebas y revisiones aplicables. Para distribuir a varios comercios hay rutas de app pública y privada. Una app privada de tipo Connector también puede requerir revisión: no debe asumirse que evita el proceso.

No se comprobó si la entidad jurídica de Katuq puede completar el onboarding del desarrollador desde Colombia para los mercados deseados. Es una validación previa a comprometer fechas, inversión o lanzamiento. Los plazos de revisión dependen de TikTok.

## Estado observado en Katuq

- `src/app/components/integrations/integrations-directorio.ts:68` declara TikTok Shop con `estado: 'pronto'` y `fuente: 'ninguna'`.
- En los servicios, controladores, routers y nodos de flows revisados no se encontró un conector operativo de TikTok Shop.
- `functions/services/medicionServidor.js:225` en el backend sí implementa TikTok Events API para medición de conversiones de la tienda web. Esto no constituye autorización de Shop ni acceso a comentarios de LIVE. Su aceptación real depende de la configuración y credenciales del comercio; no se probó contra TikTok en esta investigación.
- Los hallazgos históricos de Osmosis/Shopify se leyeron como contexto. No se usaron sus cifras como evidencia actual ni se consultó o modificó Firestore.

## Recomendación de alcance, sin aprobación de implementación

Para comercios que venden en Colombia, evaluar primero una experiencia de venta durante el LIVE con destino a la tienda de Katuq. TikTok documenta enlaces de sitio web en el perfil según el tipo y habilitación de cuenta. La atribución específica de cada directo necesitaría definirse; el píxel existente no la garantiza por sí solo.

Para comerciantes con Shop ya aprobado en un mercado admitido, validar primero el acceso del desarrollador y los permisos; después proponer una primera integración de pedidos, cantidades y despachos. La publicación de catálogo/precios y las automatizaciones del LIVE deben tener alcance separado. Evitar que dos conectores —por ejemplo, uno directo y otro vía Shopify— importen el mismo pedido o descuenten dos veces la existencia.

La propuesta futura deberá respetar multi-tenancy, autorización por tienda, idempotencia, firma y persistencia de eventos, límites de datos personales y separación entre catálogo e inventario. No ampliar los flows mixtos actuales para incorporar este canal.

## Fuentes oficiales

1. [TikTok Shop y Showcase: disponibilidad y compras en LIVE](https://ads.tiktok.com/resources/help/article/tiktok-shopping-and-showcase?lang=en-GB), actualización indicada: junio de 2026. La lista es orientativa y puede ir detrás de anuncios de expansión; no incluye Colombia.
2. [Alta de una tienda en Seller Center](https://ads.tiktok.com/resources/help/article/set-up-tiktok-shop-using-tiktok-seller-center): verificación del negocio y datos bancarios.
3. [TikTok Shop Partner Center](https://partner.tiktokshop.com/): desarrolladores, APIs, webhooks, Development Shops y distribución de apps.
4. [Proceso de revisión de aplicaciones](https://partner.tiktokshop.com/docv2/page/app-review-process): revisiones por tipo de aplicación, categoría y mercado.
5. [Order Management System](https://partner.tiktokshop.com/docv2/page/order-management-system-oms): pedidos, estados y fulfillment.
6. [Update Inventory](https://partner.tiktokshop.com/docv2/page/update-inventory): cantidades por SKU y bodega; permiso `seller.product.write`.
7. [Categorías y capacidades de aplicaciones](https://partner.tiktokshop.com/docv2/page/hulvi36o): LIVE Shopping y Livestream Tool, sujetas a permisos y habilitación.
8. [Tipos de cuenta y enlaces de sitio web](https://support.tiktok.com/en/using-tiktok/growing-your-audience/switching-to-a-creator-or-business-account): alternativa de destino web y requisitos de cuenta para LIVE.
9. [Digital Commerce Labs en Colombia](https://newsroom.tiktok.com/llegan-los-digital-commerce-labs-de-la-icc-y-tiktok-la-puerta-de-entrada-real-a-oportunidades-globales-para-mipymes-en-colombia?lang=es-419), 18 de agosto de 2026: programa de formación; no anuncia lanzamiento de Shop en Colombia.

Pendientes antes de diseñar: mercado y comercio objetivo; existencia de una tienda aprobada o invitación; elegibilidad de Katuq en Partner Center; permisos concretos de LIVE si se requiere automatización de comentarios. No hay spec, diseño ni tasks aprobadas como resultado de esta investigación.

## Adenda 2026-10-18 — Complemento intermedio sin TikTok Shop

Daniel precisó que busca un complemento para quien transmite que cargue el catálogo sin tener Shop, conservando el objetivo de que el espectador pueda interactuar con productos. Esta precisión amplía la investigación; no aprueba implementación.

La viabilidad depende de dónde se ejecuta la interfaz:

| Superficie | Qué puede aportar la capa de Katuq |
|---|---|
| Equipo del vendedor / OBS | Un panel conectado al catálogo y una fuente web que dibuje el producto elegido en la transmisión. OBS documenta fuentes de navegador. La emisión hacia TikTok requiere que la cuenta tenga una vía de transmisión compatible habilitada. |
| Video recibido por el espectador | Las tarjetas renderizadas quedan como imagen del video. Inferencia técnica: sus botones HTML no se transmiten como controles interactivos a la app del espectador. |
| Página propia del comprador | Un catálogo interactivo sincronizado con el producto presentado, con carrito y compra en Katuq. Requiere acceder a esa página mediante una vía disponible; no equivale a insertar controles encima del LIVE nativo. Ver el LIVE también en esa página necesitaría una solución de video independiente que no se verificó. |
| Extensión instalada por el espectador en un navegador compatible | Podría añadir una interfaz local a la página web. No permite que una instalación hecha solo por el vendedor cambie la app móvil de los demás. No se construyó ni validó extensión. |
| LIVE nativo en la app de TikTok | No se encontró una API pública general que permita a cualquier complemento del vendedor insertar un catálogo interactivo personalizado sin Shop u otra superficie habilitada por TikTok. Esto expresa un resultado de investigación, no una prueba de inexistencia de acuerdos privados. |

Hallazgo adicional: TikTok documenta **Lead Generation LIVE anchor** para cuentas de negocio verificadas, y Colombia aparece entre los países elegibles de esa solución. Es una superficie nativa para captar interesados mediante formularios; no acredita un catálogo ni checkout de comercio electrónico. Su disponibilidad efectiva debe comprobarse en la cuenta. No se verificó que permita dirigir directamente a un catálogo arbitrario.

TikTok One Webpage anchors sí documenta páginas de producto abiertas dentro de TikTok en mercados sin Shop, pero su documentación se refiere a videos de creadores. No extrapolar esa capacidad a transmisiones LIVE.

Fuentes nuevas:

- [OBS: Browser Source](https://obsproject.com/kb/browser-source).
- [Configuración de Lead Generation: mercados y requisitos](https://ads.tiktok.com/resources/help/article/set-up-lead-generation-from-business-account?lang=en).
- [FAQ de Lead Generation: LIVE anchor y uso con OBS](https://ads.tiktok.com/resources/help/article/lead-generation-faq?lang=en).
- [TikTok One Webpage anchor: alcance en videos](https://ads.tiktok.com/resources/help/article/how-to-create-a-tiktok-one-webpage-anchor).

Resultado: se puede proponer un complemento para el vendedor y un catálogo de compra sincronizado en una página de Katuq sin Shop. El requisito más estricto —tocar los productos directamente sobre el LIVE en la app móvil estándar, con solo instalar el complemento al vendedor— sigue sin una vía oficial confirmada. Sin cambios de código ni pruebas sobre una cuenta real.

## Ampliación 2026-10-18 — Entrada tocable en el LIVE y compra sin Shop

Solicitud: investigar específicamente el acceso interactivo desde el LIVE hasta el catálogo y el pago propios de Katuq, sin TikTok Shop. Se contrastaron páginas oficiales de requisitos, edición de formularios, Destination Links, TikTok One y Minis. No se accedió a una cuenta del comercio.

### Resultado por mecanismo

| Mecanismo | Evidencia oficial | Límite para la solicitud |
|---|---|---|
| Business Account Lead Generation LIVE anchor | Existe para captación orgánica desde LIVE; exige cuenta de negocio verificada y Colombia está contemplada. La FAQ también documenta uso con OBS y un solo anchor por LIVE. | Abre el formulario de captación. La guía pública del formulario orgánico describe datos personales, descripción, privacidad y revisión; no documenta sustituirlo por una URL de catálogo, HTML personalizado, carrito ni checkout. |
| Destination Links | Permite enlazar a una web propia desde videos y un CTA encima de sus comentarios. Colombia figura para e-commerce. Exige cuenta verificada y píxel o Events API activo con evento de pago completo; la disponibilidad depende de la cuenta. | La guía explica adjuntar a videos nuevos, videos existentes y Spark Ads. No confirma soporte en LIVE. «Encima de comentarios» no debe interpretarse como acceso a los comentarios de una transmisión. |
| TikTok One Webpage anchor | Documenta páginas de producto abiertas dentro de TikTok en países sin Shop y CTAs hacia web. | Se aplica a videos de creadores dentro de TikTok One. No acredita habilitación en LIVE. |
| Instant Forms de Ads Manager | La página final admite CTA a una web o descarga de app; puede haber contenido de productos y carrusel. | Es el editor de formularios de anuncios. TikTok distingue esa solución de los formularios orgánicos del Business Account. No hay evidencia pública suficiente de que un formulario creado allí pueda adjuntarse al LIVE orgánico con la misma página final. |
| Minis | Hay APIs de identidad y pagos para mini apps y mini games. Las guías consultadas describen juegos y mini dramas, incluyendo pagos con Beans. | No confirman una entrada desde LIVE a un catálogo minorista de productos físicos. No se presentan como vía habilitada para Katuq. |
| Complemento para el transmisor | Puede controlar contenido propio y superponer gráficos en la señal de video. | No proporciona un mecanismo para insertar controles nativos en la app móvil de cada espectador. |

### Flujo candidato que sigue condicionado

`LIVE → botón nativo de captación → formulario → CTA final a la web (SI está habilitado) → catálogo y checkout de Katuq`.

La existencia de LIVE anchor y la del CTA final de los formularios de anuncios están documentadas por separado. **Su combinación en el LIVE orgánico no está verificada.** No anunciar ni implementar este flujo como una capacidad confirmada. Tampoco etiquetar «Ver catálogo» o «Comprar» si TikTok no ofrece o aprueba ese texto para el anchor: los CTAs orgánicos documentados incluyen cotización, registro y oferta, entre otros.

Para resolverlo en la cuenta sin construir primero un conector:

1. Comprobar en Business Suite / Get Leads la verificación y el formulario que efectivamente permite seleccionar la cuenta para LIVE.
2. Inspeccionar si ese formulario tiene una página final con botón a una URL propia, o si existe una modalidad distinta de enlace web expresamente habilitada para LIVE. Un campo de URL de privacidad no demuestra esa capacidad.
3. Si solo aparece el formulario simple, obtener confirmación de TikTok sobre disponibilidad de enlace web o de CTA de salida en LIVE para comercio electrónico físico en Colombia. No extrapolar desde anuncios o videos.
4. Si se confirma y habilita la ruta, validar desde una cuenta espectadora en Android e iOS: entrada en LIVE, apertura del destino, acceso al catálogo, pago y vuelta al directo. Verificar si el video sigue visible y si el pago abre navegador/app bancaria; no prometer permanencia del LIVE o de todo el pago dentro de TikTok.

Pregunta técnica preparada para soporte de TikTok, **no enviada**: «Para una Verified Business Account registrada en Colombia, sin TikTok Shop, ¿qué función permite colocar durante un LIVE orgánico un enlace HTTPS al catálogo y checkout propios de productos físicos? ¿Admite el Lead Generation LIVE anchor una página final con CTA a esa URL? ¿Se pueden usar los Instant Forms de Ads Manager con ese LIVE anchor? ¿Qué aprobación, permisos y restricciones aplica cada ruta?».

### Lo que puede afirmarse hoy

- Compra en web propia sin Shop: documentada para Destination Links, sujeta a requisitos y disponibilidad, pero en videos/Spark Ads.
- Entrada nativa en LIVE sin Shop: documentada para captación mediante formulario; su conexión directa con un catálogo y checkout externo no se verificó.
- Si no se habilita la salida desde el formulario o un enlace web específico del LIVE, la alternativa disponible es el enlace del perfil hacia la tienda propia. Eso añade navegación y no satisface el requisito de tocar directamente un catálogo sobre el LIVE.
- El producto nativo tocable más checkout sin Shop, manteniendo visible el LIVE de TikTok, **no es una capacidad que este estudio pueda garantizar**. La condición pendiente está en TikTok, no en la disponibilidad del catálogo de Katuq.

Fuentes adicionales oficiales (consultadas 2026-10-18):

- [Crear el formulario orgánico de una cuenta de negocio verificada](https://ads.tiktok.com/resources/help/article/create-a-new-lead-generation-form).
- [Destination Links: funciones, mercados y requisitos](https://ads.tiktok.com/resources/help/article/about-destination-links?lang=en).
- [Destination Links: adjuntar a videos y Spark Ads](https://ads.tiktok.com/resources/help/article/how-to-use-destination-links?lang=en).
- [Instant Forms de Ads Manager: CTA de la página final](https://ads.tiktok.com/resources/help/article/build-instant-form?redirected=1).
- [TikTok Minis Server APIs](https://developers.tiktok.com/docs/en/minis-server-apis-overview).
- [Desarrollar un mini drama: alcance de WebView y monetización](https://developers.tiktok.com/docs/en/tiktok-minis-develop-your-mini-app).

Sin spec o implementación aprobadas, formularios publicados, LIVE iniciado, pruebas de pago ni mensajes a terceros. Se solicitó la cuenta objetivo y su estado de verificación para una comprobación posterior; sin respuesta al registrar esta ampliación.

## Comprobación de la cuenta `@katuq_` — 2026-10-18

Daniel identificó `@katuq_` como cuenta objetivo. Se abrió el perfil y se encontró una sesión existente de esa misma cuenta en Edge, confirmada por el botón «Edit profile» en el perfil de Katuq. No se ingresaron credenciales ni se modificaron ajustes.

Observaciones de la interfaz:

- Perfil: [Katuq (@katuq_)](https://www.tiktok.com/@katuq_), 34 seguidores al consultar. El conteo no se usa para deducir por sí solo elegibilidad para LIVE.
- [Settings](https://www.tiktok.com/setting): «Account region: Colombia».
- En «Business verification» aparece el texto para verificar el negocio y acceder a herramientas de marketing, con el interruptor en OFF. Se confirma que esa función no aparece activada; no se inspeccionó el proceso de verificación ni se afirmó que ya esté aprobada.
- El menú «LIVE tools» contiene «LIVE Creator Hub» y «LIVE Studio». El primero abre un centro informativo general, sin demostrar permiso de emisión ni habilitación de anchor para la cuenta.
- No apareció Business Suite / Get Leads ni Destination Links en el menú web inspeccionado. Esto no prueba que no existan en la aplicación móvil o tras la verificación.

Resultado específico: sigue sin demostrarse la entrada de catálogo/checkout desde el LIVE. El primer prerrequisito pendiente observado en la cuenta es la verificación comercial requerida por TikTok para Lead Generation LIVE anchor. Activarla no garantiza un CTA a catálogo: esa segunda condición continúa pendiente de verificación. No se activaron interruptores, aceptaron términos, subieron documentos, publicaron formularios ni iniciaron transmisiones.
