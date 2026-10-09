## Context

Motivación en `proposal.md`. Hechos del código que condicionan el diseño (informe de solo lectura del 2026-10-08):

- **Pedidos.** Colección `orders`, multiempresa por `company`, con `fechaCreacion` ISO en string y formatos mezclados: el Seller usa UTC, Shopify `-05:00` y WooCommerce no trae zona. No hay campo de actualización universal:
  - `date_upd` y `date_edit` no los escriben la toma de pedido del mensajero, Envíame, el picking ni los flows.
  - `order_status_history` tampoco cubre Shopify, Envíame, los flows, el picking ni la toma de pedido.
- **Estados.** Enum en `models/Pedido.js:322-340`, con estados extra de picking/packing, `EnDespachoUltimaMilla`, `Anulado`, `Cancelado` y `Eliminado`. "En camino" es solo la etiqueta de Despachado. Los cancelados se reconocen con `tools/_orderFilters.js` (`isCancelledOrder`).
- **Transportador.** `order.transportador` es un string con el nombre. Los mensajeros propios están en `transportadores`, todos en moto. Las transportadoras externas no están en esa colección.
- **Servidor.** pm2 en modo fork con una sola instancia (`ecosystem.config.js`). `server.close` espera conexiones abiertas y no hay nginx versionado.
- **SSE existente.** El de flows usa `EventSource`, que no manda `Authorization`: hoy recibe 401. El patrón que sí funciona es `fetch` + `getReader()` con los encabezados de `KatuqCommerceContext` (`opttia-chat.service.ts:203-206,474-480`).
- **Piezas reusables.**
  - `services/salesMetricOrder.js`: la cifra de ventas de `dashboard-core` y de la bienvenida.
  - `services/metricasPropias.js`: el alcance de D-349.
  - `services/geo/ubicacionPedido.js`: ciudad y DANE (D-352).
  - Índice `company + fechaCreacion`. Para `orders` no hay exenciones de campo versionadas, así que el índice simple de `fechaCreacion` (consulta de toda la plataforma) existiría; la tarea 1.5 lo confirma.
  - `shared/escena-3d/escena-base.ts` y la escena del mapa de D-352.
- **Candado de plataforma.**
  - El tenant dueño es `Julsmind`. `getTicketsResumen` lo compara contra `getJwtTenant(req)`, y es el molde que se sigue.
  - `getPlatformOverview`, `getCompanies`, `getBillingOverview` y `cambiarEstadoCiclo` lo comparan contra `req.headers.company`, y `auth` no ata ese encabezado al token: es el bug 5 de D-386. Ese patrón no se copia.
  - `companies.nomComercial` es la llave de tenant que va en el token y en `orders.company` (`companyAccess.js`).

## Goals / Non-Goals

**Goals:**
- Detectar todos los cambios de pedido sin tocar ningún camino de escritura.
- Que todas las cifras salgan del servidor.
- Un solo observador por empresa y uno solo para toda la plataforma.
- La vista de toda Katuq solo para la empresa del token `Julsmind`.
- Que tocar cualquier cosa abra su detalle sin salir de la pantalla.
- La pantalla sigue funcionando sin canal (modo de respaldo) y sin WebGL.

**Non-Goals:**
- Historial completo de transiciones (no existe una fuente completa).
- Cambios de pedidos de más de 7 días en el tablero del comercio, ni de antes de ayer en la vista de toda Katuq.
- GPS de mensajeros.
- Varias instancias del backend: si un día se pasa a cluster, el reparto por empresa necesita un bus. Queda anotado, no se construye.

## Decisions

