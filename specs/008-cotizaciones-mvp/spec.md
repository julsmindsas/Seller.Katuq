# Spec 008 — Cotizaciones (MVP: listado + editor)

> Estado: **approved** (aprobada por responsable de producto 2026-06-14)
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-06-14

## 1. Contexto / Por qué
Hoy un comercial que quiere enviar una propuesta de precios a un cliente no tiene
dónde construirla dentro de Katuq: usa la venta asistida (que ya descuenta inventario
y genera pedido real) o herramientas externas. Necesitamos un módulo de **cotizaciones**
que permita armar una propuesta —con cliente, productos, descuentos e IVA— **sin afectar
inventario ni fulfillment**, guardarla, versionarla por estado y enviarla al cliente.
Esta spec cubre la **Fase 1**: el listado con métricas y el editor de cotización. La
conversión a pedido y el portal de aprobación por correo se difieren a fases posteriores.

## 2. Objetivo de negocio
Un comercial puede crear, guardar, listar y dar seguimiento a cotizaciones por estado,
con cálculo de totales idéntico al de la venta asistida (descuentos por línea, descuento
global, IVA por línea), y compartirlas (PDF / WhatsApp). Medible: una cotización pasa de
"crear" a "guardada con consecutivo" en una sola pantalla, y el listado refleja KPIs
(monto cotizado del mes, pipeline activo, tasa de conversión, borradores).

## 3. User stories
- Como **comercial** quiero **ver un listado de cotizaciones con métricas, filtros por estado y buscador** para **dar seguimiento a mi pipeline**.
- Como **comercial** quiero **crear una cotización nueva seleccionando un cliente existente** para **no recapturar datos del CRM**.
- Como **comercial** quiero **agregar productos del catálogo de la empresa** y, **si el producto tiene configuración comercial, completarla en un popup antes de añadirlo**, para **cotizar el producto correctamente**.
- Como **comercial** quiero **editar el precio y el IVA de una línea cuando el producto lo permite**, igual que en el carrito de venta asistida, para **ajustar la propuesta comercial**.
- Como **comercial** quiero **ver subtotal, descuentos, base gravable, IVA y total en tiempo real** para **validar la propuesta antes de enviarla**.
- Como **comercial** quiero **definir fecha de validez y términos y condiciones** para **dejar la cotización lista para el cliente**.
- Como **comercial** quiero **guardar como borrador, descargar PDF y enviar por WhatsApp** para **compartir la cotización**.
- Como **comercial** quiero **cambiar el estado de la cotización** (borrador, enviada, aceptada, rechazada, vencida) para **reflejar dónde está en el pipeline**.
- Como **comercial** quiero **exportar el listado** para **analizarlo fuera del sistema**.

## 4. Criterios de aceptación (notación EARS)

### Listado y métricas
- THE system SHALL mostrar un listado de cotizaciones de la empresa activa, ordenado por fecha de emisión descendente por defecto.
- THE system SHALL mostrar cuatro indicadores: monto cotizado del mes en curso, monto de pipeline activo (cotizaciones en estado enviada o aceptada), tasa de conversión (convertidas ÷ no-borrador) y número de borradores.
- WHEN el usuario escribe en el buscador THE system SHALL filtrar las cotizaciones cuyo número o nombre de cliente contenga el texto.
- WHEN el usuario selecciona un filtro de estado THE system SHALL mostrar solo las cotizaciones de ese estado y el conteo por estado.
- WHEN el usuario hace clic en un encabezado ordenable THE system SHALL ordenar por esa columna y alternar dirección en clics sucesivos.
- WHEN el usuario pulsa "Exportar" THE system SHALL generar un archivo descargable con las cotizaciones del filtro vigente.
- WHEN una cotización en estado distinto de convertida o rechazada tiene fecha de validez vencida THE system SHALL mostrarla como vencida en el listado.

### Editor — cliente y fechas
- WHEN el usuario pulsa "Nueva cotización" THE system SHALL abrir el editor con fecha de emisión = hoy, fecha de validez por defecto, vendedor = usuario en sesión y estado = borrador.
- WHEN el usuario abre el buscador de cliente THE system SHALL permitir buscar clientes existentes de la empresa por nombre, documento o correo y seleccionar uno.
- THE system SHALL mostrar los datos del cliente seleccionado (nombre, documento, ciudad, correo, teléfono).
- WHEN el usuario cambia la fecha de validez THE system SHALL persistirla en la cotización y reflejarla en el resumen.

