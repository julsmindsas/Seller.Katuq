# Spec 012 — Pantalla única de métodos de pago (disponibilidad por canal)

> Estado: draft | in-review | **approved** | superseded
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-08-06 (aprobada en checkpoint; clarifications resueltas → D-055)
> Rama: `feature/pagos-metodos-unificados` (ambos repos). Ver D-054.
>
> Tarea 1 de 6 del lote "módulo pagos" pedido por el negocio.

## 1. Contexto / Por qué
Hoy la gestión de métodos de pago está **duplicada en dos pantallas independientes**: una para
**e-commerce** (`extras/formasPago`, colección `pagos`) y otra para **POS**
(`extras/pos/formasPago`, colección `formaPagosPos`). Ambas tienen el mismo formulario, el mismo
modelo (`nombre`, `online`/clasificación, `posición`, `integración`, `activo`) y CRUD casi idéntico.
Consecuencias:
- **Doble trabajo y desincronización:** dar de alta "Wompi" o "Efectivo" exige repetirlo en dos
  lugares; es fácil que un canal quede con un método que el otro no tiene.
- **Confusión operativa:** el operador no tiene una vista de "qué métodos existen y en qué canal
  están disponibles".
- **Deuda de mantenimiento:** dos componentes, dos servicios y dos colecciones para el mismo concepto.

## 2. Objetivo de negocio
Un operador administra **todos los métodos de pago desde una sola pantalla** y decide, con un control
por canal, en cuáles canales de venta (e-commerce y POS) queda **disponible cada método**. Un método
puede estar activo en POS y no en e-commerce (o viceversa) sin duplicar registros. Las dos pantallas
actuales quedan reemplazadas por esta única vista.

## 3. User stories
- Como **operador/administrador** quiero **ver en una sola pantalla todos los métodos de pago del
  negocio** para **no saltar entre dos configuraciones separadas**.
- Como **operador** quiero **activar o desactivar cada método de pago de forma independiente por canal
  (e-commerce, POS)** para **ofrecer distinto surtido de pago en cada canal sin duplicar el registro**.
- Como **operador** quiero **crear, editar y eliminar un método de pago una sola vez** para **que su
  configuración (nombre, clasificación, integración) viva en un único lugar**.
- Como **vendedor de e-commerce** quiero **ver en el checkout solo los métodos habilitados para
  e-commerce** para **no ofrecer un medio que ese canal no acepta**.
- Como **cajero de POS** quiero **ver en el POS solo los métodos habilitados para POS** para **cobrar
  con los medios correctos del punto de venta**.

## 4. Criterios de aceptación (notación EARS)

**Pantalla única (listado consolidado)**
- THE system SHALL presentar una **sola pantalla** que liste todos los métodos de pago de la empresa
  activa, cada método como **una sola fila**, mostrando su disponibilidad en cada canal (e-commerce, POS).
- THE system SHALL reemplazar las dos pantallas actuales (métodos de pago de e-commerce y de POS) por
  esta pantalla única; las rutas/menú que llevaban a las viejas SHALL dirigir a la nueva.

**Disponibilidad por canal**
- THE system SHALL permitir marcar, por cada método, si está **disponible o no en cada canal** (e-commerce
  y POS) de forma **independiente** entre canales.
- WHEN el operador cambia la disponibilidad de un método en un canal y guarda, THE system SHALL persistir
  ese cambio afectando **solo** ese canal, sin alterar la disponibilidad del método en el otro canal.
- WHERE un método está **no disponible** en un canal, THE system SHALL excluirlo de la selección de pago
  de ese canal (checkout del canal correspondiente), y mantenerlo disponible en el canal donde sí lo esté.

**Gestión del método (una sola vez)**
- THE system SHALL permitir **crear y editar** un método de pago desde la pantalla única, guardando su
  configuración (nombre, clasificación en línea/fuera de línea, integración) en un **único lugar** por empresa.
- THE system SHALL asociar la **integración/pasarela** (ej. Wompi) a **nivel del método (global)**, no por
  canal: la integración de un método es la misma en todos los canales donde esté disponible.
- WHEN el operador **elimina** un método desde la pantalla única, THE system SHALL **inhabilitarlo**
  (borrado lógico, `activo=false`), conservando el registro y su historial; un método inhabilitado SHALL
  quedar excluido de la selección de pago en **ambos** canales.
