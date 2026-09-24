## 0. Prerrequisitos (Daniel; sin esto no se enciende nada)

- [ ] 0.1 Activar DKIM de Google Workspace para katuq.com y publicar `google._domainkey`. Agregar `include:_spf.google.com` al SPF. Llevar el `rua` de DMARC a un buzón de Katuq. Verificar en los encabezados de un correo real que SPF, DKIM y DMARC den `pass`.
- [x] 0.2a Proveedor decidido: MailerSend (Daniel, 2026-09-23).
- [ ] 0.2 En MailerSend: agregar y verificar `novedades.katuq.com` (SPF, DKIM y return-path en el DNS), apagar su seguimiento de aperturas y clics, crear el token de API y el webhook (eventos delivered, hard_bounced, soft_bounced, spam_complaint, unsubscribed), cargar `MAILERSEND_API_TOKEN` y `MAILERSEND_WEBHOOK_SECRET` en prod, y confirmar el plan: velocidad y cabeceras propias.
- [x] 0.3 Colecciones `email_campaigns`, `email_usage` y `email_subscribers` aprobadas; cupos de 500 gratis y 5.000 premium, tope de 5.000 por campaña, sin cobro (Daniel, 2026-09-23).
- [ ] 0.4 Validar con un asesor el texto de autorización, la política de privacidad y el horario y la frecuencia (pregunta 6).
- [ ] 0.5 Registrar la decisión en `specs/CONTRACT.md`, incluida la excepción al Artículo IX (Angular 14).

## 1. Autorización y baja (se despliega primero: solo junta suscritos)

- [ ] 1.1 Pruebas de contrato de la baja (`GET/POST /v1/marketing/email/baja/:token` y la página `/baja` de la tienda) y del cambio de autorización desde la cuenta del comprador: códigos de estado, token malo → sin efecto, token de otra tienda → sin efecto. La autorización del checkout, el formulario y el boletín viaja en los endpoints que ya existen, con un campo nuevo y opcional.
- [ ] 1.2 Módulo puro `utils/suscripcionCorreo.js`: `emailHash`, `idSuscriptor`, `firmaBaja` y `firmaBajaValida` (HMAC en tiempo constante), `AUTORIZACION_PUBLICIDAD_V1` y `registroDeAutorizacion()`. Con pruebas unitarias.
- [ ] 1.3 `registrarSuscripcion()` y `darDeBaja()` en `controllers/sites.js`, escribiendo en `email_subscribers`. Ninguna de las dos puede lanzar error hacia el pedido.
- [ ] 1.4 Casilla desmarcada en el checkout (`siteTienda.js`) que envía `autorizaPublicidad`. Llamarla después de crear el pedido. Prueba de pedido de punta a punta en FLORECER, con y sin casilla, y con falla simulada del registro.
- [ ] 1.5 Formulario de contacto con casilla opcional. El boletín registra la autorización y guarda el prospecto con `tipo: "boletin"`. "Tus contactos" lo muestra como "Boletín".
- [ ] 1.6 Interruptor de autorización en la cuenta del comprador.
- [ ] 1.7 Página `/baja` de la tienda: confirmar y deshacer. Agregar `baja` a `RUTAS_PAGINA_RESERVADAS` y el POST de un clic.
- [ ] 1.8 Finalidad comercial condicionada en `sitePaginasLegales.js`.
- [ ] 1.9 Agregar `novedades` a `SLUGS_RESERVADOS` y un script con `--dry-run` que confirme que ninguna tienda usa ese slug.
- [ ] 1.10 `npm test` del backend en verde (`scripts/test-sitios-publicacion.js` más lo nuevo). Revisar el diff con Daniel antes de desplegar.

## 2. Proveedor, entregabilidad y eventos

- [ ] 2.1 Prueba de contrato del webhook `POST /v1/marketing/email/eventos`: firma de MailerSend válida, inválida, ausente y repetida.
- [ ] 2.2 `services/marketing/proveedorEnvio.js`: interfaz y adaptador de MailerSend por HTTP con `fetch` nativo, con `listo()`, `messageId` desde `X-Message-Id`, velocidad configurable y errores transitorios (429 y 5xx) distinguidos de los definitivos. Sin dependencias nuevas.
- [ ] 2.3 Webhook de eventos: guarda el crudo en `rawIntegrationEvents` (`mailersend_<id>`, `create()`) antes de procesar. Aplica entregado, rebote definitivo, queja y baja, y la supresión en todas las filas del hash.
- [ ] 2.4 Módulo puro `utils/ventanaEnvio.js`: horario permitido y festivos de Colombia (Ley Emiliani), con el siguiente horario válido. Pruebas con Semana Santa, festivos trasladados y sábado a las 15:00.
- [ ] 2.5 Módulo puro `utils/cuposCorreo.js`: cupo mensual por plan (con `subscriptionValidator`), tope por campaña, tope diario por etapa de calentamiento y regla de pausa automática. Con pruebas.

