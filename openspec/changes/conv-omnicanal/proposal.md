> **Estado:** borrador — pendiente aprobación de Daniel.
> **Tickets (13 hijos + 1 padre):** PRINCIPAL `6huHhaB0xYznfATiEmO2` (1298) · A `peFhP2zWIdA93o9lCT1l` (1301) · B `vvyqD3dO2MWETPoWx2eW` (1302) · C `THYnUX1HjySgeKOPGDzA` (1303) · D `tq1sK0KF5R0Vqb5XGR8N` (1304) · E `OpjNQnXBsuR3GFRBiRzN` (1305) · F `3VBswHv25B22hvRhyscs` (1311) · G `HqaMTGyM11IIPj6bdzhG` (1312) · H `W2xiIYg4v6midJ35AKfE` (1306) · I `7ih0W51rHKpl9Q4BYk8e` (1313) · J `vu1Z1vsRWRJTlhkR3ifR` (1307) · K `jTKeoz4vMECVEKvqBia7` (1309) · L `UXA5E1E9lYnJ8DIhjqrH` (1308) · M `hWXJPgEe1pCwAJF0F51R` (1310). Categoría «funcionalidad katuq», empresa Julsmind. Comercio afectado: Punto Verde Vidagas.
> **Decisión:** D-631.
> **Origen:** Jairo Arango pidió que Katuq reemplace a HiBot y B2Chat (requisitos y pantallazos); Daniel creó el padre el 18-oct-2026 y fijó el plan A a M en los comentarios 4 y 5 del mismo día. Relacionados leídos: KCOM-E1 a E5 (1404, 1403, 1402, 1401, 1400) y F4-40 (1243).
> Esta propuesta es el **paraguas**: fija alcance, orden, límites y preguntas. No es para implementar. Cada fase abre su propio cambio OpenSpec (spec, design, tasks) con su aprobación, y el número de decisión de cada una lo asigna quien la registre en `specs/CONTRACT.md`.

## Why

Vidagas tiene 18 números de WhatsApp por vincular y hay un prospecto con unos 200. Hoy el asesor salta entre números y entre tres bandejas separadas (WhatsApp, Instagram, Facebook). Jairo quiere una sola bandeja, atendida por varios asesores, administrada con los usuarios de Katuq, que escale a cientos de números y que sea tan completa que el comercio no contrate HiBot ni B2Chat. El diferenciador es que la conversación ya vive junto a clientes, cotizaciones y pedidos.

**Alcance de Jairo** (comentario 4 del padre): solo la capa conversacional. Las difusiones ya existen en Katuq Marketing, el embudo es del CRM y el pedido lo arma el bot de pedidos. Se complementa lo construido; no se rehace.

**Nota sobre el padre:** su descripción aún habla de hijos «1 al 14» y los comentarios 1 y 2 de «15 a 18». El comentario 5 corrige: los hijos vigentes son **A a M**. Esta propuesta usa A a M.

## Qué ya existe frente a lo que pide cada letra

Verificado en el código de los worktrees (front `wt-front-aws-claude-2`, back `wt-back-aws-claude-2`, ADK en solo lectura). No se leyó ni escribió ninguna base de datos (D-579); el estado de producción no se midió.

