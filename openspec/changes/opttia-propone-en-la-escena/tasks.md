## 0. Fase 0: spec y checkpoint

- [x] 0.1 Crear este cambio con proposal, design, tasks y los deltas de `despachos-en-vivo`, `opttia-en-vivo`, `tablero-en-vivo` y `perfil-de-despacho`. Validarlo con `openspec validate opttia-propone-en-la-escena --strict`. → 13-oct, válido.
- [x] 0.2 Registrar D-421 en `specs/CONTRACT.md`. Reemplaza la parte "pestaña" de D-410. → 13-oct: la propuesta la llamaba D-418 y luego D-419, pero otras sesiones publicaron D-418 (ticket 1206), D-419 (facturación POS) y D-420 (mapa de mensajeros) ese mismo día, así que quedó D-421.
- [x] 0.3 En el repo privado del backend, agregar la sección "D-421 fase 1" con la seguridad del alcance a `openspec/changes/opttia-despachos-con-aprobacion/tasks.md`.
- [ ] 0.4 Daniel revisa los deltas. La propuesta y el boceto ya están aprobados ("dale, arranca con la fase 1"), así que la fase 1 arranca en paralelo. Cualquier ajuste a los deltas entra antes de publicar.

## 1. Fase 1, backend: ruta de solo lectura y ajustes de D-410 (repo `katuq_admin_back_firebase`)

- [ ] 1.1 Prueba de contrato de `GET /v1/opttia/propuestas`, roja primero. Casos:
  - 401 sin sesión;
  - la empresa sale del token aunque lleguen `?empresa=` o la cabecera `company`;
  - 200 `{disponible:false, motivo}` con el interruptor general apagado, con el interruptor de Opttia de la empresa apagado y con la bandera apagada;
  - nunca 403.
- [ ] 1.2 Registro cerrado de fuentes en `services/opttiaPropuestas/`, una por archivo en `fuentes/`, sin `if/else` por tipo. Una prueba fija que en la fase 1 el registro tiene exactamente `despachos` y `produccion`.
- [ ] 1.3 Pruebas puras de la fuente `despachos`:
  - una propuesta por grupo, con `grupo` tal cual;
  - el título de plantilla para mensajero, transportadora y "escoge mensajero";
  - urgente o importante según la franja y las alertas del plan;
  - las consecuencias;
  - la escena (`montones`, `veh`, `transportadora`, `color`);
  - la raíz `despachos`;
  - sin `puedeVer`, no hay propuestas;
  - `puedeAprobar` sale de `accesoPlan`.

  Luego la implementación, que envuelve `calcularPlanDeDespachos`.
- [ ] 1.4 Pruebas puras de la fuente `produccion`:
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
- [ ] 1.5 Caché por empresa y fuente (60 s y 5 min), con una sola llamada en vuelo y `invalidar(empresa)` exportada. Pruebas:
  - dos pedidos simultáneos hacen un solo cálculo;
  - después de invalidar se recalcula;
  - una empresa no ve la caché de otra.
- [ ] 1.6 Router `routers/opttiaPropuestas.js` en `/v1/opttia/propuestas`, montado en `index.js`, con:
  - `auth` y `requireJwtTenant`;
  - el interruptor `OPTTIA_PROPUESTAS_HABILITADO` (solo `"false"` apaga);
  - el interruptor de Opttia de la empresa;
  - `version` como huella de la respuesta.

  Revisar la clasificación de solo lectura en `middleware/soloLectura.js`.
- [ ] 1.7 Prueba de contrato del write-set: con una base simulada que prohíbe toda escritura, el GET con las dos fuentes hace 0 escrituras. Ninguna consulta sale sin el filtro de la empresa.
- [ ] 1.8 D-410: `"escena"` en `CANALES` (`ejecutarPlan.js`). `POST /aprobar` toma `canal` del body solo si es `"en-vivo"` o `"escena"`. Tras aprobar, el controlador llama `invalidar(empresa)`. Va con su prueba.
- [ ] 1.9 D-410: `POST /explicar` revisa el interruptor de Opttia de la empresa. Si está apagado, responde sin frase y sin llamar a Opttia. Va con su prueba.
- [ ] 1.10 Cierre del backend:
  - `node --check`;
  - las suites de `tests/opttiaPropuestas/`, `tests/despachos/` y `tests/enVivo/`, estas últimas iguales que antes y con `services/enVivo/` sin escrituras;
  - sin `console.log` de telemetría.

## 2. Fase 1, front: estado, reglas y aprobación