1. **Detector por diff sobre un listener del servidor**
   - Query: `orders.where('company','==',X).where('fechaCreacion','>=', desde7d)`, con el índice existente.
   - La primera foto es la base y no emite eventos.
   - Después, `docChanges()`:
     - `added` que no estaba en la base → `pedido_nuevo`;
     - `modified` → comparar `estadoProceso`, `estadoPago`, `transportador` y el monto contra la proyección guardada;
     - `removed` se ignora.
   - En memoria queda solo una proyección por pedido: id, número, estados, transportador, fecha, monto (`salesMetricOrder`), canal, cliente corto, ciudad/barrio (`ubicacionPedido`), correo del asesor (para D-349) y `horas`: cuándo vio el distribuidor entrar el pedido a cada etapa (para el recorrido de la ficha).
   - La función de diff es pura y probada aparte.
   - Alternativas descartadas:
     - (a) Avisos en cada camino de escritura: son decenas, varios de módulos sensibles, y siempre quedaría uno sin avisar.
     - (b) La campana en Realtime DB: depende de preferencias y no cubre EnDespacho, el despacho masivo, Shopify ni Envíame.
     - (c) Escuchar `order_status_history`: incompleto.
     - (d) Consultar cada pocos segundos por `date_edit`: no es universal.
     - (e) Releer la ventana cada pocos segundos: ~100 veces más lecturas.

2. **Etapas definidas en un solo lugar del backend.**
   - El mapa estado → etapa vive en el backend:
     - `recibido`: SinProducir y desconocidos;
     - `produccion`: EnProduccion, ProducidoParcialmente;
     - `alistamiento`: ProducidoTotalmente, EnPicking, ListoParaPacking, EnPacking, Empacado;
     - `listo`: ParaDespachar, ListoParaDespacho, EnDespacho;
     - `camino`: Despachado, EnDespachoUltimaMilla;
     - `entregado`: Entregado, Cerrado;
     - `rechazado`: Rechazado;
     - `cancelado`: lo que diga `isCancelledOrder`.
   - Viaja en la foto con nombres y tonos, para que el front no lo duplique.
   - Un pedido de POS que nace Entregado llega como `pedido_nuevo` con etapa `entregado`. La escena lo muestra como venta en el mostrador, sin viaje por la banda.

3. **Cifras siempre del servidor.**
   - Tras cada cambio, el distribuidor recalcula las cifras de hoy y de ayer desde la proyección, incluido un cancelado que resta ventas.
   - Si cambiaron, manda un mensaje `cifras`. Si el usuario tiene alcance D-349, las calcula filtradas solo para él.
   - Hoy y ayer usan los mismos cortes ISO en UTC que `dashboard-core`, para que la cifra cuadre con la bienvenida aunque las fechas vengan mezcladas.
   - El front no suma nada.

4. **Un distribuidor por empresa** (`services/enVivo/distribuidor.js`).
   - Guarda por empresa: el listener, la proyección, quiénes están conectados (cada uno con su filtro de alcance), los últimos 60 eventos, los transportadores (solo nombres; se refrescan cada 10 min) y las zonas de cobro de `salesMetricOrder`.
   - Arranca con la primera pantalla y para 2 minutos después de la última.
   - A medianoche (hora de Colombia) se reinicia para rodar la ventana y "hoy".
   - Topes:
     - `EN_VIVO_MAX_EMPRESAS` (25 por defecto; se ajusta tras la medición): al pasarlo, las pantallas nuevas quedan en `modo: sondeo`.
     - 3 canales por usuario.
   - Interruptor `EN_VIVO_HABILITADO`, que responde `disponible: false`. Dueño: Daniel. Se retira 30 días después de encenderlo para todos (Art. XII).

5. **Transporte: SSE por `fetch`.**
   - Rutas:
     - `GET /v1/analytics/en-vivo/foto`
     - `GET /v1/analytics/en-vivo/stream`
     - `GET /v1/analytics/en-vivo/global/foto` y `/global/stream` (toda Katuq, decisión 10)
     - `GET /v1/analytics/en-vivo/pedido/:id` (ficha, decisión 12)
   - Todas con `auth` + `requireJwtTenant` (empresa del JWT) y la revisión del menú `en-vivo` del rol, igual que D-354. Sin menú responden 200 `{ disponible:false }`, porque el interceptor convierte un 403 en "Límite de suscripción".
   - Mensajes: `foto` (siempre el primero), `evento` (con `id:`), `cifras`, `modo`, `reconectar`.
   - Comentario de latido cada 20 s. El stream dura como máximo 30 min y luego manda `reconectar`.
   - Encabezados `X-Accel-Buffering: no` y `flushHeaders`.
   - El front lee con `fetch` + `getReader()` y los encabezados de `KatuqCommerceContext`. Reconecta con espera creciente (1, 2, 5, 10, 20 y 30 s, con azar) y descarta ids repetidos (últimos 300).
   - Alternativas descartadas:
     - `EventSource` con el token en la query: el token queda en los logs.
     - WebSocket: necesita handshake de auth propio y upgrade en el proxy, más pesado.
     - Listener de Firestore en el cliente: el cliente Firebase no está autenticado y las reglas no están versionadas.
     - `HttpClient` con `partialText`: acumula todo el stream en memoria y el interceptor muestra "sin conexión" en cada corte.

