# Tareas — cambiar lista de precios del pedido (1356 / D-544)

**Estado: APROBADAS por Daniel: «Apruebo las tareas de ambos; implementa y valida». Implementación en curso; los diffs sensibles conservan su gate previo.** 23-oct-2026. [Diseño](design.md) aprobado por Daniel: «Apruebo ambos diseños y la adaptación». Casillas se completan solo con evidencia verificable. Se aplican los [contratos](../corregir-precio-pedido/contracts.md), [lectores](../corregir-precio-pedido/readers.md) y reglas de ejecución de [D-543](../corregir-precio-pedido/tasks.md).

## Dependencias y límites

D-543 suministra autorización, acuerdos, cálculo, comprobante, confirmación, historial/recuperación y diálogo. No duplicarlos. Las tareas de código de D-544 comienzan después del núcleo, lectores/protecciones y validación integrada D-543 T-40; se puede preparar documentación contractual sin editar código compartido. La habilitación exige también todos los gates D-543, incluido mensajero efectivo, seguridad y D-541. Un candidato apagado puede verificarse localmente aunque una evidencia operativa siga pendiente.

**Avance compartido 23-oct:** S-04 aprobado y aplicado (191/191 desde backend activo). [S-05 financiero aprobado y aplicado](../corregir-precio-pedido/review/s05-financial-breakdown/README.md),235/235 Node20 desde backend activo sin loader y cinco suites existentes verdes. [S-06 HTTP/privacidad aprobado y aplicado](../corregir-precio-pedido/review/s06-read-preview/README.md),298/298 desde backend activo Node20 sin loader; resolución de lista y todas las tareas L siguen pendientes de D-543 T-40. Este avance común no declara1356 implementado.

Cada tarea de código cierra con sintaxis/compilación y checks del bloque sin errores. En orders/fiscalidad se aplica **gate S: diff concreto revisable y aprobación explícita antes de aplicarlo, un cambio a la vez**, según `openspec/config.yaml`; no editar simultáneamente archivos comunes. `[P]` indica únicamente archivos disjuntos ya asignados. Aprobar tareas no concede permisos reales, no habilita flags ni autoriza publicación o cambios de pedidos/clientes productivos. No hay backfill/migración ni colección nueva; si surgiera esa necesidad requiere propuesta y dry-run primero.

**Preparación compartida S-07:** [material y patch puro](../corregir-precio-pedido/review/s07-confirmation-preparation/README.md) listos para checkpoint,319/319 Node20 y21 nuevas Node24, sin aplicar. No contiene resolución de lista, cambios de ficha o confirmación; L-01–L-15 continúan pendientes de sus dependencias.

## Contratos de la intención de lista

- [ ] **L-01 [P] — Fijar extensión de options con pruebas previas.**
  - **Entrada/salida:** diseño de lista → contrato probado de capacidades/listas activas del mismo tenant en `/options`.
  - **Éxito:** no derivar id de nombres Público/Mayorista, exponer permisos independientes de ficha, flags OFF sin capacidades positivas; cero escrituras/eventos/avisos. Otras capacidades y errores D-543 se conservan.
  - **Archivos:** prueba nueva `functions/tests/orders/priceChange/priceListOptions.contract.test.js`, sin editar otros contratos simultáneamente.
  - **Dependencias:** aprobación de estas tareas; contratos D-543 congelados. Su ejecución sigue el orden técnico indicado arriba.

- [ ] **L-02 [P] — Fijar extensión de preview con pruebas previas.**
  - **Entrada/salida:** `kind:priceList` y decisiones → pruebas del contrato de `/preview`, pricedAt y resultado por línea.
  - **Éxito:** una referencia persistida o provisional por línea; rechazar duplicadas/ajenas/ambiguas, decisiones desconocidas y dotted keys. Manual previo conservado por defecto, reemplazo explícito; cero activo distinto de ausencia. Sin fila requiere keepCurrent/manual/cancelar, manual solo editable; aplicar lista/conservar no exige editable. Preview cero writes.
  - **Archivos:** `priceListPreview.contract.test.js` nuevo y fixtures propios.
  - **Dependencias:** aprobación de estas tareas y contrato común aprobado.

