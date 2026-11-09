# Propuesta: Opttia en el sitio web (D-686, por aprobar) — etapas 3 y 4 de D-469

## Lo que ya existe (D-469, publicado el 17-oct)

«Pregúntale a KAI», el asesor de compra de la tienda:

- **Encendido:** el comercio lo prende en cada sitio con el interruptor `tienda.asesorKai`.
- **Cómo atiende:** el servidor busca por palabras en el catálogo vendible y Opttia elige entre esos productos en **una sola pasada** (`pedirJsonAOpttia`). Los pedidos de carrito pasan por el **puente WebMCP del sitio** (`utils/siteWebMcp.js`).
- **Límites:** hay freno por visitante y tope diario por tienda.

**Le falta:**

- leer la ficha completa y comparar productos;
- dar la lista de precios;
- llevar la venta hasta el final;
- atender soporte y crear tickets.

Además, no conversa en varios pasos: cada mensaje es una sola respuesta.

## Qué cambia

1. **Opttia de verdad en la tienda.** El asesor pasa de una sola pasada a un agente que, en cada mensaje, usa **las mismas herramientas del web MCP del sitio**:

   | Herramienta | Para qué |
   |---|---|
   | `searchProducts` | Buscar productos |
   | `getProductFilters` | Ver las categorías y el rango de precios |
   | `getProductDetails` | Leer la ficha completa: descripción, características, variables y disponibilidad |
   | `getCartContents`, `addToCart`, `updateCartItem`, `removeFromCart` | Armar el carrito |
   | `getDeliveryOptions`, `getPaymentMethods` | Ver envío y formas de pago |
   | `getOrderSummary` | Ver el resumen del pedido |
   | `beginCheckout` | Abrir el checkout |

   Así conversa como un vendedor:
   - recomienda;
   - compara dos productos leyendo sus fichas;
   - da la lista de precios de una categoría o de toda la tienda;
   - agrega, cambia y quita del carrito.
2. **Cierra la venta.** Pide en el chat los datos que falten (nombre, celular, dirección, entrega y forma de pago), los deja **puestos en el checkout** y lo abre en el último paso. El cliente solo revisa y paga o confirma. Esto cumple la regla del puente: el pedido siempre lo envía la persona.
3. **Soporte.**
   - Responde con las políticas de la tienda: envíos, cambios, garantía, horarios, medios de pago y preguntas frecuentes.
   - En los sitios de Katuq responde además con el centro de ayuda (`search_help_center`, D-628).
   - Si no puede resolver, **crea un ticket** para el dueño del sitio, con lo conversado y el contacto del cliente.
4. **Configurable sitio por sitio.** En el editor, «Opttia en la tienda» reemplaza el interruptor de hoy.
   - Se enciende y se apaga, y se elige qué hace: **asesorar**, **cerrar ventas**, **soporte**, **crear tickets** y **pasar a WhatsApp**.
   - También se configuran el nombre, el saludo y las preguntas frecuentes del sitio.
   - Un sitio con `asesorKai: true` queda con «asesorar» encendido y nada más, como hoy.
   - La Opttia del Seller también lo configura, como propuesta que se acepta en el editor.

## No-goals

- Opttia **no envía el pedido, no cobra y no toca inventario, productos ni precios**: los precios y la disponibilidad salen siempre de las herramientas. Que Opttia cree el pedido sin el clic del cliente, como el `pedidoDirecto` de WhatsApp, iría en otra propuesta con el diff aprobado.
- Sin precios por cliente: el visitante es anónimo y ve los precios de la vitrina.
- Sin chat en vivo con asesores dentro del sitio: el paso a una persona es por WhatsApp o por ticket.

## Riesgos

- **Endpoint público.** Se conservan el freno por visitante y el tope por tienda de D-469, más un tope de pasos de herramienta por mensaje (6). Cada paso del agente cuesta, así que hay que medirlo en Baudio antes de abrirlo.
- **Inyección de instrucciones.** Las herramientas de lectura solo ven el catálogo del sitio. Crear un ticket es la única escritura y va con un límite por visitante. Opttia nunca ve clientes, pedidos ni otros visitantes.
- **Módulos sensibles.** No se tocan pedidos, pagos, inventario ni consecutivos. Llenar el checkout es solo del navegador: el pedido nace igual que hoy.
- **Tickets.** Crear tickets desde una página pública abre la puerta al spam. Lleva límite, correo o celular obligatorio y marca de origen «Sitio web».