6. **Apagado ordenado.**
   - `index.js` llama a `enVivo.cerrarTodo()` antes de `server.close`: manda `reconectar`, cierra respuestas y suelta listeners.
   - Cambio aditivo: no se toca el resto del apagado.

7. **Frontend: módulo `components/en-vivo/` lazy, OnPush.**
   - Excepción al Art. IX: Angular 14 no trae signals ni `@if` (precedente en CONTRACT, línea 7305).
   - Servicios:
     - `EnVivoService extends BaseService` (foto y sondeo);
     - `EnVivoCanalService` (lectura del stream, reconexión, respaldo);
     - `EnVivoEstadoService` (aplica mensajes a un modelo de vista con `BehaviorSubject`, deduplica y lleva la cola de animaciones).
   - Componentes chicos:
     - `cifras`, `etapas` (la franja de texto accesible), `operacion`, `mapa`, `eventos`, `ventas-hora`, `flota`, `celebracion`;
     - el shell, con encabezado, conexión, vista, sonido, modo pantalla y repetición.
   - Utilidades:
     - `sonidos.ts`: WebAudio sintetizado, sin archivos;
     - `pantalla.ts`: pantalla completa, Wake Lock y tema oscuro.
   - Preferencias en `localStorage`, con try/catch: vista, sonido, privacidad y hitos ya celebrados hoy.

8. **Escenas.**
   - `OperacionEnVivoEscena extends EscenaBase`: plataforma con tienda, banda, cuatro estaciones, garaje, parqueadero de motos, camión, vía y barrio.
     - Cajas con geometría compartida, máximo 18 visibles por estación y "+N".
     - Ambiente: banda y engranaje, apagados con "reducir movimiento".
   - El mapa pasa a `shared/escena-3d/mapa-colombia.scene.ts`, como la base en D-353. `MapaEnVivoEscena` lo extiende con pulsos, arcos y columnas de hoy. La bienvenida solo cambia el import.
   - Un **director de animaciones**:
     - máximo 6 animaciones a la vez;
     - con más de 8 eventos en cola los aplica con desvanecido;
     - agrupa las salidas por transportador en una sola moto o camión con "+N", que es el caso del despacho masivo.
   - Tocar una caja abre `/pedidos` con ese pedido.

9. **Diseño visual.**
   - Tema canónico: acento `#5F3FE0`, pares semánticos, plano y sin gradientes.
   - El confeti usa colores planos de la paleta.
   - **Desvío justificado:** el modo pantalla usa una variante oscura derivada de la tinta `#211F3A`, con los mismos tonos semánticos aclarados para contraste AA en un televisor. Vive solo en esta pantalla.
   - Referencia de look y animaciones: el prototipo con datos de ejemplo publicado con esta propuesta.

10. **Observador de toda la plataforma** (`services/enVivo/plataforma.js`).
    - Consulta: `orders.where('fechaCreacion','>=', inicioDeAyerISO)` sin filtro de empresa. Mismo detector puro de la decisión 1 y una proyección **sin cliente**: comercio (`company`), ciudad del cliente, canal, monto, etapa y tipo de transportador.
    - Ventana de ayer y hoy: alcanza para "contra ayer a esta hora". Las etapas que se ven en esta vista son las de esos pedidos.
    - Un distribuidor con la llave `__katuq__`: se enciende con la primera pantalla, se apaga 2 minutos después de la última y se reinicia a medianoche.
    - Las cifras por comercio salen de `salesMetricOrder`, con la configuración de cobro de cada empresa leída a demanda (10 min).
    - Se excluyen las empresas con `metricsExcluded` (D-323).
    - Nombre y ciudad del comercio: `companies.nomComercial` y `companies.ciudad`, normalizada con `services/geo`. Sin ciudad, el comercio cuenta en las cifras pero no tiene torre.
    - Alternativas descartadas:
      - (a) Encender un observador por empresa para todas: serían cientos.
      - (b) Sumar los distribuidores ya encendidos: solo cubre las empresas con pantallas abiertas.
      - (c) Consulta agregada cada 30 s: no deja eventos que animar. Queda como respaldo (`modo: sondeo`) si la medición no da.