### Editor — productos
- WHEN el usuario busca productos THE system SHALL listar productos del catálogo de la empresa con paginación del servidor, filtrables por nombre, referencia, marca, categoría y subcategoría.
- IF el producto seleccionado requiere configuración comercial THEN THE system SHALL abrir el popup de configuración del producto y SHALL agregar la línea solo cuando el usuario confirme la configuración válida.
- IF el producto seleccionado NO requiere configuración THEN THE system SHALL agregarlo directamente como línea de la cotización.
- WHERE el producto tiene precio por categoría de cliente THE system SHALL aplicar ese precio al agregarlo.
- WHERE el producto permite precio manual THE system SHALL permitir editar el precio unitario de la línea.
- THE system SHALL permitir editar el porcentaje de IVA por línea (0%, 5%, 19%).
- THE system SHALL permitir editar cantidad y descuento por línea, y eliminar líneas.
- WHEN el usuario agrega un "ítem libre" THE system SHALL crear una línea con nombre, precio e IVA capturados manualmente.
- THE system SHALL recalcular el total de cada línea y los totales globales tras cualquier cambio de cantidad, precio, descuento o IVA.

### Editor — totales, términos y estado
- THE system SHALL mostrar subtotal, descuentos, base gravable, IVA y total, aplicando el descuento global antes del IVA.
- WHEN el usuario cambia el descuento global THE system SHALL recalcular los totales.
- THE system SHALL precargar los términos y condiciones con el texto base configurado para la empresa y permitir editarlos para esta cotización.
- WHEN el usuario cambia el estado THE system SHALL persistir el nuevo estado en la cotización.

### Persistencia y acciones
- WHEN el usuario guarda una cotización nueva THE system SHALL asignar un consecutivo único por empresa con formato `COT-AAAA-MMDD-####` de forma transaccional y persistirla.
- WHEN el usuario guarda una cotización existente THE system SHALL actualizarla conservando su consecutivo.
- IF el usuario intenta guardar sin cliente o sin al menos un producto THEN THE system SHALL impedirlo e informar qué falta.
- WHEN el usuario pulsa "Descargar PDF" THE system SHALL generar un documento con el detalle de la cotización (cliente, ítems, totales, términos, validez).
- WHEN el usuario pulsa "Enviar por WhatsApp" THE system SHALL abrir WhatsApp con un mensaje prellenado dirigido al teléfono del cliente.
- THE system SHALL operar siempre en el contexto de la empresa activa (multi-tenant) y no exponer cotizaciones de otras empresas.

## 5. Requisitos no funcionales

### 5.1 Performance
- La búsqueda de productos y el listado de cotizaciones usan paginación del servidor; p95 de carga de página de listado ≤ 1.5 s con ≤ 25 ítems por página.
- El recálculo de totales en el editor es local (sin round-trip) y perceptiblemente instantáneo (< 50 ms).

### 5.2 Seguridad
- Todos los endpoints autenticados con el esquema actual (token + empresa). Ninguna cotización accesible fuera de su empresa.
- Inputs numéricos (cantidad, precio, descuento, IVA) validados y saneados antes de persistir.

### 5.3 Observabilidad
- La asignación de consecutivo y la creación/edición de cotización quedan auditables (colección de auditoría o equivalente, no `console.log`).

### 5.4 Accesibilidad
- Editor y listado navegables por teclado; campos con etiquetas asociadas; foco visible.

### 5.5 Resiliencia
- La asignación del consecutivo es transaccional para evitar números duplicados ante concurrencia.
- Guardar una cotización nunca toca inventario ni crea pedido.

## 6. Out of scope (explícito)
- **Conversión a pedido** (wizard facturación → envío → pago → confirmar y creación de orden real). Va en spec 008.2.
- **Envío por correo con portal de aprobación del cliente** (token público aprobar/rechazar). Va en spec 008.3.
- **Plantilla base compartida con override avanzado** estilo `flujo.html` (toggle por cotización + edición global con propagación). En Fase 1 solo hay texto por cotización con default de empresa.
- Configuración de producto "a nivel pedido" (la que el mock difiere al momento de convertir).
- Facturación electrónica directa desde la cotización.

