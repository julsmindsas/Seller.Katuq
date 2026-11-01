# Evidencia inicial — tickets 1355 y 1356, ALMARA FELICIDAD

**Fecha:** 23-oct-2026. Diagnóstico de lectura y una reproducción pura en memoria. No acredita la versión desplegada ni una lectura actual del pedido/producto en Firestore.

## Fuente del requerimiento

MCP confirmó 1355 (`pIJSVi6B11veMs6o4dkf`) y 1356 (`ssQ5hm0eNwbkAPhy6oc4`), comercio/tienda **ALMARA FELICIDAD**, estado Pendiente y responsable estructurado Pendiente al iniciar. Daniel seleccionó explícitamente ambos en este chat. Se leyó también 1352 (`wKFaaBkxGpjFN8IWKXk9`), asignado a Santiago: $43.400 total, $21.700 pagado, $21.700 saldo correcto frente a $15.701 mostrado en Logística. Se usan montos y número DAD-014498 para trazabilidad, sin copiar datos personales o adjuntos del cliente a estos documentos.

## Trazado comprobado en repositorios locales

| Tramo | Evidencia |
|---|---|
| Acciones de pedido | `src/app/components/ventas/list/list.component.ts`: opciones y cálculos; `tienePreciosManualActivos` reconoce el override. `PaymentService` contiene también cálculo de precios, IVA y lista de cliente. |
| Servicio e interceptor | `VentasService.editOrder` (`shared/services/ventas/ventas.service.ts:320`) envía `/v1/orders/edit` y `_baseVersion`; hereda de `BaseService`. `HttpInterceptor2.handleAccess` (`shared/services/interceptor/http.interceptor.ts:226`) adjunta Authorization/company/user/usage-code/email para Katuq. No se modificó ni omitió. |
| Autorización y escritura | Backend `functions/routers/orders.js:39`: `auth` + `requireJwtTenantOrPlatform`. `controllers/orders.js:5043` obtiene usuario del token y aplica `services/orders/accesoEdicion.js`; luego `updateOrderInternal` lee `orders`, conserva campos por línea ausentes, recalcula si llega carrito y escribe. La comprobación de versión actual es opt-in; el nuevo flujo no debe aceptar una vista previa sin control de vigencia. |
| Protección de valores guardados | `controllers/orders.js:3279`: `preserveLineOverrides` conserva campos ausentes al coincidir índice y producto, pero **no es una autorización** para editar precios y no valida elegibilidad de la intención. Tampoco resuelve por sí solo dos líneas reordenadas/repetidas. No basta reutilizar el guardado completo como edición de precio autorizada. |
| Cálculo | `services/orderCalculationService.js`: `getSubTotalPedido`, `getSubTotalNetoPedido`, `calculateOrderTotals`; precio manual como base sin IVA, pagos por `sumarPagosVigentes`, saldo con mínimo cero. Hay caminos legacy y canónico con diferencias de resolución; el canónico incorpora `cliente.categoria.id`, `preciosPorTipoCliente` y valores resueltos por línea. Se deben preservar spec 010 y decisiones D-219/D-536, no crear una tercera fórmula. |
| Precedente dedicado | `controllers/orders.js:5099`, `editLineaIva`: intención por línea, transacción, comprobación de versión/factura y recálculo. **No copiar sus permisos literalmente:** su usuario/company todavía salen de headers y el router de esa acción solo muestra auth. Para los cambios nuevos se exige identidad/empresa de sesión y permiso explícito. No se modifica esa ruta en este diagnóstico. |
| Lectores de despachos | `ordenes-despacho.component.ts:305` y `ordenes-despacho-v2.component.ts:1447`: `getValorACobrarPorPedido` sobrescribe totales/saldo con `getSubTotalPedido`/`getTotalImpuesto`. Sus subtotales usan precio de snapshot/volumen y omiten `_precioManualOverride`. En `despachos.component.ts:676,2812` hay antiguos bloques comentados, que no se deben atribuir a ejecución real. |

## Reproducción local del caso 1352

Se extrajeron por AST de TypeScript los tres métodos **reales** `getSubTotalPedido`, `getTotalImpuesto`, `getValorACobrarPorPedido` de cada vista a una clase temporal en memoria, sin importar el módulo Angular ni conectar servicios. TypeScript transpila y `vm` ejecuta solo esos métodos con datos sintéticos:

- Línea 1: cantidad 1, base $24.200, IVA cero.
- Línea 2: cantidad 1, precio del snapshot $1, permite precio manual y `_precioManualOverride=6000`, IVA cero.
- Domicilio $13.200, descuento cero, anticipo $21.700; total guardado $43.400, saldo guardado $21.700.

| Método real extraído | Total resultante | Saldo resultante |
|---|---:|---:|
| Órdenes de despacho | $37.401 | $15.701 |
| Órdenes de despacho v2 | $37.401 | $15.701 |
| Acuerdo del pedido usado como referencia | $43.400 | $21.700 |

Esto reproduce la aritmética denunciada e identifica dos lectores incompatibles con precios manuales. **No demuestra que sean la ruta que vio el comercio, que el servidor productivo tenga esos mismos archivos o que el pedido real contenga ese override.** Falta trazar la API efectiva de Logística y del mensajero y contrastar el pedido real mediante acceso autorizado; antes de habilitar las nuevas acciones debe existir evidencia de paridad en esos consumidores. No se reasigna, repara ni cierra 1352 desde esta revisión.

## Dependencias y trabajo concurrente

- D-536 abarca creación con precio manual, IVA y descuento, no edición de pedidos creados; no cubre automáticamente estos tickets.
- D-541 aprueba un historial nuevo; diseño/tareas F1 todavía pendientes según los artefactos. Hay fuentes/tests de historial sin seguimiento en el backend: no editarlas ni asumir esa integración publicada. El diseño de 1355/1356 debe acordar su integración y disponibilidad; no crear una colección paralela ni cambiar el criterio no bloqueante general del historial sin aprobación.
- La rama principal de trabajo de Seller es `feature/venta-asistida-mejorada`; backend `backend-aws-security`. Hay cambios pendientes ajenos en POS, estilos, conocimiento de marca e historial. Se conservaron.
- No se arrancó el backend contra producción, ni se hicieron escrituras de pedidos, clientes, inventario, pagos o documentos fiscales. No se llamaron proveedores ni se verificó una factura con emisión real.

## Gates siguientes

Aprobar **propuesta + spec**, luego diseño, luego tareas y diffs sensibles uno a uno. El diseño debe cerrar contrato de vista previa/confirmación, permisos por operación, versión/identidad de línea, factura concurrente, origen del precio/IVA de lista, integración D-541, lectores y política de habilitación por comercio con responsable y retiro. Ningún endpoint/colección adicional queda autorizado por haber detectado la necesidad.


## Ampliación de diseño (23-oct-2026)

