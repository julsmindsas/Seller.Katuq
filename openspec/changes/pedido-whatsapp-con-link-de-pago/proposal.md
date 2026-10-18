# Pedido por WhatsApp con link de pago, atendido por KAI

## Why

Ticket 1243 (F4-40): (1) un cliente pide por WhatsApp, recibe el link de pago y queda con el pedido creado en Katuq sin intervención humana; (2) una cotización creada por KAI aparece en Cotizaciones con el asesor «KAI» y cuenta en sus métricas.

Hoy, medido leyendo el código el 2026-10-17 (no se consultó producción):

- **El bot cierra en cotización a propósito.** `services/whatsappBotCierre.js` arma las líneas con el precio del maestro, crea la cotización con `cotizaciones.create` (petición simulada) en `borrador` y la pasa a `enviada` con token público. `whatsappBotDispatcher.js` (~1287-1321) le manda «Revisa y aprueba tu cotización» y pasa el hilo a un asesor. Su write-set es solo `cotizaciones` y su contador (contract test).
- **Ese link no cierra la venta.** `responderPublica` (`controllers/cotizaciones.js` ~1436) exige que el documento escrito coincida con `cliente.documento`; el bot no lo envía, así que Aceptar siempre responde «El documento no coincide». Aceptada, tampoco se vuelve pedido: la conversión real es en venta asistida (spec 008.2, el navegador carga el carrito y llama `marcarConvertida`).
- **La conversión en el servidor no es reutilizable.** `POST /v1/cotizaciones/convertir-pedido` exige el estado `aceptada` y luego `validarConversionCotizacion` (`services/cotizacionService.js` ~158) exige `"Aprobada"`: nunca se cumplen las dos. Además numera `PED-AAAA-######` leyendo `orders` (no el contador `consecutives`), sin inventario ni pago.
- **La tienda ya hace el recorrido completo.** `crearPedido` (`controllers/sites.js` ~2386) toma precios del maestro, valida existencias reales de la bodega de la tienda (`getRealStockMap`), crea con `orderService.createOrder` (consecutivo canónico y freno de gemelos de 2 min), descuenta inventario al crear (D-204), genera el link con `paymentGateway.generatePaymentLink` (Wompi, un solo uso, 24 h) en `pagoTienda.linkIds`, y el webhook de Wompi lo concilia con `aplicarPagoDeTienda` (transacción, idempotente). Pero es un manejador HTTP atado a un sitio publicado (tienda con bodega, productos con `marketplace.paginaWeb`, pago aplicado solo con `siteId`). **No existe** una función interna que cree un pedido de tienda sin la petición.
- **Pasarela.** `getPaymentCredentials` usa la del comercio en Integraciones y, si no tiene, la cuenta de la plataforma.
- **Asesor.** El bot firma `vendedor: { email: "", nombre: "Bot WhatsApp — X" }`. `getMetrics` y `porVendedor` agrupan por `vendedor.email`: esas cotizaciones caen en «Sin comercial» y no salen en el filtro. Además pasan a `enviada` sin `fechaEnviada` ni evento de historial. **En curso, sin commit, en otra sesión del backend:** `vendedor: { email: "kai", nombre: "KAI" }`, `contactoVendedor` que no trata `kai` como correo y `tests/cotizaciones/asesorKai.test.js`.

## What Changes

**Parte 1 — Asesor KAI (no toca pedidos).**
- Se adopta lo que está en curso: asesor `kai` / «KAI» en filtro, comparativa e indicadores; el enlace público no muestra `kai` como correo.
- El paso a `enviada` del bot se registra como los demás (`fechaEnviada` y evento en `historialEstados`), para que cuente en «primera respuesta» y «ciclo de cierre».
- Los pedidos del bot (parte 2) llevan el mismo vendedor KAI.

