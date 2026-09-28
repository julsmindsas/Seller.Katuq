## Why

La pauta promete "crea tu tienda gratis" y hoy nadie la crea. Datos de solo lectura de los 31 registros del 23 al 27-sep, casi todos llegados por Meta:
- ninguno tiene página en `sites` ni pedidos;
- 11 terminaron la configuración inicial (objetivo → contexto → producto → pagos → resultado), que crea un producto y los manda a venta asistida;
- solo 1 volvió a entrar.

Daniel, el 27-sep: "hagamos lo que prometemos, con lo de la página web, pero ten en cuenta los otros comercios".

Revisando el código aparecen tres huecos que harían fallar una "tienda en 1 clic" aunque existiera el botón:

1. **El producto nace agotado.** Si el comercio lleva existencias, el producto que se crea en la configuración inicial queda con `disponibilidad.cantidadDisponible: 0`. La cantidad real va solo a `inventory`, pero la tienda decide "disponible" con ese campo. Resultado: una tienda vacía.
2. **La tienda nace apagada.** Todos los caminos que crean sitios por código (plantillas y Opttia) dejan `tienda.habilitada: false`, sin bodega y sin formas de pago. Publicar no revisa nada de eso.
3. **Sin pasarela propia, cobra Katuq.** Con la tienda por defecto, `pagoEnLinea` queda encendido y el dinero entraría a la cuenta de Wompi de la plataforma, no a la del comercio. Casi todos los nuevos cobran por Nequi, Daviplata, transferencia o efectivo.

Además, la configuración inicial no pregunta el tipo de negocio. El sector del registro se queda en la encuesta y no coincide con los sectores de las plantillas.

## What Changes

- **Tienda publicada en 1 clic al terminar la configuración inicial.** El paso "resultado" ofrece "Publicar mi tienda". Un solo endpoint del servidor la crea desde una plantilla, **ya lista para vender**:
  - habilitada, con la bodega del comercio, el producto que acaba de crear y los métodos de pago que eligió;
  - publicada en `<slug>.katuq.com`;
  - con tres botones: "Verla", "Compartir por WhatsApp" y "Copiar para Instagram".
  - Reusa las plantillas, el generador de sitios y la publicación que ya existen. No se crea nada paralelo.
- **Según el negocio.** Una pregunta más en el paso de contexto ("¿Cómo vendes?"), que viene preseleccionada con lo que dijo en el registro:
  - productos: tienda con catálogo y compra;
  - por mayor (distribuidores): catálogo con pedido por WhatsApp;
  - servicios: página con "Cotizar por WhatsApp";
  - comida: menú con pedido por WhatsApp.
- **Pedido por WhatsApp como forma de la tienda.** El carrito termina en un mensaje de WhatsApp al comercio, con el pedido escrito. Es la misma pieza que ya usa el plan gratis cuando llega a su tope. Sirve a distribuidores y comida, y a cualquier tienda que lo prefiera.
- **Pagos honestos.** La tienda nueva muestra los métodos que eligió el comercio (Nequi, Daviplata, transferencia, efectivo) y confirma por WhatsApp. **No cobra en línea** mientras el comercio no conecte su propia pasarela. Nunca cobra en la cuenta de Katuq.
- **El producto no nace agotado.** Al crearse en la configuración inicial, su disponibilidad en la tienda queda con la cantidad inicial que escribió el comercio.
- **Los que ya se registraron.** Ven en su inicio un aviso "Crea tu tienda en 1 clic" con lo que ya cargaron. Nada se publica a su nombre sin que lo acepten. Los comercios con tiendas (ALMARA, OH MY STORE, FLORECER, ATELIER 90…) no ven nada ni cambian.
- **Medición.** La empresa guarda cuándo publicó su primera tienda, y el panel del Super Admin muestra **"tiendas publicadas en las primeras 24 h"** sobre los registros de la semana. La meta es 1 de cada 4, y es el indicador con el que Daniel decide subir la pauta de $35.000 a $50.000.
- **De paso:** el resultado deja de decir "plan Gratis, 15 pedidos" a quien entró con el premium de la promoción, y el método de pago del registro deja de duplicarse ("Nequi" junto a "NEQUI - DAVIPLATA").

## Capabilities

### New Capabilities
- `store-at-signup`: tienda lista para vender en 1 clic al terminar la configuración inicial, el aviso a los ya registrados y la medición de las primeras 24 h.
- `store-whatsapp-ordering`: pedido por WhatsApp como forma de la tienda, y pagos sin pasarela que se muestran y confirman con honestidad.

### Modified Capabilities
- Ninguna archivada.

## Impact

- **Backend:**
  - un endpoint nuevo, `POST /v1/onboarding/tienda`, con la empresa del token;
  - `controllers/sites.js`: una función `crearTiendaInicial` que comparten el endpoint y, más adelante, Opttia;
  - `utils/siteBlocks.js`: `normalizarTienda` con `modoPedido`;
  - `utils/siteTienda.js`: el modo WhatsApp elegible, no solo al tope;
  - `controllers/onboarding.js`: disponibilidad del producto nuevo y deduplicación de pagos;
  - la métrica en `services/platformMetrics`.
- **Front:**
  - la configuración inicial (paso de contexto y paso de resultado);
  - el aviso en `/welcome`;
  - el editor de la tienda: la opción "Pedido por WhatsApp";
  - la métrica en el panel del Super Admin.
- **Datos:** sin colecciones nuevas.
  - En `companies`: `tipoNegocio` y `primeraTiendaPublicadaAt`.
  - En `sites`: `tienda.modoPedido` y `origen: "registro"`.
- **Relación con "blindar el registro contra cuentas falsas"** (propuesta aparte, pendiente). Publicar en 1 clic en un dominio de Katuq facilita el phishing si entra cualquiera. El endpoint nuevo toma la empresa del token (no de la cabecera) y nunca cobra en la cuenta de Katuq. Aun así, **se recomienda encender primero el filtro del registro** ("el sospechoso verifica con un código antes de entrar", como pidió Daniel) o salir juntos. El orden lo decide Daniel.
- **No-goals:**
  - no toca a los comercios con tiendas;
  - no cambia cómo la vitrina lee las existencias de la bodega (pendiente de inventario aparte);
  - no conecta pasarelas;
  - no toca pedidos, inventario ni consecutivos más allá del producto que crea la propia configuración inicial;
  - no toca la fase 0 de la propuesta de registros falsos.
- **Riesgos:**
  - una tienda publicada con un solo producto sin foto se ve pobre, así que el paso de producto ofrece subir foto de forma opcional;
  - el slug puede chocar, así que se resuelve con el mismo verificador que usa el editor;
  - el plan gratis permite una sola tienda, y la tienda en 1 clic es esa.
