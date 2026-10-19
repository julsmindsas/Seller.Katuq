> Backend: `katuq_admin_back_firebase/functions/`. Front: `Seller.Katuq/`. Cada grupo cierra con las pruebas y el build en verde. Nada se despliega sin OK de Daniel.

## 0. Antes de programar

- [ ] 0.1 Daniel decide las 4 preguntas abiertas de `design.md`: fbc/fbp, canal del aviso, definición de primer pedido y destinatarios del resumen. — 18-oct: Daniel aprobó construir sin contestarlas; se usó lo propuesto (ver Open Questions en `design.md`).
- [x] 0.2 Verificar en el código: el campo de empresa de `orders`, si el registro crea pedidos de ejemplo y la firma de `writeSellerNotification`. Anotar lo encontrado en `design.md`.
- [x] 0.3 Confirmar quién llama a `POST /v1/landing/contacts`: landing nueva, sitio viejo o nadie.

## 1. Lectura del gasto de Meta (`ad-spend-reading`)

- [x] 1.1 Contract test con una respuesta real de `insights` en fixture (paginada, gasto en texto, campos faltantes) → filas en el formato de Katuq.
- [x] 1.2 `services/pauta/fuentesGasto/meta.js`: consulta con `Authorization: Bearer` + `appsecret_proof`, paginación, timeout de 8 s, moneda y zona horaria de la cuenta, errores sin token.
- [x] 1.3 `services/pauta/gasto.js`: junta las fuentes; sin credencial o con error devuelve `{disponible:false, motivo}`.
- [x] 1.4 Prueba de arranque con `debug_token`: avisa si el token trae más permisos que `ads_read`.
- [x] 1.5 Prueba de que ningún log ni respuesta contiene el token.

## 2. Hitos del embudo (base de todo lo demás)

- [x] 2.1 `services/pauta/embudo/hitos.js` (puro): producto, tienda, primer pedido real y pago, con pruebas de cada caso. Incluye el de ejemplo, el total cero, la cuenta de prueba y el premium promocional, que no cuenta como pago.
- [x] 2.2 `estado.js`: lectura que reutiliza `activacion/estado.leerEstado` + `orders` con `limit 5` + campos de pago de la empresa.
- [x] 2.3 Extraer de `metricasPauta.resumirPorCampana` el filtro de "qué empresa cuenta" a una función común, sin cambiar sus resultados (prueba antes/después).
- [x] 2.4 Contract test del write-set: el motor solo escribe `companies.pauta.*`; falla si toca `orders`, `subscriptions`, `currentMonthOrders`, `orderCountResetDate` o `products`.

## 3. Eventos a Meta (`funnel-conversion-events`)

- [x] 3.1 Contract test del cuerpo de la API de conversiones (fixture) para los 3 eventos: `event_id` estable, SHA-256 normalizado, sin otros datos personales.
- [x] 3.2 `services/pauta/conversiones.js`: `enviar()` real con lotes de 50, modo `prueba` con `META_CAPI_TEST_CODE` y errores sin token.
- [x] 3.3 `services/pauta/embudo/motor.js`: hitos → reserva en transacción → envío → `enviadoAt`; incierto sin reintento; modos apagado/sombra/prueba/envío; corte `PAUTA_EVENTOS_DESDE`.
- [x] 3.4 Prueba de idempotencia con `scripts/lib/firestoreFalsa.js`: dos vueltas en paralelo mandan cada evento una sola vez (verificada con mutación).
- [x] 3.5 Registrar el crón `embudoPauta` (cada 15 min) en `cronService.js`, con su resumen estructurado.
- [ ] 3.6 Solo si Daniel lo aprueba (0.1): guardar `pauta.fbc`/`pauta.fbp` en `saveSurveyResponse` y el `_fbp` desde `/registrarse`. Correr antes `tests/onboarding/vendedoresActivos.contract.test.js`. — Pendiente: por omisión no se guardan.

## 4. Embudo y resumen diario (`paid-acquisition-funnel`)

- [x] 4.1 Middleware `requirePlataforma` (tenant del JWT = Julsmind) con pruebas: comercio → 403 y Julsmind → pasa. — Se reutilizó `requirePlatformTenant` (D-484), con prueba.
- [x] 4.2 `GET /v1/pauta/embudo`: agrupa por campaña y anuncio, une el gasto e incluye el ingreso de `paymentHistory`. Prueba: los registros por campaña dan igual que `metricas-campana`.
- [ ] 4.3 Medir el p95 con 90 días contra la base real en solo lectura; meta: 30 días ≤ 5 s. — Pendiente: se mide al desplegar, contra la base real en solo lectura.
- [x] 4.4 Crón `resumenPauta` (7:15 COT): plantilla del correo, "para pausar" con umbral, aviso de "sin datos de Meta" y del DNS pendiente; `PAUTA_RESUMEN_PARA` vacío = no envía.

## 5. Aviso del plan gratis (`free-plan-upgrade-nudge`)