- [ ] **L-03 [P] — Fijar extensión de confirm y cliente con pruebas previas.**
  - **Entrada/salida:** intención firmada → pruebas de `/confirm` para lista, revocación, idempotencia y opción de ficha.
  - **Éxito:** sin opción ficha intacta; con opción, pedido y ambos alias del cliente cambian juntos o ninguno. Cliente inexistente/ambiguo/ajeno, permiso revocado o versión obsoleta no cambia ningún documento. No degradar intención silenciosamente a solo pedido.
  - **Archivos:** `priceListConfirm.contract.test.js` nuevo y espías DB/proveedores, disjuntos de L-01/L-02.
  - **Dependencias:** aprobación de estas tareas y contrato común aprobado.

## Preparación y guardado del servidor

- [ ] **L-04 — Resolver precios y decisiones de la lista al preparar.**
  - **Entrada/salida:** maestros/fila real del tenant y acuerdo D-543 → preparador de lista usando cálculo existente y `pricedAt` del servidor.
  - **Éxito:** precios/campañas vigentes al preview sin cambiar `fechaCreacion` ni D-219 para otros pedidos. No refrescar manuales/conservados; manual IVA mantiene precedencia, fila válida aporta tarifa cuando corresponde. Conservar cantidades/extras/descuentos/envío sin doble suma. Lista inactiva/borrada o fila incompleta exige bloqueo/decisión; nunca fallback a Público/cero ni escritura maestra.
  - **Archivos:** módulos pequeños de preparación de lista en `functions/services/orders/priceChange/`, helpers vigentes leídos previamente y pruebas financieras.
  - **Dependencias:** L-02 y D-543 T-40 verde; gate S si modifica cálculo compartido.

- [ ] **L-05 — Extender POST options para lista.**
  - **Entrada/salida:** L-01/L-04 → listas/capacidades y referencias coherentes con el pedido actual desde el mismo endpoint.
  - **Éxito:** L-01 verde, `ventas.change_price_list` explícito, sin bypass; opción de cliente requiere `clientes.edit` adicional. Sin reescribir el endpoint ni crear otra ruta/servicio de permisos.
  - **Archivos:** options/controlador/acceso compartidos y pruebas de L-01; sin cambios productivos de configuración.
  - **Dependencias:** L-04, L-01; gate S.

- [ ] **L-06 — Extender POST preview para lista.**
  - **Entrada/salida:** L-02/L-04 → antes/después por línea y financiero, decisiones efectivas y token del mismo codec.
  - **Éxito:** L-02 verde; firma lista/decisiones/opción de ficha/huellas de cliente si se eligió; vencimiento acortado por campaña. Ninguna escritura, clave persistida ni aviso; cambio posterior de condición exige nueva revisión. Bootstrap congela todas las líneas con identidad D-543.
  - **Archivos:** preparación y controlador preview compartidos, DTOs y pruebas del endpoint.
  - **Dependencias:** L-05, L-07, L-02; gate S. La resolución de ficha opcional se comparte con L-07, sin duplicación provisional para preview.

- [ ] **L-07 — Preparar patch opcional del tipo de cliente.**
  - **Entrada/salida:** vínculo real cliente-pedido y modelo de clients → resolución inequívoca y patch puro autorizado de `categoria {id,nombre,descripcion}`, `tipoCliente` y metadatos actuales.
  - **Éxito:** no resolver por primer email/nombre ni confundir tenant/docId; sin opción no leer/escribir ficha innecesariamente. Con opción validar permiso independiente y versión para transacción común. No tocar contactos/direcciones/índice/otros clientes o pedidos; no llamar `clients/edit`.
  - **Archivos:** helper pequeño priceChange y contratos basados en `controllers/clients.js`; sin endpoint/escritura independiente.
  - **Dependencias:** L-03, L-05; gate S antes de integrar acceso a la entidad sensible. Se ejecuta antes de L-06 para firmar allí las huellas de cliente.

