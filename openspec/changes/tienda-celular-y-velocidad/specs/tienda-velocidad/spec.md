## Purpose

Historias de usuario (ticket TX-34, cd `Es2985T0VnVBc95LqY2D`):
- Como comprador que abre la tienda desde un enlace en el celular, quiero que cargue rápido aunque
  la tienda tenga miles de productos y aunque sea el primero en entrar.
- Como comercio, quiero que mis visitas cuenten personas y no herramientas de medición.

Requisitos no funcionales: la medición es reproducible y no escribe en producción; leer menos no
cambia qué productos ve el comprador; no se agregan capas de caché nuevas sin aprobación. Los
requisitos marcados **(provisional, Pn)** aplican la recomendación de la pregunta Pn.

## ADDED Requirements

### Requirement: Cómo se mide
THE system SHALL medirse en un laboratorio local reproducible, con la mediana de 3 corridas de
Lighthouse en celular, en la portada, el catálogo y la ficha de cada plantilla publicable (las 13
de siempre, «Producto único» y «Tecnología — Catálogo grande»), con el aviso de cookies encendido
y sin aceptar **(provisional, P10)**, sobre sitios de muestra con un catálogo de 2.000 productos o
más, pintados por el mismo render del servidor que usa la tienda publicada y medidos también en
frío **(provisional, P9)**. Cada corrida SHALL quedar guardada, y la traza de toda corrida bajo
90. Al cerrar, SHALL correrse también PageSpeed sobre tiendas publicadas; si sale bajo 90, el
criterio no se da por cumplido sin la causa y la decisión de Daniel.

Fuente: D-518 TX-34·6; ticket TX-34, criterio 1 («en las plantillas»); comentario 1 del 16-oct
(resultado bimodal sin entorno estable); F3-26, D-463 (aviso de cookies); crítica del 21-oct
(el catálogo se llena en el servidor: un laboratorio que no pase por ahí no mide el frío).

#### Scenario: Corrida repetida
- **WHEN** se corre el laboratorio dos veces seguidas con el mismo código
- **THEN** la mediana de Rendimiento de cada página no cambia más de 5 puntos

#### Scenario: Primer visitante en el laboratorio
- **WHEN** se mide el catálogo con la copia de la página vencida
- **THEN** la corrida pasa por la lectura de productos con la demora medida y su LCP cuenta para
  la meta

### Requirement: Rendimiento y buenas prácticas de 90
THE system SHALL obtener 90 o más en Rendimiento y en Buenas prácticas, en la mediana, en cada
página medida de cada plantilla.

Fuente: ticket TX-34, criterio 1; D-461 (Buenas prácticas 96–100; Rendimiento 78–86 o 97–100).

#### Scenario: Plantilla que baja
- **WHEN** una plantilla saca 86 de mediana en la ficha
- **THEN** el criterio no se da por cumplido y el informe nombra la página y la causa principal

### Requirement: Metas de carga, estabilidad y respuesta
THE system SHALL cumplir, en el laboratorio con 4G simulado, LCP de 2,5 s o menos, CLS de 0,1 o
menos e INP de 200 ms o menos al abrir el menú, buscar, filtrar, agregar al carrito y abrir el
carrito. Las fotos de la primera fila SHALL cargarse sin espera diferida y cada foto SHALL
reservar su espacio antes de llegar.

Fuente: ticket TX-34, viñeta 6; crítica del 21-oct (INP nunca medido; tarjetas sin medidas y con
carga diferida también en la primera fila).

#### Scenario: Rejilla que no salta
- **WHEN** el catálogo carga en 4G simulado
- **THEN** las tarjetas no se mueven al llegar las fotos (CLS ≤ 0,1)

