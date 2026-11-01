# Tareas — corregir precio del pedido (1355 / D-543)

**Estado: APROBADAS por Daniel: «Apruebo las tareas de ambos; implementa y valida». Implementación en curso; los diffs sensibles conservan su gate previo.** 23-oct-2026. Spec y [diseño](design.md), incluidos [contratos](contracts.md) y [lectores](readers.md), aprobados: «Apruebo ambos diseños y la adaptación». Casillas se completan solo con evidencia verificable. D-544 extiende este núcleo en [sus tareas](../cambiar-lista-precios-pedido/tasks.md).

## Reglas de ejecución y entrega

- Cada tarea recibe el contrato aprobado y produce una unidad verificable. Las unidades incompletas pueden integrarse únicamente con las acciones apagadas; no son una habilitación independiente. No se avanza con compilación rota.
- Antes de editar, releer instrucciones y archivos actuales de cada repositorio, contrastar cambios concurrentes y registrar la línea base. Backend: no importar/arrancar `index.js`, jobs ni proveedores reales para pruebas; usar módulos aislados, dobles y emulador sin credenciales productivas.
- **Gate S por cada cambio sensible:** preparar el diff concreto fuera de los archivos activos, con alcance, pruebas y write-set; obtener aprobación explícita antes de aplicarlo. Aplicar y comprobar **un cambio de orders/fiscalidad a la vez**, también en tareas sin etiqueta `[P]`. Una aprobación de tareas no sustituye este gate de `openspec/config.yaml`. No pedir aprobar un diff que aún no existe.
- Cada tarea de código termina con comprobación de sintaxis/compilación y pruebas relevantes: backend `node --check` de fuentes cambiadas y suites afectadas; frontend compilación Angular sin errores y pruebas del bloque. T-42 hace además build de producción y revisión de versión. No modificar expectativas canónicas para acomodar el cambio.
- `[P]` solo permite trabajar simultáneamente en archivos independientes expresamente asignados, con contratos congelados. Router/controlador de pedidos, calculador, permisos, D-541 y `list.component.*` son secuenciales. Preparar pruebas independientes en paralelo no permite aplicar diffs sensibles simultáneos.
- No hay migración/backfill previsto. Si fuera necesario, detener esa ampliación, proponerla y comenzar por `--dry-run` tras su autorización. No crear colecciones, endpoints v2 o fórmulas monetarias paralelas.
- Estas tareas **no incluyen publicación, activación ni concesión de permisos reales**, ni reparación del pedido real de 1352. Esas operaciones tendrán un checkpoint concreto con evidencia; la autorización del lote antiguo 1315/1313 no se hereda.

## Contratos y línea base

- [x] **T-01 — Inventariar dependencias, escritores y gates operativos.**
  - **Entrada/salida:** diseño y código actual → inventario fechado de rutas escritoras, proyecciones, gestión de roles/usuarios/reglas Firebase, estado real de D-541 y responsables de archivos concurrentes.
  - **Éxito:** se identifican escrituras completas además de genérico/batch/cierre, versión efectiva de D-541 y reglas; una dependencia ausente queda como bloqueo de habilitación, sin presumirla implementada ni ampliar D-512. Identificar plataforma/build mensajero usado en ALMARA o registrar evidencia pendiente.
  - **Archivos:** `findings.md`, `readers.md`; lectura de repositorios, reglas y artefactos D-541, sin editar trabajo ajeno.
  - **Dependencias:** aprobación de estas tareas.

- [x] **T-02 [P] — Caracterizar importes y pagos antes del cambio.**
  - **Entrada/salida:** fixtures sintéticos y motor actual → casos de referencia legacy/canónicos y fixture 1352 de total 43.400, pagado 21.700 y saldo 21.700.
  - **Éxito:** manual 6.000 frente a snapshot 1 reproduce el fallo local conocido sin atribuirlo a producción; cubrir cero, dos líneas iguales, IVA individual, descuentos, envío, extras en sus dos representaciones y excedente. Caracterizar estados reales de pago, incluido `Anulado`, sin cambiar su política ni las banderas globales de IVA.
  - **Archivos:** nuevas pruebas/fixtures aislados `functions/tests/orders/priceChange/`; referencia a suites actuales de precio manual, overrides, anticipo, saneamiento y descuento de lista.
  - **Dependencias:** T-01; no modificar fixtures compartidos mientras otra tarea los usa.
  - **Adenda 23-oct / S-05 aprobado y aplicado:** la corrección concurrente de1352 retiró los métodos de recálculo de los lectores actuales. Se conservan20 expectativas históricas mediante fixtures con commit/hash y una prueba nueva del saldo persistido en ambos lectores reales.21/21 en cada modo, sin modificar frontend; [evidencia y diff aprobado](review/s05-financial-breakdown/README.md).

- [x] **T-03 [P] — Fijar contrato de options con pruebas previas.**
  - **Entrada/salida:** sección options de `contracts.md` → pruebas de esquema cerrado, capacidades, referencias de línea, permisos y errores de `POST /options`.
  - **Éxito:** pedido ajeno 404, error sin capacidad positiva, cero escrituras/eventos/avisos incluso por instrumentación; ninguna clave persistida se crea al consultar. Líneas repetidas no se identifican solo por producto.
  - **Archivos:** `functions/tests/orders/priceChange/options.contract.test.js` nuevo; pruebas inicialmente rojas sin añadir un endpoint ficticio.
  - **Dependencias:** T-01.
  - **Avance 23-oct:** entradas y comprobantes [aprobados y aplicados en S-02](review/s02-price-preparation/README.md),95/95 con S-01 desde backend local Node20. Los contratos HTTP/respuestas/efectos de endpoint y sus integraciones siguen pendientes; no se marca completa.

  - **S-06 aprobado y aplicado:** contratos de options y composición real con acceso S-01, snapshot completo, disponibilidad y cero escrituras válidas cubiertos en las suites de lectura/integración. [63 pruebas nuevas y diff](review/s06-read-preview/README.md); auditoría existente de rechazos preservada. Gate S-06 aprobado; verificación activa298/298 sin loader.

