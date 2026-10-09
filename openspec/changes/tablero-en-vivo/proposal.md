## Why

Hoy un comercio se entera de lo que pasa en su operación entrando a Pedidos o a Despachos y refrescando. La bienvenida (D-351/D-352) muestra la foto del día, pero quieta: nada se mueve cuando entra un pedido, cuando cambia de estado o cuando sale con el mensajero. Tampoco existe una forma de ver a todos los comercios de Katuq operando a la vez.

Daniel lo pidió el 2026-10-08, en ocho mensajes:
1. "Un super dashboard parecido al del welcome pero más interactivo y en tiempo real, que anime cuando llega un pedido, cuando cambie de estado, cuando salga de un mensajero… super wow para mis clientes, no escatimes en nada."
2. "Necesito que sea por comercio y también en general, que yo vea todos los comercios de Katuq operando en un super dashboard."
3. "El mapa de la animación debe ser más amplio."
4. "Ponles interactividad, que cuando le dé clic a un pedido pueda ver detalles."
5. "Está muy apretado el super usuario… hazlo más grande y vistoso, hay que alardear más, más funcionalidades que entreguen valor."
6. "Ponle algo de inteligencia artificial."
7. "Mejoraste el super admin, haz algo para el comercio así también, parecido."
8. "Quiero que la IA Opttia tenga incidencia en el gráfico animado."

Se registra como **D-386** (numerada antes D-378, que quedó para otra decisión).

El dato del código que define el diseño: **ningún campo de "última actualización" lo escriben todos los caminos** que cambian un pedido.
- La app de mensajeros, Envíame, los flows y el picking cambian `estadoProceso` sin fecha.
- `order_status_history` tampoco cubre todos los caminos.
- La campana (D-338) depende de las preferencias de cada usuario y no avisa de EnDespacho, el despacho masivo, Shopify ni Envíame.

La única fuente completa es **el documento del pedido**: hay que mirar sus cambios, no esperar a que cada camino avise.

## What Changes

- **Pantalla "En vivo" por comercio** (ruta propia, módulo lazy), pensada también para un televisor:
  - **Cifras del día que se animan**, con las mismas ventas que la bienvenida.
  - **Escena 3D "Mi operación":** la caja del pedido cae al llegar, viaja por la banda entre estaciones, sale en moto o camión y llega a la casa del cliente.
  - **"Mi país":** el mapa de Colombia con pulsos y arcos. El país llena el recuadro y "Ampliar" le da todo el ancho a la escena.
  - **"Lo que está pasando"**, ventas por hora contra ayer, pedidos por canal, flota y celebraciones.
  - **Modo pantalla** con "ocultar clientes y montos", sonido opcional (apagado por defecto) y "Repetir el día".
  - Sin WebGL o con "reducir movimiento" quedan las cifras, la lista y la gráfica.
  - **Centro de mando del comercio** (como el de toda Katuq, pero suyo):
    - ventas en grande con proyección contra su récord y el pulso de su tienda;
    - **"Lo próximo"** sobre la escena: el pedido listo hace rato (con el mensajero libre que lo puede llevar), el demorado en su etapa, el que no ha pagado y el mensajero que lleva mucho en la calle;
    - **"Tu flota"** en vivo;
    - la vista **"Pedidos"**, un tablero por etapas cuyas tarjetas se mueven solas;
    - sus tiempos frente a la mediana de Katuq (sin nombrar a nadie) y sus productos estrella.