### Requirement: Primer visitante de un catálogo grande
WHEN un comprador abre la tienda y no hay copia reciente de la página, THE system SHALL
entregarla en 1 s o menos (mediana) con un catálogo como el de FLORECER (2.166 productos) y en
1,5 s o menos con uno como el de OH MY STORE (8.568) **(provisional, P5)**, mostrando exactamente
los mismos productos, precios y orden que con la lectura de hoy, también en la ficha, las
categorías con foto, los relacionados, las marcas, el feed y el sitemap. Catálogo, ficha, feed,
sitemap y asesor KAI SHALL dar el mismo precio de vitrina para el mismo producto. IF leer menos
no alcanza la meta, THEN el resumen por empresa de TX-34·7 SHALL presentarse a Daniel con la
medición antes de construirlo **(provisional, P4)**.

Fuente: ticket TX-34, viñeta 6 («aun con catálogos de miles de productos»); D-518 TX-34·7;
comentario 1 del 16-oct (FLORECER de 1,5 a 7,6 s); medición del 21-oct (lino-y-lona 5,26 s en
frío, 0,022 s en caliente); F2-42·5 (8.568 productos de OH MY STORE); código del 21-oct (feed,
sitemap y KAI calculan el precio de vitrina con otro registro).

#### Scenario: Misma vitrina con menos lectura
- **WHEN** la lectura mínima corre en sombra en FLORECER
- **THEN** los productos de cada página, los totales, los precios y las ofertas coinciden con la
  lectura de hoy, y la sombra registra cualquier diferencia

#### Scenario: Comprador mayorista
- **WHEN** un comprador con sesión mayorista abre el catálogo
- **THEN** su tiempo se mide e informa aparte, sin bloquear el criterio **(provisional, P5)**

### Requirement: Quien llega por un anuncio no espera de más
WHEN un comprador abre la tienda desde un anuncio o un enlace con parámetros de campaña, THE
system SHALL entregarle la misma copia reciente de la página que a cualquier otro visitante, y la
venta SHALL seguir atribuyéndose a esa campaña como hoy.

Fuente: ticket TX-34, viñeta 6 y «Por qué importa» (las compras llegan desde redes);
código del 21-oct (la copia de la página se guarda por dirección completa, con el identificador
de clic de cada anuncio); ver revisión privada.

#### Scenario: Dos clics del mismo anuncio
- **WHEN** dos compradores llegan del mismo anuncio de Meta con identificadores de clic distintos
- **THEN** el segundo recibe la copia reciente de la página y su pedido sigue contando para la
  campaña

### Requirement: Fotos del tamaño justo
WHERE una foto de producto tiene variantes de tamaño (las del constructor o las uniformadas de
TX-37, o las creadas para las fotos originales), THE system SHALL ofrecerlas al navegador para
que el celular descargue la más pequeña que le sirve, en la tarjeta, la ficha y las miniaturas,
y la foto que la página precarga SHALL pedirse con las mismas variantes, para no bajarla dos
veces. IF una foto no tiene variantes, THEN SHALL mostrarse como hoy **(provisional, P6)**.

Fuente: D-518 TX-37·8 («TX-34, que es dueño del rendimiento»); comentario 1 del 16-oct
(«variantes de tamaño para las fotos de producto»); F1-14 (prometía tamaños responsivos);
TX-37 (deja fuera las fotos no uniformadas y su portada JPEG sin variantes en la página); código del 21-oct
(la ficha precarga su foto sin variantes).

#### Scenario: Foto uniformada en la rejilla
- **WHEN** un producto tiene su foto uniformada con variantes de 320 a 1280 px
- **THEN** el celular de 390 px descarga la de 320 o 640 px, no la de 1280

#### Scenario: Ficha con foto precargada
- **WHEN** el comprador abre en celular la ficha de un producto con variantes
- **THEN** la foto principal se descarga una sola vez

### Requirement: Las visitas cuentan personas
IF quien abre la página se identifica como robot, herramienta de medición o navegador
automatizado, THEN THE system SHALL NOT contarlo como visita del comercio ni en sus reportes.

Fuente: comentario 1 del 16-oct («la baliza de visitas no descarta robots ni Chrome headless»);
F4-39, D-480 (el reporte semanal de KAI le manda esas visitas al comercio).

#### Scenario: Lighthouse contra una tienda publicada
- **WHEN** alguien corre PageSpeed sobre la tienda
- **THEN** las visitas de la tienda no suben