- IF un método está inhabilitado, THEN THE system SHALL permitir **rehabilitarlo** desde la pantalla única.
- WHERE un método está **inhabilitado**, THE system SHALL permitir además **eliminarlo definitivamente**
  (borrado físico) desde la pantalla, previa confirmación (borrado en 2 pasos, SC-012-01). (Los pedidos
  históricos referencian el método por nombre, no por id, por lo que no se rompen.)
- IF el operador intenta el borrado físico de un método que **sigue activo**, THEN THE system SHALL
  rechazarlo (guardarraíl), exigiendo inhabilitarlo primero.
- IF el operador intenta crear un método con un **nombre ya existente** en la empresa, THEN THE system
  SHALL rechazarlo indicando que ya existe (el nombre identifica al método dentro de la empresa).
- THE system SHALL crear/consultar/editar métodos únicamente dentro de la **empresa activa**
  (multi-tenant), sin confiar en datos del cliente para determinar la empresa.

**Orden / posición**
- THE system SHALL permitir definir la **posición (orden)** de un método **por canal**: la posición de un
  método en e-commerce es independiente de su posición en POS.
- WHEN el checkout de un canal lista los métodos disponibles, THE system SHALL ordenarlos según la posición
  configurada **para ese canal**.

**Consumo en la venta**
- WHEN el checkout de **e-commerce** carga los métodos de pago disponibles, THE system SHALL devolver
  únicamente los métodos marcados como disponibles para e-commerce.
- WHEN el **POS** carga los métodos de pago disponibles, THE system SHALL devolver únicamente los métodos
  marcados como disponibles para POS.
- THE system SHALL mantener disponible en la venta un método recién creado/editado sin requerir recargar
  la página completa (invalidar/refrescar la caché local de métodos de pago del canal afectado).

**Migración de datos existentes**
- WHERE ya existen métodos configurados en las dos colecciones actuales (e-commerce y POS), THE system
  SHALL consolidarlos en el modelo único **preservando la disponibilidad por canal actual**: un método
  que hoy existe solo en e-commerce queda disponible en e-commerce (y no en POS), y viceversa; un método
  presente en ambos queda disponible en ambos. (La estrategia de emparejamiento por nombre y el manejo de
  conflictos se definen en el plan; se ejecuta con verificación en seco previa.)

## 5. Requisitos no funcionales

### 5.1 Performance
- Cargar la pantalla única y guardar un cambio de disponibilidad no debe congelar la interfaz; un cambio
  de disponibilidad por canal SHALL ser una operación puntual (no reescribir todo el catálogo de métodos).

### 5.2 Seguridad
- Requiere autenticación y aislamiento por empresa. Validar entradas: nombre no vacío y único por empresa;
  la disponibilidad por canal es un booleano por canal. Sin secretos/credenciales de pasarela en el log.

### 5.3 Observabilidad
- El resultado de crear/editar/eliminar/migrar queda registrado de forma estructurada para diagnóstico,
  sin datos sensibles en claro.

### 5.4 Accesibilidad (UI)
- Los controles de disponibilidad por canal son operables por teclado y su estado no se comunica solo por
  color (texto/ícono/etiqueta además del color). La tabla es navegable por teclado.

### 5.5 Resiliencia
- Idempotencia: reintentar un guardado no duplica el método ni invierte estados. La migración debe poder
  reejecutarse sin duplicar (empareja por nombre; verificación en seco previa).

## 6. Out of scope (explícito)
- **Nuevos canales** más allá de e-commerce y POS (WhatsApp, link de pago, marketplace): fuera de alcance
  por ahora (confirmado). El modelo debe permitir agregarlos después, pero no se construyen aquí.
- **Dispersión/split de fondos** (repartir el dinero recaudado a cuentas/terceros): NO es esta tarea; aquí
  "dispersar por canal" = distribuir la **disponibilidad** del método entre canales (confirmado).
- Cambios en la **lógica de las pasarelas** (Wompi/ePayco), webhooks, tesorería, cartera o cálculo de
  totales: no se tocan en esta tarea.
