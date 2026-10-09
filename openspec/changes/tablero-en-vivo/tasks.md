## 1. Medición previa (solo lectura, sin código de producto)

- [x] 1.1 Script de solo lectura para FLORECER, ALMARA FELICIDAD y OH MY STORE: pedidos de la ventana de 7 días, tamaño promedio del documento, cambios de estado por hora en un día normal y pedidos de hoy. Anotar los números en `design.md`.
- [x] 1.2 Script local que abre el listener de la ventana de ALMARA durante 10 minutos, con y sin `select()`. Medir memoria (heap antes y después), lecturas iniciales y si `select()` funciona en listeners. Sin escribir nada.
- [ ] 1.3 Probar un SSE de prueba a través de `back.katuq.com` (ruta temporal en staging o `curl -N` contra flows con token): que llegue cada mensaje sin buffering y sobreviva 5 minutos con latido de 20 s.
- [x] 1.4 Compuerta: si la memoria o las lecturas obligan a bajar la ventana a 3 días, parar y pedir aprobación del cambio de spec. Si no, fijar `EN_VIVO_MAX_EMPRESAS` con los números.
- [x] 1.5 Medición de toda la plataforma, solo lectura: pedidos creados por día en la última semana en todas las empresas (promedio y pico), tamaño promedio del documento y confirmación de que `orders.where(fechaCreacion >= ayer)` corre sin índice nuevo. Listener local de 10 minutos con la ventana de ayer y hoy, midiendo heap y lecturas. Anotar en `design.md`.
- [x] 1.6 Compuerta de plataforma: si la memoria no da, parar y pedir aprobación para "solo hoy" o `modo: sondeo` de plataforma (cambia la spec `tablero-en-vivo-plataforma`).
- [ ] 1.7 Medición de Opttia, solo lectura: prueba local de `pedirJsonAOpttia` con un JSON de cifras de ejemplo (sin datos de clientes). Medir tokens, tiempo de respuesta y costo por resumen y por pregunta, y anotarlo en `design.md`. Una sola llamada de cada tipo (gasto mínimo).

## 2. Backend: detector y distribuidor (solo lectura)

- [x] 2.1 `services/enVivo/etapas.js`: mapa estado → etapa con nombres y tonos (diseño 2), y prueba de que cada valor del enum de `Pedido.js` y los estados extra caen en una etapa.
- [x] 2.2 `services/enVivo/detector.js`: función pura `(anterior, actual) → eventos[]` para `pedido_nuevo`, `cambio_estado`, `salida`, `entregado`, `rechazado`, `cancelado`, `pago_confirmado` y `asignado`. Pruebas por cada caso, más "cambio sin campos relevantes no emite" y "POS nace entregado".
- [x] 2.3 `services/enVivo/proyeccion.js`: proyección mínima del pedido (diseño 1) con `salesMetricOrder`, `ubicacionPedido` y el cliente corto. Prueba de datos mínimos: falla si sale teléfono, dirección, documento o correo del cliente.
- [x] 2.4 `services/enVivo/cifras.js`: cifras de hoy y de ayer desde la proyección, con los cortes ISO de `dashboard-core` y filtro D-349. Prueba que compara contra `dashboard-core` con los mismos pedidos de ejemplo.
- [x] 2.5 `services/enVivo/distribuidor.js`: listener por empresa, base sin eventos, `docChanges`, últimos 60 eventos, suscriptores con alcance, parada a los 2 minutos sin pantallas, reinicio a medianoche, topes (`EN_VIVO_MAX_EMPRESAS`, 3 por usuario) e interruptor `EN_VIVO_HABILITADO`.
- [x] 2.6 Prueba de contrato del write-set: con Firestore y Realtime DB simulados, falla ante cualquier `set`/`update`/`add`/`delete`/`push` desde el detector, la foto o el canal.
- [x] 2.7 `horas` en la proyección: hora en que el distribuidor vio cada etapa (más `fechaCreacion`). Prueba: una etapa cumplida antes de observar queda sin hora.
- [x] 2.8 `services/enVivo/plataforma.js`: observador de toda la plataforma (diseño 10), proyección sin cliente, cifras por comercio con su configuración de cobro, exclusión D-323, ciudad del comercio y distribuidor `__katuq__`. Prueba de datos mínimos: falla si un evento de plataforma trae nombre, teléfono, dirección, documento o correo del cliente.
- [x] 2.9 `services/enVivo/detalle.js`: detalle de un pedido para la ficha (diseño 12), con las líneas del carrito calculadas igual que Pedidos. Prueba contra un pedido de ejemplo de cada canal (Seller, Shopify y POS) y prueba de datos mínimos.
- [x] 2.10 `services/enVivo/radar.js`: ritmo normal por comercio, alertas (atascados, silencio raro, rechazos y una sola racha), tiempos de la operación, proyección y récords de 90 días con `count()` por día en memoria (diseño 15). Pruebas: el silencio de un comercio pequeño en su pausa normal no alerta, el de uno grande sí, y el radar no cambia durante la repetición.
- [x] 2.11 `services/enVivo/opttia.js`: armador del JSON de cifras, resumen compartido con TTL y solo con suscriptores, preguntas con tope de 20 por hora, timeout de 20 s, validación de que los números citados estén en la entrada y respaldo al último resumen (diseño 16). Prueba de contrato: falla si el JSON lleva campos de cliente. Prueba: diez pantallas en una hora piden a lo sumo 4 resúmenes.
- [x] 2.12 "Vendido con Opttia": lectura de la cotización de cada pedido con `cotizacionOrigen`, guardada en memoria, y la marca `ia` en la proyección y en los eventos (diseño 17). Prueba con una cotización del bot convertida en pedido y con una cotización manual.
- [x] 2.13 Centro del comercio en el servidor (diseño 18): "atención ahora" con D-349, récord de 90 días por empresa, productos estrella desde el carrito y comparación con Katuq solo con 5 empresas o más. Pruebas: un listo de 46 minutos aparece y uno de 40 no; la comparación no sale con 4 empresas; un cancelado resta en productos.