- **Censo productivo dirigido, solo lectura:** dos consultas a `roles` con `empresa == ALMARA FELICIDAD`, proyección solo rol/permissions. Seis roles: cuatro sin `permissions`, Administrador con array vacío, VENTAS con mapa vacío. Ninguno tiene las acciones nuevas. No se consultaron usuarios, pagos, pedidos o datos personales, ni se imprimieron secretos. Se usó solo firebase-admin en proceso aislado, sin importar index ni arrancar servicios/colas. No hubo escritura o concesión.
- **Canon granular verificado:** `shared/models/roles/modules-catalog.ts` define mapa módulo→acciones; `allPermissions()` y plantilla Administrador conceden automáticamente acciones nuevas si no se excluyen. Modelo/editor y backend tienen restos de array legacy; conservarlos sin migración implícita. `verifyRole` de gestión no garantiza gestor administrador real: el guard acotado de concesión necesita identidad/tenant del token, rol vigente y comparación transaccional antes/después. La ejecución de las acciones sigue requiriendo permiso explícito.
- **Fiscalidad:** AccountingManager lee pedido antes de tomar el candado y continúa con esa foto. DIAN prepara de nuevo dentro de su transacción. El diseño exige lectura fresca retornada por candado o rechazo por versión, y caracterización con proveedores simulados antes del piloto. No se consultó ni emitió una factura real.
- **Otros escritores:** `editBatch` y `registrarCierreCaja` pueden escribir snapshots completos sin la protección del guard genérico. Cierre protegido y precondiciones/patches operativos forman parte del gate; no basta adaptar getters. Los archivos se conservaron sin editar.
- **Historial:** la fuente local D-541 tiene catálogo cerrado y escritor create-only asíncrono. El diseño conserva ese escritor y añade cápsula/recibo recuperables en el pedido, sin colección o historial paralelo y sin afirmar que esos contratos ya existan. Recuperación por roster en config existente, independiente de apagar nuevas acciones; cursor efímero/avance justo, sin otra cola persistente.
- **Lectores y app:** trazado ampliado en [readers.md](readers.md), incluido correo backend, Excel y analítica por producto. Repo real del mensajero localizado en growdata/katuq_front_appmensajeros; consumo de saldo backend verificado en fuentes, no build/plataforma instalada de ALMARA ni pantalla productiva.
- **Revisión del diseño:** análisis backend y frontend en paralelo; hallazgos de identidad de líneas, basal no acreditable, correo backend, permisos, cierre/batch y recuperación fueron incorporados. Sin tasks ni implementación. El candidato requiere aprobación humana antes de descomponer.


## T-01 — Inventario al iniciar implementación (23-oct-2026)

Tareas aprobadas: «Apruebo las tareas de ambos; implementa y valida». Relectura local y análisis paralelo, sin escrituras de negocio. Los HEAD cambian por sesiones concurrentes; las ubicaciones son referencias de lectura, no garantía de hash productivo.

| Dependencia/escritor | Evidencia local refrescada | Consecuencia y gate |
|---|---|---|
| D-541 | `services/orders/historialPedido/index.js:6–9` dice TODAVÍA SIN ENGANCHAR; módulos sin seguimiento, catálogo aún sin tipos precio/lista; tasks informa núcleo87/87 y puntos39 rojos, no reejecutados en este inventario | No asumir integración, reglas, UI o deploy listos. Coordinar catálogo/escritor con archivos concurrentes. Actor completo desde contexto verificado evita fallback de escritor a query users por email sin tenant (`escritor.js:213–217`); ese fallback queda como dependencia D-541 |
| Reglas Firebase | Copia de lectura D-541 del23-oct, reglas release14-oct, permite CRUD por legacyWindowOpen hasta2028 salvo push; coincide CONTRACT y propuesta backend cerrar-reglas-firebase | Evidencia de copia, sin reconsulta remota nueva; no acredita cierre actual. Verificar reglas efectivas que protejan users/roles/orders/historial antes de activar; no resolver seguridad general desde estos tickets |
| Gestión de usuarios | `routers/users.js:12,106,151` usa requireRole de JWT; middleware no resuelve rol actual. `controllers/users.js:250–275` valida tenant pero edit recibe roles/identidad | Antiguo admin con token aún vigente podría restaurar su rol y luego pasar guard fresco. T-07 debe acreditar protección acotada o mantener piloto bloqueado por D-512; no basta proteger roles.permissions |
| Transportador | `orders.js:5308–5312` buildTransporterUpdate clona orderData; editByTransporter lee5407 y update5520 sin precondición para pedido normal. Rama domicilio sí calcula diferencias/tx5492–5508 | Snapshot viejo puede pisar primera marca. Requiere patch operativo y protección de versión/foto fresca, o demostrar exclusión de los pedidos piloto; guard genérico no lo cubre |
| Flow upsert | `services/flows/nodes/internal/katuq-order-upsert.action.js:304–307,329–342,362` transporta canonical y preserva algunos operativos/fiscales, no pacto/carrito; repository.update90–92 no transaccional | Acreditar alcance efectivo ALMARA antes de habilitar. Si puede alcanzar un marcado, preservar acuerdos/condiciones con diff acotado aprobado o mantener gate pendiente; no ampliar sync ni inventario |
| Otros canales | Lecturas Osmosis/WO observadas usan patches logísticos; Shopify update233–275 parchea estado/pagos/notas | Caracterizar saldo/primera marca; no declarar que no hay riesgo solo por nombre del canal |
| Facturación | AccountingManager lee1546, toma lock1558 y continúa con foto1610; DIAN vuelve a preparar en tx86–98 | Mantener T-22/T-23 y dobles de proveedor, sin emisión real |

### Llamadores web y límites de adaptación

- `list.component.ts:3574–3589` usa debounce/switchMap; cancelar suscripción no cancela una escritura ya recibida por servidor. `editOrder:6468` muta/normaliza antes de enviar. `VentasService:320–353` envía snapshot y baseVersion=date_upd o null, con avisos genéricos. El nuevo confirm sigue separado.
- Notas (`6593–6601`) y pagos (`6621–6632`) envían DTO reducido con carrito/importes sin date_upd. T-18 protege aun versión omitida y lectura previa sin marca. Producción/despachos/POS tienen llamadores completos, inventariados por T-01; no ampliar sus permisos o write-set.
- Configurador de línea (`conf-product-to-cart:1696–1703,1735–1744`) devuelve Carrito nuevo sin identidad/overrides; list reemplaza por índice7330. Agregar7453, eliminar por primera referencia8281/8478 e IVA dedicado377–400 necesitan protocolo marcado; no inventar botón de reordenar (no se encontró existente).
- Eliminar producto encola edición y llama restoreProductInventory sin esperar8298–8302. En T-19, un rechazo de edición marcada no puede provocar esa devolución paralela: ordenar el efecto existente tras éxito, sin adquirir escrituras de inventario desde la corrección ni modificar inventoryService. Última línea8235/8244 también encadena edición/eliminación sin acreditar éxito; caracterizar y conservar autorizaciones.
- Ubicación prevista coherente: servicio `shared/services/ventas/order-price-adjustment.service.ts`, DTO/util lector en shared para no hacer depender Logística del lazy de Ventas, componentes standalone en `components/ventas/order-price-adjustment/` importados en VentasModule. Releer rutas al implementar. Modelo roles aún string[], editor normaliza ausencia→{} al cargar182: preservar original antes del formulario.

### Mensajero: evidencia pendiente real