- **Vista "Toda Katuq"** (solo sesiones de Julsmind, por el token):
  - Cifras de la plataforma: ventas, pedidos, comercios vendiendo, pedidos por minuto, en camino y entregados.
  - Dos escenas: **Colombia**, con una torre por comercio, y **Comercios**, una ciudad con un edificio por comercio. Cada pedido, salida o entrega se ve sobre su comercio.
  - La carrera de los 8 que más venden, una cinta con todos, las ciudades de destino y la lista de eventos de todos los comercios.
  - Tocar un comercio abre su tablero en solo lectura, con "Toda Katuq" para volver.
  - Cámara automática en modo pantalla y "ocultar comercios y montos".
  - **Centro de mando a pantalla completa:**
    - las ventas del día en grande, con cifras que ruedan, la proyección al cierre contra el récord y un mini gráfico por hora;
    - el **pulso de Katuq**, una línea tipo electrocardiograma que late con cada pedido;
    - el comercio del momento y la carrera flotando sobre la escena, y el mapa teñido por departamento según la demanda.
  - **Radar de atención:** quién necesita ayuda ya (pedidos atascados, un silencio raro para su ritmo, rechazos) y quién está en racha (oportunidad comercial), con una sugerencia y la entrada a su tablero. Las torres y las tarjetas de esos comercios se marcan.
  - **Muro de comercios:** una tarjeta en vivo por comercio, con barras por hora, último evento y estado.
  - **Tiempos de la operación** (preparación, espera, entrega y ciclo completo), canales de toda Katuq y récords del día.
- **Opttia en la pantalla (IA):**
  - **Resumen en palabras** de lo que está pasando, en toda Katuq y en cada comercio. Para el comercio, por ejemplo, qué despachar primero y qué mensajero está libre.
  - **Preguntas en lenguaje natural** sobre lo que se ve, con acciones que abren el tablero, la lista o la ficha.
  - **Narración en vivo** sobre la escena.
  - **Opttia dentro de la escena 3D:** un orbe que vuela a lo urgente y lo señala con su sugerencia, guía un recorrido con la cámara y muestra en la escena la respuesta de cada pregunta.
  - **"Vendido con Opttia":** los pedidos que nacieron de una cotización armada por el bot de WhatsApp.
  - Todo pasa por Opttia (ADK) y no se le envían datos de clientes. Los resúmenes se comparten entre pantallas, con tope de frecuencia y de preguntas por usuario.
- **Ficha al tocar:**
  - **Un pedido** (caja, evento o fila) abre su ficha: cliente corto, monto, canal, pago, mensajero, el recorrido de hoy con horas y los productos. La ficha se actualiza sola y la cámara sigue al pedido.
  - **Cifras, etapas, ciudades y canales** abren la lista de esos pedidos.
  - **Un mensajero** abre lo que lleva.
- **Backend, solo lectura,** bajo `/v1/analytics/en-vivo`:
  - `foto` y `stream` (SSE autenticado) del comercio. Con `?empresa=` solo para sesiones de Julsmind.
  - `global/foto` y `global/stream` de toda Katuq.
  - `pedido/:id`: el detalle de la ficha.
  - Un **detector por empresa** compara cada cambio de los pedidos recientes contra su versión anterior. Un **observador de plataforma** hace lo mismo con los pedidos de todas las empresas desde ayer. Ninguno toca los caminos de escritura.
- **Encendido:**
  - La pantalla del comercio se enciende con la entrada `en-vivo` en el menú del rol (la misma llave única que D-354). Nace apagada; el piloto es en FLORECER y ALMARA FELICIDAD.
  - "Katuq en vivo" va en el menú que solo ven los administradores de Julsmind.

## Capabilities

### New Capabilities
- `tablero-en-vivo`: pantalla del comercio, cifras, escena de operación, mapa, lista, gráfica, celebraciones, modo pantalla, privacidad, sonido, repetición, accesibilidad y encendido por rol.
- `centro-comercio-en-vivo`: héroe del comercio, atención ahora y lo próximo, tablero de pedidos, tiempos frente a Katuq, productos estrella y paneles sobre la escena.
- `tablero-en-vivo-plataforma`: vista de toda Katuq (acceso por el token, cifras, escenas, carrera, cinta, entrar a un comercio, privacidad y observador de plataforma).
- `ficha-en-vivo`: fichas de pedido, de grupos y de mensajero; detalle con datos mínimos.
- `radar-en-vivo`: radar de atención, tiempos de la operación, proyección y récords, y muro de comercios.
- `opttia-en-vivo`: resumen, preguntas, narración y "Vendido con Opttia", sin datos de clientes y con gasto acotado.
- `eventos-pedidos-en-vivo`: detección de eventos por empresa, foto inicial, canal autenticado, alcance D-349, reconexión y límites de carga.

