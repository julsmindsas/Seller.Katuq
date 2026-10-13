## Context

La motivación está en proposal.md. Aquí va el estado actual que define el enfoque. Las mediciones del 13-oct se hicieron en solo lectura.

**En vivo (D-386)**
- **Shell y vistas:** `components/en-vivo/en-vivo.component.ts` es OnPush, con slots y selector de vistas. Las vistas del comercio están en `OPCIONES` (`paginas/en-vivo-comercio-pagina.component.ts:20-24`) y la página las pinta con `ngSwitch`. La vista Pedidos, `comercio/tablero-pedidos`, no tiene paneles flotantes. La comunicación entre piezas pasa por `EnVivoInteraccionService`.
- **Backend:** `routers/analyticsEnVivo.js` tiene 6 rutas, todas de lectura, con `auth` y `requireJwtTenant`. Hay un listener por empresa sobre `orders` de los últimos 7 días (`services/enVivo/distribuidor.js`) y "Tu flota" son solo los nombres de `transportadores`.
- **Candados de solo lectura:**
  - `tests/enVivo/writeset.contract.test.js` exige 0 escrituras y 0 lecturas de Realtime DB en `services/enVivo/`, y solo permite 6 colecciones.
  - `rutas.contract.test.js` fija exactamente esas 6 rutas.
  - El plan, por lo tanto, no puede vivir ahí.
- **Opttia en En vivo:** un resumen compartido por empresa cada 30 minutos y 20 preguntas por hora por persona. La validación descarta números que no estén en la entrada (`services/enVivo/opttia.js`).

**Cómo se despacha hoy**
- **Con mensajero ("Guardar y despachar"):**
  - `POST /v1/logistica/shippingorders/create` (`controllers/logistica.js:1077`) crea la orden en una transacción, con el consecutivo como el máximo de la empresa más 1, y deja los pedidos en EnDespacho.
  - Después, `POST /shippingorders/dispatch` (`:1653`) pasa cada pedido por `orders.updateOrderInternal`. Esa función aplica las transiciones, la cancelación por WhatsApp (D-396), el historial y el aviso al cliente por correo y SMS.
- **Con transportadora:** misma orden, luego `POST /v1/logistics/shipments` (`controllers/logisticsIntegrations.js:1418-1551`) → `LogisticsManager.createShipment`, que deja guía y etiqueta en el pedido.
- **Despacho Express y despacho en lote:** el despacho en lote (`logistica.js:2948`) escribe `orders` sin `updateOrderInternal`, así que no hay aviso al cliente y el historial queda con `previousStatus: "pre-dispatch"`. No se usó en los últimos 7 días.
- **App del mensajero:** lista los pedidos de `orders` con `transportador` igual a su nombre en texto, en Despachado y con `fechaEntrega` de hoy, y solo si el mensajero está en línea. No lee `shipping_orders`. Recarga su lista con el push `order_modified`.
- **Campo `despachador`:** la pantalla de pedidos lee `despachador.name`.

**Señales medidas**
- **Zona y franja:** en el comercio con mensajeros, 996 de 998 pedidos traen zona de cobro y todos traen franja de entrega como texto. Las franjas se ven así: "EN LA MAÑANA 7:00AM A 10:00", "EN LA TARDE DE 2:00PM A 5…".
- **Coordenadas:** solo 23 de 350 pedidos listos las traen.
- **Disponibilidad:**
  - `estadoDisponibilidad` sigue "online" en 19 de 21 mensajeros;
  - `ultimaActualizacion` es de hoy solo en 2 de 21;
  - en Realtime DB `active_users`, la clave es `nombres_apellidos_empresa` normalizada; iOS además quita las tildes.