- [x] 5.1 Decisión pura `p80`/`tope` con `getEffectiveOrderUsage`: ciclo vencido, cupón, premium promocional, baja y un correo al día compartido con la activación.
- [x] 5.2 Tipos `plan80`/`plantope` en `activacion/enlaces.js`, que llevan a `/pricing` y cuentan el clic.
- [x] 5.3 Plantillas del correo (textos para que Daniel los apruebe) y aviso `PLAN_LIMIT` en la campana. — Textos en `templates/avisoPlan.js`, aprobados por Daniel el 19-oct sin cambios.
- [x] 5.4 Crón `avisosPlan` (cada 15 min) con reserva en transacción y modos apagado/sombra/envío.
- [x] 5.5 Contract test del write-set: solo `companies.avisosPlan` y `activacion.ultimoEnvioAt`.
- [x] 5.6 `GET /v1/pauta/avisos-plan/metricas` (solo plataforma).

## 6. CRM de Julsmind (`company-crm-autopilot`)

- [x] 6.1 `services/crm/autopilot.js` (puro): etapas por rango, nunca hacia atrás, `churned` y regreso a `premium`, puntaje con pesos en constante. Pruebas por cada fila de la tabla del diseño.
- [x] 6.2 Crón `crmAutopilot` (6:30 COT): una lectura de empresas y pipeline, escritura por lotes y actividad `stage_change` "Automático"; modos apagado/sombra/envío.
- [x] 6.3 Prueba: con el CRM de un comercio no cambia nada; nunca toca `assignedTo`, `priority`, notas ni tareas.
- [x] 6.4 La lista del CRM devuelve `score` y `scoreMotivos` en el contexto `company`.

## 7. Front

- [x] 7.1 `PautaService extends BaseService` y `PlataformaGuard`.
- [x] 7.2 `PautaEmbudoComponent` en `/marketing/pauta`: tarjetas por etapa, tabla por campaña que se abre por anuncio, rangos y estado "sin datos de Meta"; base `cfg-pagina`, sin gradientes ni primarios prohibidos.
- [x] 7.3 Entrada "Pauta" en el menú de Marketing + script de backfill de `menus` del Super Administrador de Julsmind (`--dry-run` primero). — Sin backfill: desde el ticket 1177 el Super Administrador ve todas las rutas; la entrada filtra por Julsmind.
- [x] 7.4 Enlace a `/marketing/pauta` en la pestaña Pauta de la consola.
- [x] 7.5 CRM de empresas: columna "Puntaje" ordenable, tooltip con motivos y "Automático" en el historial.
- [ ] 7.6 `npm run build:prod` sin errores; conteo de gradientes y primarios prohibidos del módulo sin subir; revisión a 1440 y 390 px. — Build de desarrollo sin errores y conteos en 0; falta la revisión en el navegador a 1440 y 390 px, después de desplegar el backend.

## 8. Arreglo suelto

- [ ] 8.1 Según 0.3: corregir `!mensaje` en `controllers/landingContacts.js:9` con una prueba (con mensaje → 200, sin nombre → 400). — No se hace: nadie llama el endpoint y arreglarlo lo abriría a correos con HTML sin escapar (ver `design.md`).

## 9. Encendido (cada paso con OK de Daniel)

- [x] 9.1 Desplegar el backend con todo `apagado`; verificar el log y que las pantallas existentes sigan iguales. — 18-oct: backend `ed3ab1cd`; `/v1/pauta/*` 401 sin sesión y 403 a un administrador de comercio.
- [ ] 9.2 (Publicado 2026.10.18.9; falta comparar con la sesión de Julsmind) Desplegar el front; comparar el embudo con la consola en el mismo rango.
- [ ] 9.3 `eventos=hitos` (hecho el 18-oct) → `eventos=sombra eventosDesde=hoy` 1 día → revisar 10 empresas a mano → `eventos=prueba` con `meta.codigoPrueba` (ver en "Probar eventos") → `eventos=envio`. Cada paso con `node scripts/pauta-ajustes.js … --execute` (D-505).
- [ ] 9.4 Con OK de Daniel: crear la conversión personalizada `PrimerPedido` y cambiar la optimización de la campaña.
- [ ] 9.5 `avisosPlan=sombra` (desde el 18-oct) 2 días → Daniel revisa la lista → `avisosPlan=envio`.
- [ ] 9.6 `crm=sombra` (desde el 18-oct) 2 días → revisar movimientos → `crm=envio`.
- [ ] 9.7 Cargar `resumenPara` y verificar el primer resumen.
- [ ] 9.8 A los 30 días en `envio` sin incidentes: retirar los modos de flag (Artículo XII).
- [ ] 9.9 Bitácora en `specs/CONTRACT.md` con los commits y lo verificado.
- [x] 9.10 D-505 (19-oct, OK de Daniel): interruptores del `.env` a `config/pauta` (`services/pauta/ajustes.js`, `scripts/pauta-ajustes.js`), crones siempre programados. Backend `2fa5bdfe` desplegado con los mismos modos; las 3 líneas salieron del `.env` y la vuelta de las 16:45 UTC leyó de Firestore sin errores.