- [ ] **L-08 — Extender POST confirm con atomicidad de pedido y ficha.**
  - **Entrada/salida:** L-03/L-06/L-07 → rama priceList del confirm común y patch transaccional cerrado.
  - **Éxito:** todos los gets antes de writes, revalidación permisos/lista/productos/campañas/pagos/fiscalidad/cierres/cliente, resultado igual a preview. Ambos alias de ficha solo con opción y permiso; fallo en cualquiera deja ambos documentos iguales. Replay devuelve estado actual sin repetir ficha; mismo id/otra intención, expirado, lista cambiada o campaña vencida rechazan según contrato.
  - **Archivos:** confirm compartido y helpers, tests de L-03 y carreras en emulador.
  - **Dependencias:** L-06, L-07, L-03; gate S separado antes de aplicar.

- [ ] **L-09 — Completar evento de lista en el historial común.**
  - **Entrada/salida:** L-08 y catálogo D-543/D-541 → único evento `price_list_changed` con lista anterior/nueva, decisiones por línea, importes y opción de ficha realmente aplicada.
  - **Éxito:** no evento por fila/render ni segundo reintento independiente de cliente. Fallo de proyección conserva cápsula y precio/ficha aplicados; UI aplicado/pendiente y bloqueo de otra corrección. Recuperación, límites de tamaño y limpieza coincidente pasan sin nuevos mecanismos.
  - **Archivos:** constructor de evento, DTO/lector D-541 si requiere formato de detalles y pruebas con escritor común; coordinar sus archivos.
  - **Dependencias:** L-08, D-543 T-15/16/17; gate S del diff común.

## Editor y validación transversal

- [ ] **L-10 — Implementar editor de lista y decisiones por línea.**
  - **Entrada/salida:** options/preview estabilizados → `OrderPriceListEditor` standalone/OnPush, Reactive Forms/RxJS y directivas Angular 14.
  - **Éxito:** conservar manuales visible por defecto, sustitución explícita; fila ausente exige decisión, cero es válido. Aplicar lista/conservar habilitado para no editables; manual bloqueado si no editable. Sin fórmulas monetarias ni lineKeys inventadas; respuesta tardía de otra lista no reemplaza selección actual.
  - **Archivos:** editor nuevo y pruebas/estilos propios; no cambiar contenedor/módulo común simultáneamente.
  - **Dependencias:** L-06, D-543 T-29/35/37.

- [ ] **L-11 — Integrar acción, ficha opcional y resultado de lista.**
  - **Entrada/salida:** L-08–10 → Cambiar tipo de precio en Más opciones y extensión del diálogo/servicio/modelos existentes.
  - **Éxito:** capacidad afirmativa actual, ficha inicialmente desmarcada y sin habilitarla por nombre de rol. Cambiar lista/decisión/opción/motivo invalida preview; una sola confirmación para ambos documentos, nunca `clients/edit` separado. Error no reduce intención; timeout conserva operationId, 409 obliga revisar. Adoptar pedido persistido por `_id` y refresh como D-543, sin avisos de edición genérica.
  - **Archivos:** contenedor, DTO/servicio y `list.component.*` comunes, secuenciales; pruebas UI/HTTP de permisos y estados.
  - **Dependencias:** L-09, L-10, D-543 T-38; gate S del menú/flujo sensible.

- [ ] **L-12 — Ejecutar integración de lista y matriz completa de lectores.**
  - **Entrada/salida:** L-11 → contratos e integración en emulador/dobles; matriz común con acuerdos de lista, manual conservado/sustituido y ficha opcional.
  - **Éxito:** Público→Mayorista con IVA/descuentos/extras; incompleta/cero/campaña; cliente/rol/lista obsoletos; doble clic/timeout/replay e historial fallido. Catálogo/lista/categoría posteriores no revaloran. Lista/detalle/pagos/cartera/logística/planilla/mensajero/PDF/correo web y backend/Excel/reportes por producto/mappers fiscales coinciden. Espía write-set: solo pedido/historial y, con opción, patch de un cliente; ningún pago/reembolso/inventario/producto/lista/factura/shipping_order/config/rol.
  - **Archivos:** contratos/suites comunes y específicos, evidencia en este cambio; conservar expectativas legacy.
  - **Dependencias:** L-11, D-543 T-40; evidencia móvil D-543 reutilizable solo si demuestra este contrato, si falta se registra pendiente sin declarar gate pasado.