- [x] **T-04 [P] — Fijar contrato de preview con pruebas previas.**
  - **Entrada/salida:** DTO antes/después y firma aprobados → pruebas de `POST /preview` con identidad, motivo, importes, digest y expiración.
  - **Éxito:** cero escrituras/avisos/proveedores; rechaza campos extras/dotted keys, precios inválidos, línea ajena y marca incompleta. Un cero explícito es válido. Cubre token sin motivo en claro y claves provisionales deterministas.
  - **Archivos:** `functions/tests/orders/priceChange/preview.contract.test.js` nuevo, sin editar el archivo de T-03.
  - **Dependencias:** T-01.
  - **Avance 23-oct:** entradas y comprobantes [aprobados y aplicados en S-02](review/s02-price-preparation/README.md),95/95 con S-01 desde backend local Node20. Los contratos HTTP/respuestas/efectos de endpoint y sus integraciones siguen pendientes; no se marca completa.

  - **S-06 aprobado y aplicado:** preview devuelve whitelist S-05 completa y firma intención, lecturas, modo y resultado; pruebas de servicio e integración HTTP con JWT sintético y fuentes reales. [298/298 conjuntas](review/s06-read-preview/README.md); no acredita confirmación o producción.

- [ ] **T-05 [P] — Fijar contrato de confirm y repetición con pruebas previas.**
  - **S-11 candidato, sin aplicar:** transporte y37 pruebas nuevas (17HTTP reales con deps sintéticas);529/529 conjuntas y96/96 historial,37/37 nuevas Node24/canónicas. [Diff y límites](review/s11-confirm-http/README.md).
  - **S-09 aprobado y aplicado:** servicio transaccional/recibo/proyección pública y presupuesto del documento completo. 432/432 conjuntas Node20, 69/69 nuevas Node24 y 96/96 historial existente; diez JS compilan. Contrato HTTP efectivo sigue pendiente. [Diff y límites](review/s09-transactional-confirmation/README.md).
  - **Entrada/salida:** secuencia y errores de `contracts.md` → pruebas de `POST /confirm`, respuesta persistida y write-set por intención.
  - **Éxito:** casos de replay, expirado ya aplicado/no aplicado, mismo id con otro hash, operación superada, pago posterior, permiso revocado y timeout; cero efectos comerciales fuera del patch autorizado. Resultado aplicado/historial pendiente se distingue de un rechazo sin cambio.
  - **Archivos:** `functions/tests/orders/priceChange/confirm.contract.test.js` nuevo.
  - **Dependencias:** T-01.
  - **Avance 23-oct:** entradas y comprobantes [aprobados y aplicados en S-02](review/s02-price-preparation/README.md),95/95 con S-01 desde backend local Node20. Los contratos HTTP/respuestas/efectos de endpoint y sus integraciones siguen pendientes; no se marca completa.

## Acceso, acuerdo y endpoints

  - **S-07 aprobado y aplicado:** material/digests S-06 compartidos y patch financiero puro desde RAW, con reprepare y contexto servidor independiente. 319/319 desde backend activo sin loader; 21/21 nuevas Node24 en revisión; sin transacción/ruta/recibo/cápsula. [Diff y límites](review/s07-confirmation-preparation/README.md); la tarea sigue parcial.

- [x] **T-06 — Resolver acceso financiero desde la identidad vigente.**
  - **Entrada/salida:** JWT, modelo real de usuarios/roles y T-03–05 → módulo de acceso específico `priceChange/access.js`, tenant validado y capacidades explícitas.
  - **Éxito:** usuario único por empresa/identificación firmadas, sin asumir `sub=docId`; rol vigente único del mismo tenant, sin bypass por Administrador/plataforma, headers, `*` o permiso `edit`. Revalidación transaccional de identidad, revocación y flags; ambigüedad/ausencia falla cerrada. Flags D-505 ausentes equivalen a apagado, sin escrituras de configuración.
  - **Archivos:** módulo y pruebas nuevos bajo `functions/services/orders/priceChange/`; integración mínima con auth/tenant existentes, conservándolos.
  - **Dependencias:** T-01, T-03, T-04, T-05; gate S para cualquier integración sensible.
  - **Avance 23-oct:** [S-01 aprobado y aplicado](review/s01-access/README.md): «Apruebo S-01; aplícalo y continúa». Hash exacto comprobado, sintaxis limpia y 33/33 desde el backend local. No se marca T-06 completa ni se adelanta el enganche de endpoints; T-03–05 siguen pendientes.

  - **S-06 aprobado y aplicado:** acceso S-01 compuesto con middleware real de auth/soloLectura/tenant en HTTP local; confirma permiso vigente y rechaza header ajeno/API key, sin otorgar bypass. Config/DB/SQS sintéticos; ver [integración](review/s06-read-preview/integration-notes.md). Gate S-06 aprobado; verificación activa298/298 sin loader.

