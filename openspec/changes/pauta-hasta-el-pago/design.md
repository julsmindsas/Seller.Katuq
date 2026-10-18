## Context

Lo que ya existe y se reutiliza (backend `katuq_admin_back_firebase/functions/`):

- **Origen de la pauta en la empresa:** `companies.origenCampana` guarda `utm_*`, `perfil` y `conClic`, y `companies.pedidosSemana` la respuesta del registro (`utils/senalPauta.js`, `controllers/diagnostics.js:1180`). El enlace vigente de los anuncios lleva `utm_content={{ad.id}}` y `utm_term={{adset.id}}`. Los anteriores usaban `{{ad.name}}`.
- **Métrica por campaña:** `controllers/metricasPauta.js` cuenta registros, vendedores activos y el costo escrito a mano en `config/pautaCostos`.
- **API de conversiones del registro:** `services/pauta/conversiones.js` arma los eventos, pero `enviar()` nunca llama a Meta. `services/medicionServidor.js` sí envía, pero con el token de cada comercio y para sus ventas.
- **Patrón de motor por comportamiento:** `services/activacion/` (decisión pura en `pasos.js`, lectura en `estado.js`, reserva en transacción en `motor.js`, enlaces firmados en `enlaces.js`). Sus modos son apagada, sombra y envío. Corre cada 15 minutos desde `cronService.js`.
- **Plan gratis:** `services/limitsService.js:getEffectiveOrderUsage(companyData, now)` es pura. Devuelve `{current, limit, resetDate}` y ya resuelve el ciclo vencido y el tope del cupón.
- **Pago:** `services/subscriptionPaymentService.js` deja en la empresa `premiumOrigen:'pago'`, `subscriptionStartDate`, `lastBillingAmount` y `subscriptionStatus`. El historial de pagos queda en la suscripción (`paymentHistory`).
- **CRM de Julsmind:** tenant `katuq`, entidad `company`, etapas `registro → contactado → demo → trial → activo → premium → churned` (`services/crm/crmConstants.js`). La etapa vive en `crm_pipeline` y la historia en `crm_activities`.
- **Plataforma:** `middleware/companyAccess.js` identifica a Julsmind por el tenant del JWT (`TENANT_PLATAFORMA = "Julsmind"`).
- **Campana en la app:** `services/notifications/notificationHooks.js:writeSellerNotification`, encendida para todas las empresas desde el 1-oct.
- **Píxel de Katuq:** `2313426139127070` (`src/app/shared/services/pixeles-pauta.service.ts:61`).

## Goals / Non-Goals

**Goals:**
- Que el costo por cliente que paga, por campaña y por anuncio, salga solo.
- Que Meta aprenda de quién hace pedidos y paga, no solo de quién empieza el registro.
- Empujar al pago a quien ya usa el plan gratis, y ordenar el CRM de Julsmind con hechos.
- Que todo arranque apagado o en sombra y se encienda sin desplegar.

**Non-Goals:**
- Escribir en Meta (pausar, presupuestos, crear anuncios).
- Automatizaciones para los comercios.
- WhatsApp a registrados.
- Tocar el registro general, los pedidos, el contador del plan o el cobro.

## Decisions

### D1. El gasto de Meta se consulta en vivo, no se guarda
`services/pauta/fuentesGasto/meta.js` llama a `GET /{version}/act_{cuenta}/insights` con:
- `level=ad`, `time_range` y `time_increment=all_days` para el embudo, o `1` para el resumen diario;
- campos `campaign_id, campaign_name, adset_id, ad_id, ad_name, spend, impressions, clicks`;
- paginación.

Devuelve filas en el formato de Katuq (`{fuente:'meta', fecha, campanaId, campana, anuncioId, anuncio, gastoCOP, impresiones, clics}`). `services/pauta/gasto.js` junta las fuentes (Strategy, como `medicionServidor.js`), así una fuente nueva no cambia la pantalla (Artículo VI).

- **Por qué:** con unas decenas de anuncios, Meta responde en 1 a 3 llamadas. Guardarlo pide una colección nueva o un documento que crece sin fin, y el repo prohíbe capas de caché.
- **Alternativa descartada:** una foto diaria en `config`. Se descarta porque el documento crece sin límite y se desincroniza cuando Meta corrige el gasto de días anteriores.
- **Credencial:** token de usuario del sistema con `ads_read` (`META_ADS_TOKEN`) y `META_AD_ACCOUNT_ID`.
  - El token va en la cabecera `Authorization: Bearer`, nunca en la URL. Se acompaña de `appsecret_proof` (HMAC del token con `META_APP_SECRET`, que ya existe por los buzones).
  - Los errores se registran con código y mensaje de Meta, nunca con la petición.
