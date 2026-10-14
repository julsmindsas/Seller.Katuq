## 0. Fase 0: spec y checkpoint

- [x] 0.1 Crear este cambio con proposal, design, tasks y los deltas de `despachos-en-vivo`, `opttia-en-vivo`, `tablero-en-vivo` y `perfil-de-despacho`. Validarlo con `openspec validate opttia-propone-en-la-escena --strict`. → 13-oct, válido.
- [x] 0.2 Registrar D-422 en `specs/CONTRACT.md`. Reemplaza la parte "pestaña" de D-410. → 13-oct: la propuesta la llamaba D-418 y luego D-419, pero otras sesiones publicaron D-418 (ticket 1206), D-419 (facturación POS), D-420 (mapa de mensajeros) y D-422 (mapa de Despachos) ese mismo día, así que quedó D-422.
- [x] 0.3 En el repo privado del backend, agregar la sección "D-422 fase 1" con la seguridad del alcance a `openspec/changes/opttia-despachos-con-aprobacion/tasks.md`.
- [x] 0.4 Daniel revisa los deltas. La propuesta y el boceto ya están aprobados ("dale, arranca con la fase 1"), así que la fase 1 arranca en paralelo. Cualquier ajuste a los deltas entra antes de publicar. → Daniel aprobó la propuesta y el boceto: "dale, arranca con la fase 1".

## 1. Fase 1, backend: ruta de solo lectura y ajustes de D-410 (repo `katuq_admin_back_firebase`)

- [x] 1.1 Prueba de contrato de `GET /v1/opttia/propuestas`, roja primero. Casos:
  - 401 sin sesión;
  - la empresa sale del token aunque lleguen `?empresa=` o la cabecera `company`;
  - 200 `{disponible:false, motivo}` con el interruptor general apagado, con el interruptor de Opttia de la empresa apagado y con la bandera apagada;
  - nunca 403.
- [x] 1.2 Registro cerrado de fuentes en `services/opttiaPropuestas/`, una por archivo en `fuentes/`, sin `if/else` por tipo. Una prueba fija que en la fase 1 el registro tiene exactamente `despachos` y `produccion`.
- [x] 1.3 Pruebas puras de la fuente `despachos`:
  - una propuesta por grupo, con `grupo` tal cual;
  - el título de plantilla para mensajero, transportadora y "escoge mensajero";
  - urgente o importante según la franja y las alertas del plan;
  - las consecuencias;
  - la escena (`montones`, `veh`, `transportadora`, `color`);
  - la raíz `despachos`;
  - sin `puedeVer`, no hay propuestas;
  - `puedeAprobar` sale de `accesoPlan`.

  Luego la implementación, que envuelve `calcularPlanDeDespachos`.
- [x] 1.4 Pruebas puras de la fuente `produccion`:
  - solo para la familia Administrador y con la bandera;
  - sin el perfil "usa producción" (90 días, `limit 1`), no propone;
  - hoy o mañana en Colombia;
  - los formatos de fecha de `leerDatosDelPlan.js`;
  - sin cancelados;
  - hasta 12 pedidos en la escena;
  - `modo:'sombra'` y `puedeAprobar:false`;
  - urgente si alguno es de hoy;
  - efecto `fila` y estación `recibido`.

  Luego la implementación: consulta con `select` sobre el índice `orders (company, estadoProceso, fechaEntrega)`, filtrada por la empresa.
- [x] 1.5 Caché por empresa y fuente (60 s y 5 min), con una sola llamada en vuelo y `invalidar(empresa)` exportada. Pruebas:
  - dos pedidos simultáneos hacen un solo cálculo;
  - después de invalidar se recalcula;
  - una empresa no ve la caché de otra.
- [x] 1.6 Router `routers/opttiaPropuestas.js` en `/v1/opttia/propuestas`, montado en `index.js`, con:
  - `auth` y `requireJwtTenant`;
  - el interruptor `OPTTIA_PROPUESTAS_HABILITADO` (solo `"false"` apaga);
  - el interruptor de Opttia de la empresa;
  - `version` como huella de la respuesta.

  Revisar la clasificación de solo lectura en `middleware/soloLectura.js`.