- [ ] **T-07 — Proteger la administración de las dos capacidades nuevas.**
  - **Entrada/salida:** mapas actuales y censo de roles → guard administrativo transaccional acotado, validación de creación/edición y exclusión de concesiones automáticas.
  - **Éxito:** introducir/quitar/transportar `correct_price`/`change_price_list` requiere gestor administrador vigente del tenant JWT y comparación anterior/nueva. También proteger cambios de `clientes.edit` si el rol anterior o resultante tiene `change_price_list`: conservar idéntica esa acción no permite autoconcederse la ficha opcional por el guard legacy. Regresión: solo lista concedida → intento no autorizado de agregar clientes.edit rechazado → confirm con ficha sigue denegado. Omitir permissions conserva su forma; proteger identidad/empresa, dotted keys y cambios de representación. Ausencia/`[]` vacío solo se convierte por opt-in explícito; formatos no vacíos incompatibles bloquean estos controles. Pruebas de usuarios/rutas/Firebase impiden autoconcesión; si requieren seguridad general aparte, el piloto sigue bloqueado.
  - **Archivos:** rutas/controlador/validadores de roles y controles acotados identificados en T-01; pruebas de acceso multiempresa. No editar datos de roles ni reglas generales sin diff revisado.
  - **Dependencias:** T-06, T-01; gate S antes de aplicar.

- [ ] **T-08 — Exponer controles explícitos en el editor de roles.**
  - **Entrada/salida:** T-07 y mapa canónico → modelo compatible, catálogo y controles de las dos acciones; opt-in de conversión visible para cada rol elegible.
  - **Éxito:** `allPermissions()`/plantillas/Administrador no conceden acciones nuevas; guardar sin cambios preserva exactamente ausencia/`[]`/mapa y otros módulos. No perder grants explícitos, ni aceptar conversiones ambiguas. QA con fixtures, sin guardar roles productivos; su presentación vuelve a verificarse en T-42 después de compilar este bloque.
  - **Archivos:** `roles.ts`, `modules-catalog.ts`, `role-templates.ts`, `roles.component.*` en sus rutas actuales verificadas; tests y estilos canónicos del editor tocado.
  - **Dependencias:** T-07.

- [x] **T-09 — Acreditar el acuerdo histórico y la identidad de todas las líneas.**
  - **Entrada/salida:** pedido persistido y T-02 → preparador puro de bootstrap/acuerdo, esquema cerrado y claves estables/provisionales.
  - **Éxito:** ninguna base previa se toma de catálogo fresco; conciliar snapshot, overrides, extras, descuentos e importes con precisión actual. Datos insuficientes o inconsistentes → `AGREEMENT_INVALID`, sin alterar otras líneas. Dos líneas iguales conservan identidades distintas; repetir preparación deriva las mismas claves para esa operación.
  - **Archivos:** módulos pequeños nuevos en `functions/services/orders/priceChange/` y sus pruebas, sin escribir aún pedidos.
  - **Dependencias:** T-02, T-04.
  - **Avance 23-oct:** Identidad/versionado de línea aprobado y aplicado en S-02. Acreditación histórica y adaptador de pricingAgreement [aprobados y aplicados en S-03](review/s03-agreed-prices/README.md),151/151 desde backend activo; integración pendiente; casos sin fuente histórica demostrable siguen bloqueados. No se marca completa.

- [x] **T-10 — Dar precedencia al acuerdo en el calculador existente.**
  - **Entrada/salida:** T-09 y casos de referencia → resolución de `pricingAgreement` en caminos legacy/canónico de `orderCalculationService` y campos resueltos actuales.
  - **Éxito:** sustituir solo base elegida sin perder IVA, descuentos, cantidades, envío o extras; cero por presencia, marca inválida sin fallback. Pagos actuales siguen determinando pagado/saldo y `overpaymentAmount` separado. Catálogo posterior no cambia pactos; sin marca y casos de spec 010 conservan resultados. Sin activar banderas globales ni introducir otra fórmula.
  - **Archivos:** calculador y helpers actuales leídos previamente, pruebas de T-02/T-09 y contratos de cálculo.
  - **Dependencias:** T-09; gate S antes de aplicar.
  - **Avance 23-oct:** Calculador S-03 aprobado y aplicado,56 pruebas nuevas,22 salidas completas congeladas y regresiones existentes verdes;151/151 desde backend activo. integración/lectores y gates de entrega pendientes.
  - **S-05 aprobado y aplicado:** desglose por línea capturado del mismo motor y ajustes separados;235/235 conjuntas Node20,23/23 financieras nuevas Node24 y cinco suites existentes verdes. No distribuye descuento fijo ni introduce otra resolución de precios. [Diff aprobado](review/s05-financial-breakdown/README.md),235/235 desde backend activo sin loader; T-10 permanece parcial.

- [x] **T-11 — Implementar comprobante firmado y huellas.**
  - **Entrada/salida:** contrato de token → `priceChange/comprobante.js` con HS256 exclusivo, derivación de llave existente, esquema, digest y vigencia.
  - **Éxito:** actor/tenant/pedido/operación/intención/resultado/calculador vinculados; huellas incluyen updateTime y datos relevantes. Máximo 10 min y límite comercial; algoritmo/propósito/llave inválidos fallan cerrados. Sin secreto nuevo, tokens/motivos en logs o cambios al TTL de MCP.
  - **Archivos:** codec y tests nuevos; solo lectura de precedentes `mcp/confirmacion.js` y `despachos/comprobantePlan.js`.
  - **Dependencias:** T-04, T-09.
  - **Avance 23-oct:** Codec y huellas aprobados y aplicados en S-02, sin integración; no acredita cálculo ni recibo transaccional.

  - **S-06 aprobado y aplicado:** integración del codec con DTO completo, snapshots/mode y propósito exclusivo verificada; TTL 600 s y comprobante rechazado como autenticación. Confirm/recibo siguen en T-14, sin declarar transacción validada.