- [x] 2.1 Contrato tarjeta ↔ escena: `propuestas/propuestas.modelos.ts` y `propuestas/propuestas-escena.puente.ts`.
- [ ] 2.2 Prueba de caracterización de `paraAprobar` y de la serie de "Aprobar todo" del componente de la pestaña, antes de moverlos. Así se prueba que el servicio arma el mismo cuerpo de aprobación.
- [ ] 2.3 `propuestas.reglas.ts`, puro, con pruebas en node:
  - orden por prioridad, hora límite y valor;
  - "Después" (30 min) y "No hoy" por huella, con `localStorage` en try/catch;
  - vejez por grupo, que ignora la repetición;
  - cuándo pedir: espera de 20 a 30 s, respaldo de 5 min, TV a lo sumo cada 5 min y solo con la escena visible;
  - señales de cobro desde `radar.atencion` (`sin_pago`);
  - paso a `PropuestaEnEscena`;
  - contador y saludo de plantilla.
- [ ] 2.4 `EnVivoPlanDespachosService.aprobar(grupos, canal?)` manda `canal: 'escena'` desde la tarjeta. La pestaña sigue mandando lo de hoy hasta que se quite.
- [ ] 2.5 `EnVivoPropuestasService` (root, `extends BaseService`, sin el cargador global):
  - el GET de la cola;
  - el estado `{cola, actual, aplicando, resultados, viejoPorGrupo, bloqueado}`;
  - la lógica extraída: `paraAprobar`, `editable`, `conQuien`, `opcionesDe`, `sinRespuesta`, `mensajeDe` y la serie con `concatMap` y `takeWhile`;
  - el mapa de ejecutores por tipo.

  Llama `puente.mostrar()` y `puente.contar()`.

## 3. Fase 1, front: tarjeta y hoja (`EnVivoPropuestasModule`)

- [ ] 3.1 `app-en-vivo-sugerencia`, OnPush, en `.ev-escena-slot` entre la narración y la ficha:
  - eyebrow, título, razón, frase opcional y chips;
  - Aprobar, Ajustar, Después y el menú con "No hoy";
  - modo `on` con Aprobar, modo `sombra` con "Así lo haría Opttia · pronto podrás aprobarlo" y sin botón, y modo `senal` con "Abrir pedido".
- [ ] 3.2 Aprobar en dos toques:
  - "Confirmar: <efecto>", que vuelve solo a los 5 s;
  - "Despachando…" con su propio indicador;
  - bloqueo de 1,5 s después de pasar sola a la siguiente;
  - resultado por grupo;
  - "Aprobar los N grupos" solo si todos son de mensajero, y las transportadoras de a una;
  - grupo viejo bloqueado.
- [ ] 3.3 Cero ruido:
  - una tarjeta a la vez, y lo urgente entra de siguiente;
  - a los 45 s se retira el ensayo y queda el contador;
  - "Todo al día. Te aviso si sale algo";
  - ← → Enter Esc;
  - `aria-live="polite"` solo para la propuesta nueva;
  - `:focus-visible`.
- [ ] 3.4 `app-en-vivo-sugerencia-ajuste`:
  - hoja lateral de 368 px, y abajo con velo en 620 px o menos;
  - `grupo-despacho` y `fuera-del-plan` exportados por `EnVivoDespachosModule`;
  - la línea del perfil, si el contrato la trae (ver design, "Risks");
  - el foco vuelve a la tarjeta al cerrar.
- [ ] 3.5 A 390 px:
  - la tarjeta va acoplada abajo en lugar de la narración, hasta el 45 % del alto;
  - Aprobar a todo el ancho y 48 px de alto;
  - la razón detrás de "¿Por qué?";
  - el margen `abajo` en `margenes-escena.ts`.
- [ ] 3.6 TV y "Repetir el día":
  - en TV, botones ocultos, "Apruébalo desde tu celular", "ocultar" respetado y "Aprobado desde el celular" durante 6 s;
  - en la repetición, la tarjeta y la capa se esconden, los eventos simulados se ignoran y al volver se pide la cola una vez.
- [ ] 3.7 Montaje con `*ngIf` en operacion, pais y pedidos. Requiere Opttia prendido, sin `soloLectura`, sin `soloPropias`, sin `?empresa=` y con `disponible:true`.

## 4. Fase 1, front: escena y orbe (solo lectura)

- [ ] 4.1 Pruebas puras, sin three, de lo que calcula la capa:
  - montones por grupo y fila numerada;
  - topes de 6 grupos y 40 fantasmas;
  - colores de `CHAQUETAS`;
  - qué se atenúa.
- [ ] 4.2 `escenas/capa-propuesta.ts` por los ganchos aditivos de `EscenaBase`:
  - fantasmas con `InstancedMesh`;
  - anillos y líneas punteadas;
  - atenuado al 40 % con un material compartido;
  - efectos `montones`, `fila` y `moneda`;
  - fuera de la zona de Angular.