- **Moneda y zona horaria:** se leen de la cuenta (`/act_{id}?fields=currency,timezone_name`). Si la moneda no es COP, la pantalla lo dice y no convierte.

### D2. Los hitos se calculan una vez y quedan en la empresa
Un motor nuevo, `services/pauta/embudo/` (`hitos.js` puro, `estado.js` lectura, `motor.js`), corre cada 15 minutos y escribe en `companies.pauta.hitos`:
- `productoAt`, `tiendaAt` (reutiliza `activacion/estado.leerEstado`);
- `primerPedidoAt` y `primerPedidoValor`;
- `pagoAt` y `pagoValorCOP`.

Se revisan las empresas registradas en los últimos 90 días a las que les falte algún hito. Al cumplir los 90 días, las pendientes pasan al recálculo diario del CRM (D5).

- **Primer pedido real:** consulta `orders` de la empresa ordenada por fecha, con `limit 5`. Toma el primero con total > 0 que no sea de ejemplo. Una consulta por empresa pendiente, solo lectura.
- **Pago:** sale del documento de la empresa (`premiumOrigen == 'pago'` y `subscriptionStartDate`), sin leer la transacción. El valor es `lastBillingAmount` del primer pago visto.
- **Por qué:** así el embudo de la pantalla lee una sola colección (`companies` en el rango) y cumple los 5 s. Los eventos, el embudo y el CRM usan la misma definición de cada hito.

### D3. Los eventos a Meta salen del mismo motor, con reserva y sin reintento
Cuando aparece un hito nuevo, el motor:
1. reserva en transacción `companies.pauta.eventos.<tipo>.enviandoAt`;
2. envía;
3. marca `enviadoAt`.

Si el proceso muere en medio, el evento queda incierto y no se repite: es la misma regla de la secuencia de activación.

- **Envío:** `services/pauta/conversiones.js:enviar()` pasa a llamar de verdad a `POST /{version}/{pixel}/events`, con lotes de hasta 50.
- **Eventos:**

  | Hito | Evento | `event_id` |
  |---|---|---|
  | Registro | `CompleteRegistration` | `reg-<id>` (el mismo del navegador) |
  | Primer pedido real | `PrimerPedido` (propio) | `pp-<id>` |
  | Primer pago | `Subscribe`, con `value` y `currency:'COP'` | `pago-<id>` |

  En todos: `action_source:'website'`, correo y teléfono en SHA-256 con la normalización de `medicionServidor.resumen`/`resumenTelefono`, y `fbc`/`fbp` si Daniel aprueba guardarlos.
- **Configuración:** `PAUTA_EVENTOS` = `apagado | sombra | prueba | envio`, `PAUTA_EVENTOS_DESDE` (corte ISO), `META_CAPI_TOKEN` (token del píxel KATUQ) y `META_CAPI_TEST_CODE` (solo en `prueba`).
- **Por qué `PrimerPedido` y no un evento estándar:** ninguno estándar significa "el comercio vendió por primera vez". Con un evento propio se arma la conversión personalizada para optimizar. Disfrazarlo de `Purchase` ensuciaría el `Purchase` de las tiendas de los comercios.
- **Alternativa descartada:** disparar el evento dentro de la creación del pedido o del webhook de Wompi. Toca módulos sensibles y agrega latencia al camino del dinero.

### D4. El embudo y el resumen
- **Endpoint `GET /v1/pauta/embudo?desde&hasta`.** Pasa por `auth`, `requireRole(['Super Administrador'])` y un chequeo nuevo, `requirePlataforma`: el tenant del JWT debe ser Julsmind, con la misma comparación de `companyAccess.js`.
  - Lee `companies` por `date_added` en el rango, con los filtros de `metricasPauta.resumirPorCampana` (se extraen a una función común para que los dos cuenten igual).
  - Agrupa por `utm_campaign` y `utm_content` (anuncio). Pide el gasto a `gasto.js` y une las dos fuentes por id de anuncio, o por nombre de campaña cuando no hay id.
  - El ingreso suma `paymentHistory` aprobados de las suscripciones de las empresas con `pagoAt` (pocas).