- [x] **T-12 — Implementar POST options como lectura autorizada.**
  - **Entrada/salida:** T-03 y acceso/acuerdo → controlador dedicado de options y registro v1 normal.
  - **Éxito:** pruebas T-03 verdes; referencias y capacidades del servidor, bloqueo fiscal/financiero claro, ninguna escritura/aviso. La respuesta no concede autorización futura ni filtra datos ajenos o cápsulas del historial.
  - **Archivos:** controlador dedicado, `routers/orders.js`, preparación/acceso; tests options.
  - **Dependencias:** T-06, T-09, T-10, T-11; gate S antes de aplicar ruta de orders.
  - **Preparación 23-oct:** borrador separado S-06 de HTTP/privacidad/uso, dependiente de S-05. Sin aplicar o declarar endpoint completo. Conserva auditoría de seguridad de rechazos; solo los dos nuevos POST de lectura se excluirán del contador global de uso para no escribir en consultas válidas.

  - **S-06 aprobado y aplicado:** dos rutas con guards conservados, privacidad morgan/rendimiento/Sentry y errores de parsers cubiertos. Lecturas válidas sin apiUsage/DB/SQS; auditoría tenant de rechazos sigue activa. Patch de 15 archivos aplicado con aprobación explícita; [alcance/evidencia](review/s06-read-preview/README.md).

- [x] **T-13 — Implementar POST preview de precio de línea.**
  - **Entrada/salida:** T-04 y núcleo → vista previa autoritativa con antes/después completos, motivo, operationId y token, sin persistirlos.
  - **Éxito:** pruebas T-04 verdes; producto real del tenant con precio editable, solo base sin IVA elegida cambia; preparación no registra ids, recibos, historial ni notificaciones. Ningún total aceptado del cliente.
  - **Archivos:** preparación/controlador dedicado y ruta `/preview`; pruebas de preview.
  - **Dependencias:** T-12, T-10, T-11; gate S.
  - **Avance 23-oct:** preparación financiera y guard fiscal/financiero puros aprobados y aplicados en S-04,40 pruebas nuevas;191/191 desde backend activo. Sin composición HTTP/firma/transacción; T-13 permanece parcial.
  - **S-05 aprobado y aplicado:** añade antes/después completos por línea, cantidad y ajustes de cabecera; los DTOs se construyen desde el cálculo acreditado. No incluye rutas, firma integrada o confirmación.235/235 Node20 con caracterización desde backend activo; [diff financiero aplicado](review/s05-financial-breakdown/README.md). T-13 sigue parcial.

  - **S-06 aprobado y aplicado:** composición HTTP/firma y DTO S-05 completa en candidato; 298/298 conjuntas Node20, 63/63 nuevas en modo canónico y Node24. Confirmación, UI y piloto siguen pendientes. [Diff aprobado y aplicado](review/s06-read-preview/README.md).

- [ ] **T-14 — Implementar POST confirm transaccional de precio de línea.**
  - **S-11 candidato, sin aplicar:** ruta auth→requireJwtTenant, transporte/lazy singleton y privacidad de consumo. No cambia el núcleo S-09/S-10. HTTP local cubierto; emulador, aplicación y gates previos a activación continúan pendientes.
  - **S-09 aprobado y aplicado:** compone S-01–S-08 con replay antes de cálculo, nueva autorización/digests/TTL por intento y único update financiero+recibo+cápsula; sin ruta, proyector o activación. [Evidencia](review/s09-transactional-confirmation/README.md); la tarea sigue parcial.
  - **Entrada/salida:** T-05 y preview → confirmación dedicada con pedido/recibo/cápsula atómicos y resultado persistido.
  - **Éxito:** todos los gets antes de writes; revalidar usuario/rol/flags/producto/pagos/cierres/fiscalidad/updateTime/resultado. Replay devuelve pedido actual sin pisar pagos; expirado solo reconoce aplicación existente; otras condiciones de T-05 verdes. Patch cerrado, límites de documento/cápsula antes de commit; no `updateOrderInternal`, inventario, facturas, correos ni devoluciones.
  - **Archivos:** `priceChange/confirm.js`, controlador y ruta `/confirm`; pruebas contract/integración con emulador. Proyección se conecta tras T-16; hasta entonces no habilitar.
  - **Dependencias:** T-13, T-05; gate S. T-15/16 y demás gates son obligatorios antes de entrega habilitada.

## Historial recuperable y escritores posteriores

  - **S-07 aprobado y aplicado:** material/digests S-06 compartidos y patch financiero puro desde RAW, con reprepare y contexto servidor independiente. 319/319 desde backend activo sin loader; 21/21 nuevas Node24 en revisión; sin transacción/ruta/recibo/cápsula. [Diff y límites](review/s07-confirmation-preparation/README.md); la tarea sigue parcial.

- [ ] **T-15 — Extender el catálogo y lector D-541 para eventos de precio.**
  - **S-08 aprobado y aplicado:** evento `line_price_corrected` completo, preflight cerrado y acuse de duplicado mediante contenido verificado en el escritor único; lector modular expone `cambioPrecio` sin enriquecer actor. 363/363 conjuntas Node20, 96/96 existentes de historial y 44/44 nuevas Node24; diez JS compilan. GET efectivo, evento D-544 y seguridad operativa pendientes. [Diff y límites](review/s08-price-history/README.md); la tarea sigue parcial.
  - **Entrada/salida:** contrato D-541 realmente disponible → tipos `line_price_corrected` y `price_list_changed`, detalles cerrados y presentación del antes/después.
  - **Éxito:** validar evento completo y límites, conservar excepciones por línea y motivo sin truncado silencioso. Escritor único y colección aprobada; reglas/lector preservan aislamiento. No cambiar la política no bloqueante de otros eventos ni adelantar toda la F2 de D-541.
  - **Archivos:** catálogo/validadores/DTO y lector de historial existentes coordinados con su sesión, más pruebas; sin crear otra colección.
  - **Dependencias:** T-01, T-05; D-541 base verificado y gate S del diff compartido.

