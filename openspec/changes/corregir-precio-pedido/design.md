# Diseño técnico — corregir precio del pedido (D-543 / 1355)

**ALMARA FELICIDAD · 23-oct-2026.** Propuesta/spec aprobadas por Daniel: «Apruebo ambas specs y esas reglas». **Diseño APROBADO:** «Apruebo ambos diseños y la adaptación». Incluye contratos, matriz de lectores y excepción acotada Angular 14. [Tareas APROBADAS](tasks.md): «Apruebo las tareas de ambos; implementa y valida». Implementación en curso con aprobación de cada diff sensible antes de aplicarlo; sin autorización de despliegue.

## Contexto y decisiones

La escritura genérica `updateOrderInternal` recalcula, puede afectar inventario y dispara avisos. No sirve como confirmación de esta intención. D-536 resuelve creación; no cubre edición posterior. Los campos resueltos existentes no congelan por sí solos el acuerdo: los lectores los vuelven a calcular. D-541 está en desarrollo concurrente, con catálogo cerrado de eventos y escritor no bloqueante; no se presume publicado.

Se adopta un flujo dedicado **preparar → revisar → confirmar**, compartido con D-544. El servidor calcula y autoriza; la pantalla presenta importes. Contratos, marca y recuperación en [contracts.md](contracts.md); cobertura de consumidores en [readers.md](readers.md). Sin colecciones nuevas, endpoints v2 o cambios de banderas globales de IVA.

## Backend y permisos

- Rutas bajo `/v1/orders/price-change`: `POST /options` (capacidades/líneas/listas, solo lectura), `POST /preview` (solo lectura) y `POST /confirm`, con `auth`, empresa del JWT y comprobación específica de intención. No se usa el bypass de plataforma/Administrador del middleware granular para ejecutar estas acciones; el piloto exige sesión legítima de ALMARA y permiso explícito.
- Módulos pequeños en `services/orders/priceChange/`: acceso, preparación, contrato de preview, confirmación y entrega al historial; controlador dedicado. No importar/arrancar `index.js` para pruebas.
- Reutilizar el mapa canónico `roles.permissions: { modulo: ['accion'] }`: acciones `ventas.correct_price` y, en D-544, `ventas.change_price_list`. No crear otro almacén de permisos ni derivarlos de menú, `edit`, `*` o nombre de rol. `clientes.edit` se exige adicionalmente para la ficha opcional.
- Resolver usuario **único** por empresa e identificación firmadas; `JWT.sub` no es el docId de `users`. Comprobar estado, identidad y rol vigentes, y resolver el rol por empresa/nombre sin escoger arbitrariamente el primero. Las referencias y su vigencia se comprueban otra vez en la transacción.
- Modelo de Role, validación del backend y controles explícitos del editor se alinean con el mapa existente, preservando mapas legacy no relacionados. Roles ausentes, ambiguos o con `permissions` legacy en forma de array no reciben las acciones nuevas. **Censo productivo de solo lectura realizado el 23-oct:** seis roles de ALMARA; cuatro sin permissions, Administrador con `[]`, VENTAS con `{}`. Ninguno tiene estas acciones. No se consultaron usuarios, pedidos o pagos ni se mostraron credenciales en ese censo; no se escribió ningún rol.
- Roles con mapa conservan módulos/acciones ajenos. Sin permissions o con array vacío se conserva la representación exacta al guardar sin cambios de capacidades. Para conceder una capacidad nueva, el gestor debe optar expresamente por habilitar el mapa granular en **ese rol** y seleccionar la acción; se muestra el cambio ausencia/`[]`→mapa antes de guardar, sin convertir otros roles o grants. Array no vacío/malformado bloquea estos controles hasta una conversión explícita aparte con correspondencia revisada. Esta es una operación administrativa posterior, no una migración ni una concesión autorizada por desplegar código.
- `allPermissions()` y plantillas no deben conceder estas acciones al agregar el catálogo: se excluyen del conjunto automático y requieren marcar controles específicos. Conservar los grants explícitos existentes al editar. El diseño no autoriza modificar roles reales.
- El guard de gestión actual no se reutiliza como garantía: `verifyRole` acepta roles estándar por substring y toma empresa de headers. Crear/editar un rol que introduzca, quite o transporte estas capacidades exige guard transaccional acotado: gestor administrador **vigente verificado** del mismo tenant JWT, comparación del mapa anterior/nuevo y protección de identidad/empresa del rol. Rechazar dotted keys y cambios de representación para eludir la comparación; si el payload omite permissions, preservar el original. No activar estos permisos mediante plantillas, nombres de rol, paths o cambio de empresa. La gestión restante de roles no se rediseña.
- Gate de acceso: verificar que las rutas de gestión de roles/usuarios y las reglas directas de Firebase no permitan autoconcederse estas acciones o cambiar la identidad. Los ajustes acotados para proteger estos permisos se revisan con su diff; si el cierre exige trabajo de seguridad general pendiente de D-512, **no se habilita** el piloto por adelantado.

