## Why

Hoy todo WhatsApp de Katuq pasa por Kapso: el número compartido, los números propios de los comercios, el bot y las campañas. Eso agrega un intermediario con su propio plan, su cobro y sus fallas. Julsmind ya tiene verificados el negocio y el acceso como proveedor de tecnología ante Meta (25-ago-2026). Lo que falta es la conexión directa y la revisión de Meta, que solo se aprueba si se ve funcionando en video. Daniel lo aprobó el 9-nov-2026: «todo aprobado, da la opción de número compartido o uno nuevo, además de los permisos para IG y FB».

## What Changes

- **Nuevo proveedor de mensajería «Meta WhatsApp»** dentro del dominio Mensajería (D-437), al lado de Kapso. El buzón, el bot, las campañas y el dueño de cada chat siguen igual: solo cambia por dónde sale y entra el mensaje de esa línea.
- **Conectar el número desde Katuq con la ventana oficial de Meta**, en su versión 4. El comercio escoge entre dos opciones:
  - **Usar el número que ya tiene en WhatsApp Business del celular.** Sigue contestando desde el celular, y los mensajes de los dos lados se ven en el buzón.
  - **Un número nuevo, solo para Katuq.**
- **Enviar y recibir directo con Meta:** texto, plantillas, botones, fotos, marcar como leído, y la descarga de las fotos que manda el cliente.
- **Crear y consultar plantillas desde Katuq** en la cuenta de WhatsApp del comercio, sin pasar por Kapso.
- **Cobro.** En una línea conectada directo, Meta le cobra al comercio en la tarjeta de su cuenta de WhatsApp, y Katuq no descuenta ese costo del saldo prepago.
  - **Modifica lo decidido en D-437**, donde Katuq le pagaba a Meta. Ese modelo sigue solo para las líneas de Kapso.
  - **Por qué cambia:** un proveedor de tecnología no puede compartir línea de crédito con sus clientes.
- **Kapso sigue funcionando en paralelo** hasta que el piloto directo esté probado. No se apaga nada en este cambio.
- **Una sola solicitud de revisión a Meta**, preparada en este cambio, con cuatro permisos:
  - `whatsapp_business_messaging` y `whatsapp_business_management`, que son nuevos;
  - `pages_messaging` e `instagram_manage_messages`, que se reenvían. Los rechazaron el 26-ago porque el video no mostraba el mensaje llegando al otro lado (D-249).
  - La solicitud lleva el guion exacto de cada video, las descripciones en inglés y las instrucciones para el revisor.
- **Bandera por comercio** para encender la conexión directa, más un interruptor global en la configuración de la plataforma (D-505). Ningún interruptor nuevo en el `.env`.

## Capabilities

### New Capabilities

- `whatsapp-meta-conexion`:
  - el comercio conecta un número directo con Meta, compartiendo el del celular o con uno nuevo;
  - Katuq lo confirma contra Meta;
  - deja la línea lista para recibir y enviar;
  - el comercio puede desconectarla.
- `whatsapp-meta-mensajes`:
  - entrada y salida de mensajes y plantillas por la línea directa;
  - mensajes enviados desde el celular del comercio;
  - cobro de Meta al comercio;
  - firma de los avisos de Meta.
- `meta-revision-permisos`: lo que la solicitud de revisión debe demostrar y entregar para los cuatro permisos, para que salga aprobada en un solo envío.

### Modified Capabilities

Ninguna en `openspec/specs/`. Este cambio se monta sobre `whatsapp-varios-numeros` (D-437), que sigue sin archivar. Sus líneas, el dueño de cada chat y el alcance por vendedor se usan tal cual.

## Impact

- **Backend** (`katuq_admin_back_firebase/functions`):
  - `services/messaging/providers/` (provider nuevo) y el webhook `/v1/messaging/webhook/:provider`, que ya existe;
  - en `kapsoService` y `whatsappOutboundService`, la salida por línea según el proveedor y el costo 0 en líneas directas;
  - las plantillas;
  - la configuración global de Meta en `config/` y la bandera en `companies.featureFlags`.
- **Frontend**:
  - `integrations/messaging-lines` y `connectors/connector-registry.ts`, con el conector de Meta, que carga el SDK de Facebook solo en esa pantalla;
  - el buzón y las campañas, sin cambios de comportamiento.
- **Meta**, en la app `katuq` (`2191585237986547`):
  - agregar el producto WhatsApp;
  - crear la configuración de inicio de sesión para WhatsApp;
  - suscribir el objeto de WhatsApp al webhook;
  - enviar la solicitud de revisión.
- **Datos:** sin colecciones nuevas. La línea directa vive en `messaging_lines`, con su llave cifrada, como ya se hace con Instagram y Facebook.
- **Sin cambios en los módulos sensibles:** no se toca nada de pedidos, inventario ni consecutivos. El bot sigue cerrando en cotización, por el mismo camino.
