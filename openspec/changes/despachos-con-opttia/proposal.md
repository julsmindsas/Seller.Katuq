## Why

Daniel (13-oct): "quiero tener un apartado aquí mismo [En vivo] donde Opttia tenga un poco más de autonomía, como organizar despachos automáticos al comercio según su integración, si tiene mensajeros, y que el usuario solo apruebe. Y revisa si hace falta cosas en los MCP para que esto pase." Y después: "es hacerlo genérico para futuros comercios".

Por eso el cambio es **un solo motor para todo comercio, actual o futuro**. Nada se programa ni se ajusta a mano para un comercio en particular. Cada comercio tiene un **perfil de despacho** que se detecta solo con sus datos: si tiene mensajeros, qué integración logística tiene conectada, de qué tamaño arma sus grupos y qué franjas usa. Un comercio nuevo arranca con valores por defecto, y su perfil se ajusta a medida que despacha.

Lo que hoy pasa en producción muestra el problema y fija las reglas. Se midió el 13-oct, en solo lectura, sobre los últimos 30 días. Los comercios se nombran solo como evidencia, no como casos especiales:

- **Los comercios que despachan arman todo a mano, y nada sale solo.**
  - **Con mensajeros propios (ALMARA):**
    - 274 órdenes de despacho con 998 pedidos, unas 9 órdenes y 34 pedidos al día;
    - salen unos 4 mensajeros al día, con cerca de 9 pedidos cada uno;
    - las olas tienen mediana de 6 pedidos y el 10 % más grande llega a 14.
  - **Por transportadora (OH MY STORE con Osmosis y Fullpi, CAFÉ ESCOBAR con Partners Logistics):** 512 órdenes, una por pedido. El envío automático que existe está apagado: en 52 de 60 pedidos revisados de OH MY STORE, el envío salió después de que una persona creara la orden en la pantalla.
  - **Mismo día:** 1.507 de 1.514 pedidos despachados salieron el día de su fecha de entrega.
- **El trabajo es repetitivo:**
  - **Con mensajeros:** filtrar por fechas, escoger pedidos, crear la orden, buscar al mensajero en una lista con todos y despachar. Unas 9 veces al día.
  - **Con transportadora:** crear una orden de envío por cada pedido y mandarla. Más de 12 veces al día.
- **Las señales disponibles son débiles, y el motor tiene que funcionar con ellas:**
  - **Reglas y zonas:** no hay ninguna regla de despacho guardada en Katuq, y ningún mensajero tiene zonas asignadas.
  - **Mensajero por zona:** a lo largo de 30 días, el mensajero más frecuente de cada zona se lleva solo el 38 % de sus pedidos. Dentro del mismo día sí se repite: el 71 % de las zonas del día salió con un solo mensajero.
  - **Disponibilidad y ubicación:** el estado "en línea" casi nunca se apaga, pocas apps están conectadas a la vez y casi ningún pedido trae coordenadas.
  - **Lo que sí sirve:** casi todos los pedidos traen zona de cobro y franja de entrega.
- **Hay pedidos atascados que no son despachos:** cientos de pedidos de más de 60 días siguen marcados como listos, y en un comercio la mayoría de los listos son para recoger en tienda. El plan no debe tratar de despacharlos.
- **Las herramientas MCP de despacho que escriben no siguen el camino de la pantalla**, así que no le sirven a Opttia para despachar. El detalle está en el design y en el repo del backend.

## What Changes

- **Perfil de despacho por comercio, detectado solo.**
  - **Qué detecta:**
    - el modo: mensajeros, transportadora, ambos o todavía ninguno;
    - los mensajeros activos;
    - las integraciones logísticas activas;
    - el tamaño de grupo habitual;
    - las franjas, leídas de cualquier texto.
  - **Sin configuración:** no hace falta configurar nada. Si el comercio tiene reglas de despacho guardadas, esas mandan.
  - **Visible:** la vista lo muestra en una línea, para que se entienda de dónde salen las sugerencias.
- **Vista "Despachos" dentro de En vivo**, como cuarta vista del comercio, junto a Mi operación, Mi país y Pedidos. Es la misma para todos los comercios; solo aparecen las secciones que aplican a cada perfil. Muestra el plan del momento:
  - grupos por zona y franja con el mensajero sugerido y la razón;
  - grupos por transportadora;
  - lo que ya va en un envío automático, si el comercio lo tiene encendido;
  - lo que no entra al plan, con la razón: recoger en tienda, sin zona, ya en una orden, fecha vencida, pago no apto o falta un dato.