| Letra | Ya existe | Falta de verdad |
|---|---|---|
| **A** Varios números y cuentas (1301) | Dominio `services/messaging/` con Strategy: manager, provider Kapso, líneas (`messaging_lines`), dueño de chat (`messaging_threads`), webhook `/v1/messaging/webhook/:provider` con HMAC que falla cerrado, reserva e idempotencia y evento crudo (D-437, bandera `whatsappMultiNumero`, encendida en Julsmind el 16-oct). Front: lista de números, conectar por enlace de Kapso y asignar vendedores. Meta (Instagram, Messenger) conecta **una** cuenta por canal en `integration_configs/{company}_meta_{canal}` (D-170). | Falta de D-437: la prueba con dos números reales (6.2, 6.3), la revisión en navegador (3.8), el plan Platform de Kapso (más de 3 números), `partner_managed` y `MESSAGING_KAPSO_WEBHOOK_SECRET` (todo por verificar hoy). De A: varias páginas y cuentas de Instagram por comercio (Meta aún no es provider), estado y alertas de desconexión, alias, costo por número, plan documentado para 200, decisión API oficial vs QR, importar contactos de HiBot o B2Chat. |
| **B** Bandeja única (1302) | Tres módulos: `whatsapp-inbox` (6 componentes; filtros `pendientes/todas/bot`; pestaña Pedidos; plantilla para iniciar chat), `meta-inbox` (Instagram y Facebook) e `inbox-core` (`chat-dueno`, `chip-linea`). Rutas `notificaciones/{whatsapp,instagram,facebook}/inbox` y menú «Mensajes». Panel de contacto en ambos buzones. Seis respuestas rápidas fijas en el compositor. | Una sola lista con filtros por canal, número, agente, estado y etiqueta; responder siempre por el canal de entrada; historial unificado por cliente; adjuntos, notas de voz y no leídos; uso desde la app móvil con push; rendimiento con alto volumen. |
| **C** Multiagente (1303) | Dueño único por chat con tomar, soltar y asignar (transacción), alcance por vendedor en el servidor y familia Administrador (`roles.ts`, `messagingAccess`). Pestaña Pedidos distingue Bot y Asesor. | Roles supervisor y agente, asignación automática, propietario del contacto, transferir con nota, notas internas y menciones, estados del agente, vista de supervisor, alerta de sin responder, registro de quién respondió. D-437 dejó estas piezas como no-goals. |
| **D** Colas y horarios (1304) | Horario y bienvenida solo dentro del bot de pedidos. | Todo: colas, horario por cola, fuera de horario, enrutamiento por número, tipo de primer mensaje, menú o propietario, visibilidad por permisos. |
| **E** Automatizaciones (1305) | Una auto-respuesta, seis notificaciones de pedido, confirmación y recuperación de carrito por WhatsApp (`whatsapp-confirmacion-y-carrito`), bajas por palabra clave. | Mensajes por evento, seguimiento antes de cerrar la ventana de 24 h, respuestas rápidas editables con comandos, etiquetas, motivos de cierre, campos personalizados, registro de consentimiento. |
| **F** KAI en la atención (1311) | ADK con `channels/whatsapp` (agente de pedidos, sin escribir en Katuq: el backend decide y cobra), `channels/telegram` como molde, bot de pedidos que deja cotización en borrador con asesor KAI (D-481), modo sombra. | Desborde a asesor con contexto, preguntas frecuentes sin IA, lectura de imágenes y audios, encuesta, Instagram y Messenger con KAI, control de costo de IA por comercio. Se reparte con 1243 (pedido con link de pago, postventa, recuperación). |
| **G** Vidagas (1312) | Nada específico. Depende de A, B, C y D. | Listado de los 18 números, tareas del comercio en Meta, colas, vinculación, capacitación y bitácora. |
| **H** Informes (1306) | Medidor de saldo de WhatsApp y dashboard de Marketing; no hay métricas de atención. | Auditoría por conversación con descarga y métricas de tiempos, agentes, transferencias, desborde y satisfacción. |
| **I** Próximamente (1313) | **Resuelto** (D-509, versión 2026.10.20.6): TikTok, Correo y Llamadas informativos en Integraciones y Mensajes. Queda solo la revisión de textos con Jairo. | Nada de código. |
| **J** QA (1307) | Pruebas de contrato de mensajería (9 suites) y de bot. | Checklist por canal, bandeja, colas, KAI e informes con evidencia, prueba de carga para 200 números y validación real con Vidagas. |
| **K, L, M** TikTok, correo, llamadas (1309, 1308, 1310) | Solo la tarjeta «Próximamente». | Documentos de investigación. **Ojo:** KCOM-E4 (1401) ya describe construir TikTok. |

## Cruce con KCOM (hallazgo principal)

Existen otros cinco tickets, **KCOM-E1 a E5 (1400 a 1404)**, creados el 25-oct, con el mismo objetivo: canales Meta y multi-número (E1), bandeja unificada con SLA y notas (E2), vender desde el chat con KAI (E3), canal TikTok (E4) y seguridad (E5). Cubren buena parte de A, B, C, D, F, H y J, y E4 contradice a K («investigación, sin desarrollo»). Proponen un modelo `channelAccounts/{id}` que duplicaría `messaging_lines`, y cargan adjuntos (Spec v1.1 y mockups en PDF) que no pude leer: son gráficos sin texto extraíble. Esta propuesta **no los absorbe ni los modifica**; deja la reconciliación como pregunta 1.

