# Propuesta: Opttia en el sitio web (D-686, por aprobar)

## Por qué

Hoy el cliente que entra a una tienda de Katuq solo tiene dos salidas cuando duda: el botón de WhatsApp o irse. Opttia ya atiende clientes por WhatsApp con el catálogo, el carrito y las cotizaciones de cada comercio (`channels/whatsapp/` del ADK, `whatsappBotDispatcher.js` en el backend). Falta llevar esa misma atención **dentro del sitio**, sin que el cliente salga de la página.

## Qué cambia

1. **Editor del sitio (diseño nuevo):** un interruptor «Opttia en la tienda», con:
   - el saludo;
   - lo que puede hacer: responder dudas, armar el carrito, pedir cotización, pasar a WhatsApp;
   - el nombre que muestra.
   Opttia (la del Seller) también puede encenderlo cuando el comercio se lo pida («agrega Opttia a mi tienda»).
2. **Sitio publicado:** una burbuja de chat liviana. Su código se carga solo al tocarla, para que la página no pese más. El cliente pregunta y Opttia responde con los productos **de ese sitio** (precio, foto, enlace a la ficha) y los agrega al **carrito de la tienda**. El pago sigue por el checkout que ya existe.
3. **Pasar a una persona:** si el cliente lo pide, o Opttia no sabe la respuesta, ofrece seguir por WhatsApp con lo conversado, o dejar los datos como solicitud (el mismo camino del formulario de contacto).

## Alcance

- Solo sitios con el diseño nuevo (`sistemaVisual: 2`) y empresas con la bandera nueva `featureFlags.opttiaEnSitio` (D-505). Apagada, el sitio sale **byte por byte igual** (regla X1).
- Reusa el agente de ventas de WhatsApp como un canal más (`channels/web/`, AGENTS.md: «un canal nuevo es un adaptador de transporte»).

## No-goals

- Opttia **no crea pedidos, no cobra, no toca inventario ni precios**. Solo agrega al carrito del navegador; el pedido nace en el checkout de siempre, que recalcula precios en el servidor.
- No hay chat en vivo con asesores dentro del sitio (eso sigue en WhatsApp).
- No hay colecciones nuevas en `katuq-db`: la conversación es dato propio de Opttia, en sus sesiones (como WhatsApp).
- Los sitios v1 no cambian.

## Riesgos

- **Endpoint público sin login.** Lleva límite por visitante, por IP y un tope diario de turnos por comercio (costo de Bedrock), y responde 404 si el sitio no está publicado o la bandera está apagada.
- **Inyección de instrucciones.** El agente solo tiene herramientas de lectura del catálogo del sitio y de carrito del navegador. No ve clientes, pedidos ni datos de otros visitantes.
- **Módulos sensibles.** No se tocan pedidos, pagos, inventario ni consecutivos. Si más adelante se quisiera que Opttia cierre el pedido en el chat, va en otra propuesta, con el diff aprobado.
- **Peso y CSP.** Hay que medir que la burbuja quede por debajo de 3 KB gz antes del primer toque; el chat solo habla con `back.katuq.com`, que ya está permitido.