11. **Candado y entrada a un comercio.**
    - `global/*`, y el parámetro `?empresa=` en `foto` y `stream`, exigen `normalizeTenant(getJwtTenant(req)) === 'julsmind'`. La revisión va antes de tocar Firestore y con `requireJwtTenant`, que rechaza un encabezado distinto al token.
    - Con `?empresa=`, la sesión de Katuq usa el distribuidor de esa empresa (decisión 4), sin filtro D-349 y con `soloLectura: true` en la foto.
    - En cualquier otra sesión, `?empresa=` se ignora.
    - El front manda el encabezado `company` de la sesión (Julsmind), nunca el del comercio que mira.
12. **Ficha.**
    - `GET /v1/analytics/en-vivo/pedido/:id` (con `?empresa=` para Katuq) lee **un** documento.
    - Responde 404 si es de otra empresa o está fuera del alcance D-349.
    - La proyección es la de la decisión 1 más las líneas del carrito (nombre, cantidad y valor, con la misma cuenta que Pedidos) y `horas`: la hora de cada etapa que el distribuidor vio cambiar, más `fechaCreacion`. Sin teléfono, dirección, documento ni correo.
    - Las listas por etapa, ciudad, canal y mensajero se arman en el front con la foto: no hay ruta nueva. Por eso la foto del comercio trae los pedidos de hoy (también los entregados) y los activos de la ventana.
    - La ficha abierta se repinta solo si cambió su contenido, para no perder el scroll ni el puntero.
13. **Encuadre automático en `EscenaBase`.**
    - `ajustarAContenido(puntos)` mide, en el ángulo inicial de la cámara, el contorno del país más la altura de torres y nombres (o la plataforma de la ciudad).
    - Al redimensionar, fija el frustum para que eso llene el recuadro, dejando márgenes para el título, las herramientas y la franja de etapas.
    - "Ampliar" pasa la lista debajo y la escena toma todo el ancho, con más alto en los mapas.
    - La cámara de la ficha y la automática mueven el centro, no el encuadre.
14. **Frontend de toda Katuq.**
    - Ruta `en-vivo/katuq` dentro del mismo módulo, con entrada `isOnlyAdmin` (administradores de Julsmind).
    - Reusa `cifras`, `eventos`, `ventas-hora` y la franja de etapas con otra fuente. Componentes nuevos: `carrera` (filas posicionadas con `transform`, para animar los cambios de puesto), `cinta` y `ciudades`.
    - Escenas `PaisKatuqEscena`, sobre el mapa compartido, y `CiudadKatuqEscena`. Cámara automática en modo pantalla.
    - Ficha en `components/en-vivo/ficha/` (`ficha-pedido`, `ficha-lista`, `ficha-mensajero`), con `EnVivoDetalleService extends BaseService`.
    - Centro de mando: `heroe` (odómetro de ventas, proyección y mini gráfico), `pulso` (canvas 2D a ~30 fps, pausado si la pestaña está oculta y estático con "reducir movimiento"), paneles flotantes (`momento`, `carrera`) y `muro`. Los paneles se apagan con "Ampliar" o con menos de 1180 px de ancho. El encuadre automático (decisión 13) deja libre su espacio.

