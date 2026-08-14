## Why

Hoy la comunicación con el cliente entra por tres puertas y solo una tiene buzón: WhatsApp. Los mensajes de Instagram y de Facebook llegan a la app de Meta de cada comercio, fuera de Katuq, donde el que contesta no ve ni el cliente, ni sus pedidos, ni su cartera. El buzón de WhatsApp ya resolvió ese problema —cruza el hilo con el lead del CRM y con los pedidos del contacto— y esa misma pieza sirve para los otros dos canales sin reinventarla.

Se hace ahora porque el trámite de Meta (verificación de negocio + revisión por permiso, con screencast del producto funcionando) tarda semanas y corre en paralelo al desarrollo: construir primero contra usuarios de prueba es lo que permite tener el screencast que Meta exige.

## What Changes

- **Dos buzones nuevos e independientes**: `/notificaciones/instagram/inbox` y `/notificaciones/facebook/inbox`, calcados del patrón del buzón de WhatsApp (shell + lista de hilos + detalle + panel de contacto).
- **El buzón de WhatsApp NO se toca ni se reemplaza.** El canal Kapso sigue vivo, cobrando por conversación, con su propio webhook. Cero cambios en `whatsapp-inbox`, `whatsappConversations`, `whatsappWebhook` ni `kapsoService`.
- **Endpoint de webhook nuevo para Meta**, que enruta por `body.object` (`instagram` / `page`). No se modifica el handler de WhatsApp, aunque ya parsee el mismo formato `entry[].changes[]`.
- **Identidad de hilo por canal**: Instagram usa su user id de ámbito de app e Instagram; Facebook usa el PSID de la página. Se hashean con el mismo mecanismo que `whatsappPhoneHash` para conservar la política de no exponer identificadores crudos al frontend. **No se puede reutilizar `phoneHash`**: estos canales no tienen teléfono.
- **Conexión de cuentas por empresa** vía Facebook Login for Business: cada comercio conecta su propia página de Facebook y su cuenta profesional de Instagram desde `/integrations`, sin intervención técnica.
- **Reutilización sin modificar** del servicio que arma el panel del contacto (lead del CRM, pedidos, calificación, cliente registrado).

### No-goals

- **El bot que recibe pedidos por WhatsApp queda FUERA.** Toca el módulo de órdenes (sensible) y va en propuesta aparte.
- No se migran los hilos históricos de WhatsApp a ningún modelo nuevo.
- No se unifican los tres canales en un solo buzón. Son tres buzones separados, por decisión explícita del usuario.
- No se toca facturación, opt-out ni saldos de WhatsApp.
- No se publica la app de Meta a modo Live en esta propuesta.

## Capabilities

### New Capabilities

- `buzon-instagram`: recepción, listado, lectura y respuesta de mensajes directos de Instagram por empresa, con el panel de contacto de Katuq.
- `buzon-facebook`: lo mismo para conversaciones de Messenger de la página de Facebook.
- `conexion-cuentas-meta`: flujo por el que una empresa conecta y desconecta sus propias cuentas de Instagram y páginas de Facebook, y el enrutamiento multiempresa de los mensajes entrantes hacia la empresa dueña de la cuenta.

### Modified Capabilities

_Ninguna._ No cambian los requisitos de ninguna capability existente: los buzones son aditivos y el de WhatsApp queda intacto.

## Impact

**Aprobación explícita requerida (regla del proyecto):**

- **Colección Firestore nueva.** Se propone **una sola** colección compartida por Instagram y Facebook, con campo de canal, en vez de dos separadas: son el mismo modelo de Meta y comparten identidad, y separarlas duplicaría el trabajo sin darle nada al usuario, que igual ve dos buzones distintos. **Requiere el visto bueno explícito de Daniel antes de implementar.**
- Decisión a registrar como **D-170** en `/specs/CONTRACT.md`.

**Frontend (`Seller.Katuq`)**

- Nuevos módulos bajo `src/app/components/notificaciones/` para cada buzón.
- Entradas de menú nuevas en `nav.service.ts`.
- Pantalla de conexión de cuentas en el módulo de integraciones.
- UI sujeta a `openspec/specs/design-system/spec.md`.

**Backend (`katuq_admin_back_firebase`)**

- Router, controlador y servicio nuevos para conversaciones de Meta.
- Endpoint de webhook nuevo (verificación GET + recepción POST con validación de firma).
- Servicio de hash de identidad reutilizando el mecanismo existente.
- Almacenamiento del token de página por empresa, cifrado, y su renovación.

**Externo — Meta (es el camino crítico, no el código)**

- App `katuq` (ID `2191585237986547`, negocio Julsmind) ya tiene Messenger, Instagram y Webhooks agregados, pero está en **modo Desarrollo** y **los tres permisos de mensajería están en acceso estándar, sin revisión solicitada y con cero llamadas a la API**.
- Se requiere acceso avanzado a `instagram_business_manage_messages` y `pages_messaging`, cada uno con revisión y screencast del recorrido completo.
- Katuq es **proveedor de tecnología** (sus clientes conectan sus propias cuentas): exige verificación de negocio y verificación de acceso.
- Hasta 25 usuarios de prueba no requieren revisión: es contra ellos que se construye y se graba el screencast.

**Riesgos**

- **Módulos sensibles:** esta propuesta NO toca órdenes, inventario ni consecutivos. Si en la implementación aparece la necesidad de tocarlos, se detiene y se abre propuesta aparte.
- **Riesgo de contagio al canal vivo:** el webhook de Meta y el de WhatsApp comparten formato. Se implementan en archivos y endpoints separados para que un error en el nuevo no pueda tumbar el de Kapso, que hoy cobra plata.
- **Dependencia de terceros:** los tiempos de aprobación de Meta no los controlamos; el alcance de código se define para ser útil y demostrable sin acceso avanzado.