- **Mensajero por zona:** el más frecuente se lleva el 38 % a 30 días; en el mismo día, el 71 % de las zonas salió con un solo mensajero.
- **Capacidad:** `capacidadCarga` registrada es 1 (4 mensajeros), 5 (9), 10 (7) y 50 (1). Las órdenes con mensajero tienen en promedio 3,6 pedidos.
- **Integraciones:** viven en `integration_configs/{empresa}_{proveedor}`.
  - **Proveedores:** la capa de proveedores (`services/logisticsManager.js`) tiene Envíame, Prindel, Osmosis, Fullpi y Partners.
  - **Cotización:** cotizan Envíame y Partners; Prindel usa tarifa fija.
  - **Duplicados:**
    - Cereza tiene candado de un solo envío por pedido (`cerezaOrderDispatchService.js:462-521`);
    - Fullpi responde "ya existe" como éxito;
    - Prindel reintenta sin llave de idempotencia.
- **Reglas:** `dispatch_rules/{empresa}` existe con su sugeridor (`logistica.js:2716-2938`), pero no hay ningún documento en producción.

**MCP y ADK**
- **Herramientas de despacho que escriben:** `create_shipping_order`, `dispatch_shipping_order`, `assign_transporter` y `update_order_status` escriben directo en Firestore, sin el servicio de la pantalla. Lo que pasa hoy:
  - la orden no aparece en la lista, porque no escriben `fecha`;
  - el mensajero no ve el pedido, porque `transportador` queda como objeto;
  - no encuentran mensajeros, porque buscan `transportadores.nombre`;
  - no hay aviso al cliente ni transiciones.
- **ADK:** ya tiene confirmación humana (`request_confirmation`, `OPTTIA_WRITE_MODE`), pero su `dispatch_routes_hitl` termina en `assign_transporter`.
- El diagnóstico completo y lo de accesos está en el cambio privado del backend.

## Goals / Non-Goals

**Goals:**
- Un motor genérico: perfil y plan como funciones de los datos del comercio, sin ramas por comercio ni por proveedor.
- Que "Aprobar" haga exactamente lo que hace la pantalla, compartiendo código, no copiándolo.
- Que En vivo siga sin escribir fuera de la vista Despachos y de su ruta propia.
- Que el costo sea acotado: lecturas proyectadas, plan solo a pedido y una explicación de Opttia por plan distinto.

**Non-Goals:**
- Guardar planes o perfiles. No hay colección nueva; si hace falta un historial de planes, va en otra propuesta.
- Cambiar `updateOrderInternal`, las transiciones de estado o el consecutivo. El plan los usa como están.
- Arreglar los otros caminos de despacho (Despacho Express, despacho en lote). Quedan anotados.

## Decisions

### 1. El perfil y el plan son funciones puras sobre una lectura acotada
Se crea `services/despachos/`, fuera de `services/enVivo/`, con estas piezas:
- `leerDatosDelPlan({ db, rtdb, company, ahora })`: lectura con `select` de los campos necesarios. Lee:
  1. **Candidatos:** `orders` con `company == T`, `estadoProceso in [Empacado, ParaDespachar, ProducidoTotalmente]` y `fechaEntrega` desde hace 15 días.
  2. **Historia de 14 días:** `orders` con `company == T`, `estadoProceso in [Despachado, Entregado]` y `fechaEntrega` desde hace 14 días, solo con `transportador`, `envio.zonaCobro`, `envio.ciudad`, `fechaEntrega` y `shippingOrder`. De ahí salen la zona por mensajero, la carga de hoy y el tamaño de grupo (pedidos por `shippingOrder`).
  3. **Modo del comercio:** `shipping_orders` de 30 días con solo `metodoEnvio`, `transportador` y `fecha`, sin el arreglo `pedidos`, que es pesado.
  4. **Mensajeros:** `transportadores` de la empresa.
  5. **Integraciones:** las logísticas activas, por la capa de proveedores, más `dispatch_rules/{empresa}` si existe.
  6. **App conectada:** en Realtime DB, por mensajero, la clave calculada en las dos formas (con y sin tildes). No se lee el nodo entero.
