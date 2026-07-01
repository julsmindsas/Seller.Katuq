# Spec 012 — Consolidación de la integración SIIGO (un solo camino de facturación)

> Renumerada de 008 → 012 el 2026-07-01 (colisión con `008-cotizaciones-mvp` — ver D-067 en CONTRACT.md).
> Estado: **draft**
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-06-23

## 1. Contexto / Por qué

Hoy conviven **tres caminos** que emiten o intentan emitir facturas electrónicas en SIIGO, y solo uno es correcto:

- **Camino A — núcleo contable (sano):** la venta asistida encola la facturación en background contra el servicio contable multi-tenant, que arma la factura desde el pedido usando la configuración de la empresa. Es el único camino confiable.
- **Camino B — legacy de frontend (peligroso, aún conectado):** el **POS clásico** arma la factura en el frontend con **datos de prueba e identificadores fijos** (la palabra "prueba" en el nombre del cliente, observaciones "Prueba…", tipo de documento, vendedor, impuesto y medio de pago hardcodeados de **una sola cuenta SIIGO ajena**, y geolocalización que solo resuelve dos ciudades). Lo envía a un endpoint marcado como deprecated. En `crear-ventas` y el POS nuevo este camino quedó **vestigial** (se calcula pero no se envía), pero en el POS clásico **sí se envía** cuando el cajero activa la facturación electrónica.
- **Camino C — nodos de flow (rotos):** los nodos de SIIGO para crear factura, crear/actualizar cliente y consultar estado **invocan métodos que no existen** en la capa contable, por lo que fallan en ejecución y nunca completaron su función.

Adicionalmente, el endpoint legacy del Camino B contiene **credenciales reales de SIIGO en el código fuente** como fallback (fuga de secreto).

El problema no es falta de funcionalidad —el núcleo (A) está completo— sino **fragmentación y riesgo**: un prototipo con datos de prueba sigue en producción, una capa de automatización (flows) no funciona, y hay un secreto expuesto.

## 2. Objetivo de negocio

Toda factura electrónica de SIIGO se emite por **un único camino canónico, multi-tenant y sin datos de prueba**, sin importar el origen del pedido (venta asistida, POS clásico, POS nuevo o flow). Resultado observable y medible:

- **0** facturas emitidas con datos de prueba (nombres con "prueba", observaciones de prueba) o con identificadores de una cuenta ajena.
- **100%** de las facturas usan las credenciales e identificadores de **la propia empresa**.
- **0** credenciales de proveedor contable en el código fuente.
- Los nodos de flow de SIIGO ejecutan sin error de "método inexistente".

## 3. User stories

- Como **comerciante** quiero que la factura que SIIGO genera lleve **mis datos reales** (mi nombre de cliente, mi tipo de documento, mi vendedor, mis impuestos) para que sea válida ante la DIAN.
- Como **cajero del POS** quiero generar la factura electrónica al cerrar la venta y ver su número/tirilla, sin que se emitan facturas de prueba.
- Como **operador** quiero que, si la facturación falla, el pedido igual se cree y la factura quede reintentable, para no perder la venta.
- Como **responsable de plataforma** quiero un solo camino de facturación mantenible y sin secretos en el repo, para reducir riesgo operativo y de seguridad.
- Como **comerciante avanzado** quiero poder automatizar la facturación desde un flow y que el nodo de SIIGO realmente funcione.

## 4. Criterios de aceptación (notación EARS)