15. **Radar, tiempos y récords en el servidor** (`services/enVivo/radar.js`).
    - Funciones puras sobre la proyección de plataforma, que lleva por pedido `tC`, `tL`, `tS` y `tE`: la hora de llegada, de listo, de salida y de entrega que vio el observador.
    - Se recalculan cada 30 s y viajan en un mensaje `radar` del stream global.
    - **Ritmo normal** de un comercio: sus llegadas de hoy anteriores a la última hora, divididas por el peso de esas horas en la curva de ayer de toda la plataforma y multiplicadas por el peso de la hora actual.
      - El silencio es raro si supera `max(50 min, 4,6 / ritmo)`: la probabilidad de cero llegadas en un proceso de Poisson es menor a e^-4,6 ≈ 1 %.
      - En el prototipo, la regla anterior de "50 minutos" daba una falsa alarma en 1 de cada 8 cargas para un comercio de 2 a 3 pedidos por hora. Con esta regla desaparecen.
    - **Récords de 90 días:** una vez al día (y al arrancar), 90 consultas `count()` de `orders` por `fechaCreacion` de cada día, sin filtro de empresa. Cuestan 1 lectura por cada 1.000 entradas del índice.
      - Se guardan en memoria: no hay colección ni escritura.
      - Cuentan pedidos creados, incluidos los cancelados: separar los cancelados pediría un índice compuesto nuevo, y eso necesita aprobación aparte.
    - **Proyección al cierre:** lo de hoy dividido por la fracción del día de ayer que ya había pasado a esta misma hora.
16. **Opttia en la pantalla** (`services/enVivo/opttia.js`).
    - Toda llamada pasa por `pedirJsonAOpttia` (`/api/ai/json` del ADK, Bedrock). No hay llamadas directas ni Genkit (D-257).
    - **Resumen:**
      - Entrada: un JSON solo de cifras, con las mismas que ve la pantalla: totales, top 5 de la carrera, alertas del radar, tiempos, canales y lo vendido con Opttia. Para un comercio van sus cifras, sus pedidos listos (número, ciudad y minutos) y sus mensajeros libres (solo el primer nombre).
      - Salida: `{ titular, puntos: [{ tono, texto, accion? }] }`.
      - Hay uno compartido para toda Katuq y uno por comercio, en memoria con TTL de 15 o 30 minutos, y solo se piden mientras haya suscriptores.
      - Timeout de 20 s. Si falla, queda el último resumen.
    - **Preguntas:** `POST /v1/analytics/en-vivo/opttia/pregunta`, con la misma autorización y alcance que la foto. Lleva el mismo JSON de cifras más la pregunta (máximo 160 caracteres) y responde `{ texto, acciones[] }`. Tope de 20 por usuario por hora, en memoria.
    - **Narración:** plantillas en el front sobre los eventos, sin modelo, más los puntos del último resumen.
    - **Orbe en la escena** (`components/en-vivo/escenas/opttia-orbe.ts`): un solo objeto 3D que se mueve a la escena activa.
      - Su lista de puntos sale del mensaje `radar` y del resumen, sin llamadas nuevas.
      - Cada escena expone `posComercio`, `posCaja`, `posVeh`, `posEstacion` y `posCiudad` para ubicar el objetivo, que el orbe sigue si se mueve.
      - La cámara del recorrido mueve el centro (`cT`), como la ficha.
      - En el muro y el tablero, la marca es una clase en la tarjeta que sobrevive al repintado.
      - Hay un solo temporizador de 16 s y el recorrido se corta con cualquier interacción de cámara.
    - **Prueba de contrato:** el armador del JSON falla si recibe o emite campos de cliente (`cliente`, `telefono`, `direccion`, `documento`, `correo`, `email`, `nombre` del cliente).
    - En el prototipo, el resumen y las respuestas salen de plantillas con los mismos datos y se renuevan cada minuto, para poder verlo.
17. **"Vendido con Opttia".**
    - `convertirCotizacionAPedido` crea el pedido con `typeOrder: "Cotización Convertida"` y `cotizacionOrigen`, pero no copia el `origen: "whatsapp-bot"` de la cotización.
    - El observador lee una vez la cotización de cada pedido con `cotizacionOrigen` y guarda en memoria si su `origen` es `whatsapp-bot`. No cambia ningún camino de escritura.
    - Copiar `origen` al convertir sería más barato, pero toca el flujo de cotizaciones: queda como mejora aparte.