- **El plan lo arma el servidor con reglas fijas; Opttia lo explica.**
  - El código decide los grupos y las sugerencias.
  - Opttia redacta el resumen y los avisos, por ejemplo "la franja de la mañana vence en 40 minutos y quedan 6 pedidos".
  - Lo que Opttia diga y no salga de los datos se descarta, con la misma regla de D-401 y D-404. Opttia nunca asigna por su cuenta.
- **La persona aprueba.**
  - **Qué puede hacer:** aprobar un grupo o todo, cambiar el mensajero o la transportadora de un grupo, sacar un pedido o pasarlo a otro grupo.
  - **Qué hace "Aprobar":** lo mismo que la pantalla de Despachos. Con mensajero es "Guardar y despachar": la orden con su consecutivo, el pedido en Despachado, el aviso al cliente y el historial con quién aprobó. Además, al mensajero le llega un aviso para que su app se actualice. Con transportadora es el mismo envío que se crea desde la pantalla.
  - **Sin duplicados:** repetir la aprobación no duplica nada. Si un pedido cambió desde que se armó el plan, queda por fuera y se dice por qué.
- **Opttia toma la iniciativa sin escribir nada.** Cuando hay pedidos listos, la narración y el orbe de En vivo avisan "Hay 14 pedidos listos; armo el plan en Despachos" y señalan la vista. El aviso sale de los datos que En vivo ya tiene, y el plan se arma al abrir la vista. Nada se despacha sin la aprobación de una persona.
- **Transportadoras por la capa común de proveedores** (segunda fase, Artículo VI).
  - **Qué declara cada adaptador:** si cotiza, qué datos exige y si garantiza un solo envío por pedido.
  - **Sin reglas por nombre:** el plan no tiene reglas para una transportadora con nombre propio.
  - **Requisito para entrar:** solo se ofrece una transportadora que garantice no duplicar envíos (Artículo IV). Una nueva entra cuando su adaptador hace esas declaraciones y pasa las pruebas.
- **Opttia por chat (Katuq, Telegram).** La persona puede pedir el plan y aprobarlo con un botón. La aprobación nunca se toma del texto que escribe el modelo. Las herramientas MCP nuevas y el arreglo de las actuales van en un cambio del repo privado del backend, que es prerrequisito para encender la función.
- **Bandera por comercio `despachosOpttia`.** Nace apagada y se enciende comercio por comercio, siempre con el mismo motor. Antes de encenderla en un comercio con historia corre un ensayo en sombra sobre sus últimos 14 días. El orden de encendido está en las tareas.

## Capabilities

### New Capabilities
- `perfil-de-despacho`: cómo se detecta solo, con los datos de cada comercio, su forma de despachar y qué valores usa un comercio nuevo.
- `plan-de-despachos`: qué pedidos entran al plan y cuáles no, cómo se agrupan, cómo se sugiere el mensajero, qué va en un envío automático y cuándo el plan se vuelve viejo.
- `aprobar-plan-de-despachos`: quién aprueba, qué se puede ajustar, qué escribe al aprobar (el mismo efecto que la pantalla de Despachos), qué hace con un pedido que cambió y cómo evita duplicados.
- `despachos-en-vivo`: la vista dentro de En vivo, quién la ve, cuándo se esconde, los avisos de Opttia y su diseño.
- `opttia-plan-de-despachos`: el papel de Opttia (explicar y avisar, nunca asignar), su tope de gasto y la aprobación desde los canales de chat.
- `plan-con-transportadora`: la segunda fase, con cualquier transportadora conectada, la tarifa y el envío sin duplicados.

### Modified Capabilities
- Ninguna archivada. Al archivar `tablero-en-vivo`, su requisito "Solo lectura" debe nombrar la excepción: la vista Despachos escribe solo al aprobar y por su propia ruta. Queda anotado en `despachos-en-vivo` y en D-410.

## Impact

- **Backend** (`katuq_admin_back_firebase`):
  - **Lo nuevo:** el perfil y el plan, en un servicio aparte de `services/enVivo/` para que En vivo siga sin escribir. Una ruta para leer el plan y otra para aprobarlo.
  - **Lo que se extrae:** la lógica de crear y despachar una orden de envío sale de `controllers/logistica.js` a un servicio que usan la pantalla y el plan. La pantalla debe seguir haciendo exactamente lo mismo, y lo prueban pruebas de caracterización.
  - **Capacidades de proveedor:** las integraciones logísticas declaran sus capacidades en la capa de proveedores (`services/logisticsManager.js`).
  - **Reutiliza:**
    - la normalización de ciudad y los tramos de `services/logistics/dispatchInsights.js` (D-404);
    - `pedirJsonAOpttia` con la validación compartida;
    - el push que la app del mensajero ya entiende.