- [ ] 4.3 `OperacionEnVivoEscena.prepararVehiculo(nombre)`, con etiqueta en el montón si no hay moto libre, y `posCasa(pedidoId)`.
- [ ] 4.4 Orbe:
  - `EnVivoOrbeService.proponer/retirarPropuesta`;
  - estado "propuesta" en `GuiaOpttia`, que `cortar()` no suelta;
  - `OrbeOpttia.senalar` en modo fijo;
  - el botón del orbe con el contador, el halo que late dos veces y `pedirTarjeta()`.
- [ ] 4.5 Doble vía: tocar un montón llama `puente.tocarGrupo` y la tarjeta enfoca su fila; pasar el puntero por un grupo resalta su montón.
- [ ] 4.6 Mi país: arco fijo para los grupos de transportadora, que al aprobar pasa a ser el arco de salida. Pedidos: `usarMarcas('pedido')` en las tarjetas del grupo.
- [ ] 4.7 Sin WebGL, la tarjeta lista los números. Con calidad baja, las líneas no se animan. Con "reducir movimiento", solo anillos y líneas.

## 5. Fase 1, front: quitar la pestaña y la narración nueva

- [ ] 5.1 Quitar `OPCION_DESPACHOS`, `'despachos'` de `SIN_ESCENA`, la suscripción de la insignia y el `ngSwitchCase`. Con la vista guardada `despachos`, la página abre en `operacion`.
- [ ] 5.2 `EnVivoDespachosModule` exporta `grupo-despacho` y `fuera-del-plan`. El componente de la vista completa queda sin uso hasta la tarea 7.5.
- [ ] 5.3 Narración:
  - la línea "plan" pasa a "Organicé N pedidos en M salidas; apruébalas aquí", solo sin tarjeta;
  - el saludo de plantilla, una vez;
  - se calla con tarjeta;
  - si hay algo urgente y el sonido está prendido, un tono una vez.

## 6. Fase 1: compuertas antes de publicar

- [ ] 6.1 Build de producción sin errores, uno a la vez y solo quien integra, con salida al scratchpad: `node --max_old_space_size=8192 node_modules/@angular/cli/bin/ng build --configuration=production --output-path=<scratchpad>/dist-opttia-f1`.
- [ ] 6.2 En `components/en-vivo/`:
  - el conteo de `(linear|radial)-gradient(` y de los primarios prohibidos no sube;
  - ninguna clase nueva contiene "p-".
- [ ] 6.3 Playwright con la API simulada, a 1440 y 390 px:
  - sin scroll horizontal ni texto invisible;
  - la tarjeta, los dos toques, Ajustar, TV, "Repetir el día", sin WebGL, "reducir movimiento" y "ocultar".
- [ ] 6.4 Pruebas puras de `propuestas.reglas` y de la capa, en verde.
- [ ] 6.5 Revisión de seguridad del alcance contra la sección "D-421 fase 1" del cambio privado del backend, sin escribir el detalle en este repo.

## 7. Fase 1: despliegue (con el OK de Daniel)

- [ ] 7.1 Desplegar el backend:
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
- [ ] 7.3 Publicar el front:
  - `git pull`;
  - `npm run build:prod`;
  - `node scripts/verify-dist-prod.js`;
  - `firebase deploy --only hosting`;
  - commit de `src/assets/version.json`, con una versión mayor que la viva.

  La pestaña desaparece en este mismo despliegue.
- [ ] 7.4 Seguir 2 días en OH MY STORE y ALMARA FELICIDAD: aprobaciones por canal "escena", grupos que quedaron fuera y errores.
- [ ] 7.5 Borrar `EnVivoDespachosComponent` como vista completa y lo que quede sin uso.
- [ ] 7.6 Bitácora de la fase 1 en D-421.

## 8. Fase 2: primera escritura nueva y cobro con WhatsApp (cada uno en su propio cambio)

- [ ] 8.1 Producción, en un cambio aparte porque `orders` es un módulo sensible:
  - `POST /v1/opttia/propuestas/produccion/aprobar` con huella por pedido;
  - `updateOrderInternal` de SinProducir a EnProduccion;
  - id determinista y auditoría en el historial;
  - prueba de contrato del write-set, que también prueba que no se avisa al cliente.

  Antes de encender, verificar que la configuración de producción no cambie los estados que avisan al cliente.
- [ ] 8.2 Bandera por operación, con modos apagado, sombra y encendido. Reemplaza el uso de `despachosOpttia` como "Opttia propone". La producción pasa de sombra a encendida comercio por comercio, primero en FLORECER.
- [ ] 8.3 Cobro con "Abrir WhatsApp":
  - el enlace se pide por pedido al tocar, con sesión, menú y el alcance de D-349;
  - el mensaje sale de una plantilla;
  - el teléfono no existe en TV ni con "ocultar".

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
- [ ] 10.4 `openspec validate --strict`, cierre de D-421 y archivo del cambio. Se archiva después de `tablero-en-vivo` y `despachos-con-opttia`.
