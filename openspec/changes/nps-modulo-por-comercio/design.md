## Context

D-483 ya está publicado y es la base. B = backend (`functions/`), F = front (`src/app/`).

- **Respuestas:** `surveyResponses` con `type: "nps"`, cuyo dueño es la empresa que recibe (`company`). La nota se calcula en `services/nps/nota.js`, que da `npsContribution` 100/0/-100.
- **Tablero:** `services/nps/tablero.js` corre especificaciones fijas sobre la fuente `nps` con `runQuery(..., req.tenant)`. KAI sale de `services/ai/temasComentarios.js`.
- **Front:** `SatisfaccionComponent` (`crm/satisfaccion`), `EscalaNpsComponent` (standalone), `FeedbackService` y `rutas-publicas.ts`.
- **Encuesta a compradores existente:** `scheduleSatisfactionSurvey` (B `notificationHooks.js:1818`) escribe `scheduled_notifications/{orderId}` a +15 días. El promotor (B `cronService.js:2416`) está apagado y encola correo y SMS. El enlace apunta a `/survey/...`, que no existe.
- **Campana del comercio:** nodo RTDB `ActualizacionTicket{nomComercial}`, por empresa y no por usuario. Hay escritura idempotente en B `supportTicketInApp.js:120` (`crearSiNoExiste`).
- **Correo:** `notification_queue`, canal EMAIL (B `notificationQueue.js:304`); piezas de plantilla en `templates/registro.js`.
- **CRM:** las tareas exigen un lead (`crm_tasks` con `entityId`). Los compradores de pedidos no son leads, así que el caso no se monta sobre tareas del CRM: llenaría el pipeline de compradores.
- **Usuarios de la empresa:** `GET /v1/users/all` (por `empresa` de la sesión).
- **Banderas por comercio:** `companies.featureFlags.<nombre>`, en B `companyFeatureFlags.js` y F `company-features.service.ts`.

## Goals / Non-Goals

**Goals:**
- un solo modelo para Julsmind y para cada comercio: la empresa que recibe es la dueña;
- el caso de seguimiento vive en la respuesta, sin colección de casos;
- la empresa siempre sale del JWT; los enlaces públicos van firmados;
- nada escribe en `orders`.

**Non-Goals:** los de la propuesta.

## Decisions

### 1. Datos

```
npsSurveys/{id}                                  // NUEVA (pide aprobación)
  company, nombre, canal: "entrega" | "enlace"
  estado: "borrador" | "activa" | "pausada"
  preguntas: { nps, abiertas: { detractor, pasivo, promotor },
               adicionales: [{ id, tipo: "opcion" | "texto", texto, opciones[] }] }   // máx. 3
  diasEspera (entrega, 1..30), publicId (enlace, aleatorio)
  responsable: { email, nombre }
  createdAt/By, updatedAt/By

surveyResponses/{id}                             // existente; campos nuevos
  surveyId, canal: "entrega" | "enlace" | "seller"
  preguntasVistas (copia de las preguntas al responder)
  adicionales: { <idPregunta>: valor }, contacto? (enlace, opcional)
  caso?: { estado: "nuevo" | "contactado" | "resuelto" | "sin_solucion",
           responsable: { email, nombre }, notas[], historial[],
           abiertoAt, primerContactoAt?, cerradoAt?, notaCierre?,
           avisadoAt?, recordadoAt? }
```

- **La encuesta de Julsmind a comercios no se guarda en `npsSurveys`.** El listado la arma desde la bandera `NPS_COMERCIOS`. Sus respuestas existentes (sin `surveyId`, `audience: "merchant"`) se leen como `canal: "seller"`, así que no hace falta migrar datos.
- **Índices:** `npsSurveys (company, canal, estado)`. Los casos se consultan por igualdades (`company`, `type`, `caso.estado`); las fechas se filtran en memoria, como ya hace el motor.
- **Alternativa descartada:** guardar las encuestas en `companies`. Ese documento lo reescribe la ficha de empresa y ya es grande.

### 2. Backend, en piezas pequeñas (`B/services/nps/`)

- **`encuestas.js`:** validación pura (preguntas, canal, días y responsable activo de la empresa), más el CRUD. Garantiza una sola encuesta de entrega activa por empresa: al activar otra, pausa la anterior en una transacción.
- **`casos.js`:** máquina de estados pura (transiciones válidas; nota obligatoria al cerrar; historial) y escrituras en transacción. Abre el caso con la respuesta, si es detractor y no es prueba.
- **`avisos.js`:**
  - campana: escribe en `ActualizacionTicket{comercio}/nps_<idRespuesta>` con `crearSiNoExiste` (tipo `NPS_DETRACTOR`, `actionUrl: /nps/seguimiento/<id>`);
  - correo al responsable: va por `notification_queue` con la plantilla `NPS_CASO_NUEVO`;
  - un solo aviso por caso (`avisadoAt` en transacción).