- **`GET /v1/registro/metricas-campana`** sigue igual. La consola agrega un enlace a `/marketing/pauta`.
- **Resumen diario:** crón `resumenPauta` a las 7:15 COT (7:00 ya tiene facturación y DIAN).
  - Destinatarios en `PAUTA_RESUMEN_PARA`, separados por coma. Vacío = no envía.
  - Umbral de "para pausar" en `PAUTA_UMBRAL_PAUSA_COP`, por omisión 30.000.
  - Sale por el correo transaccional de Katuq (`services/email.enviarEmail`). Es correo interno, no marketing.

### D5. El CRM de Julsmind con reglas puras
`services/crm/autopilot.js` es puro: recibe empresa, hitos y pipeline, y devuelve `{stage?, motivo, score, motivos[]}`. El crón `crmAutopilot` corre a las 6:30 COT, lee las empresas y el pipeline del tenant `katuq` una vez (`_loadPipelineMap`) y escribe por lotes.

- **Etapas por rango:** `registro 0 < contactado 1 < demo 2 < trial 3 < activo 4 < premium 5`.
  - Se mueve a `activo` o `premium` solo si sube de rango.
  - `churned` cuando hubo pago y `subscriptionStatus` es `cancelled` o `suspended`.
  - De `churned` vuelve a `premium` si paga de nuevo.
  - Cada movimiento escribe `crm_pipeline.stageAuto {stage, motivo, at}` y una actividad `stage_change` con `por:'Automático'`.
  - Nunca toca `assignedTo`, `priority`, notas ni tareas.
- **Puntaje (0–100, sin premium):**

  | Señal | Puntos |
  |---|---|
  | Pedidos por semana: más de 50 | 25 |
  | Pedidos por semana: 10 a 50 | 20 |
  | Pedidos por semana: menos de 10 | 8 |
  | Producto propio | 10 |
  | Tienda publicada | 10 |
  | Primer pedido real | 15 |
  | Uso del plan ≥ 80 % (≥ 50 %) | 20 (10) |
  | Entró en los últimos 7 días (`users.ultimoIngreso`) | 10 |
  | Más de 30 días sin entrar | −15 |
  | Llegó por anuncio con clic | 5 |

  Se guarda en `crm_pipeline.score` y `scoreMotivos`. Los pesos viven en una constante, para ajustarlos con datos.
- **Modo:** `CRM_AUTOPILOT` = `apagado | sombra | envio`. En sombra escribe el puntaje y `stageAutoPropuesta`, sin mover etapas.
- **Por qué reglas fijas y no un modelo:** con unos cientos de empresas y 9 que pagan no hay datos para entrenar. Las reglas se explican solas en el CRM.

### D6. Aviso del plan gratis
El crón `avisosPlan` corre cada 15 minutos.

- **A quién revisa:** consulta `companies` con `currentMonthOrders >= 3`. Para cada una calcula `getEffectiveOrderUsage` (que ignora el contador de un ciclo vencido) y decide `p80` (`current >= ceil(0.8 * limit)`) o `tope` (`current >= limit`).
- **Marcas:** `companies.avisosPlan = {ciclo: <resetDate ISO>, p80:{enviandoAt, enviadoAt}, tope:{…}}`. Un ciclo nuevo reemplaza el objeto.
- **Frecuencia:** comparte `activacion.ultimoEnvioAt` (un correo de Katuq al día) y la baja `activacion.baja`.
- **Canal:** correo transaccional desde `notificaciones@katuq.com`, más la campana con un tipo nuevo `PLAN_LIMIT` en `writeSellerNotification`, que respeta las preferencias de la empresa.
- **Botón:** enlace firmado de `activacion/enlaces.js` con los tipos nuevos `plan80` y `plantope`, que llevan a `/pricing`. Cuenta el clic.
- **Medición:** `GET /v1/pauta/avisos-plan/metricas` (avisos, clics y pagos en 14 días por mes). Los pagos se cruzan con `pauta.hitos.pagoAt`.
- **Solo lectura del contador:** un contract test falla si el módulo escribe `currentMonthOrders`, `orderCountResetDate`, `orders` o `subscriptions`.