Repo b0e126f al leer, sin tocar cambios iOS ajenos. Android candidato29/2.2.0 con notas sin subir a Play; iOS candidato1.1.0(6) con evidencia histórica1.0.0(5); Flutter1.0.8+9. Ninguno acredita dispositivo/plataforma/build instalado en ALMARA. No se consultaron tiendas ni dispositivos; T-39 permanece pendiente. Las pruebas de endpoint no sustituyen pantalla refrescada.

### Resultado del inventario

Inventario T-01 producido con riesgos explícitos, no gates de piloto superados. Se puede continuar desarrollo apagado y aislado; la activación sigue bloqueada hasta acreditar seguridad efectiva, D-541, escritores completos y mensajero. No se consideran arreglados por este documento ni se hace una migración general.


## T-02 — Caracterización ejecutada (23-oct-2026)

Tres archivos nuevos en backend `functions/tests/orders/priceChange/`: `characterization.fixtures.js`, `characterizationReaders.js`, `characterization.test.js`. Solo funciones puras del calculador y tres métodos reales extraídos por AST de cada componente; sin cargar Angular/constructores/servicios. El checkout Seller debe existir al lado o indicarse por RUTA_SELLER_KATUQ; si falta, la prueba falla, no se omite.

- **20 casos únicos**, 20/20 en cada proceso local con IVA_PERSIST_CANONICAL=false y true (**40 ejecuciones**, no40 casos distintos). Se configura solo el proceso de prueba; no se modifican flags de la aplicación o producción. Node local24.2.0; no acredita runtime productivo ni emulador.
- Backend sintético 43.400/21.700, dos lectores 37.401/15.701, diferencia5.999. Control snapshot6.000 sin override conserva43.400/21.700 en ambos lectores y valida extracción. No es una lectura o reparación de DAD-014498.
- Se cubren manual cero, dos líneas del mismo producto con precios distintos, IVA individual/descuentos compuestos/envío, extras planos/anidados/ambos sin doble suma actual, campaña histórica, pagos posteriores y excedente.
- **Divergencias existentes fijadas como caracterización, no requisitos nuevos:** motor ignora adición anidada donde Logística la suma, Logística ignora adición plana; descuento fijo100/base1000 produce900 legacy y1000 canónico; Anulado actualmente sí suma, Rechazado/Cancelado y WompiPendiente no. No se cambió política de pagos ni cálculo legacy para hacer pasar el caso.
- Motor actual no expone overpaymentAmount; sí deuda mínima0 y conserva pagos. Queda prueba de ese límite anterior, sin pretender que implemente el nuevo resultado.
- Sintaxis limpia de los3 archivos. Cinco suites existentes pasaron: precioManualSubtotal, lineOverridesValidation, anticipoSinPagosRechazados, precioEfectivoSaneamiento.contract, descuentoDeListaEspejo.contract. Frontend: POS línea/precio y precio congelado por fecha pasaron en la comprobación aislada inicial; no hubo cambios de runtime o UI.

Comandos reproducibles desde backend/functions:

```bash
IVA_PERSIST_CANONICAL=false node --test tests/orders/priceChange/characterization.test.js
IVA_PERSIST_CANONICAL=true node --test tests/orders/priceChange/characterization.test.js
node tests/orders/precioManualSubtotal.test.js
node --test tests/orders/lineOverridesValidation.test.js tests/orders/anticipoSinPagosRechazados.test.js tests/orders/precioEfectivoSaneamiento.contract.test.js tests/orders/descuentoDeListaEspejo.contract.test.js
```

T-02 completada. Ninguna prueba de endpoint, transacción nueva, permisos reales, historial integrado, build UI o producción declarada ejecutada desde estos resultados.


## S-01 — Primer diff sensible preparado, todavía sin aplicar

[Candidato y comandos](review/s01-access/README.md), [patch](review/s01-access/s01-access.patch), [resultado33/33](review/s01-access/validation.tap). Solo dos archivos nuevos espejo: módulo de acceso y sus pruebas. No hooks, rutas, catálogo de flags, middleware o fuentes existentes en el patch. Backend observado f322affe; SHA256 del patch2366dc4d5110a32b01909ad74204702a9d1a9893e040dfc901c509f9a419f50c.

Comprobar acceso usa contexto JWT ya verificado, identificacion de negocio sin asumir docId, tenant/usuario/rol/empresa vigentes únicos, grants expresos, ciclo de vida y flags booleanos. Actor completo evita fallback D-541 por correo sin tenant; identificación numérica conserva tipo. Revalidar repite queries dentro de la transacción del llamador, con updateTime/hash. No writes ni telemetría de acceso (options/preview deben seguir sin efectos).

33 pruebas con DB falsa verdes, sin fail/skip/todo; parse-check limpio de ambos archivos. Autor y revisión principal comprobaron git apply --check en backend, exit0 sin aplicar. Node local24.2.0; no acredita emulador, transacción real, contrato HTTP, permisos productivos o piloto. Error423 de ciclo es interno y su mapeo al contrato HTTP sigue pendiente del controlador.

Preparar este módulo aislado permite revisar el diff S antes de integración; no adelanta terminación de T-06 ni de T-03–05. Se solicitará aprobación de este diff concreto, conservando todos los gates restantes. No se aplicó código productivo al backend.


## S-01 aplicado y S-02 preparado (23-oct-2026)

Daniel: «Apruebo S-01; aplícalo y continúa». Se comprobó el hash aprobado, se aplicaron solo sus dos archivos nuevos al backend local y pasaron sintaxis y33/33 allí, sin el path especial del scratch. No se conectaron rutas o servicios, ni se activó una bandera.

Siguiente [S-02](review/s02-price-preparation/README.md), [patch](review/s02-price-preparation/s02-price-preparation.patch), SHA256bbcb0d9ca72a83a75d94362b162dc1fccb4500c66a54f903463cfed3d45eec80: siete archivos nuevos solo en scratch, entradas cerradas, huellas/identidad y comprobante firmado, más sus contratos/composición. Nadie añadió los archivos al backend activo; git apply --check pasó. No calcula dinero ni registra endpoints.

- Aclaración de implementación compatible con contrato aprobado: 1355 siempre recibe triple index/productId/fingerprint incluso marcado; servidor resuelve lineKey. Precio sin coerción/round; razón máximo500 como D-541 para no truncar auditoría. D-544 priceList pendiente.
- Referencia incorpora orderFingerprint obligatorio obtenido del snapshot fresco path+exists+updateTime con nanos+datos seleccionados reales. No usar versión/body de cliente ni solo date_upd. Se cerró en candidato una carrera options→preview con líneas financieramente iguales y destinatarios distintos, sin incluir datos personales en la huella de línea.
- HS256 con derivación Buffer32 del SECRET_TOKEN existente y propósito propio; esquema/binding cerrados y máximo600s acortable. verifyForReceipt nunca concede permiso para una operación nueva, ni fresco; no consulta aún un recibo real. No cambia el comprobante MCP ni carga secretos/config al importar.
- [62/62 S-02 en Node24](review/s02-price-preparation/validation.tap), sin fallos/omisiones; [95/95 en Node20.20.2 local](review/s02-price-preparation/validation-node20.tap) suma los62 S-02 y33 S-01, no95 casos nuevos. Sintaxis de7 archivos con Node20 y whitespace limpios. Probe con Timestamp nativo del SDK instalado preservó nanosegundos sin Firebase App o red.
- Revisiones principal e independientes cerradas. T-03–05 HTTP/T-09 financiero/T-10/cálculo/T-11 integración siguen incompletas; no atribuir a estos helpers pruebas de confirm transaccional, permisos reales, emulador, móvil o producción. Checkpoint del diff S-02 pendiente.


