## Context

**Lo que ya existe y se reutiliza**
- El módulo Marketing del front (`src/app/modules/marketing/`, rutas `/marketing`, `/marketing/campanas` y `/marketing/campanas/whatsapp`). Tiene su guard, su entrada de menú y `MarketingService extends BaseService`.
- La difusión por WhatsApp. Decisiones previas:
  - no hay colección de campañas; el historial se arma desde `whatsapp_usage` (D-096);
  - la baja se guarda por teléfono en `integration_configs` (D-098);
  - la audiencia se exporta en CSV para Meta y Google (D-092).
- Los correos de la tienda (D-317, `utils/siteCorreos.js`): la envoltura con el color, el pie, `esc` y `moneda`.
- La atribución UTM que ya queda guardada en `orders.campana` y `prospects.campana` (`utils/siteOrden.js:397`).
- La regla de "disponible" de la vitrina: `productoParaVitrina(...).disponible` en `controllers/sites.js`.
- Las promociones de la tienda (`utils/sitePromociones.js`) y sus cupones.
- La firma HMAC de los enlaces de pago y carrito (`utils/sitePagoPendiente.js`, `utils/siteCarrito.js`).
- La colección de eventos crudos `rawIntegrationEvents` y las tareas programadas con bandera en `services/cronService.js`.
- El paso de IA por Opttia: `services/ai/opttiaJson.js` (D-257).

**Lo que no existe**
- Envío masivo de correo.
- Consentimiento de publicidad del comprador.
- Baja de correo.
- Manejo de rebotes y quejas.
- Cabecera `List-Unsubscribe`.

**Estado del correo hoy**
- Todo sale por SMTP de Google Workspace como `notificaciones@katuq.com`.
- SPF da `softfail` y DMARC da `fail` (DKIM genérico `gappssmtp.com`, sin alinear).
- Los reportes DMARC le llegan a `lovable.dev`.
- SES tiene producción en `us-east-1` en la cuenta 011528299077, pero aprobada para Red de Acopio (solo transaccional). En `us-east-2` y `us-west-2` sigue en sandbox.

## Goals / Non-Goals

**Goals**
- Autorización de publicidad demostrable por tienda y baja de un clic.
- Campañas de correo con segmentos, bloques, vista previa, prueba, programación, métricas y ventas atribuidas.
- Reputación de envío aislada de los transaccionales, con cupos, calentamiento, pausa automática y envío idempotente.
- Tres automatizaciones: "Volvió", "Te extrañamos" y "Bienvenida".

**Non-Goals**
- SMS o WhatsApp dentro de la campaña de correo.
- Importar listas.
- Pruebas A/B.
- HTML libre.
- Cobro por saldo.
- Envío de audiencias a Meta o Google.
- Cambiar los correos transaccionales, salvo el arreglo de DNS, que es de Daniel.

## Decisions

### 1. Proveedor: SES por SMTP, detrás de una interfaz

`services/marketing/proveedorEnvio.js` expone `enviar({de, para, responderA, asunto, html, texto, cabeceras, etiquetas}) → {messageId}`.

La primera implementación usa un **segundo transporte de nodemailer** contra el SMTP de SES. Nodemailer ya está instalado, así que no hay dependencia nueva que instalar en prod.
- El configuration set y las etiquetas viajan en `X-SES-CONFIGURATION-SET` y `X-SES-MESSAGE-TAGS`.
- **Alternativas descartadas:**
  - `@aws-sdk/client-sesv2`: es una dependencia nueva, y el SMTP basta para enviar.
  - `aws-sdk` v2: ya no tiene soporte desde 2025.
  - MailerSend o Brevo: posibles con la misma interfaz. MailerSend ya aparece en el SPF de katuq.com; si Katuq tiene cuenta ahí, se evalúa como plan B.
- **La cuenta de SES no puede ser la de Red de Acopio.** Se recomienda una cuenta de AWS propia de Katuq, o por lo menos una región distinta con una solicitud de producción honesta que describa el opt-in, la baja y los rebotes (lo que implementa este cambio). La decisión es de Daniel.

