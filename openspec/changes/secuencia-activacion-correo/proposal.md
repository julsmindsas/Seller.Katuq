## Why

De los 31 registros del 23 al 27-sep:
- 11 terminaron la configuración inicial;
- solo 1 volvió a entrar;
- ninguno publicó tienda.

Jairo les escribió a mano a 29. Daniel, el 28-sep: "yo quiero algo automatizado, no me pongas a hacerlo persona a persona".

Desde el 28-sep la tienda se publica en 1 clic (D-324). Lo que falta es traer de vuelta, sin intervención humana, a quien se registró y no dio el siguiente paso.

## What Changes

- **Tres correos por comportamiento.** Cada uno sale solo si la persona no ha dado ese paso, y la secuencia se detiene sola cuando lo da:

  | Paso | Cuándo | Condición | Mensaje | Enlace |
  |---|---|---|---|---|
  | 1. Producto | 1 h después del registro | sin producto propio | "Sube tu primer producto en 2 minutos" | crear producto |
  | 2. Tienda | 24 h después del registro | con producto y sin tienda publicada | "Tu tienda está lista para publicar en 1 clic" | la tienda en 1 clic |
  | 3. Compartir | 3 días después de publicar | sin pedidos de la tienda | "Así compartes tu tienda en Instagram y WhatsApp" | la tienda y cómo compartirla |

- **Personalizados** con el nombre del negocio, el producto que ya subió y un enlace a un video corto de 30 a 45 s. Los textos finales y los videos los hace la sesión de videos.
- **Solo correo** (decisión de Daniel, 28-sep). El remitente lo escoge Daniel entre dos opciones (ver diseño):
  - el correo actual de Katuq;
  - MailerSend, que ya está integrado para las campañas.
- **Requisito: arreglar el dominio.** Hoy los correos de katuq.com fallan DMARC y caen en Spam. Es un paso de Daniel en el DNS; los registros exactos están en el diseño. Sin él, la secuencia no pasa de modo sombra.
- **Reglas:**
  - solo registros desde el momento en que se encienda (los 29 ya contactados quedan fuera);
  - fuera las cuentas de prueba o sospechosas (`metricsExcluded`) y quien no ha confirmado su correo (D-323);
  - máximo un correo al día y tres en total por empresa;
  - cada correo trae un enlace para dejar de recibirlos.
- **Medición por paso:** enviados, abiertos (si el remitente lo permite), clics, cuántos dieron el paso en los 7 días siguientes, y bajas. Se ve en el panel del Super Admin.
- **Encendido por bandera:** apagada, sombra (calcula a quién le llegaría sin enviar) o envío.

## Capabilities

### New Capabilities
- `activation-email-sequence`: la secuencia, sus reglas de parada, la baja y la medición.

### Modified Capabilities
- Ninguna.

## Impact

- **Backend:**
  - un trabajo programado cada 15 min;
  - las plantillas de los tres correos;
  - un canal de envío intercambiable (el correo actual o MailerSend);
  - dos rutas públicas firmadas: el enlace con seguimiento y la baja;
  - la métrica para el Super Admin.
- **Datos:** sin colecciones nuevas. Todo vive en `companies.activacion`.
- **DNS:** lo hace Daniel.
- **Front:** nada obligatorio. La métrica se muestra en el panel del Super Admin, en una tarea aparte.
- **Decisión:** D-325.
- **No-goals:**
  - WhatsApp;
  - reenviar la secuencia a los 29 ya contactados (el aviso único de la tienda en 1 clic es de D-324);
  - campañas a compradores de las tiendas (D-318);
  - escribir los textos finales.