- [x] **T-16 — Proyectar cápsula idempotente después del commit.**
  - **S-10 aprobado y aplicado:** proyector/cleanup y hook confirm/replay con recibo exacto capturado;9 casos de composición y22 independientes de entrega, dentro de492/492 conjuntas. [Diff, write-set y límites](review/s10-history-delivery/README.md);17 hashes posteriores/sintaxis verificados y492/492 desde activo sin loaders.
  - **Entrada/salida:** T-14/T-15 → entrega con id determinista por operación usando exclusivamente el escritor D-541.
  - **Éxito:** `created/already_exists` permiten limpieza solo si eventId/operationId siguen coincidiendo. Error conserva payload y precio aplicado, devuelve history pending y bloquea otra corrección; replay intenta recuperar sin reaplicar dinero. No borrar/actualizar eventos ni limpiar cápsula ajena.
  - **Archivos:** módulo de entrega `priceChange/`, conexión confirm y pruebas de fallos/duplicados.
  - **Dependencias:** T-14, T-15; gate S.

- [ ] **T-17 — Recuperar entregas pendientes con avance justo.**
  - **S-10 aprobado y aplicado:** módulo de recuperación, registro cron diferido e índice declarado;23 casos de recuperación y6 de cron/índice, dentro de492/492 conjuntas. Límites50 empresas/5 IO/8s/50s y reserva25s documentados.492/492 desde activo y96/96 historial; gates operativos continúan pendientes. Índice/reglas/coexistencia productivos y activación siguen pendientes; no se escribe roster.
  - **Entrada/salida:** T-16 → reconciliador de 60 s, lotes de 25 por tenant del roster `config/order_price_change_recovery`, cursor efímero y corte D-505.
  - **Éxito:** query tenant+pendiente e índices acreditados, sin scan global; 25 cápsulas fallidas no bloquean la 26. Reinicio repite idempotentemente y avanza; apagar nuevas acciones mantiene recuperación y lectores, corte D-541 conserva cápsulas. No writes en GET/options/preview ni cola/cursor persistido nuevo.
  - **Archivos:** recuperación priceChange, registro de jobs existente, declaración de índices si aplica y pruebas aisladas; configuración productiva solo propuesta/simulación, sin escribirla.
  - **Dependencias:** T-16; gate S al integrar con orders/jobs.

- [ ] **T-18 — Proteger guardado genérico y protocolo de carrito marcado.**
  - **Entrada/salida:** T-10 y censo de escritores → control transaccional de campos server-only, versión e intenciones estructurales legítimas.
  - **Éxito:** snapshots viejos/dotted keys/baseVersion omitida no pisan precios/recibo/cápsula, incluso si la lectura inicial aún no tenía marca. Reordenar/cantidad/eliminar conservan identidad; IVA/descuento autorizado cambia solo su condición. Agregar línea exige intención y permiso existente, resuelve solo la nueva; ambigüedad devuelve 409. No bloquear todas las ediciones como sustituto del contrato.
  - **Archivos:** `updateOrderInternal` y validadores/calculador del camino existente; pruebas de primera marca y operaciones legítimas.
  - **Dependencias:** T-10, T-14, T-01; gate S.

- [ ] **T-19 — Adaptar llamadores legítimos de edición de carrito.**
  - **Entrada/salida:** protocolo T-18 → payloads actuales de cantidad, IVA, descuento, altas/bajas y reordenación con identidad/intención/versión cuando corresponda.
  - **Éxito:** las acciones autorizadas siguen funcionando en marcados y sin marca; rechazo 409 obliga recarga, sin recalcular bases con catálogo ni fingir permisos. Un cuerpo completo no altera dinero de líneas ajenas a su intención. Al eliminar en un marcado, los efectos operativos existentes (incluida devolución de stock) esperan el éxito del guardado: un 409 no puede dejar una devolución paralela. Caracterizar también última línea/edición-eliminación, sin ampliar el write-set de la corrección ni tocar inventoryService.
  - **Archivos:** llamadores identificados en T-01, incluidos `list.component.*`/servicios actuales, de uno en uno; pruebas frontend/backend del contrato.
  - **Dependencias:** T-18; gate S para la integración sensible. No simultanear con otros cambios de `list.component.*`.

- [ ] **T-20 — Proteger edición por lote frente a primera marca y snapshot viejo.**
  - **Entrada/salida:** semántica de lote caracterizada → patch operativo cerrado y precondición para `editBatch`/`edit-multiple-orders` del piloto.
  - **Éxito:** excluye dinero/acuerdos/recibos/cápsulas; conflicto conserva semántica por pedido/lote explícitamente probada, sin sobrescritura parcial silenciosa. Carrera iniciada antes de la primera corrección invalida la escritura antigua.
  - **Archivos:** camino batch en `controllers/orders.js`, sus validadores y pruebas de concurrencia.
  - **Dependencias:** T-18, T-01; gate S separado.

- [ ] **T-21 — Evitar cierre de caja con foto monetaria obsoleta.**
  - **Entrada/salida:** cierre actual y T-02 → patch solo de campos de cierre y precondición updateTime, con recarga/recalculo de resumen ante conflicto.
  - **Éxito:** carrera cierre/corrección en ambos órdenes de commit no pierde precios ni consolida saldo antiguo; confirm bloquea caja ya cerrada, Kuvo y estado protegido. No basta reintentar el mismo resumen ni escribir todo el pedido.
  - **Archivos:** `registrarCierreCaja` en `controllers/orders.js`, llamador de cierre si requiere recarga y pruebas.
  - **Dependencias:** T-20, T-14; gate S separado.