## S-02 aprobado y aplicado (23-oct-2026)

Daniel: «Apruebo S-02; aplícalo y continúa». Se verificó SHA256bbcb0d9ca72a83a75d94362b162dc1fccb4500c66a54f903463cfed3d45eec80 y aplicó el patch exacto, siete archivos nuevos. Sintaxis Node20 limpia y95/95 desde backend activo (33 S-01 +62 S-02), sin scratch, Firebase ni red. Este registro sustituye el estado pendiente anterior. Contratos HTTP, antes financiero, cálculo, confirm transaccional, lectores/UI y gates productivos siguen pendientes. Se prepara el siguiente diff financiero fuera del código activo para su revisión/aprobación; no se habilitó el piloto ni se publicó.


## S-03 preparado, no aplicado (23-oct-2026)

[Alcance, contratos y evidencia](review/s03-agreed-prices/README.md); [patch completo](review/s03-agreed-prices/s03-agreed-prices.patch), SHA256 **b801067a81c01d6c29fec3392ccabea29f783704736bb021bef871fb58489a8f**. Ocho archivos: calculador existente, dos módulos nuevos y cinco archivos de pruebas/fixture. Calculador activo conserva baseline374e0fd6145fff13f2fc21e89d6d0db299033eca19774feee606baa30b48aded. Aplicabilidad/whitespace limpios, sin aplicar. Cambios concurrentes nuevos en orders/historial/Opttia pertenecen a otras sesiones y no se incluyeron; gates se revalidarán al integrar consumidores.

Acredita antes desde datos históricos, cada IVA de producto y seis importes; modo vigente observado del servidor sin probar alternativas. Esquema/contexto opaco no prueban por sí solos DB ni autorización. Frame capturado valida material completo una vez por agregado síncrono, sin aceptar JSON como contexto. Marca y bases se conservan en memoria; no implementa todavía una corrección elegida o ruta. Fuente ausente/ilegible no acredita cero; CON→SIN exige tarifa original; campañas exigen fecha histórica válida. Conflictos/parciales y diferencia real0,25 a escala1e15 rechazan, sin absorberla por tolerancia relativa.

Revisiones principal/independientes cerraron neto promocional legacy incoherente, condiciones ilegibles→cero, total puro marcado divergente por centavos y uso del reloj actual sin fecha histórica. Campos y redondeos producto/extras/agregado documentados en readers.md; no se inventó distribución de descuento fijo ni nueva fórmula monetaria. Frame reduce medición local Node24/500 líneas sintéticas de9622ms a22ms (contexto6ms); no es tiempo de bootstrap completo o SLA de producción.

Resultado final:151/151 Node20 (56 S-03 +95 S-01/S-02),56/56 Node24; siete JS de patch con sintaxis limpia y fixture JSON válido. Cinco suites financieras existentes y T-02/20 casos en ambos modos pasan. Las22 salidas completas del calculador anterior se congelaron con hash de baseline; el test aplicado no compara contra sí mismo. No se cambiaron expectativas canónicas.

Todavía bloqueados envío legacy dependiente de zona+ciudad y extras anidados sin importes acreditables; no se completan con datos actuales. T-09/T-10 siguen parciales/candidatas. HTTP, guard de ingreso/escritores, confirmación/recibo/historial, lectores, UI, seguridad efectiva y build instalado del mensajero conservan gates. Sin datos reales, permisos/flags, publicación, commit/push ni cierre. Notas internas6 creadas exitosamente por MCP en1355 y1356; ambos continúan Haciendo/Daniel, sin mensaje público.


### 2026-10-23 — D-543/D-544: S-03 aprobado y aplicado

Daniel: «Apruebo S-03; aplícalo y continúa». Patch SHA256 b801067a81c01d6c29fec3392ccabea29f783704736bb021bef871fb58489a8f y baseline verificados antes de aplicar. Ocho archivos activos coinciden con el manifest; cambios concurrentes conservados.151/151 en Node20.20.2 desde backend activo, sin loader/variables de scratch; sintaxis de siete JS limpia. Cinco suites financieras existentes y T-02/20 casos en cada modo pasan desde ese checkout. No hay rutas, permisos/flags habilitados, datos reales, build UI, publicación, commit/push o cierre. T-09/T-10 conservan integración pendiente. Se prepara S-04 en scratch para vista previa de precio de línea y elegibilidad fiscal/financiera pura, con su próximo diff sensible; no se adelantan rutas/transacciones ni gates del piloto.


### 2026-10-23 — D-543/D-544: S-04 preparado para checkpoint, sin aplicar

Candidato en `openspec/changes/corregir-precio-pedido/review/s04-line-preview/README.md`; patch SHA256 **94ac8d3675bcc0079d833e99a4cf36a76cea36390c543bf94340f84d6f4317b3**, seis archivos nuevos (dos helpers puros y cuatro suites). Prepara precio de línea desde snapshot original completo, producto real editable del tenant y antes acreditado; solo base seleccionada/metadata y derivados del calculador, con pagos/pactos restantes conservados. Elegibilidad separada bloquea evidencia fiscal, lock presente incluso vencido, historial fiscal anulado, cierre de caja/Cerrado y Kuvo/ambiguos; referencia POS sola conserva su semántica canónica.

191/191 Node20 local (40 nuevas +151 anteriores),40/40 nuevas Node24, sintaxis de seis JS y aplicabilidad/whitespace limpios. Revisiones principal e independientes sin hallazgo material pendiente en este alcance. Ninguno prueba DB/auth o habilita el flujo: compositor debe aplicar acceso/elegibilidad/historial, preparar/firma/DTO whitelist y confirm transaccional. No hay rutas, I/O, escrituras o activación. T-12/T-13/gates productivos siguen pendientes. Cada diff sensible conserva aprobación previa; S-03 ya aprobado/aplicado es un estado distinto.

- **Seguimiento MCP S-03/S-04:** relectura confirmó1355/1356 ALMARA/Haciendo/Daniel; notas internas7 creadas con S-03 aplicado y S-04 candidato. Sin respuesta pública, reasignación o cierre. Ambos cambios OpenSpec pasan validación estricta; hash/manifest/ausencia de archivos S-04 en backend y enlaces correctos.


### 2026-10-23 — D-543/D-544: S-04 aprobado y aplicado; preparación S-05

Daniel: «Apruebo S-04; aplícalo y continúa». Hash94ac8d3675bcc0079d833e99a4cf36a76cea36390c543bf94340f84d6f4317b3 verificado, patch exacto aplicado; seis archivos activos coinciden con manifest y tienen sintaxis Node20 limpia.191/191 desde backend activo sin loader/variables de scratch. Sin rutas, permisos/flags habilitados, cambios de negocio, publicación o commit/push en esta tarea.