- [ ] **L-13 — Ensayar banderas y reversión sin perder acuerdos.**
  - **Entrada/salida:** L-12 → ensayo aislado con `orderPriceListChanges` ausente/OFF/ON y núcleo/historial disponibles o no.
  - **Éxito:** default apagado; ninguna concesión automática ni `.env`. Apagar acción conserva precios, ficha ya aplicada, lectores y recuperación; no revertir automáticamente negocio ni volver a binario que ignore acuerdo. Simulación de activación ALMARA separada de ejecución, roster de pendientes se conserva.
  - **Archivos:** pruebas y runbook compartido/específico; no escribir flags, permisos o configuración de producción.
  - **Dependencias:** L-12, D-543 T-41.

- [ ] **L-14 — Compilar y revisar selector/preview a 1440 y 390.**
  - **Entrada/salida:** L-12/L-13 → build prod sin errores, checks backend y QA del flujo completo de lista/ficha.
  - **Éxito:** filas/decisiones responsive, sin scroll horizontal o texto invisible; teclado/foco/aria-live, tema plano canónico sin incremento de gradientes/primarios prohibidos o clases nuevas con `p-`. Revisar versión/environments modificados por build, sin publicar dist ni mezclar diffs ajenos. Repetir checks del bloque si se corrige algo.
  - **Archivos:** evidencia QA y correcciones propias del editor/diálogo; checks de fuentes/suites afectadas.
  - **Dependencias:** L-12, L-13.

- [ ] **L-15 — Preparar entrega y seguimiento de 1356.**
  - **Entrada/salida:** L-14 y gates comunes → dossier único de ambos cambios con diffs, pruebas, matriz, permisos/flags propuestos, reversión y pendientes reales.
  - **Éxito:** actualizar CONTRACT y nota interna MCP de 1356, sin afirmar publicación o cerrar por un build. Listo para piloto solo con D-543 T-43 y todos sus gates acreditados; si falta evidencia, entregar candidato apagado y registrar pendiente. Publicar, otorgar permisos y verificar producción requieren autorización concreta posterior.
  - **Archivos:** `tasks.md`, evidencias/runbook del cambio, `specs/CONTRACT.md` y nota MCP.
  - **Dependencias:** L-14 y D-543 T-43 para declarar listo el piloto.

## Orden y definición de terminado

Contratos L-01–03 pueden prepararse en paralelo en archivos nuevos separados. Después: L-04 → L-05 → L-07 (resolver ficha) → L-06 (preview) → L-08 → L-09; editor L-10 tras contrato estable; L-11 integra sin cruzar archivos comunes con D-543. L-12–15 cierran validación y entrega. Todos los diffs sensibles conservan su aprobación individual.

Implementación terminada exige contratos/regresiones/compilación verdes y coherencia de todos los consumidores; listo para piloto añade evidencia de seguridad, historial y app instalada. Publicación/activación/verificación productiva se registran únicamente tras ejecutarse con autorización; no son efectos de aprobar tareas. Piloto solo ALMARA, responsable Daniel, revisión/retiro 23-nov-2026 mediante cambio aprobado posterior.


### Avance compartido 23-oct / S-09 y candidato S-10

S-09 aprobado y aplicado: confirmación/recibo del núcleo D-543,432/432 contra producto activo con adaptación read-only de allowlists VM por D-549, más96/96 historial. [S-10 aprobado y aplicado](../corregir-precio-pedido/review/s10-history-delivery/README.md) prepara entrega/recuperación:492/492 conjuntas y60/60 nuevas por modo/runtime, verificado492/492 desde activo y96/96 historial tras aprobación exacta. No se adelantan implementación del cambio de lista, evento D-544 o ficha opcional; se conserva dependencia de T-40 de D-543 y todos los gates de activación.


### Avance compartido 23-oct / candidato S-11

S-10 ya aplicado/verificado492/492 desde activo y96/96 historial. [S-11](../corregir-precio-pedido/review/s11-confirm-http/README.md) prepara HTTPconfirm de D-543:529/529 conjuntas y37/37 nuevas por modo/runtime; permanece sin aplicar hasta aprobación concreta. No implementa lista/evento D-544 o ficha opcional, ni levanta dependencia T-40/gates de habilitación.