## 3. Campañas (backend)

- [ ] 3.1 Pruebas de contrato de `/v1/marketing/email/*` (campañas CRUD, conteo de audiencia, vista previa, prueba, programar, pausar, reanudar, cancelar, métricas, sugerir): todas exigen sesión y devuelven 404 si el recurso es de otra empresa.
- [ ] 3.2 Módulo puro `utils/campanaCorreo.js`: arma el HTML desde los bloques con la envoltura de `siteCorreos` (exportar `envoltura`), pie obligatorio del servidor, versión en texto plano y reemplazos por destinatario. Con pruebas de escape (nada de HTML del comercio).
- [ ] 3.3 Segmentos (solo lectura de `orders` y `prospects`) cruzados con `email_subscribers`: suscritos, compraron en N días, dormidos, producto o categoría, carrito sin comprar, pidieron aviso. Conteo sin enviar.
- [ ] 3.4 Rutas CRUD, vista previa, prueba (con límite por minuto) y programación, con validación de ventana y de cupo.
- [ ] 3.5 Tarea `initCampanasCorreoJob` con bandera: arrendamiento por campaña, armado de audiencia en `email_usage` con `create()`, despacho con topes, `incierto` sin reintento y pausa automática. Prueba de dos despachadores simultáneos: cero duplicados.
- [ ] 3.6 Seguimiento: `/c/:token` (redirección solo a la propia tienda, con UTM) y `/o/:token.gif`. Prueba de redirección abierta.
- [ ] 3.7 Métricas con ventas atribuidas calculadas al leer (UTM más clic en 7 días), sin escribir en `orders`.
- [ ] 3.8 `POST /sugerir` por Opttia (`pedirJsonAOpttia`), con tiempo límite y mensaje de falla.
- [ ] 3.9 Contract test del write-set: una campaña completa no escribe `orders`, `products`, `inventory` ni precios.

## 4. Campañas (front, módulo Marketing)

- [ ] 4.1 `MarketingCorreoService extends BaseService` con los endpoints de 3.x.
- [ ] 4.2 `editor-bloques-correo` (bloques, productos del catálogo, cupones de la tienda, color) y `vista-previa-correo` (iframe con sandbox, celular y computador).
- [ ] 4.3 Asistente `campana-correo` de 4 pasos (audiencia con conteo, contenido con "Escríbelo con Opttia", prueba, envío o programación). Confirmaciones con SweetAlert2.
- [ ] 4.4 `campanas-historial` con canal (WhatsApp y correo) y detalle de métricas y ventas atribuidas.
- [ ] 4.5 `suscriptores`: lista, evidencia de la autorización, bajas y supresiones, y conteo de "sin autorización".
- [ ] 4.6 Menú en `nav.service.ts` y verificación de `menus` de los roles (script con `--dry-run` si hace falta).
- [ ] 4.7 `npm run build` sin errores. Revisión visual contra el sistema de diseño.

## 5. Encendido controlado

- [ ] 5.1 Desplegar con `EMAIL_CAMPAIGNS_ENABLED=false`. Encender solo para FLORECER y enviar a direcciones internas: SPF, DKIM y DMARC en `pass`, baja de un clic en Gmail, rebote de prueba → suprimido.
- [ ] 5.2 Campaña real pequeña de Julsmind o FLORECER. Revisar métricas, atribución y pausa automática forzada.
- [ ] 5.3 Registrar el resultado en CONTRACT.md y en la memoria. Abrir por comercio, siguiendo el calentamiento.

## 6. Remarketing automático (fase 2)

- [ ] 6.1 "Volvió": tarea cada 30 minutos sobre `avisame-stock` con `productoParaVitrina` (solo lectura), filas en `email_usage` y `avisadoEn` en el prospecto. Contract test: producto, variantes, precios e inventario sin cambios.
- [ ] 6.2 "Bienvenida": se dispara al suscribirse, una vez por persona y tienda, dentro de la ventana.
- [ ] 6.3 "Te extrañamos": N ≥ 30 días sin comprar, una vez cada 90 días.
- [ ] 6.4 Pantalla `automatizaciones` en Marketing (encender y apagar, texto, cupón, métricas) y build sin errores.
- [ ] 6.5 Retirar la bandera de lanzamiento según el plan (dueño Daniel, 2027-01-31).