- `calcularPerfil(datos)` y `armarPlan(datos, perfil, ahora)`: funciones puras, sin I/O y deterministas. La huella es un SHA-256 de los pedidos ordenados con `estadoProceso`, `estadoPago`, `shippingOrder` y `date_edit`, más el mensajero o proveedor y la franja de cada grupo.
- `franjas.js`: lee la franja de cualquier texto, con hora de inicio y de fin. Se prueba con todos los textos distintos que hoy existen en producción, de todas las empresas.
- **Índice nuevo:** las consultas 1 y 2 requieren `orders (company, estadoProceso, fechaEntrega)`. Se agrega a `firestore.indexes.json` y se crea antes del despliegue. Es el camino que pide la regla de "optimizar en origen".
- **Sin el índice:** la consulta 1 lee todos los listos (en un comercio, 350, de los que 322 son viejos).
- **Costo estimado:** unas 800 lecturas pequeñas por plan en el comercio más activo. El plan solo se arma cuando alguien abre la vista o actualiza.

*Alternativas descartadas:*
- **Que el modelo arme el plan:** puede inventar, cuesta en cada consulta, y va contra la regla de D-401 y D-404.
- **El planificador del ADK (`plan_dispatch_routes`):** está en Python, depende de coordenadas que casi no existen y dejaría dos fuentes distintas para la vista y el chat.
- **Usar la proyección en memoria de En vivo:** no tiene pago, forma de entrega ni orden de envío, y obligaría a que En vivo lea más.

### 2. Una sola implementación de "crear y despachar", compartida con la pantalla
La lógica de `createAndEditShippingOrder` y `dispatchShippingOrder` pasa a `services/despachos/ordenesDeEnvio.js` con dos funciones:
- `crearOrdenDeEnvio({ company, actor, payload })`;
- `despacharOrdenDeEnvio({ company, actor, ordenId, pedidos })`.

Los controladores quedan como envolturas: leen el request, llaman al servicio y responden igual que hoy.

- **Antes de mover nada:** pruebas de caracterización sobre una base simulada. Con el mismo request deben salir las mismas escrituras y la misma respuesta. Se escriben primero y deben pasar antes y después del cambio.
- **Datos del pedido que usa el plan:** los que el servidor acaba de leer, más los campos de despacho. Nunca una copia que mande el cliente.
- **`despachador`:** el plan escribe `{ name, email }` de quien aprobó, porque la pantalla de pedidos lee `despachador.name`. No guarda la sesión. Que la pantalla siga guardando la sesión es un tema aparte, en el repo privado.
- **`transportador`:** se escribe en texto, con `canonicalTransportadorName([nombres, apellidos])` (D-083), igual que lo busca la app.

*Alternativa descartada:* llamar a los controladores con un request falso. Es frágil, sigue tomando la empresa de la cabecera y amarra el plan a detalles de HTTP.

### 3. Aprobación idempotente sin colección nueva
- **Id de la orden:** la orden de envío de un grupo se crea con un id que sale de la huella: `plan-<sha256(company|huellaGrupo)[:24]>`.
- **Transacción:**
  1. si ese documento existe, se responde "ya aprobado por <correo> a las HH:MM" sin escribir nada;
  2. si no, se leen los pedidos con `transaction.get`, se validan contra la huella y el estado actual, y se saca de la lista el que cambió;
  3. se lee el consecutivo dentro de la transacción, igual que la pantalla;
  4. se escribe la orden en EnDespacho.
- **Después de la transacción:** se despacha con `despacharOrdenDeEnvio` (Despachado, aviso al cliente, historial) y se manda el push `order_modified` a cada mensajero, sin que un fallo del push frene nada.
- **Si el despacho se corta a mitad:** reaprobar encuentra la orden y continúa con los pedidos que siguen en EnDespacho.
- **Auditoría:**
  - en la orden: `origen: "plan-opttia"`, `aprobadoPor`, `planHuella` y `canal` (en-vivo, chat o telegram);
  - en el historial: el mismo `source` y la metadata, con el correo de quien aprobó.

*Alternativa descartada:* una colección `dispatch_plans`. Daría una bandeja de planes, pero la regla pide aprobación explícita para colecciones nuevas, y la idempotencia no la necesita.