**Parte 2 — Pedido directo con link de pago (sensible, detrás de bandera).**
- **Bandera `whatsappBotDirectOrder`** en `companies.featureFlags` (catálogo de `companyFeatureFlags.js` y `company-features.service.ts`), **apagada de fábrica**. Apagada, el bot queda idéntico a hoy; apagarla es el kill switch. Primero en FLORECER; se retira 30 días después de encenderla para todos (Artículo XII).
- **Condiciones**, todas: bot encendido y fuera de modo sombra; tienda publicada con pedidos, bodega y pago en línea; pasarela **propia** del comercio activa (el bot nunca cobra con la cuenta de la plataforma). Si falta una, el cierre sigue siendo cotización.
- **Cierre.** Cuando el cliente confirma el resumen (productos y total del servidor) y elige pagar en línea, el bot crea el **pedido** por el mismo núcleo de `crearPedido`: precios, existencias, consecutivo, inventario al crear, link Wompi y conciliación por el webhook existente. Responde con número de pedido, total y link.
- **Reutilizar sin duplicar.** Se extrae el núcleo de `crearPedido` a un servicio interno que usan la ruta pública y el bot; la ruta pública queda idéntica, con pruebas de caracterización escritas **antes** de mover código. La alternativa (petición simulada, como catálogos y el bot con `cotizaciones.create`) se evalúa en el design.
- **Marcas.** `origen: "whatsapp-bot"`, `whatsappPhoneHash` y vendedor KAI. Con ese origen no corren los efectos propios de la página: analítica y contador del sitio, conversión a Meta/Google, carrito abandonado y plantilla de confirmación contra entrega.
- **Idempotencia (Artículo IV).** Llave por conversación y carrito en la sesión del bot (`whatsapp_bot_sessions`, existente): un reintento de Kapso, una ráfaga o un segundo «sí» devuelven el mismo pedido y link. Se suma el freno de gemelos de `orderService`.
- **Si algo cambia** antes de crear (precio, existencias, cupo del día, tope del plan), no se crea nada: el bot dice qué cambió y pide confirmar; si no se resuelve, pasa a un asesor. Si el link no sale, el pedido queda pendiente de pago y pasa a un asesor con el número.
- **Límites.** Nunca inventa precios, existencias, descuentos, cupones ni valor del domicilio: el envío sale de la tienda (tarifa fija o zona de `zonacobro`) y si la ciudad no da una sola zona, no hay pedido. Si el cliente pide una persona, se traspasa (`traspasoMotivo`) sin crear pedido.
- **Modo sombra:** registra «así habría creado el pedido» sin crear ni cobrar. **Observabilidad (VII, XI):** eventos `pedido_directo_ok|cae_a_cotizacion|fallido` con `phoneHash`, sin teléfonos ni nombres.

**Write-set del camino nuevo.** Permitido: `orders`, contador `consecutives`, `inventory`/`inventoryMovement` solo vía `inventoryService.updateByPOS` (sin lógica nueva), `clients` (como la tienda) y la sesión del bot. Prohibido: `products`, catálogo, precios, precios por cliente y listas de precios; un contract test falla si se escribe fuera. Decisión: D-496 (aprobada por Daniel el 2026-10-18).

## Capabilities

### New Capabilities
- `whatsapp-bot-pedido-directo`: el bot crea el pedido con link de pago cuando bandera y condiciones lo permiten, y deja cotización cuando no.

### Modified Capabilities
- `whatsapp-bot-pedidos` (en `changes/add-bot-pedidos-whatsapp`, sin archivar): el cierre deja de ser solo cotización y el asesor es KAI.

## No-goals

- Arreglar `convertir-pedido` / `convertirCotizacionAPedido`, o la aprobación por link sin documento: van aparte.
- Contra entrega y formas manuales por el bot en esta fase.
- Comercios sin tienda publicada o sin pasarela propia.
- Colecciones nuevas, endpoints «v2» o cambios al webhook de Wompi, a D-204 o a la lógica de inventario.

## Riesgos

- **Pedidos (sensible).** Extraer el núcleo de `crearPedido` toca los pedidos de todas las tiendas: caracterización previa, un cambio a la vez con diff aprobado, bandera apagada.
- **Consecutivos.** Si falla una validación previa no se gasta número; un pedido cuyo link falla no se borra, queda pendiente de pago (como en la tienda).
- **Inventario.** La tienda anula a los 60 min el pedido en línea no pagado (D-206, `RESERVA_TIENDA_MINUTOS`), devuelve existencias y lo revive si paga tarde. El barrido no filtra por sitio: alcanzaría a los pedidos del bot.
- **Pagos duplicados.** Los frenan la llave de idempotencia y el link de un solo uso en `pagoTienda.linkIds`; un link nuevo para el mismo pedido se suma a la lista (ya soportado).
- **Idempotencia.** El freno de gemelos cubre 2 min; la llave de sesión, los reintentos tardíos. Un carrito cambiado después abre otro pedido; el creado nunca se modifica.
- **Totales distintos.** El bot calcula hoy con `calcularTotales` de cotizaciones; la tienda con `precioParaCliente`, promociones y envío. El total mostrado debe salir del cálculo que cobra; si no coinciden, no hay pedido.
- **Clientes duplicados.** Tienda y bot resuelven al cliente por teléfono; no deben quedar dos fichas en `clients`.

## Preguntas para Daniel

1. ¿Extraer el núcleo de `crearPedido` (recomendado) o petición simulada?
2. ¿La tienda publicada es requisito, o sin tienda el bot usa `POST /v1/orders/create` de venta asistida (también genera link Wompi y concilia por `pagoInformation.linkId`)?
3. ¿Contra entrega y transferencia crean pedido directo, o solo pago en línea en esta fase?
4. ¿Los 60 min de reserva sirven para WhatsApp, donde el cliente puede tardar más?
5. ¿KAI tiene meta mensual? Hoy `normalizarMetas` solo acepta correos.
6. ¿Piloto en FLORECER y después ALMARA FELICIDAD?
