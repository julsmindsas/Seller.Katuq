## Context

El buzón de WhatsApp (spec 009) está vivo en producción sobre el canal Kapso: recibe por webhook, agrupa hilos, muestra el detalle y arma un panel de contacto que cruza el hilo con el cliente, su lead del CRM y sus pedidos. También cobra por conversación y administra opt-out. Es código que mueve plata.

La pieza reutilizable es el **panel de contacto**: `whatsappConversationsService` ya resuelve cliente, pedidos, pipeline y calificación a partir de una identidad. Esa resolución no tiene nada de WhatsApp salvo cómo se llega a ella.

El bloqueo estructural está en la identidad: `WhatsappThread.phoneHash` es el hash del E.164, y de ahí cuelgan la ruta `inbox/:phoneHash`, el `ContactProfile`, el opt-out y el cobro. Instagram y Facebook no tienen teléfono — usan un id de usuario con ámbito de app/página.

Del lado de Meta, la app `katuq` (`2191585237986547`, negocio Julsmind) ya tiene agregados Messenger, Instagram y Webhooks, pero está en modo Desarrollo, con `instagram_business_manage_messages`, `pages_messaging` y `whatsapp_business_messaging` en acceso estándar, sin revisión solicitada y con cero llamadas a la API.

Restricción transversal dada por el usuario: **la conexión de cuentas y los buzones tienen que ser usables por personas no técnicas.**

## Goals / Non-Goals

**Goals:**

- Dos buzones nuevos, independientes y aditivos, que no puedan romper el canal de WhatsApp.
- Que el operador vea, en Instagram y Facebook, el mismo panel de cliente y pedidos que ya ve en WhatsApp.
- Que un comercio conecte sus cuentas solo (sin soporte técnico) y entienda si quedó conectado o no.
- Que el producto sea demostrable con usuarios de prueba antes de tener acceso avanzado de Meta.

**Non-Goals:**

- El bot de pedidos por WhatsApp (propuesta aparte, toca órdenes).
- Unificar los tres canales en un buzón.
- Migrar hilos históricos.
- Tocar cobro, opt-out o saldos de WhatsApp.
- Publicar la app de Meta a modo Live.

## Decisions

### 1. Buzones separados, no un buzón multicanal

**Decisión del usuario, acatada.** Tres buzones en el menú: WhatsApp, Instagram, Facebook.

Alternativa descartada: generalizar el buzón existente a multicanal. Habría obligado a reemplazar `phoneHash` por una identidad genérica en un módulo que cobra por conversación y administra opt-out — riesgo alto sobre código vivo, a cambio de una unificación que el usuario no pidió. Para gente no técnica, tres entradas rotuladas con el canal son más claras que una bandeja mezclada.

### 2. Endpoint de webhook nuevo, separado del de WhatsApp

`POST /v1/meta/webhook` (más su `GET` de verificación), que enruta por `body.object`: `instagram` → buzón de Instagram, `page` → buzón de Facebook. Cualquier otro `object` se registra y se descarta.

Aunque el handler de WhatsApp ya parsea la misma forma `entry[].changes[]`, **no se toca ni se reutiliza**. Alternativa descartada: extender `whatsappWebhook.handle` con un `switch`. Se rechaza porque un error en el código nuevo tumbaría la recepción del canal que hoy factura. El aislamiento vale más que la deduplicación.

### 3. Identidad de hilo: hash del id de Meta, un solo esquema

`identidadHash = hash(canal + ":" + idCrudo)`, donde `idCrudo` es el IGSID en Instagram y el PSID en Facebook. Se reutiliza el mecanismo de `whatsappPhoneHash` (mismo algoritmo y mismo secreto) para conservar la política de que el frontend nunca recibe identificadores crudos.

Incluir el canal en el material hasheado evita colisiones entre un PSID y un IGSID que casualmente coincidan.

### 4. Una sola colección con campo de canal — **requiere aprobación explícita**

Instagram y Facebook comparten modelo, identidad y ciclo de vida; separarlos en dos colecciones duplicaría índices, consultas y servicio sin beneficio para el usuario, que igual ve dos buzones. La separación vive en la consulta (`where canal == "instagram"`), no en el almacenamiento.

La regla del proyecto prohíbe proponer colecciones Firestore nuevas sin visto bueno explícito: **queda bloqueado hasta que Daniel lo apruebe.** Alternativa si lo rechaza: dos colecciones espejo, con el costo de duplicar índices y servicio.

### 5. Reutilizar el resolutor de contacto sin modificarlo

El servicio nuevo llama al resolutor existente de cliente/lead/pedidos/calificación pasándole la identidad ya resuelta. Si ese resolutor hoy solo acepta teléfono, se extrae la parte agnóstica a un módulo compartido **sin cambiar el comportamiento del de WhatsApp**, y se verifica con los tests del canal vivo antes de mezclar.