- **`entrega.js`:** reemplaza el cuerpo de `scheduleSatisfactionSurvey`:
  - busca la encuesta de entrega activa de la empresa;
  - aplica la regla de 30 días por comprador (hash del correo) y una encuesta por pedido (ID `buyer_<company>_<orderDocId>` con `create()`);
  - programa en `scheduled_notifications` a +`diasEspera`.

  El promotor confirma que el pedido sigue Entregado y que la encuesta sigue activa, y se envuelve con `conLatido`.
- **`publica.js`:** responde por token (entrega) o por `publicId` (enlace):
  - registra la nota por POST al cargar la página; un GET nunca registra;
  - guarda las preguntas vistas, la segunda pregunta y las adicionales;
  - el enlace abierto tiene límite por visitante (`utils/rateLimitKeys.opcionesPorVisitante`).
- **`utils/enlaceFirmado.js`:** `firmar(prefijo, id, venceMs)` y `leer(prefijo, token)`, con HMAC-SHA256, `timingSafeEqual` y vencimiento; secreto `ENCUESTA_SECRET`.
- **Rutas `/v1/nps`** (`auth` + `requireJwtTenant`):
  - `GET|POST|PUT /encuestas`, familia Administrador;
  - `GET /casos` (administradores ven todos; los demás, los suyos) y `PUT /casos/:id`;
  - `GET /tablero?encuesta=&canal=`.

  **Públicas, sin sesión:**
  - `GET /publica/encuesta/:ref`, que devuelve solo las preguntas;
  - `POST /publica/respuesta`, `POST /publica/comentario`.
- **Recordatorio diario** (cron con `conLatido`): busca los casos `nuevo` con más de 48 horas y `recordadoAt` de otro día, y envía la plantilla `NPS_CASO_RECORDATORIO`.
- **Banderas:**
  - `featureFlags.npsModulo`, por comercio, para el encendido por etapas;
  - `NPS_COMPRADORES` (env), interruptor general de envíos, que reemplaza a `SATISFACTION_SURVEY_CRON_ENABLED`.

  Dueño: Daniel. Revisión: 2027-01-31.

### 3. Front: módulo lazy `F/components/nps/`

- Rutas: `nps/resultados`, `nps/encuestas`, `nps/encuestas/:id`, `nps/seguimiento` y `nps/seguimiento/:id`. `crm/satisfaccion` redirige a `nps/resultados`.
- Piezas (standalone, SRP, `cfg-pagina`):
  - `ResultadosComponent`: es `SatisfaccionComponent` movido, con filtros de encuesta y canal y las respuestas adicionales;
  - `EncuestasListaComponent`;
  - `EncuestaEditorComponent`: formulario reactivo con vista previa usando `EscalaNpsComponent`; QR con la librería `qrcode`, que ya usa sitios;
  - `SeguimientoListaComponent`;
  - `CasoComponent`: estado, reasignar, notas e historial, con Swal para confirmar el cierre.
- Página pública `encuesta/:ref` sobre `<app-publica-marco>` y `EscalaNpsComponent`; se agrega a la lista de rutas públicas.
- Servicio: `FeedbackService` se amplía, o se crea `NpsService extends BaseService` con los mismos patrones.
- Menú: entrada "NPS" visible con la bandera `npsModulo` y la familia Administrador (o la ruta dada por el administrador). Julsmind la ve siempre.
- Campana: tipo `NPS_DETRACTOR` en `notification.types.ts`.

### 4. Correos

Se rehace `SATISFACTION_SURVEY` y se crean `NPS_CASO_NUEVO` y `NPS_CASO_RECORDATORIO`, con las piezas de `registro.js`: planos y con la escala como tabla de enlaces. Antes de encender `NPS_COMPRADORES` se verifican SPF, DKIM y DMARC.

## Risks / Trade-offs

- **[El caso dentro de la respuesta]** Consultar casos abiertos de todas las empresas cuesta más. Se acepta: siempre se consulta por empresa y el volumen de detractores es bajo.
- **[La campana es de toda la empresa]** El aviso lo ven todos los usuarios. Mitigación: el correo es solo para el responsable; la campana dice "Un cliente calificó 3/10" sin datos personales.
- **[El enlace abierto admite respuestas falsas]** Mitigación: límite por visitante, canal marcado y filtro por canal en Resultados.
- **[Correo]** Mitigación: entregabilidad verificada antes de encender y el interruptor general.

## Migration Plan

1. Backend con `NPS_COMPRADORES` apagado y la bandera `npsModulo` sin encender en ningún comercio.
2. Front.
3. Encender `npsModulo` en FLORECER: encuesta de entrega con un pedido real y una por enlace, y probar el caso, el aviso y el recordatorio.
4. Encender `NPS_COMPRADORES` y luego los comercios por grupos.
5. Reversa: apagar `NPS_COMPRADORES` y la bandera.

## Open Questions

1. ¿Se aprueba la colección `npsSurveys`?
2. ¿Correo, enlace y QR en la primera entrega, y WhatsApp después?
3. ¿Todos los planes, o con límite en el plan gratis?