- [x] 1.7 Prueba de contrato del write-set: con una base simulada que prohíbe toda escritura, el GET con las dos fuentes hace 0 escrituras. Ninguna consulta sale sin el filtro de la empresa.
- [x] 1.8 D-410: `"escena"` en `CANALES` (`ejecutarPlan.js`). `POST /aprobar` toma `canal` del body solo si es `"en-vivo"` o `"escena"`. Tras aprobar, el controlador llama `invalidar(empresa)`. Va con su prueba.
- [x] 1.9 D-410: `POST /explicar` revisa el interruptor de Opttia de la empresa. Si está apagado, responde sin frase y sin llamar a Opttia. Va con su prueba.
- [x] 1.10 Cierre del backend:
  - `node --check`;
  - las suites de `tests/opttiaPropuestas/`, `tests/despachos/` y `tests/enVivo/`, estas últimas iguales que antes y con `services/enVivo/` sin escrituras;
  - sin `console.log` de telemetría.

## 2. Fase 1, front: estado, reglas y aprobación

- [x] 2.1 Contrato tarjeta ↔ escena: `propuestas/propuestas.modelos.ts` y `propuestas/propuestas-escena.puente.ts`.
- [x] 2.2 Prueba de caracterización de `paraAprobar` y de la serie de "Aprobar todo" del componente de la pestaña, antes de moverlos. Así se prueba que el servicio arma el mismo cuerpo de aprobación.
- [x] 2.3 `propuestas.reglas.ts`, puro, con pruebas en node:
  - orden por prioridad, hora límite y valor;
  - "Después" (30 min) y "No hoy" por huella, con `localStorage` en try/catch;
  - vejez por grupo, que ignora la repetición;
  - cuándo pedir: espera de 20 a 30 s, respaldo de 5 min, TV a lo sumo cada 5 min y solo con la escena visible;
  - señales de cobro desde `radar.atencion` (`sin_pago`);
  - paso a `PropuestaEnEscena`;
  - contador y saludo de plantilla.
- [x] 2.4 `EnVivoPlanDespachosService.aprobar(grupos, canal?)` manda `canal: 'escena'` desde la tarjeta. La pestaña sigue mandando lo de hoy hasta que se quite.
- [x] 2.5 `EnVivoPropuestasService` (root, `extends BaseService`, sin el cargador global):
  - el GET de la cola;
  - el estado `{cola, actual, aplicando, resultados, viejoPorGrupo, bloqueado}`;
  - la lógica extraída: `paraAprobar`, `editable`, `conQuien`, `opcionesDe`, `sinRespuesta`, `mensajeDe` y la serie con `concatMap` y `takeWhile`;
  - el mapa de ejecutores por tipo.

  Llama `puente.mostrar()` y `puente.contar()`.

## 3. Fase 1, front: tarjeta y hoja (`EnVivoPropuestasModule`)

- [x] 3.1 `app-en-vivo-sugerencia`, OnPush, en `.ev-escena-slot` entre la narración y la ficha:
  - eyebrow, título, razón, frase opcional y chips;
  - Aprobar, Ajustar, Después y el menú con "No hoy";
  - modo `on` con Aprobar, modo `sombra` con "Así lo haría Opttia · pronto podrás aprobarlo" y sin botón, y modo `senal` con "Abrir pedido".
- [x] 3.2 Aprobar en dos toques:
  - "Confirmar: <efecto>", que vuelve solo a los 5 s;
  - "Despachando…" con su propio indicador;
  - bloqueo de 1,5 s después de pasar sola a la siguiente;
  - resultado por grupo;
  - "Aprobar los N grupos" solo si todos son de mensajero, y las transportadoras de a una;
  - grupo viejo bloqueado.
- [x] 3.3 Cero ruido:
  - una tarjeta a la vez, y lo urgente entra de siguiente;
  - a los 45 s se retira el ensayo y queda el contador;
  - "Todo al día. Te aviso si sale algo";
  - ← → Enter Esc;
  - `aria-live="polite"` solo para la propuesta nueva;
  - `:focus-visible`.
- [x] 3.4 `app-en-vivo-sugerencia-ajuste`:
  - hoja lateral de 368 px, y abajo con velo en 620 px o menos;
  - `grupo-despacho` y `fuera-del-plan` exportados por `EnVivoDespachosModule`;
  - la línea del perfil, si el contrato la trae (ver design, "Risks");
  - el foco vuelve a la tarjeta al cerrar.