- [ ] **T-22 — Usar foto fresca al adquirir candado de facturación.**
  - **Entrada/salida:** carrera localizada en AccountingManager → pedido retornado por transacción del candado o rechazo por versión antes de preparar/emitir.
  - **Éxito:** corregir antes del lock produce emisión simulada con precio nuevo; lock antes de corregir bloquea confirm. Caracterizar transacción/fingerprint DIAN; estado fiscal incierto bloquea. La corrección nunca toma/libera/limpia candados.
  - **Archivos:** `AccountingManager.js`, contratos de `dian/invoiceRequests.js` y pruebas con proveedores simulados.
  - **Dependencias:** T-14, T-01; gate S fiscal separado. Cero documentos fiscales reales.

- [ ] **T-23 — Alinear adaptadores fiscales posteriores con el acuerdo.**
  - **Entrada/salida:** T-10/T-22 → mappers SIIGO, World Office y DIAN/UBL consumen base e IVA pactados en pedidos marcados.
  - **Éxito:** payloads simulados de línea/impuesto/descuento/extras/total coinciden con servidor, incluido cero; legacy intacto. Sin llamadas de emisión ni cambios a auth/proveedor/documentos emitidos.
  - **Archivos:** mappers existentes identificados en T-01 y sus contratos; un diff sensible a la vez.
  - **Dependencias:** T-22, T-10; gate S por adaptación sensible.

## Lectores de servidor

- [ ] **T-24 — Conservar acuerdos en lista, búsqueda y export API de pedidos.**
  - **Entrada/salida:** T-10 y matriz → proyecciones/DTOs y `calculateOrderTotals` conservan marca y campos necesarios en lecturas paginadas/export.
  - **Éxito:** totales/unitarios/pagado/saldo/excedente correctos, cápsula no expuesta; catálogo posterior no revalora. Mismos contratos de filtros/paginación/tenant y resultados sin marca.
  - **Archivos:** caminos list/search/export de `controllers/orders.js` y tests de respuesta.
  - **Dependencias:** T-10, T-21; gate S.

- [ ] **T-25 — Respetar pactos en pagos, Tesorería y Cartera.**
  - **Entrada/salida:** política caracterizada T-02 → adaptaciones de lectura/cálculo en `treasuryService` y `carteraService`.
  - **Éxito:** corrección conserva pagos y aging; un pago posterior refresca saldo con bases pactadas; sobrepago devuelve deuda cero y excedente separado, sin crear abono/reembolso. Estados de pago no se redefinen desde este cambio.
  - **Archivos:** servicios de tesorería/cartera, contratos `test-013-treasury`/`test-014-cartera` y nuevas regresiones.
  - **Dependencias:** T-10, T-14; gate S para cualquier escritura existente afectada.

- [ ] **T-26 — Devolver dinero actual en logística y transportadores.**
  - **Entrada/salida:** T-10 y rutas efectivas → respuestas de shippingorders/all, getByTransportador y variante independiente con marca/resueltos/saldo numérico.
  - **Éxito:** orden de despacho creada antes de la corrección lee pedido actual; `faltaPorPagar` numérico incluso cero, sin fallback de envío. Mantener carrierAuth y aislamiento; ninguna escritura a `shipping_orders` para copiar dinero.
  - **Archivos:** `controllers/logistica.js`, `controllers/independientes`, proyecciones y pruebas de las rutas existentes.
  - **Dependencias:** T-10, T-14; gate S de integración con pedidos.

- [ ] **T-27 — Mostrar acuerdo en HTML de correo del backend.**
  - **Entrada/salida:** T-10 → `templateHelpers` y camino real de reenvío usan precios/IVA/extras/descuentos pactados.
  - **Éxito:** HTML marcado/legacy coincide por línea y total; corrección/preview no generan correos y QA usa transporte simulado. Coordinar el archivo concurrente de correo, sin sobreescribirlo ni reenviar documentos anteriores.
  - **Archivos:** `reenviarConfirmacionPedido`, `notificationHooks`, `templateHelpers` en sus rutas verificadas; pruebas de render HTML.
  - **Dependencias:** T-10, T-01.

- [ ] **T-28 — Conservar ingresos pactados en reportes.**
  - **Entrada/salida:** T-10 → proyección de `analytics.js` incluye acuerdo/resueltos y evita recálculo legacy en marcados.
  - **Éxito:** ingreso por producto y total son correctos tras modificar catálogo/lista; agregados persistidos conservan resultados. No basta probar el total del pedido; cero y descuentos/extras tienen casos propios.
  - **Archivos:** proyecciones/cálculo de analítica y contratos de reportes actuales.
  - **Dependencias:** T-10.

## Cliente HTTP, lectores y diálogo Angular 14

- [ ] **T-29 — Crear modelos, servicio dedicado y lector de importes.**
  - **Entrada/salida:** contratos estabilizados → `OrderPriceAdjustmentService extends BaseService`, DTOs cerrados y util de lectura/validación sin fórmula ni mutación.
  - **Éxito:** options/preview/confirm pasan por interceptor; nunca HttpClient en componentes ni `VentasService.editOrder`. Pruebas de códigos, payload mínimo y lectura marcada/inválida/sin marca; no derivar importes ni identidad en navegador.
  - **Archivos:** archivos nuevos en módulo pequeño de ajuste de precios bajo ventas y util lector compartido; nombres/rutas concretos según estructura verificada.
  - **Dependencias:** T-12, T-13, T-14, T-24.

- [ ] **T-30 — Adaptar lista, búsqueda y detalle de Pedidos.**
  - **Entrada/salida:** T-29/T-24 → bifurcación antes de todos los recálculos frontend, incluido saldo/anticipo independiente.
  - **Éxito:** no depender solo de `_calculadoEnBackend`; total 43.400/saldo 21.700 se conservan, cero y excedente visibles, sin mutar el pedido para reconstruir precios. Resultados legacy intactos.
  - **Archivos:** lecturas y recálculos de `list.component.ts`, templates y pruebas asociadas; no mezclar menú/PDF/export en el mismo diff.
  - **Dependencias:** T-29, T-19; gate S del cambio sensible, secuencial en list.

