## Context

- **Origen:** la motivación está en proposal.md. La propuesta completa (experiencia, las seis operaciones, arquitectura, seguridad y fases) se aprobó el 13-oct junto con el boceto interactivo: https://claude.ai/artifact/XVjArkR2s6cbpVXym7G6e2. Este design fija **solo la fase 1**. Las fases 2 a 4 tendrán su propio cambio y su design.
- **Estado de partida:**
  - D-410 está desplegado (front 2026.10.13.4) y su bandera `despachosOpttia` está encendida en FLORECER, OH MY STORE y ALMARA FELICIDAD.
  - La pestaña vive en `paginas/en-vivo-comercio-pagina.component.ts`: `OPCION_DESPACHOS`, `SIN_ESCENA` y la suscripción de la insignia. En el html está el `ngSwitchCase 'despachos'`.
  - La lógica de aprobar son métodos del componente `despachos/en-vivo-despachos.component.ts`: `paraAprobar`, `editable`, `conQuien`, la serie de `aprobarTodo` con `concatMap` y `takeWhile`, y `bloqueado`.
- **Lo que no puede cambiar:**
  - `services/enVivo/` del backend no escribe y tiene un read-set cerrado (`tests/enVivo/writeset.contract.test.js` y `rutas.contract.test.js`). Las propuestas viven fuera de ahí.
  - Las escenas se extienden solo por los ganchos aditivos de `EscenaBase` (`raiz`, `alCuadro`, `alTocar`), como el orbe.

## Goals / Non-Goals

**Goals:**
- Un contrato estable entre la tarjeta y la escena, para que la escena no sepa de HTTP ni de aprobar.
- Un motor de fuentes que reciba las operaciones de las fases 2 a 4 sin tocar la ruta ni el front.
- Cero escrituras nuevas. Despachar reutiliza D-410 tal cual.

**Non-Goals (fase 1):**
- la bandera por operación con modos apagado, sombra y encendido;
- `POST /v1/opttia/propuestas/:tipo/aprobar`;
- la señal `propuestas-version` en el canal en vivo;
- MCP y Telegram para propuestas.

## Decisions

1. **Contrato tarjeta ↔ escena, ya escrito y fijo:** `propuestas/propuestas.modelos.ts` y `propuestas/propuestas-escena.puente.ts` (`EnVivoPropuestaEscenaPuente`, root).
   - La tarjeta llama `mostrar(PropuestaEnEscena | null)` y `contar({ideas, urgentes})`.
   - La escena y el orbe leen `actual$` y `contador$`.
   - La escena llama `tocarGrupo(id)` y el botón del orbe, `pedirTarjeta()`.

   *Alternativa descartada:* que la escena use el servicio de propuestas. Acoplaría three.js a HTTP y a la aprobación.

2. **`GET /v1/opttia/propuestas` (backend, router `routers/opttiaPropuestas.js`):**
   - **Middleware:** `auth`, `requireJwtTenant`, el interruptor general `OPTTIA_PROPUESTAS_HABILITADO` (solo `"false"` apaga) y el interruptor de Opttia por empresa de D-386 (`services/enVivo/interruptorOpttia`), revisado en el servidor.
   - **Empresa:** sale siempre de `req.tenant`. La ruta ignora `?empresa=` y las cabeceras.
   - **Respuesta:** siempre 200. Si no aplica, `{ disponible:false, motivo }`, porque el interceptor del front convierte un 403 en "Límite de suscripción". La forma es `RespuestaPropuestas`, y `version` es la huella de toda la respuesta, para no repintar si nada cambió.

   *Alternativa descartada:* que el front pida `GET /v1/logistica/plan`. Ese plan solo trae despachos y no centraliza el acceso ni la caché de las otras fuentes.