18. **Centro de mando del comercio** (mismo `services/enVivo/radar.js`, con funciones por empresa).
    - "Atención ahora" se calcula en el distribuidor de la empresa cada 30 s, con las `horas` de la proyección. Viaja en un mensaje `radar` del stream de la empresa, filtrado por D-349 para cada vendedor.
      - "Lo normal de hoy en su etapa" es la mediana de los pedidos de hoy que ya pasaron por esa etapa; sin datos, 30 minutos.
      - El mensajero libre que se sugiere es uno sin pedidos en ruta.
    - **Récord del comercio:** 90 consultas `count()` con `company + fechaCreacion` (índice existente), una vez al día por empresa con pantallas abiertas, en memoria.
    - **Productos estrella:** el distribuidor suma por nombre las líneas del carrito de los pedidos de hoy (unidades y valor, con la cuenta de Pedidos) y resta al cancelarse o rechazarse. Va en la foto y en los mensajes `cifras`.
    - **Comparación con Katuq:** mediana de las medianas de ciclo de las empresas con distribuidor encendido, más el observador de plataforma si está encendido. Solo se manda si hay 5 empresas o más, y nunca con nombres.
    - **Tablero de pedidos:** sale de la foto (pedidos de hoy y activos, con `horas`) y de los eventos, sin ruta nueva. En el front: columnas con tarjetas por id, reubicadas con animación FLIP, hasta 40 por columna.
    - El encuadre automático (decisión 13) se aplica también a la escena de operación, para dejar espacio a los paneles flotantes.

## Risks / Trade-offs

- **[Memoria del listener]** El SDK guarda los documentos completos de la ventana (el carrito pesa) por cada empresa observada. → Medición previa (tarea 1) con ALMARA y OH MY STORE, con y sin `select()` en el listener; tope de empresas. Si hace falta bajar la ventana a 3 días, se pide aprobación porque cambia la spec.
- **[Memoria del observador de plataforma]** Ve los pedidos de ayer y de hoy de todas las empresas, con documentos completos. → La medición 1.5 cuenta pedidos y tamaños de toda la plataforma y abre el listener 10 minutos en local. Si no da: ventana de solo hoy o `modo: sondeo` de plataforma. Las dos cambian la spec y se pide aprobación.
- **[Candado de plataforma]** Un error ahí expone a todos los comercios. → La empresa sale del token antes de leer nada, igual que `getTicketsResumen`. La prueba de contrato manda `company: Julsmind` con un token ajeno y exige 403 sin tocar Firestore.
- **[Gasto de Opttia]** Cada resumen y cada pregunta es una llamada a Bedrock. → Resúmenes compartidos con TTL (4 por hora en toda Katuq, 2 por hora por comercio con pantallas abiertas), tope de 20 preguntas por usuario por hora y narración por plantillas. Antes de encenderlo para todos se mide en el piloto.
- **[IA que se equivoca]** El resumen podría afirmar algo que no dicen las cifras. → La entrada es solo el JSON de cifras, el prompt exige no inventar, y la salida se valida: los números que cita deben estar en la entrada, si no se descarta y queda el resumen anterior. Además, la IA solo sugiere: no hace nada.
- **[Falsas alarmas del radar]** Una alerta de más gasta la atención del equipo. → Umbrales estadísticos por comercio (decisión 15), una sola racha a la vez y radar congelado durante "Repetir el día".
- **[Ficha en un televisor]** El detalle trae el cliente corto y los productos. → Datos mínimos, y "ocultar clientes y montos" también aplica en la ficha.
- **[Lecturas]** Cada arranque relee la ventana: unos 70 a 240 documentos por empresa, más 1 por cambio, y vuelve a pasar en cada despliegue y a medianoche. → Se mide y se anota en la tarea 1.
- **[Proxy de producción]** Puede tener buffering o cortes por inactividad. → La tarea 1 prueba el stream a través de `back.katuq.com`. El latido de 20 s y el modo de respaldo cubren lo demás.
- **[Despacho masivo]** 50 salidas de golpe. → El director las agrupa.
- **[Fechas mezcladas]** El corte de "hoy" puede correrse unas horas para pedidos de WooCommerce sin zona. → Mismo comportamiento que la bienvenida, a propósito, para que cuadren.
- **[Televisor a la vista]** → Datos mínimos desde el servidor y el modo "ocultar clientes y montos".
- **[Equipos débiles (TV)]** → Calidad baja automática, unos 40 fps, pausa fuera de pantalla y el respaldo sin WebGL.
- **[Reload de pm2]** Por un momento hay dos procesos vivos. → `reconectar` y la reconexión del cliente.

