## Why

Daniel quiere que el comercio pueda "enviar y hacer remarketing" por correo desde Katuq, como en Shopify o Tiendanube. Hoy la tienda ya junta contactos (compradores, carritos abandonados, "Avísame cuando llegue", boletín), pero con ellos no se puede hacer nada:

- no hay envío masivo de correo;
- nadie les ha pedido permiso para publicidad;
- no existe la baja;
- el bloque "Boletín" guarda correos a los que nunca se les escribe.

La única difusión que existe es la de WhatsApp, en el módulo Marketing.

Hay además dos bloqueos previos que hacen peligroso mandar volumen hoy:

1. **Los correos que Katuq ya envía no pasan la verificación de remitente.** En un correo de `notificaciones@katuq.com` del 23-sep, SPF da `softfail` (el SPF de katuq.com no incluye a Google) y DMARC da `fail`, porque la firma DKIM es la genérica `gappssmtp.com` y no la de katuq.com. Además, los reportes DMARC le llegan a `lovable.dev`. Si se suma volumen de publicidad a esa misma dirección, se arriesgan las confirmaciones de pedido y de pago de todos los comercios.
2. **La aprobación de envío masivo que ya existe en AWS no es de Katuq.** La cuenta 011528299077 tiene SES en producción en `us-east-1`, pero se aprobó para Red de Acopio, declarado como "solo transaccional, nunca publicidad". Usarla para campañas contradice lo que se le dijo a AWS y pone en riesgo ese servicio humanitario.

A esto se suma la ley colombiana. La Ley 1581 de 2012 exige autorización previa, expresa e informada para usar datos con fines comerciales. La política de privacidad que Katuq genera para cada tienda dice que los datos se usan **únicamente** para el pedido, así que hoy escribirle publicidad a un comprador va más allá de lo que se le informó.

## What Changes

**Consentimiento y baja en las tiendas** (lado del comprador)
- Casilla desmarcada "Quiero recibir novedades y ofertas de {tienda}" en tres puntos: el checkout, el formulario de contacto y la cuenta del comprador.
- Suscribirse al "Boletín" pasa a ser una autorización registrada, con su propio tipo.
- Cada autorización guarda cuándo se dio, desde dónde, el texto aceptado y la tienda.
- La política de privacidad generada agrega la finalidad comercial, solo para quien autoriza.
- Todo correo de campaña trae un enlace de baja de un clic, con su página de baja en la tienda y la cabecera que Gmail y Yahoo exigen.
- La baja aplica de inmediato y por tienda. Los rebotes definitivos y las quejas por spam se suprimen en todas las tiendas.

**Campañas de correo en el módulo Marketing** (lado del comercio)
- Un asistente nuevo, `/marketing/campanas/correo`, junto al de WhatsApp. Tiene cuatro pasos:
  1. **Audiencia:** segmentos de la tienda (suscritos; compraron o no compran hace N días; compraron tal producto o categoría; dejaron carrito; pidieron aviso de un producto). Solo entran contactos con autorización vigente.
  2. **Contenido:** editor de bloques (encabezado con logo, título, texto, imagen, botón, productos del catálogo con precio y promoción, cupón de la tienda, separador) con el color de la tienda. El pie es obligatorio y no se puede quitar: identifica al comercio, dice por qué le llega el correo y trae el enlace de baja. Opcional: "Escríbelo con Opttia".
  3. **Prueba:** vista previa en celular y computador, y envío de prueba al correo del comercio.
  4. **Envío:** ahora o programado, siempre dentro del horario de contacto comercial.
- El historial de campañas junta WhatsApp y correo. Por campaña muestra: enviados, entregados, rebotes, aperturas (aproximadas), clics, bajas, quejas y **pedidos y ventas atribuidos**.

**Envío seguro**
- Las campañas salen por un proveedor de envío masivo, detrás de una interfaz común, desde un subdominio propio para no contaminar la reputación de los correos transaccionales. El remitente tiene el nombre de la tienda y las respuestas le llegan al comercio.
- **Límites:**
  - un cupo mensual por plan;
  - un tope por campaña;
  - un calentamiento del dominio nuevo;
  - la campaña se pausa sola si rebotes o quejas pasan el umbral;
  - un interruptor general con dueño y fecha de retiro.