### 5.b Vinculación de contacto: manual, con la puerta abierta a IA

**Hallazgo durante la implementación (2026-08-11).** El resolutor del panel de contacto resuelve al cliente **por teléfono** (`numero_celular_whatsapp`, `numero_celular_comprador`). Instagram y Messenger no entregan teléfono: un DM llega con un id de Meta y un nombre de perfil. La spec original daba por hecho que el panel resolvería solo al cliente, y eso **no se sostiene**.

Decisión de Daniel: **vinculación manual**, con espacio para IA más adelante.

El vínculo se guarda como registro propio con campo `origen` (`manual` hoy; `sugerido_ia` o `auto_telefono` mañana) y confianza opcional. Así una sugerencia automática futura entra como **propuesta que un humano confirma**, sin cambiar el modelo de datos y sin poder auto-aplicarse en silencio.

Alternativa descartada: emparejar por parecido de nombre. En un buzón donde se habla de plata, mostrarle al operador los pedidos del cliente equivocado es peor que no mostrar ninguno.

Una vez vinculado, el panel reutiliza el resolutor existente **por el cliente ya identificado**, no por teléfono — con lo cual la reutilización se mantiene y el código de WhatsApp sigue sin tocarse.

### 6. Conexión de cuentas: Facebook Login for Business, una pantalla, un estado

Katuq es proveedor de tecnología: cada empresa conecta **sus propias** cuentas. La pantalla vive en integraciones y muestra, por canal, uno de tres estados legibles: **sin conectar**, **conectado** (con el nombre de la página o cuenta), **reconectar** (token vencido o permiso revocado). Un botón por canal, nada de pegar tokens ni ids a mano.

El token de página se guarda cifrado por empresa y el enrutamiento del entrante se hace por el id de página o de cuenta de Instagram que trae el propio webhook — no por inferencia, a diferencia de lo que hubo que hacer en WhatsApp con el número compartido.

### 7. Construir contra usuarios de prueba primero

Modo Desarrollo permite hasta 25 usuarios de prueba sin revisión. Se construye y se prueba el flujo completo con la página y el Instagram de Julsmind; de ahí sale el screencast del recorrido que Meta exige para la revisión. Trámite y desarrollo corren en paralelo.

## Risks / Trade-offs

- **Romper el canal que factura** → endpoints, controladores, servicios y colecciones separados; cero ediciones en archivos de WhatsApp. Cualquier extracción de código compartido se hace sin cambiar comportamiento y se valida contra el canal vivo antes de mezclar.
- **Meta niega o demora el acceso avanzado** → el alcance de código se define para ser útil y demostrable con usuarios de prueba; el trámite no bloquea el desarrollo, solo la salida a clientes reales.
- **La ventana de 24 horas de Meta** para responder fuera de sesión es más estricta que la de WhatsApp → el buzón debe indicar con claridad cuándo ya no se puede responder, o el operador escribirá al vacío.
- **Token de página vencido o permiso revocado en silencio** → estado explícito de "reconectar" en la pantalla de integraciones, no un fallo mudo.
- **Duplicados por reintentos de Meta** → idempotencia por id de mensaje, igual que en el canal de WhatsApp.
- **Costo de la decisión de una sola colección** → si Daniel prefiere dos, el diseño se sostiene igual; solo cambian consultas e índices.

## Migration Plan

No hay migración de datos: nada existente cambia de forma. El despliegue es aditivo y se hace por partes — primero el webhook y el almacenamiento (sin UI), luego la pantalla de conexión, luego cada buzón. La reversión es quitar las entradas de menú y dejar de suscribir el webhook; nada de lo viejo depende de lo nuevo.

## Resueltas (Daniel, 2026-08-10)

1. **Una sola colección con campo de canal.** Aprobado explícitamente, con lo que queda satisfecha la regla del proyecto sobre colecciones Firestore nuevas.
2. **Se lee y se responde en la primera entrega.** Eso sube la ventana de 24 horas de Meta de riesgo a requisito: el buzón debe mostrar cuánto queda de ventana y bloquear el envío cuando expire, con una explicación entendible, no un error técnico.
3. **Los tres buzones van agrupados bajo "Mensajes"** con hijos WhatsApp, Instagram y Facebook. El menú no crece al agregar canales y el operador entiende que son la misma tarea en distintos canales.

## Open Questions

1. ¿Qué se hace con las dos apps "Opttia" en desarrollo, una de ellas sin negocio asignado? No bloquea el desarrollo, pero conviene limpiarlo antes de la verificación de negocio.
2. ¿La agrupación "Mensajes" reemplaza la entrada actual de WhatsApp en el menú, o esta se conserva también en su sitio de hoy durante una transición? Mover la entrada existente es el único punto donde esta propuesta toca la experiencia del canal vivo.