- [x] 3.5 A 390 px:
  - la tarjeta va acoplada abajo en lugar de la narración, hasta el 45 % del alto;
  - Aprobar a todo el ancho y 48 px de alto;
  - la razón detrás de "¿Por qué?";
  - el margen `abajo` en `margenes-escena.ts`.
- [x] 3.6 TV y "Repetir el día":
  - en TV, botones ocultos, "Apruébalo desde tu celular", "ocultar" respetado y "Aprobado desde el celular" durante 6 s;
  - en la repetición, la tarjeta y la capa se esconden, los eventos simulados se ignoran y al volver se pide la cola una vez.
- [x] 3.7 Montaje con `*ngIf` en operacion, pais y pedidos. Requiere Opttia prendido, sin `soloLectura`, sin `soloPropias`, sin `?empresa=` y con `disponible:true`.

## 4. Fase 1, front: escena y orbe (solo lectura)

- [x] 4.1 Pruebas puras, sin three, de lo que calcula la capa:
  - montones por grupo y fila numerada;
  - topes de 6 grupos y 40 fantasmas;
  - colores de `CHAQUETAS`;
  - qué se atenúa.
- [x] 4.2 `escenas/capa-propuesta.ts` por los ganchos aditivos de `EscenaBase`:
  - fantasmas con `InstancedMesh`;
  - anillos y líneas punteadas;
  - atenuado al 40 % con un material compartido;
  - efectos `montones`, `fila` y `moneda`;
  - fuera de la zona de Angular.
- [x] 4.3 `OperacionEnVivoEscena.prepararVehiculo(nombre)`, con etiqueta en el montón si no hay moto libre, y `posCasa(pedidoId)`.
- [x] 4.4 Orbe:
  - `EnVivoOrbeService.proponer/retirarPropuesta`;
  - estado "propuesta" en `GuiaOpttia`, que `cortar()` no suelta;
  - `OrbeOpttia.senalar` en modo fijo;
  - el botón del orbe con el contador, el halo que late dos veces y `pedirTarjeta()`.
- [x] 4.5 Doble vía: tocar un montón llama `puente.tocarGrupo` y la tarjeta enfoca su fila; pasar el puntero por un grupo resalta su montón.
- [x] 4.6 Mi país: arco fijo para los grupos de transportadora, que al aprobar pasa a ser el arco de salida. Pedidos: `usarMarcas('pedido')` en las tarjetas del grupo. → 13-oct: `escenas/arcos-fijos.ts` (variante quieta de `arco()`, fuera de los efectos pasajeros) y reglas puras en `escenas/propuesta-marcas.reglas.ts`. Al aprobar, el arco fijo se borra y la salida real dibuja el suyo. Mi país también deja el orbe fijo en la propuesta, como Mi operación. Pedidos: `EnVivoOrbeService.marcasPropuesta$` (con `usarMarcas('pedido')`) marca las tarjetas con el color del grupo y pausa la ronda de marcas. 19 pruebas puras y humo en 1440 y 390.
- [x] 4.7 Sin WebGL, la tarjeta lista los números. Con calidad baja, las líneas no se animan. Con "reducir movimiento", solo anillos y líneas.

## 5. Fase 1, front: quitar la pestaña y la narración nueva

- [x] 5.1 Quitar `OPCION_DESPACHOS`, `'despachos'` de `SIN_ESCENA`, la suscripción de la insignia y el `ngSwitchCase`. Con la vista guardada `despachos`, la página abre en `operacion`.
- [x] 5.2 `EnVivoDespachosModule` exporta `grupo-despacho` y `fuera-del-plan`. El componente de la vista completa queda sin uso hasta la tarea 7.5.
- [x] 5.3 Narración:
  - la línea "plan" pasa a "Organicé N pedidos en M salidas; apruébalas aquí", solo sin tarjeta;
  - el saludo de plantilla, una vez;
  - se calla con tarjeta;
  - si hay algo urgente y el sonido está prendido, un tono una vez.

## 6. Fase 1: compuertas antes de publicar

- [x] 6.1 Build de producción sin errores, uno a la vez y solo quien integra, con salida al scratchpad: `node --max_old_space_size=8192 node_modules/@angular/cli/bin/ng build --configuration=production --output-path=<scratchpad>/dist-opttia-f1`.
- [x] 6.2 En `components/en-vivo/`:
  - el conteo de `(linear|radial)-gradient(` y de los primarios prohibidos no sube;
  - ninguna clase nueva contiene "p-".
