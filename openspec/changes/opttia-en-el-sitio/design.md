# Diseño: Opttia en el sitio web

## Piezas

| Capa | Dónde | Qué |
|---|---|---|
| Config | `sites/{id}.tema.opttia` (dato del sitio) + bandera `companies.featureFlags.opttiaEnSitio` | `{ activo, saludo, nombre, puede: { dudas, carrito, cotizacion, whatsapp } }` |
| Render | `utils/sitioModulos/opttiaBurbuja.js` (nuevo módulo v2) | Burbuja + cargador diferido. Sin config activa no emite nada (X1) |
| Script del chat | `utils/siteOpttiaChat.js`, servido aparte y cacheable | Panel, historial en `sessionStorage`, visitante anónimo (id aleatorio), llama al endpoint; aplica las acciones con `window.__kqTienda` (carrito existente) |
| Endpoint | `POST /v1/sites/render/:slug/opttia/turno` (público, junto al render) | Valida sitio publicado + bandera + límites, arma el contexto y llama al ADK servidor a servidor (`X-Bot-Token`) |
| Límites | `services/sites/opttiaSitioLimites.js` | Por visitante y por IP en memoria del proceso; tope diario por empresa en el contador existente de uso de Opttia |
| ADK | `kai/adk_agent/channels/web/` + `endpoints/web_bot_endpoint.py` | Reusa el agente de `channels/whatsapp/agent.py` con el juego de herramientas «web»: buscar en el catálogo del sitio, ver ficha, proponer agregar al carrito, pasar a WhatsApp, dejar solicitud. Sin `cerrar_pedido` |
| Editor | Panel «Opttia en la tienda» en el editor v2 (`sitio-editor`), base `_config-pagina.scss` | Interruptor, saludo, nombre, qué puede hacer; vista previa en el marco |
| Opttia del Seller | herramienta de edición existente (`edit_katuq_site` / propuestas) | Sabe encender y configurar el bloque como propuesta |

## Contrato del turno

Navegador → back: `{ visitante, texto, carrito:[{cd,cantidad,variables}] }`
Back → ADK: `{ company, sitioId, catalogoIds, politicas, tono, historialCorto, texto, carrito }`
ADK → back → navegador: `{ respuesta, tarjetas:[{cd,nombre,precio,foto,url}], acciones:[{tipo:'agregar'|'whatsapp'|'solicitud', ...}] }`

El back revisa cada acción contra el catálogo del sitio antes de devolverla: un `cd` que no esté en el sitio se descarta. El precio que se muestra sale del back, nunca del modelo.

## Write-set

- Ninguna escritura en `orders`, `inventory`, `products`, precios ni consecutivos.
- Solo la solicitud de contacto, por el flujo de leads del sitio que ya existe, y el contador de uso.

## Diseño visual

- Botón y encabezado con el color de marca del sitio. Es la tienda del comercio, no una pantalla del Seller.
- Plano, sin degradados.
- Radios del tema del sitio.
- Se ubica encima de la burbuja de WhatsApp en celular y al lado en escritorio, sin tapar el carrito.
