> Backend: `katuq_admin_back_firebase/functions/`. Front: `Seller.Katuq/`. Cada grupo cierra con las pruebas y el build en verde. Nada se despliega sin OK de Daniel.

## 0. Antes de programar

- [ ] 0.1 Daniel decide las 4 preguntas abiertas de `design.md`: fbc/fbp, canal del aviso, definición de primer pedido y destinatarios del resumen.
- [ ] 0.2 Verificar en el código: el campo de empresa de `orders`, si el registro crea pedidos de ejemplo y la firma de `writeSellerNotification`. Anotar lo encontrado en `design.md`.
- [ ] 0.3 Confirmar quién llama a `POST /v1/landing/contacts`: landing nueva, sitio viejo o nadie.

## 1. Lectura del gasto de Meta (`ad-spend-reading`)

- [ ] 1.1 Contract test con una respuesta real de `insights` en fixture (paginada, gasto en texto, campos faltantes) → filas en el formato de Katuq.
- [ ] 1.2 `services/pauta/fuentesGasto/meta.js`: consulta con `Authorization: Bearer` + `appsecret_proof`, paginación, timeout de 8 s, moneda y zona horaria de la cuenta, errores sin token.
- [ ] 1.3 `services/pauta/gasto.js`: junta las fuentes; sin credencial o con error devuelve `{disponible:false, motivo}`.
- [ ] 1.4 Prueba de arranque con `debug_token`: avisa si el token trae más permisos que `ads_read`.
- [ ] 1.5 Prueba de que ningún log ni respuesta contiene el token.

## 2. Hitos del embudo (base de todo lo demás)

- [ ] 2.1 `services/pauta/embudo/hitos.js` (puro): producto, tienda, primer pedido real y pago, con pruebas de cada caso. Incluye el de ejemplo, el total cero, la cuenta de prueba y el premium promocional, que no cuenta como pago.
- [ ] 2.2 `estado.js`: lectura que reutiliza `activacion/estado.leerEstado` + `orders` con `limit 5` + campos de pago de la empresa.
- [ ] 2.3 Extraer de `metricasPauta.resumirPorCampana` el filtro de "qué empresa cuenta" a una función común, sin cambiar sus resultados (prueba antes/después).
- [ ] 2.4 Contract test del write-set: el motor solo escribe `companies.pauta.*`; falla si toca `orders`, `subscriptions`, `currentMonthOrders`, `orderCountResetDate` o `products`.

## 3. Eventos a Meta (`funnel-conversion-events`)

- [ ] 3.1 Contract test del cuerpo de la API de conversiones (fixture) para los 3 eventos: `event_id` estable, SHA-256 normalizado, sin otros datos personales.
- [ ] 3.2 `services/pauta/conversiones.js`: `enviar()` real con lotes de 50, modo `prueba` con `META_CAPI_TEST_CODE` y errores sin token.
- [ ] 3.3 `services/pauta/embudo/motor.js`: hitos → reserva en transacción → envío → `enviadoAt`; incierto sin reintento; modos apagado/sombra/prueba/envío; corte `PAUTA_EVENTOS_DESDE`.
- [ ] 3.4 Prueba de idempotencia con `scripts/lib/firestoreFalsa.js`: dos vueltas en paralelo mandan cada evento una sola vez (verificada con mutación).
- [ ] 3.5 Registrar el crón `embudoPauta` (cada 15 min) en `cronService.js`, con su resumen estructurado.
- [ ] 3.6 Solo si Daniel lo aprueba (0.1): guardar `pauta.fbc`/`pauta.fbp` en `saveSurveyResponse` y el `_fbp` desde `/registrarse`. Correr antes `tests/onboarding/vendedoresActivos.contract.test.js`.

## 4. Embudo y resumen diario (`paid-acquisition-funnel`)

- [ ] 4.1 Middleware `requirePlataforma` (tenant del JWT = Julsmind) con pruebas: comercio → 403 y Julsmind → pasa.
- [ ] 4.2 `GET /v1/pauta/embudo`: agrupa por campaña y anuncio, une el gasto e incluye el ingreso de `paymentHistory`. Prueba: los registros por campaña dan igual que `metricas-campana`.
- [ ] 4.3 Medir el p95 con 90 días contra la base real en solo lectura; meta: 30 días ≤ 5 s.
- [ ] 4.4 Crón `resumenPauta` (7:15 COT): plantilla del correo, "para pausar" con umbral, aviso de "sin datos de Meta" y del DNS pendiente; `PAUTA_RESUMEN_PARA` vacío = no envía.