- **Front** (`Seller.Katuq`):
  - una vista y sus componentes en `components/en-vivo/`, con un servicio que extiende `BaseService`;
  - la opción nueva en el selector de vistas;
  - la bandera en `company-features.service.ts`.
- **MCP y ADK:** herramientas nuevas para leer y aprobar el plan, y retiro o arreglo de las cuatro de despacho que escriben. Va en el repo privado del backend.
- **Datos:**
  - **Sin colecciones nuevas:** ni el perfil ni el plan se guardan. Lo que queda es la orden de envío, el historial del pedido y la auditoría que ya existen.
  - **Write-set:** `shipping_orders`, `orders` (estado de despacho, mensajero, orden y fecha de despacho) y `order_status_history`. Con transportadora, además lo mismo que escribe hoy el envío desde la pantalla.
  - **Nunca escribe:** productos, precios, inventario, configuraciones de integración, mensajeros ni reglas de despacho. Lo cuida una prueba de contrato.
- **Módulos sensibles:** `orders` y el consecutivo `nroShippingOrder`. Un cambio a la vez, y el diff se aprueba antes de aplicarlo.
- **App del mensajero:** sin cambios. Ve el despacho igual que si lo hubiera hecho la pantalla. En iOS hoy no llega ningún push, por un desajuste de nombres al registrar el teléfono; se arregla aparte.

## No-goals

- **Ajustes por comercio en el código:** no hay umbrales, listas de franjas ni reglas especiales por comercio. Todo sale del perfil o de las reglas que el propio comercio guarde.
- **Aprobar solo:** no hay aprobación automática, ni siquiera de lo que la persona siempre aprueba igual. Si se pide, va en otra propuesta.
- **Rutas con mapa:** no se ordenan las paradas por mapa, porque casi ningún pedido trae coordenadas. La app del mensajero ya ordena la ruta en el teléfono.
- **Pantalla de Despachos, app del mensajero y envíos automáticos:** no cambian lo que hacen. El plan no prende, no apaga ni reemplaza un envío automático.
- **Pedidos viejos o para recoger:** el plan no los cierra ni los limpia. Los muestra aparte, como ya lo hace D-404.
- **Disponibilidad del mensajero:** no se corrige que el estado "en línea" no se apague. El plan usa señales mejores: actividad del día y app conectada.
- **Pantalla de reglas por zona:** no se hace. Las reglas guardadas se respetan.
- **Venta asistida, POS y tiendas:** no cambian.

## Riesgos (módulos sensibles)

- **Despachar mal un pedido:** se manda a un mensajero que no está o sale un pedido que no debía. Lo contienen:
  - la aprobación humana;
  - la validación del pedido justo antes de escribir;
  - el ensayo en sombra;
  - el encendido comercio por comercio.
- **Duplicados:** dos personas aprueban a la vez o la red reintenta. La aprobación es idempotente por grupo y el consecutivo se toma dentro de la transacción.
- **Diferencias con la pantalla:** si el plan escribe distinto, el mensajero no ve el pedido o el cliente no recibe el aviso. Por eso se usa el mismo servicio que la pantalla y se prueba que la pantalla no cambió.
- **Perfil equivocado:** si un comercio tiene poca historia o datos raros, las sugerencias pueden ser malas. Lo contienen la línea visible del perfil, los valores por defecto y que la persona siempre puede cambiar la sugerencia.
- **Gasto de Opttia:** una explicación por plan distinto, con tope por comercio. Si Opttia no responde, el plan se muestra sin texto.
- **Seguridad:** antes de encender la función hay que corregir varias cosas en las escrituras de despacho y en el acceso de Opttia. Están en el repo privado del backend, porque este repo es público.

## Verificación contra la constitución

- **I:** esta propuesta.
- **IV:** idempotencia por grupo, y un solo envío por pedido con transportadora.
- **VI:** las transportadoras entran por la capa común de proveedores, sin `if` por proveedor en la vista ni en el plan.
- **VII:** el historial guarda quién aprobó y el resultado de cada grupo.
- **VIII:** pruebas de contrato de las rutas nuevas y del write-set.
- **IX:** servicio con `BaseService`, componentes nuevos OnPush y carga diferida. Signals y `@if` no aplican en Angular 14.
- **XI:** a Opttia no le llegan nombres, teléfonos ni direcciones de clientes.
- **XII:** la bandera `despachosOpttia` tiene como dueño a Daniel y se retira 30 días después de encenderla para todos.
- **XIII:** cada spec cabe en 3 páginas.
- **XIV:** D-410.
- **XV:** no aplica, porque no se escriben integraciones.