- [x] 6.3 Playwright con la API simulada, a 1440 y 390 px:
  - sin scroll horizontal ni texto invisible;
  - la tarjeta, los dos toques, Ajustar, TV, "Repetir el día", sin WebGL, "reducir movimiento" y "ocultar".
- [x] 6.4 Pruebas puras de `propuestas.reglas` y de la capa, en verde.
- [x] 6.5 Revisión de seguridad del alcance contra la sección "D-422 fase 1" del cambio privado del backend, sin escribir el detalle en este repo.

## 7. Fase 1: despliegue (con el OK de Daniel)

- [x] 7.1 Desplegar el backend: → 13-oct: backend `482607a`, con las pruebas corridas en el servidor; la ruta responde 401 sin sesión.
  - `git pull`;
  - `--ff-only` en el servidor;
  - `set -e`;
  - HEAD verificado;
  - `node --check` y las suites;
  - `pm2 restart katuq-api`.

  Si hay commits ajenos sin desplegar, preguntar antes.
- [ ] 7.2 Probar el front nuevo en local contra producción, en FLORECER con la sesión de Daniel y pedidos de prueba:
  1. ver la tarjeta y el ensayo;
  2. ajustar;
  3. aprobar en dos toques;
  4. ver la salida animada y "canal: escena" en el historial;
  5. aprobar otra vez y ver "Ya estaba aprobado";
  6. ver la sombra de producción como Administrador y no verla como vendedor;
  7. cancelar los pedidos de prueba.
- [x] 7.3 Publicar el front: → 13-oct: front 2026.10.13.6, verify-dist-prod OK y humo sobre la compilación final.
  - `git pull`;
  - `npm run build:prod`;
  - `node scripts/verify-dist-prod.js`;
  - `firebase deploy --only hosting`;
  - commit de `src/assets/version.json`, con una versión mayor que la viva.

  La pestaña desaparece en este mismo despliegue.
- [ ] 7.4 Seguir 2 días en OH MY STORE y ALMARA FELICIDAD: aprobaciones por canal "escena", grupos que quedaron fuera y errores.
- [x] 7.5 Borrar `EnVivoDespachosComponent` como vista completa y lo que quede sin uso. → 13-oct: borrados el componente (ts, html y scss), `EnVivoPlanDespachosService.obtener()`, `RespuestaPlan` y `.dz-btn--sec`. Quedan `grupo-despacho`, `fuera-del-plan`, el servicio (`explicar` y `aprobar`), los modelos, las reglas, `_dz-comun.scss` y `EnVivoDespachosModule`. Un grep confirma que nada lo importa. Se hizo antes de cerrar 7.4 porque así se pidió.
- [x] 7.6 Bitácora de la fase 1 en D-422.

## 8. Fase 2: aprobar la producción, bandera por operación y cobro con WhatsApp

Daniel lo pidió el 13-oct: "sigue con la fase 2". Las decisiones y el contrato están en la sección "Fase 2" del design, y los requisitos en `operaciones-de-opttia`. La seguridad del alcance está en el cambio privado del backend, sección "D-422 fase 2".

Reglas de esta fase:
- `orders` es un módulo sensible: un paso a la vez, con su diff y aprobación explícita antes de aplicarlo;
- toda prueba va roja primero;
- sin `console.log` de telemetría;
- ningún registro lleva teléfonos ni datos del cliente.

Orden: 8.2 va primero, porque la producción y el cobro dependen de las banderas. Después, 8.1 y 8.3 pueden ir en paralelo. El front espera a que termine el otro trabajo que lo está cambiando.

### 8.0 Checkpoint

- [x] 8.0.1 Deltas de la fase 2 y sección "Fase 2" del design, validados con `openspec validate opttia-propone-en-la-escena --strict`. → 13-oct, válido. Producción y cobro se movieron de `opttia-en-vivo` a la capacidad nueva `operaciones-de-opttia`, para que cada delta quepa en 3 páginas. Los documentos se alinearon con el backend que se estaba escribiendo al mismo tiempo: banderas, rutas, marca y respuestas.
- [x] 8.0.2 Sección "D-422 fase 2" en `openspec/changes/opttia-despachos-con-aprobacion/tasks.md` del backend privado.
- [x] 8.0.3 Bitácora "Fase 2" en D-422.
- [ ] 8.0.4 Daniel revisa los deltas, las banderas y quién aprueba cada operación.