## Precio pactado y cálculo

Al primer cambio se fija identidad de cada línea y **se conservan los precios pactados de todas las líneas**, no solo de la elegida. Valores monetarios reutilizan `precioSinIvaResuelto`, `tarifaEfectiva`, `ivaLinea` y los derivados actuales; metadatos server-only `pricingAgreement` identifican versión, líneas, origen y momento del acuerdo. Una marca sin datos completos es error explícito, nunca fallback a catálogo/cero.

**Acreditar el antes:** reconstruir bases de líneas no elegidas exclusivamente del pedido guardado y su snapshot/overrides históricos, nunca del producto fresco. Conciliar línea, extras, descuentos e importes guardados con la precisión/redondeo actual antes de preparar; discrepancia no explicable o base no acreditable → `AGREEMENT_INVALID`, sin normalizar silenciosamente otras líneas. El producto real solo acredita pertenencia y permiso de edición en 1355; su precio actual no reemplaza el pacto previo.

La resolución prioritaria del acuerdo se integra en `orderCalculationService` y sus caminos legacy/canónico; se conserva la fórmula actual de impuestos, descuentos, extras y envío. No se encienden `IVA_PERSIST_CANONICAL` ni `ivaCalcUnificado`, ni se cambian los casos de referencia de spec 010. Campos de snapshot usados por los adaptadores se mantienen coherentes **dentro del pedido**, sin tocar `products`.

Para 1355 se sustituye solo la base sin IVA de la línea elegida, manteniendo IVA efectivo y condiciones no cambiadas. Precio cero se comprueba por presencia, no por `||`. Extras conservan su representación y cantidades; el resultado expone sus importes para no sumarlos otra vez en PDF. Pagos no se congelan: se leen frescos y se suman con la política vigente; `faltaPorPagar` mínimo cero y `overpaymentAmount` separado. Caracterizar estados reales, incluido `Anulado`, sin cambiar la política de pagos desde este ticket.

En pedidos marcados, el guardado genérico debe preservar acuerdos/recibos/cápsula y proteger campos de precio frente a payload completo antiguo, llaves con puntos o un `_baseVersion` omitido. La comprobación es transaccional también para ese caso. Cambio de líneas ambiguo o basado en una copia anterior exige recarga, sin completar por índice+producto a ciegas. Las acciones legítimas existentes de cantidades, IVA, descuento o pagos conservan su contrato y respetan las bases pactadas de líneas no cambiadas; se caracterizan antes de habilitar. Pedidos sin marca mantienen comportamiento previo.

Reglas para edición posterior de carrito marcado:

| Intención legítima existente | Tratamiento del acuerdo |
|---|---|
| Reordenar | Conservar lineKey y base por identidad, no por posición |
| Cambiar cantidad | Conservar base pactada; el motor actual recalcula importes/extensiones y descuentos válidos |
| Cambiar IVA/descuento por su acción autorizada | Conservar base; actualizar solo la condición expresamente cambiada y derivados, sin refrescar catálogo |
| Eliminar línea | Quitar solo la identidad seleccionada y recalcular; no transferir su acuerdo a otra línea |
| Agregar línea | Intento estructural explícito, versión fresca y autorización existente de modificar productos; el servidor valida/resuelve **la línea nueva** con el camino vigente de selección/creación y le asigna lineKey/acuerdo. Las líneas anteriores no se revaloran |
| Payload antiguo sin intención estructural | Preservar precio/metadatos actuales; si el conjunto de líneas cambió o no puede identificarse inequívocamente, 409 y recarga, no inventar base ni aceptar cambios monetarios encubiertos |

Se adaptan los llamadores legítimos de esas acciones al protocolo marcado, sin ampliar su autorización. Un cuerpo completo no puede fingir una intención autorizada o mutar precios de líneas existentes. Pruebas de esas acciones y clientes son gate del piloto; la promesa no se cubre bloqueando todas las ediciones.

También existen escritores fuera de `updateOrderInternal`: **editBatch** recibe snapshots completos y **registrarCierreCaja** arma un batch con la foto previa. Para pedidos marcados, el primero usa patch operativo cerrado que excluye dinero/acuerdos/recibos y precondición de versión; cualquier conflicto se reporta según el contrato por pedido/lote existente, sin sobrescritura parcial silenciosa. El cierre escribe solo sus campos propios con precondición `updateTime`; conflicto obliga releer y recalcular el cierre/resumen antes de reintentar. No vale consolidar caja con una foto monetaria anterior. Estos diffs y el censo de otros escritores completos se revisan antes de habilitar; guard genérico solo no es suficiente. La precondición cubre también la **primera marca**: para pedidos elegibles del piloto, guardado genérico/batch validan updateTime o releen en transacción aunque su lectura inicial fuera sin acuerdo. Si otra corrección introduce la marca entre lectura y commit, la copia antigua falla; no se decide conservar el camino inseguro solo porque la primera foto no tenía marca.

## Concurrencia fiscal e historial: dependencias obligatorias

Confirm lee `facturacionEnProceso`, datos fiscales y cierres financieros en la misma transacción que escribe el pedido. Bloquea cierre de Kuvo y `cierreCaja.estadoCierre='cerrado'`/estado operativo protegido `Cerrado`; no permite reabrirlos por corrección de precio. No toma, limpia ni libera un candado fiscal. Factura emitida, en curso o elegibilidad indeterminada bloquean sin cambio. La carrera con cierre de caja se prueba en ambos órdenes de commit.

**Carrera adicional localizada:** `AccountingManager` lee el pedido antes de tomar el candado y después continúa con esa foto anterior. El diseño exige que use el pedido fresco retornado por la transacción de toma de candado, o rechace por versión antes de preparar/empezar emisión. El compositor DIAN ya prepara de nuevo dentro de su transacción; se caracteriza también. Esta corrección acotada de la lectura fiscal y los lectores SIIGO/World Office/DIAN son gates, con diff sensible separado; no se emite una factura real como prueba automática.

Pedido y **cápsula pendiente** del evento se guardan juntos. Se proyecta el evento únicamente mediante el escritor D-541 y su colección ya aprobada; la cápsula es entrega pendiente, no una segunda línea de tiempo. Se amplía solo el catálogo de precio/lista y su lectura, conservando el comportamiento no bloqueante de los demás eventos D-541. Una falla de proyección deja el precio aplicado y recuperable; UI informa ese estado y bloquea **otra corrección** hasta proyectar. Recuperación acotada y recibos en contracts.md. La F1/habilitación y reglas de D-541 deben estar verificadas antes del piloto; no asumir toda la F2 implementada.

## UI y adaptación Angular 14 aprobada