S-05 se prepara fuera de archivos activos para options/preview de solo lectura, acceso vigente, lectura del pedido/producto, DTO público y comprobante firmado; confirm sigue pendiente. Lectura actual detectó dos dependencias globales: requireJwtTenant registra audit_log_access solo al rechazar (seguridad existente, mantener middleware) y morganBody en index.js registra cuerpos5xx salvo Kuvo. El candidato debe excluir los cuerpos de las rutas de precio antes de engancharlas, conservando los controles y logs ajenos; no se expondrán motivo/token al logger. Las pruebas distinguirán cero escrituras de negocio en options/preview válidos de la auditoría de seguridad existente ante rechazo. No se retirará middleware para conseguir un contador artificial de cero. Gate S-05 todavía pendiente de diff/revisión/aprobación; la activación conserva los gates restantes.


### 2026-10-23 — D-543/D-544: S-05 financiero preparado; HTTP separado como S-06

Se descompone la preparación anterior: **S-05 contiene solo el desglose financiero** necesario antes de enganchar rutas; el compositor HTTP se conserva como borrador S-06. S-04 ya aprobado/aplicado mantiene191/191 desde backend activo. Ninguno de los nuevos borradores está aplicado.

[Alcance y evidencia S-05](review/s05-financial-breakdown/README.md), patch SHA256 **fae4594c86657828597e040b9679a02cb6e1b26c735226d94a77a3a55150b8ce**:9 archivos,4 existentes y5 nuevos. Captura importes por línea desde los bucles existentes, conserva IVA producto persistido, separa descuento fijo/envío/redondeo sin repartirlos, y extiende antes/después del preparador puro. Sin fórmula paralela, I/O o escrituras.235/235 conjuntas Node20 (214 núcleo +21 caracterización),23/23 financieras nuevas Node24,21/21 T-02 en cada modo y cinco suites financieras existentes verdes; sintaxis6 JS, JSON y aplicabilidad/whitespace limpios. Revisión independiente sin hallazgos materiales. Pendiente aprobación explícita del diff conforme config.yaml:60.

La corrección concurrente1352 sustituyó el recálculo de ambos lectores de despachos por saldo persistido y retiró métodos que T-02 extraía. S-05 conserva las20 expectativas previas, congela métodos históricos con commit/hashes y añade una prueba separada del lector real actual (21700/0, sin mutación). No edita frontend ni convierte la reproducción histórica en afirmación del estado productivo.

S-06 sigue en scratch, dependiente de S-05 y con gate propio. Además del logger5xx, se verificó que usageTracker escribe apiUsage globalmente antes del auth; su borrador excluye exclusivamente los dos nuevos POST options/preview mediante helper de pathname, con DB/SQS dobles. Confirm y rutas existentes conservan contabilización; requireJwtTenant y su auditoría de rechazo siguen activos. No se declara completado HTTP por probar helpers. Confirm/historial/escritores/lectores/UI, seguridad efectiva y mensajero instalado continúan pendientes; no hay permisos/flags, datos reales, publicación, commit/push o cierre desde esta tarea.

- **Seguimiento del checkpoint S-05:** MCP reconsultó ambos tickets, ALMARA FELICIDAD/Haciendo; notas internas creadas exitosamente con S-04 aplicado y S-05 candidato, sin aviso público o cierre. Ambos cambios OpenSpec pasan validación estricta. Patch/manifest final9 archivos, baselines activos intactos, enlaces y aplicabilidad/whitespace comprobados. S-05 sigue sin aplicar a la espera de aprobación explícita.


### 2026-10-23 — D-543/D-544: S-05 aprobado y aplicado; integración S-06 en preparación

Daniel: «Apruebo S-05; aplícalo y continúa». Patch SHA256 **fae4594c86657828597e040b9679a02cb6e1b26c735226d94a77a3a55150b8ce** y cuatro baselines verificados antes de aplicar; nueve archivos activos coinciden con los hashes finales.235/235 Node20 desde backend activo sin loader/RUTA de scratch; seis JS compilan sin errores. Cinco suites financieras existentes y caracterización canonical21/21 adicionales pasan, con legacy incluido en las235. [Evidencia aplicada](review/s05-financial-breakdown/validation-applied-node20.tap).

T-10/T-13 siguen parciales: desglose completo en memoria aplicado, HTTP/confirmación e integración restantes pendientes. S-06 compone options/preview/acceso/codec y cambios mínimos de privacidad/uso; revisión integral y prueba HTTP local con servicios reales contra dependencias sintéticas en preparación. No se mezclará este candidato con el hash ya aplicado. Se conserva cada gate sensible, sin permisos/flags, datos productivos, publicación, commit/push o cierre en esta tarea.


### 2026-10-23 — D-543/D-544: S-06 HTTP/privacidad listo para checkpoint, sin aplicar

[Alcance, contratos y evidencia](review/s06-read-preview/README.md), patch SHA256 **3b8eddb88d984a0cac35aec5ba7e39b242a37ac9dfc9c5509bfbd0ee9a14fbdc**: 15 archivos (cuatro existentes y once nuevos), baselines activos verificados y aplicabilidad/whitespace limpios. Solo options/preview; auth y tenant existentes preceden acceso vigente S-01, lectura/acreditación y whitelist completa S-05, codec S-02. Sin permiso no se lee pedido/producto; ajeno404 antes de fiscalidad. Huellas completas/modo y resultado íntegro firmados; ninguna autorización futura se deriva de options. Lista/ficha continúan con capacidades falsas hasta implementar D-544.

**Privacidad comprobada antes de conectar rutas:** exclusión limitada del contador apiUsage/SQS para ambos POST; skip de cuerpos5xx y rendimiento privado; request Sentry reducido a method/path. Express acepta doble barra en la frontera mount y el helper la reconoce sin normalizar rutas arbitrarias. JSON malformado reprodujo filtración por finalhandler antes del controlador: handler tras parsers responde400/413/415 conocidos o503 desconocido, mensajes estáticos y error ajeno delegado intacto. No cambian límites globales o auth. Estos hallazgos y sus controles tienen reproducciones independientes rojo→verde; no se cargan index/Firebase/Sentry reales.

**Validación final:** 298/298 Node20 (235 anteriores +63 nuevas),63/63 S-06 con modo canónico y63/63 Node24;15 JS compilan. Incluye seis casos HTTP con fuentes reales de auth/soloLectura/tenant/router/S-01/servicio/cálculo/codec y JWT firmado sintético, DB/config/SQS aislados. Revisiones principal e independientes sin hallazgos materiales pendientes. No acredita configuración/reglas productivas, transacción/confirmación, recuperación, SLA, interfaz o build mensajero. No cambia el calculador aprobado/aplicado ni el frontend.

Se conserva la auditoría de seguridad existente de rechazos tenant; el write-set del servicio y de lecturas válidas es cero, incluido consumo. Los eventos de observabilidad previos no copian request privado por estas vías. Gates de confirm/historial/escritores/lectores/UI, seguridad efectiva y mensajero siguen pendientes. Patch sin aplicar hasta aprobación explícita conforme openspec/config.yaml:60. Sin flags/permisos, datos reales, publicación, commit/push o cierre desde esta tarea. S-05 permanece aprobado/aplicado con235/235 desde activo.