## 3. Backend: rutas y apagado

- [x] 3.1 Prueba de contrato de las rutas antes de implementarlas (Art. VIII): 401 sin token, `disponible:false` sin menú, empresa del JWT aunque el encabezado diga otra, formato de `foto` y de los mensajes del stream.
- [x] 3.2 Router `routers/analyticsEnVivo.js` montado en `/v1/analytics/en-vivo` con `auth` + `requireJwtTenant` y revisión del menú `en-vivo` del rol: `GET /foto` y `GET /stream` (SSE: `foto` primero, `evento` con `id`, `cifras`, `modo`, `reconectar`, latido de 20 s y vida máxima de 30 minutos).
- [x] 3.3 Apagado ordenado: `index.js` llama a `enVivo.cerrarTodo()` antes de `server.close`. Diff aparte para revisar.
- [x] 3.4 `node --check`, pruebas de 2.x y 3.1 en verde, y un `curl -N` local con sesión de prueba que muestre los mensajes al cambiar un pedido de demo de FLORECER.
- [x] 3.5 Prueba de contrato del candado, antes de implementar: `global/*` con token de ALMARA y encabezado `company: Julsmind` → 403 sin tocar Firestore; `?empresa=` con token de un comercio → se ignora; `?empresa=` con token de Julsmind → la empresa pedida, en solo lectura y sin D-349; `pedido/:id` de otra empresa o fuera de D-349 → 404.
- [x] 3.6 Rutas `GET /global/foto`, `GET /global/stream` y `GET /pedido/:id`, y el parámetro `?empresa=` en `foto` y `stream` (diseño 11). Vuelven a correr 3.1, 3.5 y el `curl -N` de 3.4 con una sesión de Julsmind.
- [x] 3.7 Ruta `POST /opttia/pregunta` y mensajes `radar` y `opttia` en los streams. Prueba de contrato: tope de 20 por hora por usuario, la empresa del token, y Katuq solo con la sesión de Julsmind.

## 4. Frontend: base, datos y pantalla sin 3D

- [x] 4.1 Mover `mapa-colombia.scene.ts` y `mapa-rampa.ts` a `shared/escena-3d/`, actualizar los imports de la bienvenida y verificar que la bienvenida compila y se ve igual.
- [x] 4.2 Módulo lazy `components/en-vivo/`, ruta `en-vivo` con `AuthGuard` y entrada "En vivo" en "Operaciones" de `nav.service.ts`.
- [x] 4.3 `EnVivoService extends BaseService` (foto) y `EnVivoCanalService` (`fetch` + lector SSE con los encabezados de `KatuqCommerceContext`, reconexión con espera creciente, respaldo a sondeo cada 30 s y mensaje de rol sin acceso).
- [x] 4.4 `EnVivoEstadoService`: aplica `foto`/`evento`/`cifras`, deduplica por id, calcula "Te pusimos al día: N cambios" y guarda preferencias en `localStorage` con try/catch.
- [x] 4.5 Componentes `cifras` (conteo animado y "+1"), `etapas` (franja en texto), `eventos` (lista con hora relativa), `ventas-hora` (hoy contra ayer), `flota` y shell con estado de conexión. Tema canónico y OnPush.
- [x] 4.6 Build sin errores y prueba manual con el backend local y pedidos de demo, sin 3D.
- [x] 4.7 Ficha (`components/en-vivo/ficha/`): ficha de pedido con recorrido, productos, pago y mensajero; listas por cifra, etapa, ciudad y canal armadas con la foto; ficha de mensajero; "Atrás", Escape, hoja en celular, teclado y "ocultar clientes y montos". Con `EnVivoDetalleService extends BaseService`.
- [x] 4.8 Vista de toda Katuq sin 3D: ruta `en-vivo/katuq`, entrada `isOnlyAdmin` en `nav.service.ts`, cifras de plataforma, carrera con reordenamiento animado, cinta, ciudades, lista de todos, entrar a un comercio con `?empresa=` y "Toda Katuq" para volver.
- [x] 4.9 Centro de mando sin 3D: héroe (odómetro, proyección contra el récord y mini gráfico por hora), pulso en canvas (pausa con la pestaña oculta, estático con "reducir movimiento"), radar con acciones, tiempos, canales, récords y muro de comercios con tarjetas que se iluminan.
- [x] 4.10 Tarjeta de Opttia en las dos vistas: resumen con escritura animada, preguntas sugeridas, respuestas con acciones, "Vendido con Opttia" y narración sobre la escena. Mensaje claro al pasar el tope de preguntas y cuando Opttia no responde.
- [x] 4.11 Centro de mando del comercio sin 3D: héroe (ventas, proyección contra su récord, pulso de su tienda y cifras que abren listas), "Atención ahora", tiempos frente a Katuq, productos estrella y la vista "Pedidos" (tablero por etapas con animación FLIP, tarjetas tarde y entrada a la ficha).