### 4. Capacidades declaradas por cada proveedor logístico
Cada proveedor de la capa común expone `capacidades()`:

```
{ creaEnvio, cotiza: 'api' | 'fija' | null, unEnvioPorPedido: boolean,
  buscarEnvioExistente?: fn, datosRequeridos: [...] }
```

- **Por defecto:** sin declaración, el proveedor no se ofrece; falla cerrado.
- **Al aprobar por transportadora:** se crea la orden con id determinista y se llama al mismo servicio que usa `/v1/logistics/shipments`, ya extraído, con la empresa de la sesión firmada.
- **Primero en entrar:** Cereza declara `unEnvioPorPedido: true` con su candado existente.
- **Los demás:** entran cuando su adaptador lo garantice y pase la prueba. Una prueba de contrato simula una respuesta perdida y verifica que no se cree un segundo envío.

### 5. Rutas propias, fuera de En vivo
`routers/despachosPlan.js`, montado en `/v1/logistica/plan`:
- `GET /`: el plan y el perfil.
- `POST /explicar`: el texto de Opttia para una huella. El servidor recalcula los números y no confía en lo que mande el cliente.
- `POST /aprobar`: con `{ grupos: [{ huella, pedidos: [ids], transportadorId | proveedor }] }`.

Middlewares:
- `auth` y `requireJwtTenant`;
- la bandera por empresa `despachosOpttia`, con el contrato de `companyFeatureFlags.js`;
- el interruptor general `DESPACHOS_OPTTIA_HABILITADO`;
- en `POST /aprobar`, además, `puedeDespachar`: el rol tiene `path: "despachos"` en sus menús (misma búsqueda que `rolTieneMenu`) o es de la familia Administrador. `POST /aprobar` se clasifica como escritura en `middleware/soloLectura.js`.

*Por qué el menú y no `permissions.despachos`:* en producción ningún rol tiene `permissions.despachos`. Con el permiso fino, nadie podría aprobar; el menú es lo que hoy deja despachar.

### 6. Opttia explica con la regla de siempre
- **Prompt:** `services/ai/prompts/planDespachosPrompt.js`, por `pedirJsonAOpttia`.
- **Entrada:** solo cifras del plan y del perfil, nombres de pila de los mensajeros (como ya hace En vivo) y las alertas calculadas. Nada de clientes.
- **Validación:** `services/ai/frasesVerificadas.js` (D-404).
- **Una explicación por huella:** se guarda en memoria del proceso 10 minutos, con el mismo criterio que el resumen compartido de En vivo. El tope es una llamada cada 10 minutos por empresa, con 20 segundos de espera. Sin texto, el plan se muestra igual.

### 7. Front: una vista más en En vivo
- **Archivos:** `components/en-vivo/comercio/despachos/` con:
  - `en-vivo-despachos.component` (contenedor);
  - `grupo-despacho.component`;
  - `fuera-del-plan.component`;
  - `perfil-despacho.component`.
  - Todos son OnPush.
- **Servicio:** `EnVivoPlanDespachosService extends BaseService`.
- **Opción en el selector:** la opción `despachos` se suma a `OPCIONES` solo cuando se cumplen las tres condiciones:
  - la bandera está encendida (`CompanyFeaturesService`);
  - la sesión no es de solo lectura;
  - la sesión no es `soloPropias`.
- **Botones de aprobar:** se desactivan en modo TV y durante "Repetir el día" (estado `repeticion`).
- **Plan viejo:** la vista escucha los eventos del SSE que ya llegan. Si uno toca un pedido del plan, lo marca "cambió" y ofrece actualizar.
- **Aviso proactivo:** sale con una plantilla en `EnVivoNarracionService`, con el conteo de pedidos de hoy listos que ya muestra "Lo próximo". El orbe apunta al selector.
- **Estado "aplicando":** la vista tiene su propio estado, porque el cargador general está suprimido, y los resultados salen por `aria-live`.
- **Estilo:** tema `_en-vivo-tema.scss`, plano y sin gradientes.