- Control de acceso por **rol** para quién puede administrar métodos de pago (posible spec aparte).
- Rediseño del **formulario de creación** del método más allá de lo que exige el control por canal.

## 7. Dependencias
- Pantallas y servicios actuales: `extras/formasPago` + `extras/pos/formasPago` (frontend),
  `MaestroService.consultarFormaPago/consultarFormaPagoPOS/crear/edit/delete*`, y los endpoints
  `/v1/pagos/*` y `/v1/pagos/pos/*` (backend, `controllers/pagos.js`).
- Consumidores de la selección de pago: `checkout` (e-commerce, `consultarFormaPago`) y widgets POS
  (`card-payment`, `consultarFormaPagoPOS`), más `asentarpagomanual` y onboarding step 5.
- Datos existentes en las colecciones `pagos` y `formaPagosPos` a consolidar/migrar.
- Se apoya en el módulo de pagos ya mapeado (ver bitácora de estudio del módulo).

## 8. Clarifications (resueltas 2026-08-06 — checkpoint, D-055)
- [x] **Orden/posición por canal:** la posición es **por canal** (puede diferir entre e-commerce y POS).
      Preserva el comportamiento actual (cada colección tiene su propia `posicion`).
- [x] **Bandera de integración (ej. Wompi):** la integración/pasarela es **global** al método (igual en
      todos los canales donde esté disponible).
- [x] **Eliminar vs desactivar:** eliminar en la pantalla = **inhabilitar** (borrado lógico `activo=false`),
      conservando historial; un método inhabilitado se rehabilita. **Revisado (SC-012-01, D-057):** además se
      permite **borrado físico en 2 pasos** — solo tras estar inhabilitado, con confirmación y guardarraíl 409
      server-side si sigue activo (igual patrón que Descuentos).
- [x] **Conflicto de configuración en la migración:** la **regla de resolución se define en el plan** y la
      **verificación en seco reporta los conflictos** (mismo nombre en ambas colecciones con campos distintos)
      antes de aplicar. No se migra a ciegas.

## 9. Riesgos identificados
- **R-01 (migración):** consolidar dos colecciones en un modelo único preservando disponibilidad por canal.
  Riesgo de perder un método que exista solo en un canal, o de fusionar mal dos con el mismo nombre pero
  distinta config. Mitigación: emparejar por nombre, **verificación en seco obligatoria** que reporte
  conflictos antes de aplicar.
- **R-02 (consumo de envío en la venta):** el checkout de cada canal debe seguir viendo exactamente los
  métodos que hoy ve. Si el filtro por canal se implementa mal, un canal podría quedarse sin métodos o
  mostrar de más. Mitigación: pruebas de contrato de los dos lectores (e-com y POS) y validación en navegador.
- **R-03 (caché stale):** los métodos de pago se cargan y cachean; un cambio de disponibilidad podría no
  reflejarse hasta refrescar (mismo patrón que mordió en zonas de cobro). Mitigación: invalidar la caché
  del canal afectado al guardar.
- **R-04 (retiro de pantallas viejas):** al reemplazar las dos pantallas hay que actualizar menú/rutas y no
  dejar enlaces muertos. Mitigación: redirigir rutas viejas a la nueva y cubrirlo en tasks.

## 10. Métricas de éxito post-launch
- La gestión de métodos de pago se hace en **1 pantalla** (antes: 2).
- Un método nuevo se da de alta **una sola vez** y se marca su disponibilidad por canal (antes: alta
  duplicada en 2 lugares).
- El checkout de e-commerce y el POS muestran **exactamente** los métodos habilitados para su canal
  (0 métodos de más, 0 de menos respecto a la disponibilidad configurada).
- **0 métodos con nombre duplicado** por empresa tras la migración.

---

**Checklist de revisión humana antes de aprobar:**
- [x] No hay nombres de librerías/frameworks en la spec.
- [x] Cada criterio EARS es testeable de forma binaria.
- [x] NFRs cubren al menos performance, seguridad, observabilidad.
- [x] Out of scope explícito.
- [x] Clarifications resueltas (4 preguntas cerradas en checkpoint 2026-08-06).
- [x] **Checkpoint humano:** spec **aprobada** 2026-08-06 → habilitada la redacción de `plan.md`.