## Fases (orden del padre; si choca con una dependencia, manda la dependencia)

El padre fija: «A y B → C y D → E → G → F y H → J; en paralelo I y K-L» (M no bloquea). D depende de A y C, y G de A, B, C y D, así que C va antes que D.

0. **Decisiones sin código.** API oficial o QR (parte de A, con Jairo); reconciliar con KCOM; cerrar lo pendiente de D-437; modelo de datos y colecciones nuevas por aprobar; política de datos personales y costos.
1. **A + B.** Cerrar el piloto de números; Meta como provider de línea (varias páginas y cuentas); bandeja única que **evoluciona** `inbox-core` y las tres rutas actuales (se conservan como filtros), detrás de bandera por comercio.
2. **C, luego D.** Roles, asignación, transferencia, supervisión; después colas, horarios y enrutamiento.
3. **E.** Automatizaciones, etiquetas, cierre y consentimiento.
4. **G.** Vidagas con sus 18 números, en comercio piloto y con bitácora.
5. **F + H en paralelo.** KAI en la atención y los informes (leen datos que C, D y E ya registran).
6. **J.** QA con evidencia; **solo J decide el cierre** de los demás tickets (regla del padre).
- **En paralelo, sin bloquear:** I (hecho), K, L y M son documentos; nacen como «Próximamente» ya publicado.

## Riesgos

- **Datos personales (Ley 1581).** Una conversación guarda teléfono, nombre, imágenes y audios. Reglas: identificadores hasheados en URLs y logs (patrón `phoneHash` y `metaIdentityHash`); sin cuerpos de mensaje en logs; número del contacto visible solo con permiso; consentimiento y baja registrados (E); retención y borrado al desconectar un canal; exportes de auditoría con permiso y rastro. La IA solo ve el contexto mínimo y, según 1400, solo proveedores que no entrenan con datos del cliente (por confirmar con Jairo). En el ADK, nada se escribe en Katuq (el backend decide).
- **Webhooks.** Cada canal nuevo exige HMAC que falla cerrado, reserva de idempotencia por mensaje y evento crudo antes de procesar. Hallazgo: el webhook antiguo de WhatsApp (`controllers/whatsappWebhook.js`, `verifyHmacSignature`) devuelve `true` si el secreto está vacío, a diferencia del de Meta y del nuevo de mensajería, que rechazan. Con 18 a 200 números sube el volumen y la superficie; propongo cerrarlo en la Fase 0 o 1.
- **Costos por mensaje.** Hoy Katuq paga a Meta y descuenta del saldo prepago ($80 COP por defecto, `whatsappOutboundService`). Los tickets discrepan sobre cuándo cobra Meta los mensajes de servicio dentro de la ventana (1298: desde jul-2025; 1404: desde 1-oct-2026): **verificar con la fuente oficial** antes de fijar precios. Más líneas, seguimientos de 24 h, encuestas y KAI multiplican el gasto; la IA de B2Chat vale 80 USD/mes por agente más tokens. Cada automatización que envía mensajes debe mostrar costo, respetar el saldo (con saldo cero, solo lo gratuito) y tener tope.
- **No duplicar la bandeja de WhatsApp.** Ya hay tres módulos de buzón. Reglas: una sola bandeja que reutiliza sus piezas; sin «v2»; las rutas actuales siguen funcionando; la lista de WhatsApp no se reimplementa. Revierte en parte D-170 («tres buzones separados, por decisión explícita») y los no-goals de D-437: hay que registrar la reversión (pregunta 3).
- **Canal vivo.** ALMARA usa el número compartido y el bot piloto, y el buzón actual. Todo nuevo nace detrás de bandera por comercio (D-505), con kill switch, sin tocar el número compartido ni las notificaciones.
- **Módulos sensibles.** F y el bot de pedidos tocan cotización, pedido y pago (propuestas `pedido-whatsapp-con-link-de-pago` y `whatsapp-confirmacion-y-carrito`): un cambio a la vez con diff aprobado. Esta propuesta no toca inventario, precios ni consecutivos.
- **Dependencias externas.** Revisión de Meta para Instagram y Messenger, plan Platform de Kapso, límites por número y calidad del número; coexistencia con elegibilidad e historial parcial (por confirmar). QR no oficial: riesgo de bloqueo.
- **Colecciones y datos.** Colas, etiquetas, motivos, estado del agente, consentimiento y auditoría necesitan almacenamiento nuevo. Tablas/colecciones nuevas: aprobación expresa antes de crearlas (config.yaml). El backend usa la API de Firestore sobre PostgreSQL (D-579); indexar con el sí de Daniel.