### 2. Subdominio de envío: `novedades.katuq.com`
- **Remitente:** `"<Nombre de la tienda>" <<slug>@novedades.katuq.com>`, con `Reply-To` = correo de respuesta de la tienda (D-317) o el contacto del sitio.
- **Autenticación:** DKIM de SES en el subdominio, MAIL FROM propio (`rebote.novedades.katuq.com`, MX y SPF) para alinear SPF, y DMARC propio con `p=none` al inicio y `quarantine` después del calentamiento.
- **Choque con las tiendas:** como las tiendas viven en `*.katuq.com`, al crear registros bajo `novedades` el comodín deja de responder por ese nombre. Por eso `novedades` entra en `SLUGS_RESERVADOS` y una tarea verifica que ninguna tienda lo use hoy.
- **Envío bloqueado sin verificación:** hasta que la identidad esté verificada, `proveedorEnvio.listo()` devuelve `false` y bloquea el envío.

### 3. Datos: tres colecciones (requieren aprobación)

**`email_subscribers/{siteId}_{sha256(correo)}`**
- Campos:
  - `{company, siteId, correo, emailHash, nombre}`
  - `estado: suscrito|baja`
  - `autorizacion: {fecha, origen: checkout|formulario|boletin|cuenta, texto, version}`
  - `bajaEn`, `origenBaja`
  - `supresion: {motivo: rebote|queja, fecha}|null`
  - `creadoEn`, `actualizadoEn`
- Es por tienda, así que queda aislado por empresa. "Suscritos de la tienda" se resuelve con `company + siteId + estado`.
- **Supresión global sin colección global:** un rebote definitivo o una queja marca `supresion` en **todas** las filas de ese hash (`where("emailHash","==",h)`). Además, la lista de supresión de SES a nivel de cuenta hace de respaldo. Los transaccionales no la leen.

**`email_campaigns/{id}`**
- Campos:
  - `{company, siteId, tipo: campana|automatizacion, automatizacion?: volvio|te_extranamos|bienvenida, activa?}`
  - `estado: borrador|programada|enviando|pausada|pausada_auto|terminada|cancelada`
  - `audiencia: {segmento, parametros}`
  - `contenido: {asunto, preheader, bloques[]}`
  - `programadaPara`
  - `despacho: {reservadoHasta, instancia}`
  - `totales: {destinatarios, enviados, entregados, rebotes, quejas, aperturas, clics, bajas}`
  - `motivoPausa`, `creadaPor`, fechas
- Las automatizaciones también son documentos de aquí. Así no se toca el documento del sitio ni su `normalizarTienda`, que ya se comió configuración por el guard de campos (D-317).

**`email_usage/{campaignId}_{sha256(correo)}`**
- Campos:
  - `{company, siteId, campaignId, emailHash, correo, nombre}`
  - `estado: pendiente|enviando|enviado|entregado|rebotado|queja|fallido|omitido|incierto`
  - `intentos`, `messageId`, `reservadoHasta`
  - `enviadoEn`, `entregadoEn`, `abiertoEn`, `clicEn`, `bajaEn`
  - `motivo`
- El docId determinista más `create()` hace que una persona quede **una sola vez** por campaña (Artículo IV).
- Es el mismo patrón de libro que `whatsapp_usage` y `sms_usage`: el cupo mensual se cuenta de aquí.

### 4. Despacho: tarea cada minuto, con arrendamiento

`initCampanasCorreoJob` en `cronService.js`, con la bandera `EMAIL_CAMPAIGNS_ENABLED`. Por cada campaña que toca:

1. Reserva la campaña por transacción (`despacho.reservadoHasta` = ahora + 2 min). Así dos instancias de pm2 no despachan la misma.
2. Si la campaña está en `programada` y ya es la hora, arma la audiencia en ese momento y crea las filas `pendiente` en lotes. En el mismo paso deduplica por hash, filtra autorizados y quita a los suprimidos.
3. Revisa la ventana horaria (lun–vie 7–19, sáb 8–15, sin domingos ni festivos de Colombia, calculados con la Ley Emiliani en un módulo puro) y los topes: velocidad del proveedor, tope diario global por etapa de calentamiento, cupo mensual de la empresa y tope por campaña.
4. Toma N filas `pendiente`, pasa cada una a `enviando` por transacción, envía y la marca `enviado`.
   - **Si el proceso muere entre enviar y marcar**, la fila queda `enviando` con el arrendamiento vencido. **No se reintenta: pasa a `incierto`.** Se prefiere perder un correo a mandarlo dos veces.
   - Solo los errores que el proveedor declara transitorios (4xx de SMTP) vuelven a `pendiente`, con `intentos` + 1 y un máximo de 3.