- THE system SHALL emitir toda factura electrónica de SIIGO a través de **un único camino de facturación canónico**, independientemente del origen del pedido (venta asistida, POS clásico, POS nuevo, flow).
- WHEN se confirma una venta en el POS con facturación electrónica habilitada THE system SHALL emitir la factura de forma **síncrona** por el camino canónico y devolver el número de factura y el documento imprimible (tirilla) en la misma respuesta (decisión D-040).
- WHEN se confirma un pedido en la venta asistida con facturación electrónica habilitada THE system SHALL emitir la factura en **background** sin bloquear la confirmación, dejando el resultado consultable.
- THE system SHALL NOT incluir en ninguna factura emitida datos de prueba (p. ej. literal "prueba" en el nombre del cliente, observaciones de prueba) ni identificadores fijos pertenecientes a una cuenta distinta a la de la empresa.
- WHEN se factura para una empresa THE system SHALL usar exclusivamente las credenciales y los identificadores (tipo de documento, vendedor, impuestos, medios de pago, centro de costo) configurados para **esa** empresa.
- IF falta un identificador requerido en la configuración de la empresa THEN THE system SHALL abortar la facturación con un error claro y trazable, en vez de usar un valor por defecto de otra cuenta.
- WHEN se va a emitir una factura SIIGO desde el listado de pedidos THE system SHALL permitir seleccionar la **forma de pago**, mapeada a los medios de pago configurados de la empresa en SIIGO, y dicho campo SHALL permanecer **deshabilitado hasta que se elija el tipo de documento** (decisión D-042).
- WHEN la forma de pago seleccionada es de tipo **crédito** (el medio de pago "maneja vencimiento") THE system SHALL solicitar y enviar **una sola** fecha de vencimiento (`due_date`), calculada desde un plazo seleccionable (Contado / 8 / 15 / 30 / 45 / 60 / 90 / 120 días / fecha exacta), y NO SHALL permitir más de un medio con vencimiento por factura (Resolución 165 SIIGO).
- WHEN un pedido tiene descuento aplicado (cupón → `porceDescuento`) THE system SHALL reflejar ese descuento en la factura SIIGO distribuyéndolo por **línea de producto** (el envío no recibe descuento), de modo que el total facturado coincida con el total del pedido con descuento (decisión D-043).
- THE system SHALL garantizar que el valor del pago (`payments[].value`) coincida con el total que SIIGO recalcula tras aplicar descuentos e impuestos, para evitar el rechazo 400 por descuadre.
- WHEN se crea un pedido con facturación electrónica habilitada THE system SHALL emitir la factura sin bloquear la confirmación del pedido.
- IF la facturación falla THEN THE system SHALL conservar el pedido creado y dejar la facturación en un estado reintentable o gestionable manualmente, con el motivo registrado.
- WHEN se reintenta la facturación de un pedido que ya tiene factura emitida THE system SHALL NOT crear una factura duplicada en SIIGO.
- WHEN un nodo de flow de SIIGO (crear factura, crear/actualizar cliente, consultar estado) se ejecuta THE system SHALL invocar la lógica contable real y completar sin error de "método inexistente".
- THE system SHALL leer y escribir la configuración de SIIGO bajo la canónica en inglés (`integrations.siigo.*`), con fallback de solo lectura al campo legacy durante la migración (Artículo XV).
- THE system SHALL NOT contener credenciales de ningún proveedor contable en el código fuente.
- WHERE existe el endpoint/servicio legacy de facturación SIIGO THE system SHALL marcarlo deprecated con fecha de retiro y eliminarlo una vez verificado 0 tráfico (Artículo XII).
- WHILE haya integraciones críticas en ejecución THE system SHALL emitir log estructurado con `correlationId` y resultado (`success`/`error`/`retry`) por cada intento de facturación (Artículo VII).

## 5. Requisitos no funcionales

### 5.1 Performance
- En la **venta asistida**, la emisión no bloquea la confirmación del pedido (background).
- En el **POS** la emisión es síncrona (D-040): el cajero espera la respuesta con número de factura + tirilla. El camino canónico síncrono ya existe (`from-order`); su latencia p95 de cara al cajero debe mantenerse en un umbral aceptable (objetivo orientativo ≤ 8 s; a confirmar contra latencia real de SIIGO en el plan).

### 5.2 Seguridad
- Cero credenciales de proveedor en el código fuente. La credencial filtrada hoy en el repo debe **rotarse** y eliminarse.
- Credenciales por empresa, cifradas en reposo y nunca en logs en claro (Artículos XI, XV).
- La facturación de una empresa nunca debe poder usar la cuenta SIIGO de otra.