## No-goals

- Difusiones y campañas (Katuq Marketing), embudo (CRM), crear pedidos desde el chat más allá de lo que ya hace el bot de pedidos.
- Construir TikTok, correo o llamadas; K, L y M son solo investigación. TikTok Shop sigue separado.
- Adoptar Chatwoot, HiBot o B2Chat como motor; el inbox embebido de Kapso.
- Tocar el número compartido, las notificaciones transaccionales o el bot piloto de ALMARA, y migrar `ownCredentials`.
- Colecciones o endpoints «v2», o un segundo modelo de cuentas junto a `messaging_lines`.
- Escribir en `products`, precios o inventario; cualquier cambio de ese tipo va en otra propuesta.
- QR no oficial como camino principal, salvo que la decisión de A lo apruebe con sus riesgos.
- Usuarios y login propios del módulo: se usan los de Katuq.

## Preguntas para Daniel

1. **¿Quién manda, CONV o KCOM?** Recomendación: CONV es el paraguas y KCOM-E1 a E5 son fuentes de requisitos mapeadas a las letras. Reutilizar `messaging_lines` y no crear `channelAccounts`. ¿E4 (TikTok) pasa a construir o K sigue como investigación?
2. **API oficial, QR o mezcla** para los 18 y los 200 números, y presupuesto: ¿lo decide Jairo?
3. **Bandeja única:** ¿se revierte formalmente D-170 (tres buzones) y se amplían los no-goals de D-437 (round-robin, SLA, etiquetas, notas)?
4. **Colecciones nuevas** (colas, etiquetas, motivos, consentimiento, auditoría): ¿se aprueban en el diseño de cada fase?
5. **Costos:** ¿se mantiene $80 por mensaje y quién absorbe seguimientos, encuestas y KAI? ¿Se verifica la política de Meta?
6. **Retención y borrado:** ¿24 meses por defecto (1400) y borrado en 30 días al desconectar?
7. **Webhook antiguo:** ¿se corrige ya que acepta sin firma si falta el secreto, y está puesto `MESSAGING_KAPSO_WEBHOOK_SECRET` en producción?
8. **Orden:** ¿F antes de H, o se adelanta F porque 1243 ya está en curso?
9. **Vidagas:** ¿quién habla con ellos y con qué fecha, dado que depende de Meta Business y verificación?
10. **I:** ¿se cierra, dado que solo falta la revisión editorial de Jairo (se reportó pendiente el 28-oct)?

## Lectura (prueba)

13 hijos y padre leídos completos (descripción, comentarios, estado). Padre: 6 comentarios (el sexto, del 3-nov, dice que lo tomó aws-claude-2). I: 3 comentarios; los demás hijos: 0. Adjuntos de los 14: ninguno. Relacionados: KCOM-E1 a E5 y F4-40 (1243, 4 comentarios). Código: el de las rutas citadas arriba. Sin cambios de código, de datos ni de tickets.

## Verificación del orquestador (3-nov)

- En producción, `KAPSO_WEBHOOK_SECRET` está definido. Se verificó por SSH en solo lectura, sin mostrar el valor. Hoy el webhook viejo `whatsappWebhook.js` sí exige firma.
- El riesgo es del código: si el secreto falta, acepta sin firma (`if (!secret) return true`). La corrección es fallar cerrado fuera de sandbox, igual que `metaWebhook.js`, y va como cambio aparte.