- **MCP y cierre del checkpoint S-06:** relectura confirmó ambos tickets ALMARA FELICIDAD/Haciendo; notas internas creadas exitosamente con S-05 aplicado y S-06 candidato, sin aviso público o cierre. Ambos cambios OpenSpec pasan validación estricta. Hash del patch,15 pares de hashes, cuatro baselines activos, enlaces y aplicabilidad/whitespace comprobados; los nueve archivos S-05 siguen exactamente aplicados. S-06 no se aplica sin la próxima aprobación explícita.


### 2026-10-23 — D-543/D-544: S-06 aprobado y aplicado

Daniel: «Apruebo S-06; aplícalo y continúa». Patch SHA256 **3b8eddb88d984a0cac35aec5ba7e39b242a37ac9dfc9c5509bfbd0ee9a14fbdc** y baselines verificados antes de aplicar. Los quince archivos activos coinciden con manifest; sintaxis de15 JS limpia y [298/298 desde backend activo](review/s06-read-preview/validation-applied-node20.tap), sin loader/RUTA de scratch. Options/preview y su privacidad están implementados localmente con guards existentes; no hay ruta confirm ni acción de lista/ficha. La aprobación explícita incluyó cero escrituras en lecturas válidas y conservación de la auditoría existente de rechazos de seguridad.

T-03/T-04/T-06/T-09/T-10/T-11/T-12/T-13 se cierran como unidades de código local; la integración HTTP completa con S-01–S-05 ya está verificada con dependencias sintéticas. Las tareas de confirmación/historial/protecciones/lectores/permisos/UI y gates productivos siguen pendientes. Antes de confirmar se revisan catálogo/validador/escritor D-541 reales y formato recuperable, sin asumir que los eventos nuevos ya existen. No hay flags/permisos habilitados, datos reales, publicación, commit/push o cierre desde esta tarea. Cambios concurrentes preservados y próximos diffs sensibles mantienen aprobación previa.


### 2026-10-23 — D-543/D-544: preparación S-07, sin aplicar

Se acota el siguiente diff a material comercial/digests compartidos de S-06 y construcción pura de patch financiero desde snapshot RAW. El candidato de cálculo normaliza Timestamp para memoria; no puede persistirse completo. Repreparar con producto real, intención/operación originales y pricedAt/mode independientes del contexto servidor permite cotejar material mutable antes de copiar solo derivados, acuerdo y agregados. No se añaden date_upd, recibo, cápsula, transacción o ruta confirm en este paso.

Investigación actual del D-541 en backend700357a3 confirma catálogo sin eventos de precio, normalizador que recorta/descarta objetos y lector nuevo todavía sin enganchar al GET efectivo. Entrega duplicada no verifica contenido; corte global ante error y partición no sirven todavía como acuse financiero cerrado. [Hallazgos](review/s07-confirmation-preparation/history-notes.md) y [análisis de confirmación](review/s07-confirmation-preparation/confirmation-contract-notes.md) conservan propuestas de schema/replay como NO ADOPTADAS para futuros diffs. T-14/T-15/T-16 y gates operativos siguen pendientes; no se acepta dinero antes de resolverlos.


### 2026-10-23 — D-543/D-544: S-07 preparado para checkpoint, sin aplicar

[Alcance y evidencia](review/s07-confirmation-preparation/README.md), patch SHA256 **500d6743b0b65a1566f8bf14bfd84cdcf773213871f93a1d206e6d54b537e793**: seis archivos, un servicio existente modificado y cinco nuevos. Extrae material/digests S-06 sin cambiar DTO o firmas y prepara patch financiero puro desde snapshot RAW/producto real y pricedAt/mode independientes del candidato mutable. Reejecuta el preparador con motor actual, coteja vínculos/resultado completos y copia únicamente seis derivados por línea, acuerdo y nueve agregados (más mapa IVA canónico). Configuración, Date/Timestamp y referencias admitidas permanecen raw, sin deep-freeze; pagos/operativo/fiscal y metadata de confirm quedan fuera.

319/319 conjuntas Node20 (298 anteriores +21 nuevas),21/21 nuevas Node24;50/50 con servicio en cada modo, sintaxis de seis JS y aplicabilidad/whitespace limpios. Revisiones independientes sin hallazgos materiales. No se cambia serializer S-02, no se habilita DocumentReference nativo y no se inventa desglose legacy: ese lector conserva gate T-24. Write-set ejecutado cero; solo objetos en memoria.

T-05/T-14 siguen parciales. No hay transacción, ruta confirm, recibo, cápsula, catálogo de precio o proyección implementados por S-07. Las propuestas de schemas/replay del dossier no se adoptan en este diff; siguen pendientes D-541 real y todos los gates de confirm/escritores/lectores/UI/seguridad/móvil. S-06 ya aprobado/aplicado conserva298/298 desde activo. Pendiente aprobación explícita de S-07 conforme config.yaml:60; sin flags/permisos, datos reales, publicación, commit/push o cierre desde esta tarea.

- **MCP y checkpoint S-07:** ambos tickets reconsultados ALMARA/Haciendo; notas internas creadas con S-06 aplicado y S-07 candidato, sin aviso público o cierre. OpenSpec estricto válido en ambos cambios; hash del patch, seis pares before/after, los quince archivos S-06 aún exactos, enlaces y aplicabilidad/whitespace comprobados. S-07 continúa sin aplicar hasta aprobación explícita.


### 2026-10-23 — D-543/D-544: S-07 aprobado y aplicado

Daniel: «Apruebo S-07; aplícalo y continúa». Patch SHA256 **500d6743b0b65a1566f8bf14bfd84cdcf773213871f93a1d206e6d54b537e793** y baselines verificados antes de aplicar. Los seis archivos activos coinciden con el manifest; sintaxis de seis JS limpia y [319/319 desde backend activo](review/s07-confirmation-preparation/validation-applied-node20.tap), sin loader ni variables de scratch. El material comercial compartido conserva DTO/digests de preview; el patch financiero se reconstruye desde RAW mediante preparación fresca. S-07 sustituye el hash histórico de readPreview.js de S-06, sin modificar el resto de su integración.

T-05/T-14 siguen parciales: no hay transacción, confirm, recibo o cápsula. El siguiente diff prepara la extensión estricta de D-541 para preservar el evento completo y reconocer duplicados mediante contenido verificado. Se conserva la política no bloqueante anterior para los demás eventos. No se escribieron datos reales ni se habilitaron flags/permisos; sin publicación, commit/push o cierre desde esta tarea.


### 2026-10-23 — D-543/D-544: S-08 historial íntegro preparado para checkpoint, sin aplicar

[Alcance, diff y evidencia](review/s08-price-history/README.md), SHA256 **0c198f47860d9b70c8dcb440508752490d77ea4f4fabceae67bb2bd42a8ac046**: diez archivos, cinco existentes y cinco nuevos. Extiende solo `line_price_corrected` en D-541 con preflight puro y material comercial completo, actor/motivo sin truncado, id determinista y hash integral. El escritor único crea una pieza acotada, falla cerrado en el corte de precio y solo reconoce duplicados tras releer/revalidar todo el contenido. Conserva política no bloqueante de otros tipos. Lector modular entrega `cambioPrecio`, usa actor capturado y valida antes de leer fechas; no se conecta aún el GET efectivo ni el evento D-544.