### 5.3 Observabilidad
- Log estructurado con `correlationId` por intento de facturación, con resultado y motivo de error. Registro del resultado en el pedido para auditoría. Alertable si crece la tasa de error o de facturas rechazadas por SIIGO.

### 5.4 Accesibilidad (si aplica UI)
- Mensajes de éxito/error de facturación claros para el cajero/operador; estado visible (en proceso / emitida / fallida / reintentable). Sin tecnicismos del proveedor.
- El modal de facturación del listado de pedidos guía una **secuencia dependiente**: tipo de documento → forma de pago (habilitada al elegir tipo de documento) → vencimiento (visible solo si la forma de pago es a crédito). Campos deshabilitados/ocultos hasta que su prerequisito esté resuelto, para no permitir combinaciones inválidas.

### 5.5 Resiliencia
- Idempotencia por pedido: reintentos no duplican facturas (Artículo IV).
- Reintentos con backoff ante fallos transitorios del proveedor; los fallos permanentes quedan en estado gestionable, sin bloquear la venta.

## 6. Out of scope (explícito)

- Nuevos documentos contables (notas crédito/débito, cotizaciones, comprobantes de egreso, recibos de caja).
- Paridad o cambios en el proveedor World Office más allá de lo necesario para que el camino canónico sea agnóstico de proveedor.
- Endurecimiento del núcleo contable que **no** cause facturas incorrectas (renovación/expiración de token cacheado, responsabilidad fiscal configurable más allá del default, mapeo de IVA cuando faltan IDs). Se registran como deuda y se priorizan aparte; el criterio "abortar si falta config requerida" de §4 ya cubre el caso de IVA/IDs ausentes a nivel de seguridad.
- Webhooks bidireccionales SIIGO → Katuq.
- Migración masiva de datos históricos de facturas ya emitidas.

## 7. Dependencias

- Artículo XV / [[002.1-migrate-to-english-integrations]] — canónica `integrations.siigo.*` en inglés.
- Núcleo contable existente (servicio multi-tenant de facturación) como destino único del camino canónico.
- Configuración de SIIGO por empresa (credenciales + mapeos) ya capturada en la UI de integraciones.
- Decisión operativa sobre comportamiento del POS (síncrono vs background) — ver §8.

## 8. [NEEDS CLARIFICATION]

- [x] **Q-01 (RESUELTA — D-040, 2026-06-20):** El POS usa el camino canónico **síncrono** (`/v1/accounting/siigo/invoices/from-order`, que ya existe) para conservar la impresión inmediata de tirilla con número de factura. La venta asistida mantiene el async. No se necesita patrón de polling.
- [x] **Q-02 (RESUELTA — D-041, 2026-06-20):** La credencial pertenece a **Almara**. Se alcanza solo cuando falta el header `company` (el frontend siempre lo envía → tráfico real va por `AccountingManager`). Acción: rotar el `access_key` en SIIGO (obligatorio: está en git history), confirmar que Almara tiene config en el sistema per-tenant, y eliminar el bloque hardcodeado reemplazando el fallback por error. Fix de seguridad ejecutado fuera del ciclo de la spec (Art I).
- [ ] **Q-03:** ¿Qué empresas tienen hoy `generarFacturaElectronica` activo en POS? (dimensiona el impacto real del Camino B vivo).
- [ ] **Q-04:** ¿Se elimina por completo el servicio/endpoint legacy de facturación de frontend y backend, o algún consumidor externo (KAI, dashboards, scripts) lo usa todavía?
- [ ] **Q-05:** ¿Los nodos de flow de SIIGO se mantienen en el roadmap (alguien los usa o planea usarlos)? Si sí, se arreglan contra la lógica contable real; si no, se marcan deprecated en vez de repararse.
- [ ] **Q-06:** ¿El payload que el camino canónico arma desde el pedido persistido contiene **todos** los datos que hoy el frontend inyectaba (cliente, geo, impuestos, medios de pago)? Validar que no haya pérdida de información al mover la transformación 100% al backend.
- [ ] **Q-07:** Fecha de retiro concreta del endpoint/servicio legacy (Artículo XII).
- [x] **Q-08 (RESUELTA — D-042, 2026-06-23):** Forma de pago + vencimiento de crédito en el modal del listado. SIIGO modela `payments[] = {id, value, due_date}`; `due_date` solo si el medio "maneja vencimiento" (flag `due_date: true` en `/payment-types`); SIIGO no define plazos (los define Katuq); Resolución 165 → factura crédito **o** contado, un solo medio con vencimiento. Modelo: una forma de pago; si crédito, una sola fecha vía plazo. Detección de crédito por `paymentType.due_date === true`. Secuencia: tipo doc → forma de pago → vencimiento.
- [x] **Q-09 (RESUELTA — D-043, 2026-06-23):** Mapeo de descuento. En Katuq el descuento es a nivel pedido (cupón → `porceDescuento`), solo sobre productos, aplicado sobre precio con IVA y luego IVA back-calculado (`list.component.ts:2907-3088`). El mapper lee `item.descuento` (inexistente) → siempre 0 → facturas sin descuento. Se distribuye `porceDescuento%` como `discount` por línea de producto y se corrige el cálculo del pago. Solo backend (`siigoDataMapper`). Pendiente de validar en pruebas: base pre/post IVA de `totalDescuento`.