## 7. Dependencias
- Servicio de clientes/CRM existente (búsqueda y selección de clientes de la empresa).
- Servicio de productos existente (búsqueda paginada del catálogo con filtros).
- Lógica de cálculo de precios/IVA existente de la venta asistida (precio manual, precio por categoría de cliente, precios por volumen, IVA por línea, descuentos).
- Popup de configuración comercial de producto existente.
- Backend nuevo: colección `cotizaciones` + endpoints CRUD + consecutivo + métricas, en el repo backend.
- Relación con `[[007-assisted-sale-step1-customer]]` (comparte patrones de selección de cliente).

## 8. [NEEDS CLARIFICATION] — RESUELTO (2026-06-14)
> Las 5 preguntas se resolvieron con los valores por defecto acordados con el responsable de producto. El detalle queda en "Decisiones tomadas" abajo.

- [x] Métricas (KPIs): **backend, endpoint de agregación dedicado**.
- [x] Consecutivo `####`: **incremental continuo por empresa** (no reinicia; la fecha del número es solo la de emisión).
- [x] Términos base por empresa: **documento de config dedicado** (`cotizaciones_config/{company}.terminosBase`).
- [x] Paginación del listado: **servidor desde el día 1** (patrón de `orders`/`productos`).
- [x] Crear cliente desde el editor: **no en Fase 1**; solo seleccionar clientes existentes.

### Decisiones tomadas
- **D-CLAR-01 — Métricas en backend:** se expone un endpoint de métricas (`/v1/cotizaciones/metrics`) que agrega por empresa el monto cotizado del mes, el monto de pipeline activo, la tasa de conversión y el número de borradores. Razón: los KPIs requieren todos los documentos del periodo, no solo la página cargada; calcularlos en frontend daría valores inexactos. Alineado con "optimizar queries/índices en origen".
- **D-CLAR-02 — Consecutivo continuo por empresa:** el contador `####` vive en un documento contador por empresa y se incrementa transaccionalmente; no reinicia por día ni por mes. La parte `AAAA-MMDD` del número refleja la fecha de emisión. Razón: coincide con los mocks (la numeración corre entre días distintos) y evita números repetidos entre periodos.
- **D-CLAR-03 — Config de términos en doc dedicado:** el texto base de términos por empresa se guarda en `cotizaciones_config/{company}` (campo `terminosBase`), no en el modelo de empresa. Razón: `CompanyInformation` es un modelo pequeño y muy usado; un doc aparte aísla la configuración de cotizaciones y deja espacio para futuros settings (numeración, plantillas).
- **D-CLAR-04 — Paginación server-side desde el día 1:** el listado se pagina y filtra en el servidor reusando el patrón existente de órdenes. Razón: multi-tenant que crece; evita refactor posterior y respeta la estandarización de paginación del proyecto.
- **D-CLAR-05 — Solo selección de cliente existente en Fase 1:** el editor selecciona clientes existentes de la empresa; la creación rápida de cliente queda fuera de Fase 1 (el servicio de creación ya existe, así que añadirla luego es de bajo costo). Razón: mantener el alcance acordado ajustado.

## 9. Riesgos identificados
- R-01: El carrito de venta asistida es un **singleton global**; reutilizar sus componentes tal cual contaminaría el estado entre una cotización y una venta activa. Mitigación: la cotización mantiene su propio arreglo de líneas y solo reutiliza funciones puras de cálculo y el popup de configuración en modo aislado.
- R-02: La lógica de precios (override manual, categoría de cliente, volumen, IVA como string) es compleja; reimplementarla divergiría de la venta asistida. Mitigación: reusar las funciones existentes, no reescribirlas.
- R-03: Colisión de numeración de specs (existe `007-assisted-sale-step1-customer` local y `007` en CONTRACT). Mitigación: esta spec usa `008`.
- R-04: Sin endpoint de métricas, los KPIs calculados solo sobre la página cargada serían inexactos. Mitigación: resolver en [NEEDS CLARIFICATION] antes del plan.

## 10. Métricas de éxito post-launch
- ≥ 1 cotización creada y guardada con consecutivo correcto por al menos un comercio piloto en la primera semana.
- 0 cotizaciones que generen movimientos de inventario o pedidos (verificable por ausencia de escrituras en `inventory`/`orders` desde el flujo de cotización).
- 0 consecutivos duplicados por empresa en el primer mes.

---

**Checklist de revisión humana antes de aprobar:**
- [x] No hay nombres de librerías/frameworks en la spec.
- [x] Cada criterio EARS es testeable de forma binaria.
- [x] NFRs cubren al menos performance, seguridad, observabilidad.
- [x] Out of scope explícito.
- [x] Bloque `[NEEDS CLARIFICATION]` resuelto.
