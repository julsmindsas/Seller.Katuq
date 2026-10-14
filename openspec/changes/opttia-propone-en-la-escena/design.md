## Context

- **Origen:** la motivación está en proposal.md. La propuesta completa (experiencia, las seis operaciones, arquitectura, seguridad y fases) se aprobó el 13-oct junto con el boceto interactivo: https://claude.ai/artifact/XVjArkR2s6cbpVXym7G6e2. Este design fija la fase 1 y, en la sección "Fase 2" del final, la fase 2: Daniel pidió el 13-oct "sigue con la fase 2". Las fases 3 y 4 tendrán su propio cambio y su design.
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

## Fase 2: aprobar la producción, bandera por operación y cobro con WhatsApp

Daniel lo pidió el 13-oct ("sigue con la fase 2"). Se detalla aquí y no en un cambio aparte, para que la cola, la tarjeta y sus deltas sigan en un solo lugar. `orders` sigue siendo un módulo sensible: el cambio es mínimo, tiene prueba de contrato del write-set y se aplica con aprobación (tareas 8.x). La seguridad del alcance está en el cambio privado del backend, sección "D-422 fase 2".

**Verificado el 13-oct, solo lectura:** en producción, `CUSTOMER_NOTIFY_STATES=ProducidoTotalmente,Despachado,Entregado,Rechazado`. "En producción" no le avisa al cliente. El correo y el SMS directos de la edición de pedidos tampoco tienen plantilla para ese estado. Solo sale la notificación interna `PRODUCTION_STARTED` al equipo.

### Decisiones

1. **Bandera por operación: una bandera booleana del catálogo de `companyFeatureFlags` para encender cada operación.** Sin ella, la operación sigue como en la fase 1.

   | Operación | Fase 1 (sin la bandera nueva) | Encendido |
   |-----------|-------------------------------|-----------|
   | despachos | `despachosOpttia` (D-410) | la misma |
   | produccion | sombra con `despachosOpttia`, solo Administrador | `opttiaProduccion` |
   | cobro | señal con "Abrir pedido" | `opttiaCobroWhatsapp` |

   - Una fuente puede declarar varias banderas (`banderas`). Aplica si alguna está encendida, y su `acceso` decide el modo. En producción, encendido gana sobre sombra.
   - Solo el booleano `true` prende, que es la regla del catálogo. Las banderas se prenden con `scripts/set-company-feature.js`, que simula por omisión.
   - No hace falta migrar banderas: quien hoy ve la sombra o la señal sigue igual.

   *Alternativa descartada:* dos banderas por operación, "ver" y "aprobar". Obligaba a migrar las banderas de los comercios que ya tienen la fase 1, sin ganar nada.

2. **Interruptores sin desplegar:**
   - apagar la bandera de un comercio devuelve la operación a la fase 1;
   - `OPTTIA_PROPUESTAS_HABILITADO` sigue apagando toda la función, también aprobar y pedir el enlace;
   - el interruptor de Opttia por empresa (D-386) se revisa también en las dos acciones.

   Los interruptores generales se retiran según el Artículo XII.

3. **Aprobar la producción: `POST /v1/opttia/propuestas/produccion/aprobar`** (`services/opttiaPropuestas/ejecutores/produccion.js`). Despachar sigue por `POST /v1/logistica/plan/aprobar`. Por cada pedido, uno tras otro y hasta 50:
   1. en una transacción relee el pedido y exige la empresa de la sesión, la misma huella de D-410 (`huellaDe`, compartida con la fuente), "Sin producir", sin cancelar y entrega hoy o mañana;
   2. deja en el pedido la marca `propuestaOpttia` (`tipo`, `propuestaId`, `aprobadoPor`, `en`, `estado:'en-curso'`). La marca no toca `date_edit`, así que la huella no cambia;
   3. fuera de la transacción llama `updateOrderInternal` con solo `{_id, estadoProceso:'EnProduccion'}` y el correo de la sesión. Es el mismo camino de la pantalla: transiciones, guard de tesorería, historial con quien aprueba y aviso interno;
   4. deja la marca en `hecho`. Si `updateOrderInternal` falla, quita la marca y el pedido queda como estaba, listo para aprobarlo otra vez.

   Sin duplicados:
   - una segunda aprobación encuentra otra huella y responde `ya-cambio` ("Ya estaba en producción");
   - dos personas a la vez: una aprueba y la otra recibe `en-curso` ("Lo está aprobando…").

   Más reglas:
   - hay un presupuesto de 40 s para empezar pedidos; lo que no alcanza queda `fuera` sin escribir;
   - `controllers/orders.js` no cambia;
   - no hay colecciones nuevas;
   - al terminar se llama `invalidar(empresa)`.

   *Alternativa descartada:* escribir `estadoProceso` directo. Se saltaría las transiciones, el guard de tesorería y el historial de la pantalla.

4. **Fuente `produccion` encendida:**
   - lleva `modo:'on'`, `puedeAprobar:true` e `items` con hasta 50 pedidos y su huella;
   - `aprobar` trae `{destino, etiqueta, confirmacion}`;
   - las consecuencias son "Pasan a En producción" (o "los primeros 50") y "Avisa a tu equipo, no al cliente".

   La ven y la aprueban la familia Administrador o un rol con `ventas/pedidos` o `despachos` en el menú (`services/opttiaPropuestas/acceso.js`, el mismo criterio de `update_order_status` del MCP).