363/363 conjuntas Node20 (319 anteriores +44 nuevas), 96/96 existentes del historial/contratos/espejo; 44/44 nuevas Node24 y 44/44 canónicas. Diez JS compilan, fuentes congeladas durante pruebas. Contratos inspeccionaron el candidato completo mediante arnés read-only. Reproducciones cerradas de getters en metadata/fechas, Timestamp con nanos reales/rango nativo y evento heredado que eludía el normalizador. Cota estructural comparada con protobuf SDK local, sin inicializar Firestore; tamaño de pedido+cápsula sigue pendiente. Las mismas 32 fallas previas de enganches 4.2–4.12 se conservaron en comparación antes/después; no se declaran resueltas. Revisiones independientes sin hallazgos materiales pendientes.

T-15 parcial y T-05/T-14/T-16 y demás gates siguen pendientes. S-07 está aprobado/aplicado y sus seis hashes continúan exactos. Los cinco baselines D-541 activos siguen intactos, cinco archivos nuevos ausentes del backend; aplicabilidad/whitespace limpios sin aplicar. No hay confirmación, recuperación, datos reales, grants/flags, publicación, commit/push o cierre desde esta tarea. Próximo paso sujeto a aprobación explícita de este diff según openspec/config.yaml:60.

- **MCP y checkpoint S-08:** reconsulta confirmó ambos tickets ALMARA FELICIDAD/Haciendo; notas internas creadas con S-07 aplicado y S-08 candidato, sin aviso público o cierre. Ambos cambios OpenSpec pasan validación estricta. Patch, diez pares de hashes, cinco baselines activos, enlaces y aplicabilidad/whitespace verificados. Pregunta de aprobación explícita presentada para S-08; continúa sin aplicar.


### 2026-10-23 — D-543/D-544: S-08 aprobado y aplicado

Daniel respondió «si» al diff exacto S-08, SHA256 **0c198f47860d9b70c8dcb440508752490d77ea4f4fabceae67bb2bd42a8ac046**. Se verificaron hash y baselines antes de aplicar; diez archivos activos coinciden con manifest, diez JS compilan. [363/363 desde backend activo](review/s08-price-history/validation-applied-node20.tap), más 87/87 núcleo/contratos y 9/9 espejo D-541, sin loader, overlay o variables de scratch. El escritor conserva íntegro el evento de precio y acredita duplicados solo tras verificar contenido completo. Los manifests anteriores conservan valor histórico.

T-15 sigue parcial por GET efectivo/consumidores y evento D-544 pendientes. Confirmación, recibo/cápsula, recuperación, protecciones, interfaz y gates productivos no están entregados. Se prepara el siguiente diff de confirmación transaccional sin ruta o activación; no hay cambios de datos reales, permisos/flags, publicación, commit/push o cierre desde esta tarea.


### 2026-10-23 — D-543/D-544: S-09 confirmación transaccional preparada para checkpoint, sin aplicar

[Diff, contratos y evidencia](review/s09-transactional-confirmation/README.md), SHA256 **70db81e2ec6483ef11e3d4430feeeacfa67d1126dfe65da1227c24060bd4adc5**: diez archivos, un acceso existente modificado y nueve nuevos. Añade lectura transaccional S-01 con sus reglas vigentes, núcleo de confirmación, recibo/cápsula, DTO público y guard del documento completo. Replay propio se reconoce antes de terna/fiscalidad/cálculo incluso con permiso/flags válidos OFF; identidad/rol inválidos, config ilegible y readonly conservan403/503/423. Nueva aplicación exige capacidad vigente, firma/TTL y digests exactos; repite TTL justo antes del único update. A superada/vencida responde409; C vigente pero vencida410. Todo get antes del write, sin callbacks externos.

Patch financiero S-07 + date_upd + recibo compacto y evento S-08 pendiente se guardan juntos. ResultVersion es revisión del acuerdo, no updateTime futuro. Tamaño de RAW+patch+recibo+cápsula validado por storage conservador y wire SDK separados; sólo datos y Date/Timestamp nativos seguros, sin callbacks o mutación. Postread devuelve pedido persistido con cápsula/hashes privados ocultos; fallo posterior al commit queda incierto y reconocible repitiendo misma operación, sin falso rollback. GET/listados actuales aún deben integrar el mapper antes de entrega.

432/432 conjuntas Node20 (363 anteriores +69 nuevas), 96/96 historial existente, 69/69 nuevas Node24 y69/69 canónicas. Diez JS compilan y hashes de fuentes probadas congelados. Revisiones principal e independientes cerradas; transacciones son dobles con snapshots/buffer/retry, no emulador ni prueba de escritores productivos. Se corrigieron sólo arnés VM de fuentes y fixture legacy acreditado, sin cambiar dinero esperado o auth; evidencia inicial conservada. Baseline activo intacto, aplicabilidad/whitespace limpios; S-09 sigue sin aplicar hasta aprobación explícita conforme config.yaml:60.

T-05/T-14 siguen parciales por HTTP efectivo; T-15/16/17, protección de escritores, lectores, reglas/permisos/UI y gates productivos pendientes. No hay ruta confirm, proyección, recuperación, grants/flags, datos reales, publicación, commit/push o cierre desde esta tarea. S-08 ya aplicado y verificado363/363 +96/96 activo; su material no cambia en S-09.

- **Coexistencia S-09:** se detectó cambio concurrente compatible en index.espejar D-541 para factory diferida. Exports y funciones de precio conservados, sin incorporar o sobrescribir ese cambio. Repetidas432/432,96/96 y69/69 por modo/runtime;30 dependencias congeladas durante la pasada final. S-09 mantiene el mismo hash y baseline de acceso intacto; manifest S-08 es histórico para ese index.

- **MCP y checkpoint S-09:** ambos tickets reconsultados ALMARA FELICIDAD/Haciendo y notas internas creadas con S-08 aplicado/S-09 candidato, sin aviso público o cierre. OpenSpec estricto válido en ambos cambios. Hash, diez pares de hashes, baseline de acceso, enlaces y aplicabilidad/whitespace verificados. Aprobación del diff S-09 solicitada; continúa sin aplicar.


### 2026-10-23 — D-543/D-544: S-09 aprobado y aplicado

Daniel respondió «aprobado» al diff S-09, SHA256 **70db81e2ec6483ef11e3d4430feeeacfa67d1126dfe65da1227c24060bd4adc5**. Se verificaron hash/baselines y los diez hashes posteriores; diez JS compilan. [Aplicación y evidencia](review/s09-transactional-confirmation/README.md): 432/432 contra producto activo y96/96 de historial. El cambio paralelo D-549 añadió el helper de adjuntos a logger/usage/Sentry; las allowlists VM de tres tests antiguos requieren adaptación read-only, sin cambiar expectativas ni producto. Ejecuciones iniciales e interrupción del único worker HTTP colgado se conservan; el ajuste shippable queda en el siguiente candidato, no modifica S-09 aprobado.