- [ ] **T-31 — Usar resueltos en PDF, comanda, correo web y orden simplificada.**
  - **Entrada/salida:** T-29/T-30 → adaptadores de documentos omiten la mutación/recalculo legacy de entrega/zona para marcados.
  - **Éxito:** unitarios, cantidades, extras, descuentos, IVA, envío y total coinciden sin doble suma/descuento. Generación local no envía/reenvía documentos ni altera el pedido. Legacy conserva su camino.
  - **Archivos:** sección documental de `list.component.ts`, `PaymentService`, `PedidosUtilService`, `orden-venta.component.*`; diffs separados y secuenciales, contratos de render.
  - **Dependencias:** T-30; gate S cuando toca comportamiento financiero de orders.

- [ ] **T-32 — Evitar recálculo monetario en Excel del navegador.**
  - **Entrada/salida:** export API T-24 → transformación de export en list conserva campos pactados.
  - **Éxito:** líneas/importes/pagos/saldo/excedente exportados coinciden con respuesta actual, incluido cero y pagos no vigentes; no revalorar catálogo. Contrato de columnas/filtros existente permanece.
  - **Archivos:** sección export de `list.component.ts` y pruebas del archivo generado.
  - **Dependencias:** T-31, T-24; secuencial en list y gate S.

- [ ] **T-33 — Adaptar Logística original/v2 y generación de planillas.**
  - **Entrada/salida:** T-26/T-29 → ambas vistas usan importes autoritativos y planilla refresca pedidos seleccionados antes de generar.
  - **Éxito:** saldo sintético 21.700 no baja a 15.701; despacho anterior a corrección no conserva dinero viejo. Cero/excedente correctos y sin writes a shipping_orders; no tomar bloques comentados como evidencia.
  - **Archivos:** `despachos.component.*`, `ordenes-despacho.component.*`, variante v2 y pruebas de planilla.
  - **Dependencias:** T-26, T-29; gate S del comportamiento financiero.

- [ ] **T-34 — Alinear resumen de cobro y pagos en la web.**
  - **Entrada/salida:** T-25/T-29 → vistas de asentar/registrar pago y Tesorería leen saldo fresco sin recalcular pactos.
  - **Éxito:** pagos posteriores mantienen bases; deuda cero y excedente separados; corregir no crea/revisa pagos ni ofrece devolución automática. No ampliar permisos de cobro.
  - **Archivos:** componentes de pago/resumen identificados en readers y sus pruebas.
  - **Dependencias:** T-25, T-29; gate S de edición financiera.

- [ ] **T-35 — Implementar contenedor y estados del diálogo.**
  - **Entrada/salida:** T-29 → `OrderPriceAdjustmentComponent` standalone/OnPush con Reactive Forms/RxJS y estados aprobados.
  - **Éxito:** editar intención/motivo invalida preview; respuestas tardías no la reactivan. Motivo obligatorio; doble clic envía una confirmación. Timeout/5xx conserva operationId y outcomeUnknown; repetir usa misma operación, 409 exige nueva revisión. Aplicado/pendiente y excedente tienen estados explícitos; cerrar no afirma cancelar una escritura enviada.
  - **Archivos:** contenedor nuevo y pruebas de transiciones/HTTP, sin tocar aún list.
  - **Dependencias:** T-29, T-16; adaptación Angular 14 aprobada, sin signals/@if.

- [ ] **T-36 [P] — Implementar editor de línea.**
  - **Entrada/salida:** DTO options → componente puro `OrderLinePriceEditor`, selección por referencia del servidor y precio base sin IVA.
  - **Éxito:** dos líneas del mismo producto se distinguen, solo editables; cero válido, vacío/negativo/no finito inválido. No calcula dinero ni fabrica lineKey; cambios emiten intención al contenedor.
  - **Archivos:** componente/editor y sus pruebas/estilos propios, sin editar contenedor/exports compartidos simultáneamente.
  - **Dependencias:** T-29, T-35.

- [ ] **T-37 [P] — Implementar resumen antes/después.**
  - **Entrada/salida:** DTO preview → `OrderPricePreview` puro con línea, bruto, descuento, envío, IVA, total, pagado, saldo y excedente.
  - **Éxito:** valores y formato provienen del servidor sin redondeo/cálculo adicional; warnings/bloqueos y recuperación legibles, accesibles y con cero explícito.
  - **Archivos:** componente/resumen y pruebas/estilos propios, disjuntos de T-36.
  - **Dependencias:** T-29, T-35.

- [ ] **T-38 — Integrar acción y adoptar pedido persistido.**
  - **Entrada/salida:** T-35–37 → acción Corregir precio en Más opciones y actualización de lista/detalle/selección por `_id` tras confirm.
  - **Éxito:** mostrar solo capacidad afirmativa del pedido actual; error/rol Administrador/respuesta vieja no habilitan. Refresh desde servidor sin restaurar snapshot previo; conserva otras opciones en trabajo paralelo y no dispara ORDER_UPDATED ni notificaciones de edición genérica.
  - **Archivos:** menú/refresh de `list.component.*`, wiring del módulo pequeño y pruebas de integración UI.
  - **Dependencias:** T-32, T-35, T-36, T-37, T-08; gate S y coordinación del menú concurrente.

## Validación transversal y preparación de entrega