### 8.2 Bandera por operación (va primero)

- [ ] 8.2.1 Backend: sumar `opttiaProduccion` y `opttiaCobroWhatsapp` al catálogo `FEATURE_FLAG_NAMES` de `services/companyFeatureFlags.js`, con su comentario (dueño Daniel; se retiran según el Artículo XII). Va con la prueba del catálogo (`tests/companies/companyFeatureFlags.test.js`).
- [ ] 8.2.2 Backend, motor (`services/opttiaPropuestas/index.js`): una fuente puede declarar `banderas`, y aplica si alguna está encendida. El motor lee cada bandera una vez por petición y le pasa a `acceso` cuáles están encendidas (`ctx.banderas`); `acceso` devuelve el `modo`. Va con su prueba en `motor.test.js`.
- [ ] 8.2.3 Backend, fuente `produccion`: `banderas: ['opttiaProduccion', 'despachosOpttia']`, y encendido gana sobre sombra. Pruebas en `fuentes.test.js`:
  - solo `despachosOpttia`: sombra, solo para Administrador;
  - `opttiaProduccion`: encendido, para Administrador o para un rol con `ventas/pedidos` o `despachos`;
  - ninguna: no hay producción;
  - un rol sin permiso con las dos banderas: sombra si es Administrador, nada si no lo es.
- [x] 8.2.4 Front: `company-features.service.ts` suma las dos banderas, como pide el catálogo. → 14-oct. Además, `EnVivoPropuestasService` pide la cola si el comercio tiene cualquiera de las tres (`despachosOpttia`, `opttiaProduccion`, `opttiaCobroWhatsapp`); el servidor decide qué trae.

### 8.1 Aprobar la producción (`orders`, módulo sensible)

- [x] 8.1.1 Verificar, solo lectura, que la configuración de producción no avisa al cliente por "En producción". → 13-oct: `CUSTOMER_NOTIFY_STATES=ProducidoTotalmente,Despachado,Entregado,Rechazado`. Se repite antes de encender cada comercio (8.5.3).
- [ ] 8.1.2 Prueba de caracterización de `updateOrderInternal` con `{_id, estadoProceso:'EnProduccion'}` sobre un pedido "Sin producir":
  - qué campos escribe;
  - qué historial deja;
  - la notificación interna `PRODUCTION_STARTED`;
  - que no sale correo, SMS ni WhatsApp al cliente;
  - que el inventario no cambia, con el efecto de inventario al día y en los dos modos de inventario.
- [ ] 8.1.3 Prueba de contrato del ejecutor y de su write-set (`tests/opttiaPropuestas/aprobarProduccion.contract.test.js`), con base transaccional simulada. Casos:
  - pedido de otra empresa o inexistente: "No se encontró el pedido";
  - huella distinta, ya en producción ("Ya estaba en producción") o en otro estado: `ya-cambio`;
  - cancelado o que ya no se entrega hoy o mañana: `fuera`;
  - otra persona aprobándolo hace menos de 2 min: `en-curso`;
  - si `updateOrderInternal` falla, se quita la marca y se puede volver a aprobar;
  - se acaba el presupuesto de tiempo: `fuera` sin escribir;
  - cuerpo inválido: 400 `PROPUESTA_INVALIDA`.

  Write-set: solo `orders.propuestaOpttia` más lo que escribe `updateOrderInternal`. Nada en inventario, movimientos, productos, precios, órdenes de envío ni integraciones. Cero avisos al cliente.
- [ ] 8.1.4 Implementar el ejecutor `services/opttiaPropuestas/ejecutores/produccion.js`:
  - en una transacción, la marca `propuestaOpttia` en curso;
  - `updateOrderInternal` con solo `{_id, estadoProceso}` y el correo de la sesión, sin carrito ni pagos;
  - la marca pasa a `hecho`.

  Hasta 50 pedidos, en serie, con resultado por pedido y la huella compartida con la fuente (`huellaDe`).