### Modified Capabilities
- (ninguna: no cambia el comportamiento de Pedidos, Despachos, la bienvenida, la consola de plataforma ni la campana)

## Impact

- **Frontend (Seller):**
  - Módulo nuevo `components/en-vivo/`, con componentes chicos por responsabilidad y servicios que extienden `BaseService`. Lleva las subcarpetas `plataforma/` y `ficha/`.
  - Entradas en `nav.service.ts`: "En vivo" en "Operaciones", y "Katuq en vivo" como `isOnlyAdmin`.
  - Escenas sobre `shared/escena-3d/escena-base.ts`, con un encuadre automático nuevo en la base. El mapa de Colombia pasa a `shared/escena-3d/`, como se hizo con la base en D-353, y la bienvenida solo cambia la ruta del import.
  - three ^0.180 ya está; no hay dependencias nuevas.
- **Backend:**
  - Módulo `services/enVivo/`: detector, distribución por empresa, plataforma, cifras, proyección y detalle.
  - Router `analyticsEnVivo` con `auth` + `requireJwtTenant`. El candado de plataforma usa la empresa del token, igual que `getTicketsResumen`, **nunca el encabezado `company`** (ver el bug 5 de D-386).
  - Reusa `salesMetricOrder`, `metricasPropias` (D-349), `ubicacionPedido` y los filtros de cancelados.
  - **IA:** usa `services/ai/opttiaJson.js` (`pedirJsonAOpttia`, `/api/ai/json` del ADK). No hay llamadas directas a un modelo ni flows nuevos en Genkit (D-257).
    - Gasto esperado: hasta 4 resúmenes por hora para toda Katuq y 2 por hora por cada comercio con pantallas abiertas, más las preguntas (tope de 20 por usuario por hora).
  - **"Vendido con Opttia":** el pedido convertido trae `cotizacionOrigen`, y la cotización trae `origen: "whatsapp-bot"`. Es una lectura por pedido convertido, guardada en memoria.
  - **Récords de 90 días:** consultas de conteo por día, una vez al día, en memoria. No se guarda nada.
  - **Write-set: ninguno.** No escribe `orders`, `inventory`, `inventoryMovement`, `products`, precios, listas de precios ni Realtime DB.
  - No crea colecciones ni índices: usa `company + fechaCreacion` y el índice simple de `fechaCreacion`.
  - El apagado ordenado del servidor cierra los streams (cambio aditivo en `index.js`).
- **Datos:** ninguno. El encendido se hace en Roles; si se hace por script, con `--dry-run` primero.
- **Módulos sensibles:** `orders` se lee y nunca se escribe.
  - Riesgo principal: la memoria y las lecturas de los observadores en un servidor de una sola instancia (pm2 fork). El de plataforma ve todas las empresas.
  - Mitigación: medición previa con compuerta, observadores que solo viven con pantallas abiertas, ventanas cortas, tope de empresas y respaldo por consulta periódica.
  - Riesgo de privacidad: la pantalla puede estar en un televisor a la vista del público. Va con datos mínimos, sin clientes en la vista de toda Katuq, y con todo ocultable en modo pantalla.
- **No-goals:**
  - Ubicación GPS en vivo de los mensajeros: depende de la rama `feature/rastreo-mensajeros` y del hueco `mapa-despachos-seguro-por-empresa`.
  - Operar desde la pantalla (cambiar estados, despachar): es del centro de operaciones (D-354).
  - Mostrar la vista de toda Katuq a los comercios.
  - Que Opttia actúe desde la pantalla (escribir al comercio, despachar, abrir tickets): solo sugiere, y las personas deciden.
  - Avisos push o por correo, inventario, cambiar la campana u `order_status_history` y notificar a clientes finales.
  - Arreglar los candados de plataforma que le creen al encabezado (bug 5 de D-386): va en un cambio aparte.