## 5. Frontend: escenas y efectos

- [x] 5.1 `OperacionEnVivoEscena extends EscenaBase`: mundo, estaciones, cajas instanciadas con "+N" y ambiente apagado con "reducir movimiento".
- [x] 5.2 Director de animaciones: llegada, viaje por la banda, salida en moto o camión agrupada por transportador, entrega en el barrio, rechazo y cancelación; máximo 6 a la vez y desvanecido con más de 8 en cola.
- [x] 5.3 `MapaEnVivoEscena` sobre el mapa compartido: pulso de llegada, arco de salida desde la ciudad de la bodega, pulso verde de entrega y columnas de hoy.
- [x] 5.4 Etiquetas sobre la escena, resaltar la caja al pasar por un evento y tocar una caja para abrir el pedido en `/pedidos`.
- [x] 5.5 Celebraciones (hitos una vez por día, guardados en el navegador, nunca al cargar ni al repetir), confeti plano y sonidos sintetizados, apagados por defecto.
- [x] 5.6 Modo pantalla: pantalla completa, Wake Lock, variante oscura y "ocultar clientes y montos".
- [x] 5.7 Repetir el día con las llegadas reales de la foto, reloj, vuelta al vivo sin perder eventos y llegadas sin hora de cambio al final.
- [x] 5.8 Sin WebGL, con "reducir movimiento", con la pestaña oculta y en celular: la pantalla sigue útil y sin errores en consola.
- [x] 5.9 Revisión contra `openspec/specs/design-system` (sin gradientes, pares semánticos, spans con color propio) y build sin errores.
- [x] 5.10 `PaisKatuqEscena` (torres por comercio, calor por ciudad, arcos, a lo sumo 3 tarjetas y nombres sin encimarse) y `CiudadKatuqEscena` (edificios con letrero, cajas, motos y camiones). Cámara automática en modo pantalla, tocar un comercio para entrar y "Repetir el día" de toda Katuq.
- [x] 5.11 Encuadre automático en `EscenaBase` (`ajustarAContenido`) para los mapas y la ciudad, y "Ampliar". La cámara de la ficha sigue al pedido o al mensajero. Revisión en 1440, 1024 y 390 px de ancho: el país completo y sin tapar.
- [x] 5.12 Mapa de demanda por departamento con su leyenda, anillos de alerta en torres y edificios, paneles flotantes con el encuadre que les deja espacio, y la marca "Con Opttia" en las escenas.
- [x] 5.13 Paneles flotantes "Lo próximo" y "Tu flota" sobre la escena de operación, con encuadre automático de la operación que les deje espacio, y "Ampliar" que los quita.
- [x] 5.14 Orbe de Opttia en las escenas: señala lo siguiente cada 16 s con anillo, rayo y burbuja; recorrido guiado (orbe o botón; automático cada 4 min en modo pantalla; se corta al arrastrar, al abrir una ficha o al repetir); vuela a la respuesta de una pregunta ("Verlo en la escena"); destello con los pedidos "Con Opttia"; marca de tarjeta en el muro y el tablero; "reducir movimiento" sin vuelo.

## 6. Encendido y cierre

- [ ] 6.1 Desplegar el backend primero y confirmar que todos los roles reciben `disponible:false`.
- [ ] 6.2 Publicar el frontend y encender "En vivo" en Roles de FLORECER y ALMARA FELICIDAD (lo hace Daniel o se hace con su OK).
- [ ] 6.3 Prueba en FLORECER con pedidos de demo: llegada, cada cambio de etapa, salida en moto y en camión, entrega, cancelación, reconexión, modo pantalla y repetición. Capturas como evidencia.
- [ ] 6.3b Prueba con una sesión de Julsmind: toda Katuq, entrar a FLORECER y volver, la ficha desde la lista general y "ocultar comercios y montos". Una sesión de ALMARA con `company: Julsmind` recibe 403. Capturas como evidencia.
- [x] 6.4 Registrar en `specs/CONTRACT.md` el cierre de D-386 con la medición y la bitácora.
- [ ] 6.5 30 días después de encenderlo para todos, retirar `EN_VIVO_HABILITADO` (Art. XII).