- [ ] 8.1.5 Prueba de contrato de la ruta (`rutas.contract.test.js`):
  - 401 sin sesión;
  - 423 `TENANT_SOLO_LECTURA` con el comercio en solo lectura, sin escribir;
  - 200 `{success:false, code}`, nunca 403, con: `PAUSADA`, `OPTTIA_APAGADO`, `FUNCION_APAGADA`, `SIN_PERMISO`, `SOLO_PROPIAS` y `SIN_APROBADOR`;
  - empresa del token aunque llegue otra en la consulta, la cabecera o el cuerpo;
  - quien aprueba sale de la sesión;
  - después de aprobar se suelta la memoria de la cola.
- [ ] 8.1.6 Implementar `POST /produccion/aprobar` en `routers/opttiaPropuestas.js`, con la misma cadena del GET más bandera, solo lectura, permiso de pedidos y D-349.
- [ ] 8.1.7 Fuente `produccion` encendida:
  - `modo:'on'`, `puedeAprobar`, `items` (hasta 50, con huella) y `aprobar` (`destino`, `etiqueta`, `confirmacion`);
  - consecuencias "Pasan a En producción" y "Avisa a tu equipo, no al cliente".

  Va con su prueba.
- [ ] 8.1.8 Cierre del backend:
  - `node --check`;
  - las suites de `tests/opttiaPropuestas/`, `tests/despachos/` y `tests/enVivo/`, estas últimas iguales y con `services/enVivo/` sin escrituras;
  - `tests/companies/soloLectura.test.js` sin fallas nuevas;
  - el GET sigue con 0 escrituras;
  - sin `console.log` de telemetría.
- [ ] 8.1.9 (A decidir con Daniel) ¿El historial de estados debe decir que el cambio vino de Opttia? Hoy dice quién lo hizo, y el origen queda en la marca `propuestaOpttia` del pedido. Si se quiere, es un diff aparte de `controllers/orders.js`, con una prueba de caracterización de que sin la opción todo queda igual.
- [x] 8.1.10 Front: modelos (`items`, `aprobar`) y el ejecutor `produccion` en `EnVivoPropuestasService`, que llama `POST /v1/opttia/propuestas/produccion/aprobar` sin el cargador global. Los resultados se dicen en palabras: "Listo: 5 pasaron a En producción", "Dejé fuera el #1043: fue cancelado", "Ya estaba en producción" y "Lo está aprobando…". Va con sus pruebas. → 14-oct: `resultadoProduccion` y `resultadoProduccionDeError` (puras), `postSinLoader` con 75 s; tras aprobar se vuelve a pedir la cola.
- [x] 8.1.11 Front, tarjeta y escena:
  - Aprobar en dos toques con la `confirmacion` del servidor, y la vejez por pedido;
  - en TV y en "Repetir el día", sin botón;
  - en la escena, los fantasmas se retiran y los eventos reales llevan cada caja por la banda, a lo sumo 6 a la vez.

  → 14-oct: tarjeta hecha (dos toques con la `confirmacion`, vejez por pedido, sin botón en TV ni en la repetición, aviso "Avisa a tu equipo, no al cliente"). Los fantasmas ya se retiran al aprobar (el puente deja de publicar la propuesta). Escena: los `cambio_estado` a "En producción" ya viajaban por la banda (`hacerCambio`, solo en modo `animado`), y el tope de 6 lo pone el director (`MAX_SIMULTANEAS`; con más de 8 en cola, el resto pasa con desvanecido); no se duplicó. El diagnóstico suma `cajasEnBanda` y `picoBanda`.

### 8.3 Cobro con "Abrir WhatsApp" (no escribe)

- [ ] 8.3.1 Prueba de contrato de `GET /v1/opttia/propuestas/pedido/:id/whatsapp`:
  - 401 sin sesión;
  - empresa del token; un pedido de otra empresa o inexistente da `NO_ENCONTRADO`;
  - `PAUSADA`, `OPTTIA_APAGADO`, `FUNCION_APAGADA` y `SIN_PERMISO` responden 200, nunca 403 ni 404;
  - un vendedor de D-349 recibe `SOLO_PROPIAS` si el pedido no es suyo;
  - `CANCELADO`, `SIN_SALDO` y `SIN_TELEFONO`;
  - `Cache-Control: no-store`;
  - 0 escrituras;
  - ni el teléfono ni el texto aparecen en lo que registra la ruta, con un registrador simulado y también en el camino de error.