### D7. Pantallas
- **`/marketing/pauta`** en `MarketingModule`, con `PautaEmbudoComponent` y `PautaService extends BaseService`.
  - Guarda la ruta un `PlataformaGuard` (rol Super Administrador y empresa Julsmind en `localStorage['user']`). El servidor vuelve a validar.
  - Base visual `cfg-pagina` (D-400). Arriba van tarjetas por etapa con el porcentaje que pasa. Abajo, una tabla PrimeNG por campaña que se abre por anuncio.
  - Rangos 7/30/90 días o manual. Aviso "sin datos de Meta" cuando aplica.
- **Menú:** entrada "Pauta" en la sección Marketing. Por la trampa del menú invisible, va con un script de backfill de `menus` del rol Super Administrador de Julsmind, con `--dry-run`.
- **CRM:** en el contexto `company`, columna "Puntaje" ordenable, con los motivos en el tooltip, y la marca "Automático" en el historial.
- **Plan gratis:** el aviso llega a la campana. No se agrega banner nuevo en esta fase.

### D8. Observabilidad y flags (Artículos VII, XI y XII)
- **Resumen de cada crón:** `{job, modo, revisadas, eventos, enviados, errores, duracionMs}` por el logger estructurado de `cronService`. Sin datos personales; solo ids de empresa.
- **Flags y vencimiento:**
  - `PAUTA_EVENTOS`, `AVISOS_PLAN` y `CRM_AUTOPILOT` se retiran 30 días después de quedar en `envio` sin incidentes. Ese retiro queda como tarea.
  - `META_ADS_TOKEN`, `META_CAPI_TOKEN` y `PAUTA_RESUMEN_PARA` son configuración, no flags.

## Risks / Trade-offs

- [El pago llega más de 7 días después del clic y Meta no lo atribuye] → El costo por cliente que paga sale de nuestro `origenCampana`, no de Meta. A Meta se le pide optimizar por `PrimerPedido`.
- [Pocos eventos para que Meta aprenda] → `PrimerPedido` se usa como conversión de optimización. Se revisa cada semana en el resumen; `Subscribe` solo cuando supere unos 50 por semana.
- [Lecturas de Firestore del motor cada 15 min] → Solo empresas de los últimos 90 días con hitos pendientes y una consulta de `orders` con `limit 5` por empresa. Se mide en el resumen del crón.
- [Anuncios viejos sin id] → Quedan a nivel de campaña, en "sin anuncio identificado".
- [Correos en spam por DMARC] → Se mide por clics (enlaces firmados). El arreglo del DNS sigue pendiente de Daniel y se repite en el resumen.
- [Token con más permisos de los necesarios] → Se pide solo `ads_read`. Una prueba de arranque llama a `debug_token`: si el token trae `ads_management`, la pantalla lo muestra como advertencia y el resumen también. No se usa.
- [Primer pedido mal definido (pedidos de prueba del comercio)] → El total debe ser mayor a cero y se excluyen las cuentas de prueba. La definición queda en una función pura con pruebas, para ajustarla si Daniel decide otra.

## Migration Plan

1. Daniel crea el usuario del sistema con `ads_read`, el token de la API de conversiones del píxel, y da los correos del resumen.
2. Se despliega el backend con todo en `apagado`. Se verifica que nada cambia (pruebas y log).
3. Se despliega el front: `/marketing/pauta` (solo lectura). Se comparan los registros por campaña con la consola en el mismo rango.
4. `PAUTA_EVENTOS=sombra` 1 día: se revisan los hitos calculados contra 10 empresas verificadas a mano.
5. `PAUTA_EVENTOS=prueba`: los eventos aparecen en "Probar eventos" del Administrador de eventos.
6. `PAUTA_EVENTOS=envio`. Luego, con OK de Daniel, se crea la conversión personalizada `PrimerPedido` y se cambia la optimización de la campaña.
7. `AVISOS_PLAN=sombra` 2 días. Daniel revisa la lista y se pasa a `envio`.
8. `CRM_AUTOPILOT=sombra` 2 días. Se revisan los movimientos propuestos y se pasa a `envio`.
9. Se carga `PAUTA_RESUMEN_PARA`.

**Reversa:** cada flag vuelve a `apagado` en `functions/.env` con `pm2 reload katuq-api --update-env`, sin desplegar. Las marcas que quedan en `companies` y `crm_pipeline` no afectan a nadie.