## Migration Plan

1. Medición de solo lectura (tarea 1); sus números se anotan aquí.
2. Despliegue del backend. Ningún rol tiene `en-vivo`, así que no cambia nada para nadie.
3. Despliegue del frontend.
4. Daniel agrega "En vivo" en Roles de FLORECER y ALMARA FELICIDAD.
5. "Katuq en vivo" aparece para los administradores de Julsmind al desplegar el front, y la apaga `EN_VIVO_HABILITADO`. Primero se usa en la oficina, antes de mostrarla afuera.
6. **Reversa:** quitar el menú del rol, o `EN_VIVO_HABILITADO=false` + `pm2 reload katuq-api --update-env`.

## Open Questions

- El valor final de `EN_VIVO_MAX_EMPRESAS`: lo dice la medición, sin cambiar el enfoque.
- Si la medición obliga a bajar la ventana de 7 a 3 días, eso cambia la spec y se vuelve a pedir aprobación antes de construir.
- La ventana del observador de plataforma (ayer y hoy, o solo hoy) depende de la medición 1.5.
- Si "Vendido con Opttia" debe contar también los pedidos que el bot cierre solo en el futuro (sin cotización). Hoy el bot siempre deja borrador.
- Si el récord de 90 días debe excluir cancelados: pide un índice compuesto, y por eso se decide aparte.
- La ciudad del comercio: `companies.ciudad` puede venir vacía o escrita a mano. Si la normalización falla para muchas empresas, se usa la ciudad de su bodega principal.

## Resultados de la medición (2026-10-08, solo lectura)

Scripts en `katuq_admin_back_firebase/functions/scripts/medicion-en-vivo/`.

| Dato | Resultado |
|---|---|
| ALMARA FELICIDAD, ventana de 7 días | 253 pedidos, 47 KB por documento, 11,8 MB; 31 hoy |
| OH MY STORE, ventana de 7 días | 165 pedidos, 73 KB por documento, 12,0 MB; 18 hoy |
| FLORECER | 3 pedidos en 30 días: casi inactiva |
| Plataforma, pedidos por día (2 a 8 oct) | 75, 17, 8, 67, 73, 66, 55; promedio 51,6, pico 75 |
| Plataforma, ayer y hoy | 121 documentos, 5,3 MB, índice de `fechaCreacion` existente (sin índice nuevo) |
| Empresas con pedidos en esa ventana | 4: ALMARA, OH MY STORE, ALMACEN BOMBAS, CAFE ESCOBAR |
| Listener de ALMARA (7 días, 3 min) | +73 MB de heap, 253 lecturas iniciales, 9,2 s al primer snapshot |
| `select()` en listeners | **No funciona**: `select clauses are not supported for real-time queries` |

Conclusiones:
- La ventana de 7 días alcanza: las compuertas 1.4 y 1.6 **no se activan**, no cambia la spec.
- `select()` no sirve en listeners: se descarta la mitigación del diseño 1. Si la memoria aprieta, el tope es por empresas o proyectar al recibir y soltar el documento (ya está así en el diseño).
- `EN_VIVO_MAX_EMPRESAS = 5` por defecto (unos 75 MB por empresa en el peor caso).
- Pendientes: cambios por hora (`order_status_history` pide un índice compuesto que no se creó; se estima 10 a 20 por hora en ALMARA), listener de plataforma de 10 minutos, SSE por `back.katuq.com` (1.3) y costo de Opttia (1.7).
- Pilotos: FLORECER casi no tiene pedidos. Para ver el tablero con movimiento real, el piloto sería ALMARA y OH MY STORE (decisión de Daniel).
