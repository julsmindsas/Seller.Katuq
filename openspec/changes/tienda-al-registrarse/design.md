## Context

**El recorrido de hoy** (mapeado el 27-sep sobre las ramas principales):
- `/registrarse` (`DiagnosticSurvey`) llama `saveSurveyResponse`. Eso crea la empresa en plan gratis, o premium con COLOMBIA2026, y además:
  - `createInitialConfiguration`: la bodega "BODEGA PRINCIPAL" (`BOD-001`), 5 pagos, canales y zonas;
  - un producto de ejemplo, que no sale en la tienda.
- `/onboarding` (`OnboardingWizardComponent`): objetivo → contexto (qué vende, dónde recibe pedidos, si lleva existencias) → producto (`POST /v1/onboarding/minimal-product`) → pagos (`POST /v1/onboarding/payment-methods`) → resultado ("Finalizar y hacer una venta", que lleva a `/ventas/crear-ventas`).
- **Lo que falla:**
  - el producto con existencias queda con `cantidadDisponible: 0` (`onboarding.js:1104`), y la tienda lo muestra agotado;
  - los sitios creados por código (`generar`, `crearSitioDesdeOpttia`) nacen con `tienda.habilitada: false` y sin bodega;
  - `normalizarTienda` deja `pagoEnLinea` encendido si no hay otra forma, y sin pasarela propia cobra la cuenta de la plataforma (`sites.js:1503-1516`);
  - el paso de contexto no guarda el tipo de negocio.
- **Piezas que se reusan:**
  - `siteTemplates` + `siteGenerator` (plantillas por sector);
  - la publicación (`exports.publish` y `publicarSitioDesdeOpttia`, con los límites del plan);
  - el modo WhatsApp del carrito (`enlaceWhatsappPedido` en `siteTienda.js`, D-319);
  - la vista previa firmada de borradores;
  - `registrarEvento` (`site_events`);
  - la colección `prospects`.

## Goals / Non-Goals

**Goals**
- Tienda lista para vender en 1 clic, sin tienda vacía ni cobros a nombre de Katuq.
- Una plantilla según el tipo de negocio.
- Aviso a los ya registrados, con su permiso.
- Medir cuántos publican en las primeras 24 h.

**Non-Goals**
- Tocar las tiendas de los comercios que ya existen.
- Leer las existencias de la bodega en la vitrina (pendiente de inventario aparte).
- Conectar pasarelas.
- La fase 0 de la propuesta de registros falsos.

## Decisions

1. **Un solo camino del servidor: `crearTiendaInicial(company, { tipoNegocio, publicar })`** en `controllers/sites.js`.
   - Lo expone `POST /v1/onboarding/tienda`, con sesión y **la empresa sacada del token**, nunca de la cabecera.
   - Es idempotente: si la empresa ya tiene un sitio con `origen: "registro"`, lo devuelve (y lo publica si se pide).
   - Pasos:
     1. Elige la plantilla.
     2. Arma el borrador con el generador sin IA: rápido, sin costo y sin gastar el cupo de Opttia.
     3. Configura la tienda y publica con la misma regla de `exports.publish`, que ya respeta "1 tienda en gratis".
   - Más adelante, `crearSitioDesdeOpttia` puede usar la misma función para no dejar tiendas apagadas.
   - Alternativa descartada: llamar desde el front a `generar`, luego `edit` y luego `publish`. Son tres viajes, deja estados a medias y repite reglas en el navegador.

2. **Tipo de negocio → plantilla y forma de pedir.**

   | Tipo de negocio | Plantilla | Forma de pedir |
   |---|---|---|
   | productos | con catálogo por sector (`brandKit.sector`), o `lanzamiento-oferta` | `modoPedido: "checkout"` |
   | mayor | `hogar-catalogo` | `"whatsapp"` |
   | comida | `alimentos-domicilio` | `"whatsapp"` |
   | servicios | `servicios-leads` | sin carrito, con el botón "Cotizar por WhatsApp" |

   - Se guarda en `companies.tipoNegocio`.
   - Viene preseleccionado desde el registro: Restaurante → comida, Servicios → servicios, Manufactura → mayor, y el resto → productos. Si en el contexto dijo que vende servicios, gana eso.

3. **La tienda nace lista y honesta.**
   - `habilitada: true`.
   - `bodegaId`: el código de negocio de la bodega principal (la del onboarding, o `BOD-001`).
   - `pagoEnLinea: false`, salvo que la empresa tenga pasarela propia; se detecta con la misma función que hoy decide si cobra la plataforma.
   - `contraEntrega`: si eligió efectivo.
   - `otrasFormasPago`: sus pagos activos de Nequi, Daviplata o transferencia (hasta 6).
   - `mensajeConfirmacion`: "Te escribimos por WhatsApp para acordar el pago."
   - El catálogo incluye el producto del onboarding aunque no tenga foto.
   - **Las tiendas existentes no se tocan:** estos valores se ponen solo al crearlas así.