## Open Questions

Daniel aprobó construir el 18-oct («dale construye») sin contestar las preguntas 1 a 4. Se construyó con lo propuesto, que se cambia sin tocar código:

1. `fbc`/`fbp`: **no se guardan** por ahora; los eventos cruzan por correo, celular e id externo, todos resumidos. La tarea 3.6 queda pendiente de su decisión.
2. Aviso del plan: **correo + campana**, sin WhatsApp.
3. Primer pedido real: **el propuesto** (total > 0, no anulado, sin marca de ejemplo o prueba), en `embudo/hitos.js:esPedidoReal`.
4. Resumen diario: **no sale** mientras `PAUTA_RESUMEN_PARA` esté vacío.
5. Verificado en el código (18-oct):
   - `orders.company` = `nomComercial`; `fechaCreacion` es texto ISO y el índice `company + fechaCreacion` ya existe (lo usan los insights). El registro **no** crea pedidos de ejemplo.
   - `writeSellerNotification(type, {company}, {title, message, data})` sirve para un aviso que no es de pedido; el front toma el destino de `data.ruta`.
   - La moneda y la zona horaria de la cuenta publicitaria se leen en cada consulta (`/act_{id}?fields=currency,timezone_name`); falta la credencial para confirmarlas.

## Desvíos en la implementación (18-oct)

- **Un solo modo para el embudo:** `PAUTA_EVENTOS` = `apagado | hitos | sombra | prueba | envio`. `hitos` calcula y guarda los hitos sin tocar Meta, para encender la pantalla antes que los eventos.
- **Ventana de Meta:** la API de conversiones rechaza eventos de más de 7 días. Los hitos de más de 6 días se marcan `omitidoAt` y no se envían; por eso `PAUTA_EVENTOS_DESDE` debe ponerse el día del encendido.
- **Rechazo de Meta:** si Meta responde con error (token, formato), nada quedó a medias y el evento se libera para la vuelta siguiente, hasta 3 intentos. Si no responde (red, tiempo agotado), queda incierto y no se repite.
- **Modo prueba:** marca `pruebaAt` para no repetir el evento de prueba; al pasar a `envio` sale el real.
- **Lecturas por vuelta:** las empresas de menos de 3 días se revisan cada 15 minutos, las de 3 a 14 días cada hora y las de 14 a 90 días cada 6 horas, sin escribir marcas de revisión. Solo se consulta lo que falta (productos, sitios, pedidos, suscripciones), con `limit 5`.
- **Pago:** sale del historial de la suscripción (`subscriptions.companyDocId` → `paymentHistory` aprobado más antiguo). `subscriptionStartDate` no sirve porque el plan gratis también lo tiene.
- **Plataforma:** se reutiliza `requirePlatformTenant` (D-484) en lugar de un `requirePlataforma` nuevo.
- **Puntaje del CRM:** vive en `companies.pauta.crm` (`score`, `motivos`, `propuesta`), no en `crm_pipeline`. Crear un pipeline por empresa cambiaría el orden del CRM y quién aparece "sin dueño". `crm_pipeline` solo se escribe al mover una etapa (`stage` + `stageAuto`). En sombra la etapa propuesta queda en `companies.pauta.crm.propuesta`.
- **Empresas de más de 90 días:** no tienen hitos; para el CRM cuenta el contador de pedidos del mes ("tiene pedidos este mes").
- **Orden del CRM:** entre las empresas sin pipeline, primero las de mayor puntaje, para que entren en la carga de 200.
- **Avisos del plan:** las marcas son `companies.avisosPlan = {cicloActual, ciclos: {<YYYY-MM-DD>: {p80, tope}}}` para medir por mes. El clic se cuenta en el ciclo actual.
- **Menú:** no hace falta backfill de `menus`. Desde el ticket 1177 el Super Administrador recibe todas las rutas del menú; la entrada lleva `isOnlySuperAdministrador` y un filtro por empresa Julsmind.
- **Formulario de contacto (`landingContacts`):** nadie lo llama (ni la landing ni el front). Arreglar el `!mensaje` lo abriría como endpoint público que manda correos con HTML sin escapar; se deja como está y se propone retirarlo aparte.
- **Resumen:** recuerda el DMARC pendiente; se quita con `PAUTA_RESUMEN_NOTA_DNS=false`.