- Nunca se envía dos veces el mismo correo de una campaña al mismo destinatario, aunque haya reintentos.

**Remarketing automático** (fase 2, dentro de este cambio)
- **"Volvió":** quien pidió "Avísame cuando llegue" recibe el aviso cuando el producto tiene existencias. Lo pidió él mismo, así que no necesita autorización de publicidad.
- **"Te extrañamos":** a los suscritos que no compran hace N días (lo configura el comercio).
- **"Bienvenida":** al suscribirse, con cupón opcional.

**Colecciones nuevas que requieren tu aprobación explícita** (sin ellas no hay campañas):
- `email_campaigns`: la campaña (contenido, audiencia, horario, estado, totales).
- `email_usage`: una fila por destinatario y campaña. Sirve de cola, de libro y de freno contra los envíos dobles. Es el mismo patrón de `whatsapp_usage` y `sms_usage`.
- `email_subscribers`: una fila por tienda y correo, con la autorización y su evidencia, la baja y la supresión por rebote o queja. La baja de WhatsApp vive en un arreglo dentro de un documento, y en correo ese arreglo crecería hasta romper el tope de tamaño del documento. Además, así "todos los suscritos de la tienda" se resuelve con una sola consulta, sin tocar `clients` ni `prospects`.

## Capabilities

### New Capabilities
- `store-marketing-consent`: autorización de publicidad del comprador, baja de un clic, supresión por rebote o queja, y política de privacidad acorde.
- `store-email-campaigns`: crear, segmentar, previsualizar, probar, programar, enviar y medir campañas de correo de la tienda.
- `store-email-deliverability`: reputación separada de los transaccionales, autenticación del dominio de envío, cupos, calentamiento, pausa automática e idempotencia.
- `store-email-automations`: correos automáticos "Volvió", "Te extrañamos" y "Bienvenida".

### Modified Capabilities
- Ninguna. `design-system` se cumple, no se modifica.

## Impact

- **Prerrequisitos que hace Daniel en DNS y Google** (no son código). Hay que hacerlos antes del primer envío y, de paso, arreglan los correos de hoy:
  - activar DKIM de Google Workspace para katuq.com;
  - agregar `include:_spf.google.com` al SPF;
  - llevar los reportes DMARC a un buzón de Katuq;
  - decidir la cuenta de envío masivo (recomendado: SES en una cuenta o región propia de Katuq, con su propio caso de uso) y publicar los registros del subdominio de envío.
- **Backend** (`katuq_admin_back_firebase/functions`):
  - rutas nuevas bajo `/v1/marketing/email/*` con autenticación y aislamiento por empresa;
  - un webhook de rebotes y quejas firmado, que guarda el evento crudo en `rawIntegrationEvents` antes de procesarlo;
  - una tarea programada que despacha la cola;
  - en las tiendas: `siteTienda.js`, `siteHtml.js`, `sitePaginasLegales.js` y el registro de prospectos y compradores en `controllers/sites.js`;
  - el nuevo slug reservado del subdominio de envío en `SLUGS_RESERVADOS`.
- **Front:**
  - en `src/app/modules/marketing/`: el asistente de correo, el historial unificado y la lista de suscritos, con un servicio que extiende `BaseService`;
  - entradas de menú en `nav.service.ts`, más los `menus` de los roles. Si el módulo Marketing no basta, el ajuste se hace con `--dry-run` primero.
- **Datos:** las tres colecciones de arriba. En `clients`, `orders` y `prospects` no se cambia nada existente. Lo único nuevo en `prospects` es que el boletín pasa a tener `tipo: "boletin"`.
- **No-goals:**
  - SMS o WhatsApp dentro de esta campaña;
  - importar listas compradas;
  - pruebas A/B;
  - editor de HTML libre;
  - cobrar el correo con saldo (queda el patrón de SMS para después);
  - enviar audiencias a Meta o Google.
- **Riesgos sobre módulos sensibles:**
  - `orders` solo se **lee** (segmentos y atribución);
  - no se toca inventario, consecutivos, precios ni productos;
  - "Volvió" solo lee existencias.
  - El checkout de las tiendas cambia: la casilla no puede bloquear ni demorar el pedido, y se prueba con un pedido de punta a punta.
  - Venta asistida y POS no se tocan.