5. Actualiza los totales y evalúa la pausa automática: rebotes > 5 % o quejas > 0,1 %, medidos desde 200 entregas.

**Calentamiento del dominio**
| Periodo | Tope diario global |
|---|---|
| Semana 1 | 500 |
| Semana 2 | 1.500 |
| Semana 3 | 5.000 |
| Después | 15.000 |

El tope se ajusta por variable de entorno, y la cuota de SES se pide acorde.

### 5. Contenido: HTML armado una vez por campaña
- `utils/campanaCorreo.js` es un módulo puro. Arma el HTML desde los bloques con la envoltura de `siteCorreos` (se exporta `envoltura`).
- Los productos se resuelven **al enviar** con `productoParaVitrina` y `promocionParaProducto`.
- El HTML se arma una vez por campaña. Por destinatario solo se reemplazan `{nombre}`, el enlace de baja y los enlaces con seguimiento.
- Todo texto del comercio pasa por `esc`, así que no se puede meter HTML crudo.
- El pie lo agrega el servidor, no el editor; por eso no se puede quitar.
- Siempre va la versión en texto plano.

### 6. Seguimiento y atribución
- **Clics:** `GET /v1/marketing/email/c/:token`. El token lleva el usage y el índice del enlace, firmado con HMAC. Registra `clicEn` y redirige 302 al destino con `utm_source=katuq&utm_medium=email&utm_campaign=<campaignId>`. Solo redirige a URLs de la misma tienda: nada de redirección abierta.
- **Aperturas:** píxel `GET /v1/marketing/email/o/:token.gif`, marcado como "aproximadas" por la protección de privacidad de Apple Mail.
- **Ventas atribuidas:** se calculan **al leer** las métricas, sin escribir nada en pedidos. Cuentan los pedidos con `campana.utm_campaign == id`, más los pedidos del mismo hash dentro de los 7 días siguientes a su clic.

### 7. Rebotes y quejas: webhook SNS
- `POST /v1/marketing/email/eventos` (sin sesión, como todo webhook):
  1. Valida la firma de SNS: el certificado tiene que venir de `sns.<region>.amazonaws.com` y el `TopicArn` tiene que ser el configurado.
  2. Guarda el crudo en `rawIntegrationEvents` con docId `ses_<MessageId>` y `create()`. Si el mensaje llega repetido, no se procesa dos veces (Artículos V y X).
  3. Aplica `entregado`, `rebotado` (solo los `Permanent` suprimen) o `queja` (suprime).
- La suscripción de SNS se confirma solo si el `TopicArn` coincide.

### 8. Baja
- **Enlace visible:** `https://<tienda>/baja?t=<token>` con token HMAC de `siteId.emailHash`. `baja` entra en `RUTAS_PAGINA_RESERVADAS`. La página confirma la baja y ofrece deshacerla.
- **Un clic (RFC 8058):**
  - `List-Unsubscribe: <https://back.katuq.com/v1/marketing/email/baja/<token>>`
  - `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
  - El `POST` da de baja sin pedir nada más.

### 9. Autorización en la tienda
- **Checkout:** `siteTienda.js` pinta la casilla desmarcada, con el texto versionado `AUTORIZACION_PUBLICIDAD_V1` y el enlace a la política. El pedido viaja con `autorizaPublicidad: true|false`.
  - Después de crear el pedido, `registrarSuscripcion()` corre en su propio `try/catch`. Una falla se registra pero nunca cambia la respuesta del pedido.
  - El flujo de `orders` no se modifica: la suscripción se escribe aparte.
- **Formulario y boletín:** usan la misma función. El boletín además pasa a guardarse con `tipo: "boletin"`.
- **Cuenta del comprador:** tiene un interruptor.
- **Política de privacidad:** `sitePaginasLegales.js` agrega la finalidad comercial condicionada a la autorización.

### 10. Front (Angular 14)
- Componentes en `modules/marketing/`, cada uno con una responsabilidad:
  - `campana-correo` (asistente de 4 pasos)
  - `editor-bloques-correo`
  - `vista-previa-correo` (iframe con `sandbox=""` y `srcdoc`, como D-317)
  - `suscriptores`
  - `automatizaciones`
- `campanas-historial` pasa a mostrar el canal.
- El servicio es `MarketingCorreoService extends BaseService`.
- Cumple el tema del sistema de diseño: acento `#5F3FE0`, plano, sin gradientes.
- **Excepción al Artículo IX:** Angular 14 no tiene signals ni `@if`/`@for`. Se sigue el estilo del módulo (NgModule lazy, OnPush, RxJS solo para HTTP), y la excepción queda en el D-XXX.
- Todo diálogo usa SweetAlert2.
- **Menú:** entradas nuevas en `nav.service.ts` y verificación contra el campo `menus` de los roles. Si hace falta ajustar roles, se hace con script con `--dry-run`.