5. **Cobro con WhatsApp: `GET /v1/opttia/propuestas/pedido/:id/whatsapp`** (`services/opttiaPropuestas/whatsapp.js`):
   - lee un solo pedido de la empresa de la sesión;
   - aplica el alcance de D-349;
   - revisa que no esté cancelado y que tenga saldo;
   - devuelve el enlace `wa.me` con el texto de una plantilla del servidor: primer nombre, comercio, número de pedido y saldo;
   - el teléfono solo viaja dentro del enlace, con `Cache-Control: no-store`. No se guarda ni se registra.

   *Alternativa descartada:* mandar el teléfono en la cola. Llegaría a todas las pantallas, también a la TV.

6. **La cola le dice al front si el cobro con WhatsApp está encendido para esa persona.** Hoy no lo dice: falta en el backend (tarea 8.3.4). Se propone `cobroWhatsapp: boolean` en la raíz, verdadero solo con la bandera, el permiso de pedidos y sin D-349, y dentro de `version`.

7. **Front, cuando el front esté libre** (otro trabajo lo está cambiando):
   - los modelos nuevos en `propuestas.modelos.ts`;
   - el ejecutor `produccion` en el mapa del servicio;
   - "Abrir WhatsApp" como ejecutor de `cobro` encendido.

   El enlace se abre en otra pestaña con `noopener` y no se guarda en el estado, el almacenamiento ni los reportes de errores. En TV, con "ocultar" y en "Repetir el día" no hay botón y no se pide el enlace.

### Contrato nuevo para el front

```ts
// GET /v1/opttia/propuestas: lo que se suma (lo demás no cambia)
interface PropuestaServidor {
  // …
  modo: 'on' | 'sombra';                 // produccion ahora puede venir 'on'
  // solo con modo 'on':
  items?: Array<{ id: string; huella: string }>;   // hasta 50, primero los de hoy y luego por franja
  aprobar?: { destino: string; etiqueta: string; confirmacion: string };
  // destino '/v1/opttia/propuestas/produccion/aprobar', etiqueta 'Pasar a En producción',
  // confirmacion 'Confirmar: 5 pedidos pasan a En producción'
}
interface RespuestaPropuestas {
  // …
  cobroWhatsapp?: boolean; // PENDIENTE en el backend (tarea 8.3.4); sin el campo, el cobro es señal
}

// POST /v1/opttia/propuestas/produccion/aprobar   (sin el cargador global)
// cuerpo: { propuestaId: string /* 'produccion-<24 hex>' */; items: Array<{ id: string; huella: string /* 16 hex */ }> } // 1 a 50
type RespuestaAprobarProduccion =
  | {
      success: true;
      resultados: Array<{
        id: string;
        nroPedido: string;
        estado: 'en-produccion' | 'ya-cambio' | 'en-curso' | 'fuera';
        razon?: string; // en palabras: "Ya estaba en producción", "Fue cancelado", "Lo está aprobando …"
      }>;
    }
  | { success: false; code: 'PAUSADA' | 'OPTTIA_APAGADO' | 'FUNCION_APAGADA' | 'SIN_PERMISO' | 'SOLO_PROPIAS' | 'SIN_APROBADOR' | 'ERROR'; message: string }; // 200
// 400 { success: false, code: 'PROPUESTA_INVALIDA', message } · 423 { success: false, code: 'TENANT_SOLO_LECTURA', message }
// 401 sin sesión. Nunca 403.

// GET /v1/opttia/propuestas/pedido/:id/whatsapp   (sin el cargador global; siempre 200, salvo 401)
type RespuestaWhatsappCobro =
  | { success: true; url: string } // https://wa.me/<dígitos>?text=<texto>; abrir y no guardar
  | {
      success: false;
      code: 'PAUSADA' | 'OPTTIA_APAGADO' | 'FUNCION_APAGADA' | 'SIN_PERMISO' | 'ERROR'
          | 'NO_ENCONTRADO' | 'SOLO_PROPIAS' | 'CANCELADO' | 'SIN_SALDO' | 'SIN_TELEFONO';
      message: string; // ya en palabras para la tarjeta
    };
```

### Riesgos de la fase 2

- [Front viejo con la producción encendida] → El front de la fase 1 no tiene ejecutor de producción. `opttiaProduccion` se prende en un comercio solo después de publicar el front nuevo.
- [Un comercio cambia la configuración de avisos] → Antes de encender cada comercio se vuelve a verificar `CUSTOMER_NOTIFY_STATES` en el servidor.
- [Más de 50 pedidos] → Se aprueban los primeros 50 en el orden de la tarjeta, y el resto sale en la siguiente propuesta.
- [Deshacer] → No hay deshacer automático. Lo aprobado se corrige desde la pantalla, como cualquier cambio de estado.
- [Inventario] → El cambio de estado no lleva carrito. La prueba del write-set confirma que no hay movimientos con el efecto de inventario al día.
- [El historial de estados no dice "Opttia"] → El historial guarda quién hizo el cambio, y el origen queda en la marca `propuestaOpttia` del pedido. Si Daniel quiere el origen también en el historial, se hace con un diff aparte de `controllers/orders.js` (tarea 8.1.9).

### Migration Plan de la fase 2

1. Desplegar el backend. Sin banderas nuevas nada cambia, y el front viejo sigue igual.
2. Publicar el front.
3. En FLORECER, simular y luego prender `opttiaProduccion` y `opttiaCobroWhatsapp`, y probar con pedidos de prueba.
4. Seguir con los demás comercios uno por uno, con Daniel.
5. **Rollback:** apagar la bandera del comercio, o `OPTTIA_PROPUESTAS_HABILITADO=false` para todos.