Dos entradas en **Más opciones**, sin reorganizar el menú en trabajo paralelo. Al abrirlo se consultan las opciones autorizadas del pedido y se muestran las acciones solo al recibir capacidad afirmativa; una falla no cae a la heurística de Administrador. Un contenedor de diálogo `OrderPriceAdjustmentComponent`, editor de línea, editor de lista (D-544) y resumen antes/después, con responsabilidad única. `OrderPriceAdjustmentService extends BaseService` hace HTTP; no usar `VentasService.editOrder`, que envía el pedido completo y dispara avisos.

Componentes nuevos standalone/OnPush, Reactive Forms, RxJS para HTTP y estado ordinario inmutable; `*ngIf/*ngFor` soportados por Angular 14. **Excepción acotada al Artículo IX APROBADA por Daniel para 1355/1356:** sin signals ni `@if`; no se cambia la constitución global.

Estados explícitos: `loading → editing → previewing → previewReady → confirming → applied | outcomeUnknown | stale | blocked`. Editar cualquier intención/motivo invalida preview; una respuesta antigua no lo reactiva. No hay fórmulas monetarias en el resumen. Timeout/5xx después de enviar puede ser resultado ambiguo: conservar operación y comprobar/repetir la misma; no afirmar reversión ni generar otra operación automáticamente. Un conflicto exige vista previa nueva y otra confirmación humana. Cerrar después de enviar no cancela una escritura ya aceptada.

Al recibir resultado confirmado se sustituye el pedido por `_id` en lista, detalle y selección, y se refresca desde servidor. Mostrar excedente y recuperación del historial como estados distintos. Tema D-131 y base `config-pagina`, foco restaurado, teclado, `aria-live`, sin clases nuevas con `p-`, gradientes o paleta paralela. QA del diálogo a 1440/390 y control de conteos CSS.

## Habilitación, reversión y validación

`companies.featureFlags.orderPriceCorrections`, apagada por defecto; requiere también `orderHistoryLog` disponible, reglas y permisos explícitos. El piloto solo ALMARA se activa mediante la herramienta existente de configuración, con simulación previa y autorización de publicación. No se escriben interruptores `.env` ni se conceden permisos como parte del despliegue. Responsable Daniel; revisión/retiro previsto **23-nov-2026**, mediante cambio aprobado posterior, sin activación automática para otros comercios.

Reversión: apagar acceso a nuevas correcciones; **mantener los lectores de acuerdos y la recuperación de eventos** para pedidos ya corregidos. Nunca volver a interpretar esos pedidos con catálogo ni revertir precios legítimos. Si se debe retirar un despliegue, la versión de recuperación debe entender la marca; no sirve restaurar ciegamente un binario anterior.

Validación prevista, no ejecutada: contratos de preview sin escrituras/avisos; confirm y reintentos transaccionales en emulador; permisos/revocación/tenant; cierre fiscal concurrente; write-set; reinicio entre commit/proyección; getters, exportes, PDF, reportes y mensajero según matriz; casos canónicos intactos; precio cero, extras, IVA, descuento, sobrepago y pagos no vigentes. Pruebas móviles del build instalado y comprobación autorizada de datos/ruta efectiva ALMARA antes de habilitar. No usar el pedido real DAD-014498 como escritura de QA.

## Gates constitucionales y siguiente checkpoint

I–III: specs y diseños aprobados; las tareas tienen checkpoint propio. IV–VIII: recibo/huellas, trazabilidad y pruebas de contrato primero, sin proveedores ni webhooks nuevos. IX: adaptación explícita aprobada arriba. X–XI: auth intacta, logs sin tokens, motivos o datos personales. XII: dueño/retiro definidos. XIII–XV: specs separadas, decisiones en CONTRACT; sin colección nueva o schema de integraciones paralelo.

Orden técnico: D-543 con núcleo y consumidores/dependencias verificables, después D-544; diffs sensibles de uno en uno. Diseño y tareas aprobados autorizan la implementación; cada diff sensible conserva aprobación antes de aplicarlo. Activación depende de todos los gates, no de haber compilado.