## 5. Aviso del plan gratis (`free-plan-upgrade-nudge`)

- [ ] 5.1 Decisión pura `p80`/`tope` con `getEffectiveOrderUsage`: ciclo vencido, cupón, premium promocional, baja y un correo al día compartido con la activación.
- [ ] 5.2 Tipos `plan80`/`plantope` en `activacion/enlaces.js`, que llevan a `/pricing` y cuentan el clic.
- [ ] 5.3 Plantillas del correo (textos para que Daniel los apruebe) y aviso `PLAN_LIMIT` en la campana.
- [ ] 5.4 Crón `avisosPlan` (cada 15 min) con reserva en transacción y modos apagado/sombra/envío.
- [ ] 5.5 Contract test del write-set: solo `companies.avisosPlan` y `activacion.ultimoEnvioAt`.
- [ ] 5.6 `GET /v1/pauta/avisos-plan/metricas` (solo plataforma).

## 6. CRM de Julsmind (`company-crm-autopilot`)

- [ ] 6.1 `services/crm/autopilot.js` (puro): etapas por rango, nunca hacia atrás, `churned` y regreso a `premium`, puntaje con pesos en constante. Pruebas por cada fila de la tabla del diseño.
- [ ] 6.2 Crón `crmAutopilot` (6:30 COT): una lectura de empresas y pipeline, escritura por lotes y actividad `stage_change` "Automático"; modos apagado/sombra/envío.
- [ ] 6.3 Prueba: con el CRM de un comercio no cambia nada; nunca toca `assignedTo`, `priority`, notas ni tareas.
- [ ] 6.4 La lista del CRM devuelve `score` y `scoreMotivos` en el contexto `company`.

## 7. Front

- [ ] 7.1 `PautaService extends BaseService` y `PlataformaGuard`.
- [ ] 7.2 `PautaEmbudoComponent` en `/marketing/pauta`: tarjetas por etapa, tabla por campaña que se abre por anuncio, rangos y estado "sin datos de Meta"; base `cfg-pagina`, sin gradientes ni primarios prohibidos.
- [ ] 7.3 Entrada "Pauta" en el menú de Marketing + script de backfill de `menus` del Super Administrador de Julsmind (`--dry-run` primero).
- [ ] 7.4 Enlace a `/marketing/pauta` en la pestaña Pauta de la consola.
- [ ] 7.5 CRM de empresas: columna "Puntaje" ordenable, tooltip con motivos y "Automático" en el historial.
- [ ] 7.6 `npm run build:prod` sin errores; conteo de gradientes y primarios prohibidos del módulo sin subir; revisión a 1440 y 390 px.

## 8. Arreglo suelto

- [ ] 8.1 Según 0.3: corregir `!mensaje` en `controllers/landingContacts.js:9` con una prueba (con mensaje → 200, sin nombre → 400).

## 9. Encendido (cada paso con OK de Daniel)

- [ ] 9.1 Desplegar el backend con todo `apagado`; verificar el log y que las pantallas existentes sigan iguales.
- [ ] 9.2 Desplegar el front; comparar el embudo con la consola en el mismo rango.
- [ ] 9.3 `PAUTA_EVENTOS=sombra` 1 día → revisar 10 empresas a mano → `prueba` (ver en "Probar eventos") → `envio`.
- [ ] 9.4 Con OK de Daniel: crear la conversión personalizada `PrimerPedido` y cambiar la optimización de la campaña.
- [ ] 9.5 `AVISOS_PLAN=sombra` 2 días → Daniel revisa la lista → `envio`.
- [ ] 9.6 `CRM_AUTOPILOT=sombra` 2 días → revisar movimientos → `envio`.
- [ ] 9.7 Cargar `PAUTA_RESUMEN_PARA` y verificar el primer resumen.
- [ ] 9.8 A los 30 días en `envio` sin incidentes: retirar los modos de flag (Artículo XII).
- [ ] 9.9 Bitácora en `specs/CONTRACT.md` con los commits y lo verificado.