3. **Motor `services/opttiaPropuestas/`.** Es un registro cerrado de fuentes, una por archivo en `fuentes/`, sin `if/else` por tipo. Cada fuente declara cuándo aplica, su ttl y `calcular(ctx)`, y es pura sobre lo que lee. En la fase 1 hay dos fuentes:
   - **despachos:**
     - aplica con la bandera `despachosOpttia` y `accesoPlan.puedeVer`;
     - envuelve `calcularPlanDeDespachos` y arma una propuesta por grupo, con `grupo` tal cual;
     - la escena lleva efecto `montones`, `veh` (el nombre del mensajero sugerido o null), `transportadora` y `color`;
     - es urgente si la franja del grupo es urgente o las alertas del plan la marcan por vencer o vencida; si no, es importante;
     - título, razón y consecuencias salen de plantillas;
     - `puedeAprobar` sale de `accesoPlan.puedeAprobar`;
     - la raíz `despachos` lleva `planHuella`, `puedeAprobar`, `mensajerosDisponibles`, `fueraDelPlan` y `envioAutomatico`.
   - **produccion (sombra):**
     - aplica solo con `isAdminFamilyRole` y `despachosOpttia`;
     - consulta acotada sobre el índice existente `orders (company, estadoProceso, fechaEntrega)`, con `estadoProceso == "SinProducir"` y la fecha de entrega desde hoy;
     - maneja los formatos de fecha igual que `leerDatosDelPlan.js` y filtra hoy o mañana con `diaColombia.js`, sin cancelados;
     - el perfil "usa producción" es una consulta con `limit 1` por un pedido en producción o producido en los últimos 90 días;
     - devuelve una sola propuesta con hasta 12 pedidos en la escena, `modo:'sombra'`, `puedeAprobar:false`, efecto `fila` y estación `recibido`.

     Ajusta la propuesta, que decía 30 días con caché de 24 h.

   El cobro **no** es una fuente del servidor en la fase 1. El front lo arma con `estado.radar.atencion` (tipo `sin_pago`), sin lecturas nuevas.

4. **Caché en memoria por empresa y fuente:**
   - 60 s para despachos y 5 min para producción;
   - **una** llamada en vuelo por empresa y fuente;
   - una función exportada la invalida, y el controlador de D-410 la llama tras aprobar;
   - cada respuesta trae, por fuente, `lecturas: { leidoEn, venceEn }` (fuera de `version`). El front solo quita la marca de "cambió" de una propuesta, o da por reflejado un cambio de pedidos listos, cuando lo leído es posterior; si salió de la memoria leída antes, vuelve a pedir cuando esta vence;
   - con D-410 en pausa (`DESPACHOS_OPTTIA_HABILITADO=false`) la fuente despachos no lee ni propone (misma regla que `/v1/logistica/plan`).

   Es una excepción acotada a "sin cache extra", con el mismo patrón de `services/enVivo/ia.js`. Cada plan cuesta unas 450 lecturas, y varias pantallas del mismo comercio (TV y celulares) lo multiplicarían. No es una capa nueva de infraestructura: deduplica lecturas idénticas por poco tiempo. La aprobación sigue releyendo y exigiendo la huella, así que una propuesta en caché nunca despacha algo que cambió.

5. **Ajustes pequeños en D-410:**
   - `CANALES` de `ejecutarPlan.js` suma `"escena"`;
   - `POST /aprobar` acepta del body solo `"en-vivo"` o `"escena"`, y cualquier otro valor queda en `"en-vivo"` (`"chat"` y `"telegram"` siguen siendo solo del canje);
   - `POST /explicar` revisa el interruptor de D-386, usa el plan que ya leyó el motor de propuestas cuando la huella coincide (no lo vuelve a armar) y deja una sola lectura y una sola llamada a Opttia en vuelo por empresa.

   La caché y la respuesta 200 en `GET /plan`, que estaban en la propuesta, quedan fuera de la fase 1: la escena ya no llama esa ruta. Cambia una línea del design de D-410: "el plan solo se arma cuando alguien abre la vista" pasa a "se arma por disparadores, con caché y solo con la escena visible".

6. **Front, módulo `propuestas/` (`EnVivoPropuestasModule`).** Es el único de En vivo que escribe.
   - **`EnVivoPropuestasService`** (root, `extends BaseService`, sin el cargador global):
     - estado `{cola, actual, aplicando, resultados, viejoPorGrupo, bloqueado}`;
     - la lógica de aprobar, extraída del componente de la pestaña sin cambiarla;
     - ejecutores en un mapa tipo → manejador: despachos va a `EnVivoPlanDespachosService.aprobar(grupos, 'escena')`, cobro a `abrir-pedido` y producción a null.
   - **`propuestas.reglas.ts`**, puro y probado con node:
     - orden de la cola;
     - "Después" y "No hoy" por huella, con `localStorage` dentro de try/catch;
     - vejez por grupo, sin contar los eventos de la repetición;
     - cuándo pedir;
     - el paso a `PropuestaEnEscena`;
     - las señales de cobro;
     - el saludo de plantilla.
   - **Componentes OnPush:**
     - `app-en-vivo-sugerencia`, la tarjeta, en `.ev-escena-slot` entre la narración y la ficha;
     - `app-en-vivo-sugerencia-ajuste`, la hoja. Reutiliza `grupo-despacho` y `fuera-del-plan`, que `EnVivoDespachosModule` ahora exporta.
   - **Cuándo se monta:** con `*ngIf` en las vistas operacion, pais y pedidos, con Opttia prendido, sin `soloLectura` ni `soloPropias`, sin `?empresa=` y con `disponible:true`.