4. **`modoPedido: "whatsapp"`** en `normalizarTienda`. Por defecto es `"checkout"`, así que las tiendas de hoy no cambian.
   - El script de la tienda reusa el modo WhatsApp de D-319: `modoWhatsapp = topeAlcanzado || modoPedido === "whatsapp"`.
   - Antes de abrir WhatsApp, el carrito se guarda como prospecto `tipo: "pedido-whatsapp"`, con los productos y el total, para que el comercio lo vea en "Tus contactos". Es el mismo patrón del carrito abandonado.
   - **No crea un pedido en Katuq ni toca `crearPedido`.** Registrar el pedido de verdad queda para después, si hace falta.
   - El número sale de `tienda.whatsapp` o del celular de la empresa. Sin número, se muestra el contacto y el editor avisa.

5. **Producto disponible desde el primer momento.**
   - `buildMinimalProduct` pone `disponibilidad.cantidadDisponible = initialQuantity` al crearlo, igual que el formulario de productos.
   - Es la creación del producto en su propio dominio, no una operación de inventario: D-134 no aplica, porque ninguna operación de inventario escribe `products`.
   - El paso de producto ofrece subir una foto, de forma opcional, con el mismo servicio de fotos de producto.

6. **Aviso a los ya registrados** en `/welcome`. Se muestra al administrador de una empresa que cumpla todo esto:
   - `canalInscripcion` es "Encuesta" o "Campaña";
   - registrada desde el 2026-09-01;
   - sin ningún sitio;
   - con al menos un producto.
   - El aviso crea un **borrador** (`publicar: false`), muestra la vista previa firmada en una ventana y publica solo si el comercio toca "Publicar".

7. **Medición.**
   - Al publicar por primera vez un sitio, por cualquier camino, se guarda `companies.primeraTiendaPublicadaAt` si no existe y se registra `site_events { tipo: "sitio_publicado" }`.
   - `services/platformMetrics` calcula, por semana de registro, los registros, los que publicaron en 24 h y el porcentaje. Excluye `metricsExcluded`.
   - El panel del Super Admin lo muestra junto a la meta de 25 %.

8. **De paso:**
   - el resultado del onboarding muestra el plan real (premium de la promoción o gratis);
   - `savePaymentMethods` reconoce "NEQUI - DAVIPLATA" como equivalente a "Nequi" o "Daviplata" y no los duplica.

## Risks / Trade-offs

- **[Phishing con una tienda publicada en 1 clic en `*.katuq.com`]** → Se recomienda encender antes el filtro del registro ("el sospechoso verifica con un código antes de entrar", propuesta aparte). Además, la tienda nueva no cobra en la cuenta de Katuq. El orden lo decide Daniel.
- **[Una tienda de un solo producto se ve pobre]** → Foto opcional en el paso de producto, y el resultado invita a "agregar más productos" con el enlace directo.
- **[Pedido por WhatsApp sin pedido en Katuq]** → El prospecto `pedido-whatsapp` deja rastro y la métrica de tiendas no depende de pedidos. Si hace falta, se decide después crear el pedido.
- **[Slug ocupado]** → El mismo verificador del editor, más un sufijo numérico.
- **[Premium temporal que vence]** → El cron de vencimiento está apagado (pendiente conocido). Cuando se encienda, la tienda en 1 clic ya cumple el plan gratis: 1 tienda y 50 productos.

## Migration Plan

1. El producto que no nace agotado y la deduplicación de pagos, que son pequeños e independientes.
2. `modoPedido` en la tienda y en el editor.
3. `crearTiendaInicial`, el endpoint y el paso de resultado.
4. El aviso a los ya registrados y la medición.
- Todo con pruebas de contrato, `npm run build` sin errores, despliegue con OK de Daniel y la rama medida contra producción.
- **Bandera:** `TIENDA_AL_REGISTRARSE=false` esconde el botón y el aviso sin desplegar. Dueño: Daniel; retiro: 2027-01-31.

## Open Questions

1. ¿Encender primero el filtro del registro (propuesta de cuentas falsas) o salir juntos? Recomendado: el filtro primero, o juntos.
2. En modo WhatsApp, ¿basta con el mensaje y el prospecto, o se quiere el pedido registrado en Katuq desde ya?
3. ¿El aviso a los ya registrados también por correo, o solo al entrar? Casi ninguno vuelve a entrar.