- [ ] **T-39 [P] — Verificar contrato y pantalla del mensajero efectivo.**
  - **Entrada/salida:** build/plataforma identificado T-01 y T-26 → evidencia de payload, decoder y pantalla refrescada de la app realmente usada en ALMARA.
  - **Éxito:** total 43.400/saldo 21.700, cero y excedente sin fallback a domicilio; verificar transportador e independiente. Android/iOS/Flutter se seleccionan por uso real, no por inspeccionar otra app del personal. Prueba HTTP sola no cierra el gate; si falta acceso/build queda pendiente. Usar entorno/datos sintéticos aislados, sin crear pedidos productivos.
  - **Archivos:** evidencia en findings/readers; repo mensajeros identificado en readers. Si requiere corrección compatible del lector, preparar diff revisable y checks de esa plataforma antes de aplicarla; no publicar app desde esta tarea.
  - **Dependencias:** T-01, T-26; puede verificarse sin tocar archivos comunes con T-40.

- [ ] **T-40 — Verificar transacciones, recuperación y write-set integrado.**
  - **Entrada/salida:** implementaciones T-06–38 → suite integrada en emulador/dobles y evidencia de la matriz completa.
  - **Éxito:** carreras primera marca/genérico/batch/cierre/factura/pagos en ambos órdenes; revocación y cambios de condiciones; timeout tras commit, reinicio antes de proyección, duplicados, 25 fallidos/26 y cápsula distinta. Espía DB/proveedores falla ante writes a productos/listas/inventario/movimientos/pagos/facturas/shipping_orders/config/roles desde el flujo; preview/options ninguno, recovery solo evento/limpieza. No regresión en eventos generales D-541.
  - **Archivos:** integración priceChange y suites existentes afectadas (IVA, pedidos, tesorería, cartera, logística, contabilidad, historial); fixtures sintéticos sin datos personales.
  - **Dependencias:** T-06 a T-38 terminadas y pruebas por bloque verdes; no depende de disponer ya de pantalla móvil real para poder avanzar pruebas aisladas.

- [ ] **T-41 — Comprobar reversión compatible y banderas apagadas.**
  - **Entrada/salida:** núcleo validado → ensayo aislado de desactivar nuevas acciones conservando precio, lectores y recuperación.
  - **Éxito:** bandera ausente/OFF no concede nuevas acciones; después de corregir, apagarla no revalora con catálogo ni pierde cápsula. D-541 cortado bloquea nuevas correcciones y conserva pendientes. Proponer roster/grants con simulación sin ejecutarlos; versión de recuperación entiende marca y no restaura ciegamente binario antiguo.
  - **Archivos:** pruebas de flags/rollback y runbook de entrega dentro de este cambio, sin `.env` ni configuración productiva escrita.
  - **Dependencias:** T-17, T-38, T-40.

- [ ] **T-42 — Compilar y verificar interfaz a 1440/390.**
  - **Entrada/salida:** T-40/T-41 → build frontend de producción sin errores, parse/check backend y reporte de QA de pantallas tocadas.
  - **Éxito:** diálogo, editor de roles, Pedidos, documentos y Logística sin scroll horizontal/texto invisible; teclado, foco restaurado, `aria-live` y foco visible. Tema plano canónico/base correspondiente; conteos de gradientes/primarios prohibidos no suben, ninguna clase nueva contiene `p-`. Revisar diff de environments y versión tras build; no incluir cambios ajenos ni desplegar dist.
  - **Archivos:** evidencias de QA y correcciones acotadas a fuentes propias; volver a comprobar el bloque si se corrige algo. No commitear automáticamente cambios de versión.
  - **Dependencias:** T-40, T-41; build no sustituye T-39 ni autorización productiva.

- [ ] **T-43 — Preparar entrega verificable y actualizar soporte.**
  - **Entrada/salida:** resultados y pendientes reales → dossier de diffs aprobados, checks, matriz lectores/escritores, seguridad/D-541/móvil, reversión y simulación de configuración/grants para ALMARA.
  - **Éxito:** actualizar CONTRACT y nota interna de 1355 con lo realizado y límites; tareas solo se marcan completas con evidencia. Sin cerrar como publicado/verificado un ticket cuyo gate siga pendiente. Presentar checkpoint posterior concreto para commit/publicación/activación según autorización vigente; sin ejecutar esas operaciones desde estas tareas.
  - **Archivos:** `tasks.md`, `findings.md`, runbook/evidencia del cambio, `specs/CONTRACT.md` y nota MCP; preservar cambios concurrentes.
  - **Dependencias:** T-42; T-39 y todos los gates de seguridad/historial necesarios para declarar listo el piloto. Si falta alguno, entregar candidato apagado y registrar bloqueo real, sin marcar habilitación completa.

## Estado local tras S-06

T-03/T-04/T-06/T-09/T-10/T-11/T-12/T-13 se cierran como unidades locales tras aprobar/aplicar S-06:298/298 desde backend activo sin loader,15 JS con sintaxis limpia. No equivalen a entrega habilitada. Las notas de avance anteriores conservan la secuencia histórica; quedan pendientes T-05 y los módulos de confirmación, catálogo/historial, protecciones/lectores, permisos/UI y gates de integración/producto. Ningún permiso o flag fue habilitado.

## Orden y definición de terminado

T-01 → contratos/caracterización T-02–05 en archivos separados → acceso/acuerdo/cálculo/firma → endpoints → historial y protecciones de escritores → lectores y UI → integración/rollback/build. T-36/T-37 pueden hacerse en paralelo; T-39 puede verificarse junto a T-40. Ningún paralelismo salta gates S o cruza archivos compartidos.

D-543 implementado exige las unidades de código, contratos, regresiones y build verdes, acuerdos protegidos y evidencia trazable. **Listo para piloto** exige además T-39 y seguridad/D-541 acreditados. **Publicado y verificado en producción** es un estado posterior que solo se registra tras autorización operativa, despliegue real y verificación; no se deduce de aprobar o completar estas tareas. Responsable Daniel; revisión/retiro del piloto 23-nov-2026 mediante cambio aprobado, sin automatismo ni ampliación a otros comercios.