## 9. Riesgos identificados

- **R-01 (MITIGADA por D-040):** El POS conserva la impresión inmediata de tirilla usando el endpoint canónico **síncrono** que ya existe (`from-order`). El trabajo se reduce a reemplazar la llamada legacy del POS por la canónica y mapear la respuesta (número + PDF).
- **R-02:** Empresas que hoy "dependen" del comportamiento legacy (aunque produzca facturas con datos de prueba o falle) podrían notar cambios de comportamiento. Mitigación: dimensionar con Q-03 y comunicar.
- **R-03:** El camino canónico arma la factura desde el pedido persistido; si al pedido le falta algún dato que antes inyectaba el frontend, la factura podría salir incompleta. Mitigación: Q-06 + contract tests del payload.
- **R-04:** Rotar la credencial filtrada puede romper el fallback si algo en producción lo usa silenciosamente. Mitigación: Q-02 + Q-03, rotación con ventana y monitoreo.
- **R-05:** Reparar los nodos de flow sin idempotencia robusta podría duplicar facturas al reintentar runs. Mitigación: idempotencia por pedido (Artículo IV) verificada con test.
- **R-06:** Eliminar `facturacion.service.ts` y el endpoint legacy puede dejar referencias colgando en POS/otros componentes. Mitigación: barrido de usos antes de borrar (ya iniciado en el análisis previo).
- **R-07 (D-043):** Al mapear el descuento por línea, si no se ajusta el cálculo de `payments[].value` (hoy suma sin restar descuento), SIIGO rechaza con **400** (pago ≠ total). Mitigación: corregir el cálculo del pago en el mismo cambio y validar contra un pedido real con cupón.

## 10. Métricas de éxito post-launch

- **0** facturas con literal "prueba" en el nombre o con identificadores de cuenta ajena, en una ventana de 30 días post-deploy.
- **100%** de facturas emitidas usan credenciales/IDs de la propia empresa (verificable por muestreo y por logs).
- **0** ocurrencias de credenciales de proveedor en el código fuente (verificable por escaneo de secretos).
- **0** errores de "método inexistente" en runs de nodos de flow de SIIGO durante 14 días.
- Tasa de facturación exitosa ≥ umbral acordado; facturas rechazadas por SIIGO con motivo registrado y gestionable.
- Tras verificar **0** tráfico al endpoint legacy durante la ventana acordada → retiro ejecutado.

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren al menos performance, seguridad, observabilidad.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto (Q-01 y Q-02 son prioritarios).
