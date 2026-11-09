# Diseño: Opttia en la tienda

## Cómo corre un mensaje

1. El navegador manda `{ visitante, texto, carrito }` a `POST /v1/sites/public/:slug/opttia` (al lado de `/asesor`).
2. El backend valida que el sitio esté publicado, que Opttia esté encendido y los límites. Arma el contexto: capacidades del sitio, políticas, tono y preguntas frecuentes. Llama al ADK de servidor a servidor (`X-Bot-Token`, como el bot de WhatsApp).
3. El ADK (`kai/adk_agent/channels/tienda/`) corre el agente con las herramientas del web MCP según las capacidades encendidas.
   - **Las de catálogo** (`searchProducts`, `getProductDetails`, `getProductFilters`, `getDeliveryOptions`, `getPaymentMethods`): el ADK se las pide al backend, que responde con las mismas consultas públicas que ya usa el puente (catálogo vendible, ficha JSON).
   - **Las de carrito y checkout:** se ejecutan **en el navegador**. El turno vuelve con `acciones` y el navegador las corre con el puente (`siteWebMcp.js`). Para eso se le agrega `window.__kqWebMcp.ejecutar(nombre, args)`, que también sirve sin `modelContext`. Después se reanuda el turno con los resultados, hasta 6 pasos.
   - **Las de soporte:** `getStorePolicies`, `searchHelpCenter` (solo en sitios de Katuq) y `createTicket`. Corren en el backend.
4. El precio, la foto y el nombre de cada tarjeta salen del backend. Un id que no esté en el sitio se descarta.

## Configuración

`sitio.contenido.tienda.opttia = { activo, nombre, saludo, puede: { asesorar, cerrarVenta, soporte, tickets, whatsapp }, preguntasFrecuentes: [{p, r}] }`

- Se sanea con lista blanca y largos máximos.
- `asesorKai: true` sin `opttia` se lee como `{ activo: true, puede: { asesorar: true } }`.

## Tickets

Los crea `services/soporte/crearTicket.js`, el único camino que existe, con `origen: "sitio-web"`, `sitioId`, el resumen y el contacto.

- **Sitio de Katuq:** el ticket va a la mesa de Katuq.
- **Sitio de un comercio:** el ticket es del comercio y lo ve en su mesa de ayuda (D-512). Sigue pendiente la decisión de Daniel: si esto va ahí o en una bandeja aparte.

## Checkout lleno

`beginCheckout` acepta `{ datos: { nombre, celular, correo, direccion, ciudad, entrega, pago } }`. El script de la tienda los pone en el formulario y abre el último paso. No cambia nada del servidor del pedido.

## Widget

- **Base:** el de D-469, con el diseño v2 (color de marca, plano, radios del tema).
- **Peso:** el código del chat se carga al abrirlo.
- **Accesibilidad:** foco visible y `aria-live` en las respuestas.
- **Lugar:** encima de WhatsApp en celular y al lado en escritorio.

## Write-set

- Solo crea tickets y registra la métrica de uso.
- Nada en `orders`, `inventory`, `products`, precios ni consecutivos.