Confirmación local guarda patch financiero, recibo y evento pendiente atómicos y devuelve el pedido persistido con cápsula privada oculta. T-05/T-14 siguen parciales por HTTP efectivo; entrega/recuperación, escritores/lectores, permisos/UI y gates productivos continúan pendientes. Se prepara S-10 con escritor único D-541, ACK verificado y limpieza transaccional de metadatos, sin reescribir dinero. No hay ruta confirm, grants/flags, datos reales, publicación, commit/push o cierre desde esta tarea.


### 2026-10-23 — D-543/D-544: S-10 entrega recuperable preparada para checkpoint, sin aplicar

[Alcance, diff y evidencia](review/s10-history-delivery/README.md), SHA256 **3da60de15ef7dfebb642229a45e3e3fceeb9f28c3f53d3a9cd94a6e663f8d10e**:17 archivos (10 modificados/7 nuevos). Proyector por escritor público único D-541 fuera de transacción financiera; ACK cerrado de contenido verificado y cleanup tx de tres metadatos, sin tocar dinero/pagos/date_upd. Confirm/replay captura recibo completo A, no entrega/adopta B aparecida después y reconoce A entregada en postread tras respuesta de cleanup perdida. Getter thenable rechazado antes de await; fallos/plazos conservan precio aplicado y payload pendiente, sin rollback.

Recuperador config/order_price_change_recovery read-only, roster cerrado máximo50 sin truncar, consulta tenant+pending/docId/lote25/cursor. Cadencia60s sin solapamiento, concurrencia5, entrega8s, presupuesto50s y consultas25s para reservar entrega de páginas sanas. Cupos de IO real retenidos hasta settle aunque expire espera; rotación/cursores parciales evitan saltar no intentados. Bajo saturación no se promete completar en60s. Índice declarado conserva286 previos y fieldOverrides; no se despliega ni se escribe roster. Logs estructurados sólo allowlist/counters.

492/492 conjuntas Node20 (432 anteriores+60 nuevas),96/96 historial,60/60 nuevas Node24 y60/60 canónicas.16 JS compilan; hashes de candidato/dependencias estables durante pasada final. Revisión principal y dos cruzadas cerradas, casos independientes de ACK/carreras/cortes/timeout y writer D-541 real con deps sintéticas. No acredita emulador, índice/reglas vivos o SLA productivo. Rojos iniciales conservados; tres tests VM adaptados a dependencia D-549, sin cambiar expectativas.

T-16/17 continúan sin marcar hasta aplicar/verificar y cerrar gates respectivos. HTTP confirm, lectores/escritores protegidos, permisos/UI, D-544 y gates productivos pendientes. S-09 permanece aplicado exacto; notas internas MCP de aplicación creadas exitosamente en ambos tickets, sin aviso público. S-10 sin aplicar hasta aprobación explícita según config.yaml:60; sin grants/flags, datos reales, publicación, commit/push o cierre desde esta tarea.

- **MCP y checkpoint S-10:** ambos tickets reconsultados ALMARA FELICIDAD/Haciendo; notas internas creadas con S-09 aplicado y S-10 candidato, sin aviso público/cierre. OpenSpec estricto válido en ambos cambios. Hash,17 pares before/after, todas las fuentes de validación aún estables, enlaces y aplicabilidad/whitespace verificados. S-10 continúa sin aplicar hasta aprobación explícita del diff.


### 2026-10-23 — D-543/D-544: S-10 aprobado y aplicado

Daniel: «Apruebo S-10; aplícalo y continúa». Patch SHA256 **3da60de15ef7dfebb642229a45e3e3fceeb9f28c3f53d3a9cd94a6e663f8d10e**, baselines y17 hashes posteriores comprobados;16 JS compilan. [Evidencia de aplicación](review/s10-history-delivery/README.md):492/492 desde activo sin loaders/overlays, más87/87 núcleo/contratos y9/9 espejo D-541. La primera pasada conjunta del historial tuvo fallo IPC del runner Node20 al deserializar un worker, conservado; se repitieron los mismos casos separados sin cambiar código o expectativas.

T-16 se completa como unidad de código local. T-17 sigue parcial por emulador/índice/reglas/coexistencia y gates operativos; índice sólo declarado, sin desplegar. S-10 sustituye manifests históricos de confirm/receipt/tests de S-09 y tres tests de privacidad de S-06, conservando su evidencia histórica. Se prepara S-11 para transporte HTTP confirm y privacidad de consumo: se reprodujo con datos sintéticos que usageTracker copia token/motivo si vienen en la query. Mantendrá el conteo y saneará endpoint privado en el próximo diff, sin extender auth ni TTL.

Sin ruta confirm aún aplicada, datos reales, roster/grants/flags, publicación, commit/push o cierre. Los próximos cambios sensibles conservan gate de diff concreto.


### 2026-10-23 — D-543/D-544: S-11 HTTP confirm preparado para checkpoint, sin aplicar

[Alcance, diff y evidencia](review/s11-confirm-http/README.md), SHA256 **6f66f1a83b0c8afd5903686dd138e5e7ca8307a5415e3969af33a2841b990ce7**:12 archivos (7 modificados/5 nuevos). Añade POSTconfirm con auth→requireJwtTenant y readonly existentes; factory con confirmService opcional y singleton diferido de lectura/confirmación compartiendo DB/codec/reloj. Delega sin repetir permiso/TTL antes del servicio; DTO persistido público directo. Cuatro códigos nuevos y fallback confirm503 conservan misma operación; no errores privados/getters. No cambia core financiero/transaccional/proyección.

Se reprodujo consumo con query privada copiada en apiUsage. Nuevo helper entrega pathname de rutas privadas exactas; confirm/replay/rechazos conservan consumo DB/SQS sin token/motivo/query/origen/fragmento, options/previewPOST siguen exentos, otros endpoints y bypassD549 intactos. Parser conocido mantiene400/413/415; desconocido503confirm instruye repetir misma operación, preview igual. Index/logger/Sentry/performance sin cambios.

529/529 conjuntas Node20 (492 anteriores+37 nuevas),96/96 historial,37/37 nuevas Node24 y37/37 canónicas.12 JS compilan; fuentes estables durante prueba final.17HTTP independientes con fuentes reales y DB/config/reloj/SQS sintéticos,8runtime,6controller y6privacy. Revisión principal y dos cruzadas cerradas. Rojos cronológicos controller/privacy y baseline runtime posterior identificados honestamente; primeraHTTPverde. No acredita emulador ni producción.

T-05/T-14 siguen parciales hasta aplicación/verificación/gates respectivos. Escritores/fiscalidad, lectores generales sin mapper, GET efectivo D-541, permisos/reglas/UI, D-544 y gates reales siguen pendientes antes de habilitar. S-10 ya aprobado/aplicado con492/492 activo+96/96 historial. S-11 sólo candidato hasta aprobación explícita config.yaml:60; sin datos/configuración real, permisos/flags/roster/índice desplegado, publicación, commit/push o cierre.

- **MCP y checkpoint S-11:** ambos tickets reconsultados ALMARA FELICIDAD/Haciendo; notas internas creadas con S-10 aplicado y S-11 candidato, sin aviso público/cierre. Ambos cambios OpenSpec estrictos válidos; hash,12 pares before/after, fuentes de validación todavía estables, enlaces y aplicabilidad/whitespace comprobados. S-11 continúa sin aplicar hasta aprobación explícita.