### 8. Ensayo en sombra antes de encender un comercio con historia
`scripts/plan-despachos-ensayo.js --empresa "<nombre>" --dias 14`, de solo lectura:
1. Por cada ola real (órdenes del mismo día y hora), reconstruye los candidatos de ese momento con el historial de estados.
2. Arma el plan con las señales que existían hasta esa hora y lo compara con lo que la persona hizo.

Mide:
- **Grupos:** el porcentaje de pedidos en el mismo grupo de zona y franja.
- **Mensajero:** el porcentaje con el mismo mensajero.
- **Transportadora:** el porcentaje con la misma transportadora.

Compuerta propuesta: grupos ≥ 70 %, mensajero ≥ 50 % y transportadora ≥ 90 %. Si no se cumple, se ajustan las reglas genéricas, nunca por comercio, y se repite. El script sirve igual para cualquier empresa.

### 9. MCP y ADK (cambio privado del backend)
- **Lectura del plan:** `get_dispatch_plan`, sobre el mismo servicio.
- **Pedir aprobación:** `request_dispatch_plan_approval` devuelve una tarjeta con un comprobante firmado por el servidor, de un solo uso y atado a empresa, persona y huella. Se canjea solo:
  - con un botón en Katuq, con la sesión de la persona;
  - o con el callback de Telegram, que valida el vínculo con una cuenta de Katuq y su permiso.
- **Herramientas actuales:** las cuatro que escriben se retiran o pasan al servicio compartido.
- **Lo demás** (alcances del OAuth por rol, autor real en el historial, listas de escritura del ADK) va en el repo privado.

## Risks / Trade-offs

- **[Consecutivo repetido si el plan y la pantalla crean órdenes a la vez]** → El mecanismo es el mismo de la pantalla, lectura del máximo dentro de la transacción, así que el riesgo es igual al de hoy. La prueba de concurrencia lo mide. Si aparece, se cambia el contador en los dos caminos a la vez, en otra propuesta.
- **[La extracción cambia la pantalla sin querer]** → Primero van las pruebas de caracterización. Se despliega sola, sin el plan, y se observa 2 días.
- **[Mensajero sin la app en línea]** → El plan lo excluye si está fuera de línea y avisa si la app no está conectada. La app no le mostraría los pedidos.
- **[Clave de Realtime DB que no coincide]** (nombres con tilde en iOS, homónimos) → Se prueban las dos formas. Si no aparece, la señal queda "sin dato", no "desconectado".
- **[Perfil con poca historia]** → Valores por defecto y la línea visible del perfil. La persona siempre puede cambiar la sugerencia.
- **[Huella sensible a `date_edit`]** → Cualquier cambio vuelve viejo el plan. Eso es lo buscado, aunque obliga a actualizar más seguido en horas de mucho movimiento.
- **[Texto de Opttia]** → Validación de frases y nada de datos de clientes. Sin respuesta, el plan sale sin texto.
- **[Transportadora que cobra por guía]** → Solo con aprobación, una guía por pedido y solo proveedores que lo garanticen.

## Migration Plan

1. Medición y ensayo en sombra, sin desplegar nada.
2. Extracción del servicio de órdenes de envío, con caracterización. Despliegue solo y 2 días de observación.
3. Índice `orders (company, estadoProceso, fechaEntrega)`. Perfil, plan y rutas con la bandera apagada en todas partes.
4. Front con la vista detrás de la bandera; se publica con `git pull` antes de compilar.
5. Cambio privado del MCP y de accesos, desplegado.
6. Encendido comercio por comercio, siempre con el mismo motor: primero el que más despacha con mensajeros, luego el que más despacha por transportadora, después los demás.

**Rollback:** se apaga la bandera de la empresa o el interruptor general, sin desplegar. Las órdenes ya creadas son iguales a las de la pantalla y siguen funcionando.

## Open Questions

- **Umbrales de la compuerta del ensayo** (70/50/90): se ajustan con el primer ensayo sin cambiar las specs.
- **Tope de 8 pedidos para comercios sin historia:** se confirma con el ensayo.