- [ ] 8.3.2 Plantilla del recordatorio, pura y con prueba (`mensajeDeCobro`): "Hola <primer nombre>, te escribimos de <comercio> por tu pedido #<nro>. Queda un saldo de <saldo>. ¿Te ayudamos a completar el pago?". Sin enlaces de pago. El teléfono se arma con `telefonoWhatsapp`.
- [ ] 8.3.3 Implementar `services/opttiaPropuestas/whatsapp.js` y la ruta, con la cadena de las acciones: bandera `opttiaCobroWhatsapp`, permiso de pedidos y alcance de D-349. Los errores se registran sin datos del pedido ni del cliente.
- [x] 8.3.4 Backend: la cola le dice al front si el cobro con WhatsApp está encendido para esa persona: `cobroWhatsapp: boolean` en la raíz, con la bandera y el permiso de pedidos. Hecho el 14-oct (`9232464`). Desvío: va en todas las respuestas, también con `disponible:false`, porque las señales de cobro salen del radar. Queda fuera de `version` (es de la sesión) y el front repinta si cambia. El vendedor de D-349 la recibe, porque el enlace solo sale para sus pedidos.
- [x] 8.3.5 Front: con `cobroWhatsapp`, el botón principal es "Abrir WhatsApp" y "Abrir pedido" pasa a secundario. Al tocar:
  - pide el enlace de ESE pedido;
  - abre la `url` en otra pestaña con `noopener`;
  - no la guarda en el estado, el almacenamiento, los registros ni los reportes de errores.

  Con `success:false` muestra el `message` y deja "Abrir pedido". → 14-oct: solo abre `https://wa.me/` o `https://api.whatsapp.com/` (`esEnlaceWhatsapp`); sin respuesta en 8 s, se puede volver a tocar.
- [x] 8.3.6 Front:
  - en TV, con "ocultar" y en "Repetir el día", el botón no existe y no se pide el enlace;
  - "Ya pagó / no aplica" la descarta por hoy en ese navegador;
  - en la escena, la burbuja vuela de la tienda a la casa al abrir WhatsApp, y con `pago_confirmado` el "$" pasa a check.

  → 14-oct: los dos primeros, hechos ("Ya pagó / no aplica" reúsa lo de "No hoy": por empresa y usuario, con el día adentro). Escena: la capa de cobro escucha `avisos$` y lanza una burbuja verde (`ok`) de la caja a su casa (sin caja visible, nada; quieta en la casa con "reducir movimiento" o calidad baja; no en TV, con "ocultar", en pausa ni en la repetición; a lo sumo 4; material liberado al terminar). Con `pago_confirmado` real, el "$" del aro pasa a "✓". El diagnóstico del componente suma `burbujasWhatsapp` y `burbujasVivas`.

- [x] 8.3.7 Pruebas en node de `propuestas.reglas`: el botón según `cobroWhatsapp`; sin botón en TV, con "ocultar" y en la repetición; descartar por hoy. → 14-oct: 17 pruebas de la fase 2 (también producción: todos pasan, mezcla con fuera, ya-cambio, en-curso y errores de negocio) y las 37 de la fase 1, en verde.

### 8.4 Compuertas antes de publicar

- [x] 8.4.1 Backend: las de 8.1.8. 33 suites en verde el 14-oct, también en el servidor antes de reiniciar.
- [x] 8.4.2 Front: build de producción (14-oct, `dist-opttia-f2`, EXIT=0, mismos avisos de siempre), uno a la vez y solo quien integra, con salida al scratchpad. El conteo de gradientes y primarios prohibidos de `components/en-vivo/` no sube, y ninguna clase nueva contiene "p-".
- [x] 8.4.3 Playwright con la API simulada, a 1440 y 390 px (14-oct, `humo-opttia-f2.js`). Pasan:
  - dos toques, el cuerpo `{propuestaId, items}` y un resultado mezclado;
  - "Abrir WhatsApp" y "sin celular";
  - "Ya pagó";
  - "ocultar", TV y repetición, sin botón y sin pedidos del enlace;
  - sin la bandera, "Abrir pedido" queda de principal.

  Riesgo abierto: en un celular, el navegador puede bloquear la pestaña de WhatsApp si el enlace tarda. Se revisa en 8.5.3. Lo pedido:
  - producción en sombra y encendida: dos toques, resultado por pedido, "Ya estaba" y "Lo está aprobando";
  - cobro con "Abrir WhatsApp" y sin celular;
  - TV, "ocultar" y "Repetir el día" sin botones, y la red sin pedidos del enlace.