### 11. Opttia
`POST /v1/marketing/email/sugerir` llama a `pedirJsonAOpttia` con la idea, los productos y el tono de la tienda, y devuelve `{asunto, preheader, texto}`. Tiene tiempo límite, y si falla muestra "Opttia no respondió; escríbelo tú". Nada de Genkit.

### 12. "Volvió"
- Cada 30 minutos se leen los prospectos `tipo: "avisame-stock"` con correo que no tengan `avisadoEn`, agrupados por producto. Para cada producto se consulta `productoParaVitrina` (solo lectura).
- Si el producto está disponible, se crean filas en `email_usage` bajo la automatización y se marca `avisadoEn` en el prospecto.
- Es el único escrito sobre datos existentes: un campo nuevo en `prospects`, dentro del write-set permitido.
- Producto, variantes, precios e inventario no se escriben nunca, y hay una prueba de contrato que falla si se escriben.

## Risks / Trade-offs

- **[Los transaccionales ya fallan DMARC]** → Prerrequisito de Daniel: DKIM de Google más SPF con Google. Sin eso no se enciende nada.
- **[AWS no aprueba o tarda con SES]** → La interfaz permite MailerSend o Brevo sin tocar el resto.
- **[Pocos suscritos al principio]** (solo cuenta la autorización desde hoy) → Se enciende primero la captura en las tiendas, semanas antes de las campañas. No se permite importar listas en esta fase.
- **[Doble envío por reinicio o por dos instancias]** → docId determinista, arrendamiento por campaña y el estado `incierto` sin reintento.
- **[El checkout se rompe por la casilla]** → Escritura aparte con `try/catch` y una prueba de pedido de punta a punta antes del despliegue. Venta asistida y POS no se tocan.
- **[Horario y frecuencia legales]** (Ley 2300 de 2023) → Se implementa la ventana conservadora. La frecuencia máxima por semana queda como pregunta abierta para validar con un asesor.
- **[Redirección abierta en los clics]** → Solo se redirige a URLs de la propia tienda que estén en el HTML armado.
- **[Costo de Firestore al armar audiencias grandes]** → Unas 5.000 escrituras por campaña (centavos de dólar). El tope por campaña lo acota.

## Migration Plan

1. **Daniel:** arreglar DNS y Google para katuq.com; decidir la cuenta de SES; pedir producción; publicar los registros de `novedades.katuq.com`.
2. **Desplegar la captura de autorización y la baja** en las tiendas. No manda nada; solo junta suscritos.
3. **Desplegar las campañas con la bandera apagada**, y probar en FLORECER con direcciones internas (sandbox de SES).
4. **Encender para Julsmind y FLORECER**, luego para cada comercio que lo pida, siguiendo el calentamiento.
5. **Fase 2:** primero "Volvió", después "Bienvenida" y "Te extrañamos".
- **Reversa:** `EMAIL_CAMPAIGNS_ENABLED=false` y `pm2 reload --update-env`. Las campañas quedan pausadas, no perdidas, y las autorizaciones se conservan.
- **Retiro de la bandera:** dueño Daniel, retiro el 2027-01-31. Después queda solo el interruptor operativo, documentado en el contrato.

## Open Questions

1. ¿Cuenta de AWS propia de Katuq para SES, o región nueva en la cuenta actual? ¿Katuq tiene cuenta en MailerSend (está en el SPF)?
2. ¿`novedades.katuq.com` como subdominio de envío?
3. ¿Está bien el remitente "Nombre de la tienda" `<slug@novedades.katuq.com>`, con las respuestas al comercio?
4. Cupos por plan. Propuesta: gratis 500 al mes, premium 5.000 al mes, tope por campaña de 5.000, sin cobro por ahora.
5. ¿Se aprueban `email_campaigns`, `email_usage` y `email_subscribers`?
6. Validación legal: textos de autorización, horario y frecuencia (Ley 1581 de 2012 y Ley 2300 de 2023).