7. **Cuándo pide el front:**
   - al abrir;
   - cuando cambian `contarListos` o `radar.atencion`;
   - con un evento de un pedido de una propuesta o un cambio hacia Empacado, ParaDespachar o ProducidoTotalmente, con 20 a 30 s de espera;
   - como respaldo, cada 5 min, y una vez después de aprobar.

   Pide solo con la pestaña del navegador y la escena visibles, nunca durante la repetición, y en TV a lo sumo cada 5 min.

8. **Escena y orbe (siguen de solo lectura):**
   - **`escenas/capa-propuesta.ts`:**
     - fantasmas con `InstancedMesh` y un material translúcido compartido;
     - anillos con los colores de `CHAQUETAS` y líneas punteadas fijas;
     - el atenuado al 40 % cambia la referencia a un material atenuado compartido por token, sin clonar uno por caja;
     - topes de 6 grupos y 40 fantasmas;
     - lee `posCaja(id)` en cada cuadro, sin guardar referencias a las cajas;
     - corre fuera de la zona de Angular.
   - **`OperacionEnVivoEscena`** gana `prepararVehiculo(nombre)`, que rotula una moto libre o, si no hay ninguna, deja la etiqueta en el montón con la línea hacia la salida. Gana también `posCasa(pedidoId)` para el cobro.
   - **Orbe:**
     - `EnVivoOrbeService` gana `proponer(p)` y `retirarPropuesta()`;
     - `GuiaOpttia` gana un estado "propuesta", con prioridad sobre la ronda;
     - `OrbeOpttia.senalar` gana un modo fijo.
   - **Mi país:** un arco persistente.
   - **Pedidos:** `usarMarcas('pedido')`.
   - **Márgenes:** suman `abajo` cuando la tarjeta está acoplada a 390 px.

9. **La pestaña se quita en el mismo despliegue que trae la tarjeta.** Salen `OPCION_DESPACHOS`, `'despachos'` de `SIN_ESCENA`, la suscripción de la insignia y el `ngSwitchCase`. La vista guardada `despachos` cae en `operacion`. `EnVivoDespachosComponent`, como vista completa, se borra cuando la fase 1 esté verificada en producción.

10. **Diseño.** Se aplica la regla de diseño Katuq de AGENTS.md con el tema de En vivo.
    - Las clases nuevas usan el prefijo `ev-sug`, y ninguna puede contener "p-". Ojo con nombres como `-top-`, `-chip-` o `-step-`.
    - Todo span de un `*ngIf` lleva color y tamaño propios.
    - `:focus-visible` con 3 px `#7C5CFF`.

## Risks / Trade-offs

- [La bandera ya está encendida donde aprobar manda pedidos reales a una integración] → La prueba de punta a punta se hace en FLORECER, con pedidos de prueba y antes de publicar el front. Además, dos toques con el efecto real y transportadoras de a una.
- [Quitar la pestaña deja sin dónde aprobar si la tarjeta falla] → Hay tres salidas:
  - la pantalla clásica de Despachos sigue igual;
  - el rollback es publicar otra vez la versión anterior del front;
  - el interruptor general apaga las propuestas sin desplegar.
- [Caché en memoria con más de una instancia] → Hoy el backend corre en una instancia. Si escala, la caché solo ahorra menos: no corrompe nada, porque aprobar relee y exige la huella.
- [Propuesta vieja después de aprobar] → La aprobación invalida la caché de esa empresa, y la vejez por grupo en el front bloquea el grupo que cambió.
- [La línea del perfil en "Ajustar"] → `RespuestaPropuestas.despachos` no trae hoy el perfil. Hay que agregar `perfil` (solo `linea`) a esa raíz, avisándole a quien integra el contrato, o la hoja queda sin esa línea.
- [Rendimiento de la escena] → Topes de grupos y fantasmas, materiales compartidos, líneas sin animar en calidad baja y nada de vuelo con "reducir movimiento".

## Migration Plan

1. Desplegar el backend con la ruta nueva y los ajustes de D-410. Es inofensivo: el front viejo no lo llama, y `"escena"` solo llega desde el front nuevo.
2. Probar el front nuevo en local contra producción, con la sesión de Daniel en FLORECER y pedidos de prueba.
3. Publicar el front. La tarjeta aparece y la pestaña desaparece en el mismo despliegue.
4. **Rollback:** `OPTTIA_PROPUESTAS_HABILITADO=false` apaga la tarjeta. Para recuperar la pestaña, se vuelve a publicar la versión anterior del front.
5. Con la fase 1 verificada en producción, se borra la vista `EnVivoDespachosComponent`.