- [ ] 8.4.4 Revisión de seguridad del alcance contra "D-422 fase 2" del cambio privado del backend, sin escribir el detalle aquí.
- [ ] 8.4.5 Daniel aprueba el diff del backend que toca `orders` (8.1.4) antes de desplegar.

### 8.5 Despliegue, comercio por comercio y con el OK de Daniel

- [x] 8.5.1 (14-oct, `9232464`, `katuq-api` en línea) Desplegar el backend: `git pull`, `--ff-only` en el servidor, `set -e`, HEAD verificado, `node --check` y las suites, y `pm2 restart katuq-api`. Si hay commits ajenos sin desplegar, preguntar antes. Sin banderas nuevas, nada cambia.
- [x] 8.5.2 (14-oct, 2026.10.14.2, verificado en sellercenter.katuq.com) Publicar el front: `git pull`, `npm run build:prod`, `node scripts/verify-dist-prod.js`, `firebase deploy --only hosting` y commit de `src/assets/version.json`, con una versión mayor que la viva. `opttiaProduccion` no se prende antes de este paso: el front de la fase 1 no sabe aprobar la producción.
- [ ] 8.5.3 (14-oct: banderas encendidas y verificadas. Con datos reales, la cola muestra la producción "on" de CER-000009 y CER-000006 y el enlace de CER-000010. Falta la prueba de Daniel con su sesión) Encender FLORECER primero, con `opttiaProduccion` y `opttiaCobroWhatsapp` (`scripts/set-company-feature.js`: simular y luego `--execute`). Antes, verificar otra vez `CUSTOMER_NOTIFY_STATES`. Con la sesión de Daniel y pedidos de prueba:
  1. ver la producción encendida y aprobarla en dos toques;
  2. ver en el pedido la marca de Opttia, en el historial quién aprobó, la notificación interna y ningún aviso al cliente;
  3. aprobar otra vez y ver "Ya estaba en producción";
  4. tocar "Abrir WhatsApp" en un pedido de prueba sin pago y confirmar que no aparece en TV ni con "ocultar";
  5. ver el inventario de los pedidos de prueba sin cambios;
  6. cancelar los pedidos de prueba.
- [ ] 8.5.4 Seguir 2 días en FLORECER: aprobaciones de producción con la marca de Opttia, pedidos que quedaron fuera, errores y ningún aviso al cliente por "En producción".
- [ ] 8.5.5 Los demás comercios, uno por uno con Daniel. OH MY STORE no produce, así que su perfil no muestra la producción. Rollback: apagar la bandera del comercio, o `OPTTIA_PROPUESTAS_HABILITADO=false` para todos.
- [ ] 8.5.6 Cierre de la fase 2 en la bitácora de D-422.

## 9. Fase 3: inventario y compras, una operación a la vez

- [ ] 9.1 "Contar lo que no cuadra":
  - abre un conteo cíclico y solo escribe la sesión de conteo;
  - `posTienda()` en la escena;
  - prueba de contrato D-134: productos, variantes, precios y listas de precios no cambian.
- [ ] 9.2 "Reponer": orden de compra abierta y anulable, que solo escribe la orden. Va con su prueba de contrato del write-set.

## 10. Fase 4: integraciones y canales

- [ ] 10.1 "Reenviar a la integración logística":
  - detector nuevo con su índice;
  - ejecución por la capa común de proveedores, con candado, búsqueda previa e idempotencia;
  - primero en sombra en OH MY STORE.
- [ ] 10.2 Las mismas propuestas por MCP y Telegram, con un comprobante firmado de 10 min y canje por botón. Requiere pasar `OPTTIA_WRITE_MODE` a `dry_run` o `live`, con el visto bueno de Daniel.
- [ ] 10.3 Señal barata `propuestas-version` en el canal en vivo, para pedir la cola solo cuando algo cambie.
- [ ] 10.4 `openspec validate --strict`, cierre de D-422 y archivo del cambio. Se archiva después de `tablero-en-vivo` y `despachos-con-opttia`.
