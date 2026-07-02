# Spec 013 — Tesorería MVP (gestión de pagos con verificación de tesorero)

> Estado: **approved** (checkpoint humano 2026-07-02 — Daniel aprobó con las 4 clarificaciones resueltas)
> Autor(es): Daniel + Claude (investigación: ClickUp lista "Tesorería (Gestión de Pagos)" + código real + web)
> Última actualización: 2026-07-02

## 1. Contexto / Por qué

Hoy cualquier vendedor que registra un pago de un pedido queda **auto-aprobado** sin que nadie verifique el dinero en el banco. En Colombia la modalidad de fraude #1 en ventas por transferencia es el comprobante falso ("falso Nequi") o el comprobante real **reciclado** en varios pedidos. No existe cola de revisión, ni segregación de funciones, ni detección de duplicados. El diseño del módulo ya existe en ClickUp (lista "Tesorería (Gestión de Pagos)", abril 2026) y los estados de pago necesarios ya existen en el sistema — falta el flujo de verificación.

## 2. Objetivo de negocio

En empresas con tesorería activa, **ningún pago con comprobante cuenta como recaudo sin verificación explícita de un tesorero**, y el equipo ve en una sola pantalla todos los pedidos que requieren acción de pago. Medible: 0 pagos auto-aprobados con el flujo activo; 100% de aprobaciones/rechazos con responsable, motivo y timestamp auditados.

## 3. User stories

- Como **vendedor** quiero subir el comprobante de pago de un pedido para que tesorería lo verifique y el pedido avance.
- Como **tesorero** quiero una cola de pagos por revisar para aprobarlos o rechazarlos después de verificar en el banco.
- Como **tesorero** quiero registrar un pago desde cero (transferencia que llegó directo al banco) sin pasar por revisión.
- Como **tesorero** quiero cambiar manualmente el estado de pago de un pedido con motivo obligatorio (ej: autorizar entrega contraentrega).
- Como **tesorero/administrador** quiero ver el historial completo de pagos (quién subió, quién aprobó, cuándo).
- Como **gerente** quiero que el sistema alerte comprobantes duplicados para prevenir detrimento patrimonial.

## 4. Criterios de aceptación (notación EARS)

### Flujo de estados (segregación de funciones)
- **CA-01** — WHERE la empresa tiene el flujo de tesorería activo, WHEN un vendedor registra un pago con comprobante THE system SHALL dejar ese pago en verificación **Pendiente** y el pedido en estado de pago **Pospendiente** (nunca auto-aprobar).
- **CA-02** — WHERE la empresa NO tiene el flujo activo THE system SHALL mantener el comportamiento actual sin cambios (pago auto-aprobado, recálculo actual).
- **CA-03** — WHEN un tesorero aprueba un pago que cubre el saldo total THE system SHALL pasar el pedido a **Aprobado** y disparar los efectos ya existentes de ese estado (facturación automática y notificaciones).
- **CA-04** — WHEN un tesorero aprueba un pago parcial THE system SHALL pasar el pedido a **PreAprobado** mostrando el saldo restante.
- **CA-05** — WHEN un tesorero rechaza un pago THE system SHALL exigir motivo obligatorio, marcar el pago **Rechazado** y el pedido **Rechazado**, y mostrar el motivo en el listado.
- **CA-06** — IF un usuario sin rol autorizado (tesorero o administrador) intenta aprobar, rechazar o cambiar estado THEN THE system SHALL denegar la operación **en el servidor** (no solo ocultar botones).
- **CA-07** — WHEN el pago se origina en punto de venta de mostrador con pago contado en caja THE system SHALL mantener la aprobación inmediata actual (no entra a revisión).
- **CA-08** — WHEN un tesorero registra un pago desde cero THE system SHALL aprobarlo directamente (total → Aprobado; parcial → PreAprobado) dejando constancia de que quien registró y aprobó es el mismo usuario.

### Cambio de estado manual
- **CA-09** — THE system SHALL permitir solo estas transiciones manuales: Pendiente→{PreAprobado, Precancelado}; Pospendiente→{Aprobado, PreAprobado, Rechazado}; PreAprobado→{Aprobado, Pendiente, Precancelado}; Rechazado→{Pendiente, PreAprobado, Precancelado}.
- **CA-10** — WHEN se cambia un estado manualmente THE system SHALL exigir un motivo (predefinido por transición u "Otro" con texto libre).

### Anti-fraude (alerta, nunca aprobación automática)
- **CA-11** — WHEN se registra un pago cuyo número de referencia ya existe en otro pago de la misma empresa THE system SHALL generar una alerta de duplicado visible en la revisión, **sin bloquear** la decisión del tesorero.
- **CA-12** — WHEN se sube un archivo de comprobante idéntico (misma huella digital del archivo) a uno ya registrado en la misma empresa THE system SHALL generar alerta de duplicado indicando en qué pedido se usó y quién lo subió.
- **CA-13** — THE system SHALL dejar claro en la interfaz que la detección solo alerta y que el tesorero debe verificar el dinero en el banco antes de aprobar.

### Pantalla y visibilidad
- **CA-14** — THE system SHALL mostrar una pantalla de gestión de pagos con: indicadores calculados en el servidor (recaudado hoy, cartera pendiente, por revisar, sin pago, alertas, rechazados), pestañas por estado, filtros (texto, vendedor, cliente, forma de pago, prioridad de vencimiento, rango de fechas) y totales de la selección filtrada.
- **CA-15** — THE system SHALL mostrar una pestaña de historial con todos los pagos registrados (pedido, cliente, método, referencia, valor, fecha, estado, quién subió, quién aprobó) con filtros.
- **CA-16** — WHERE hay pagos por revisar THE system SHALL mostrar un contador visible en el menú lateral junto a la entrada de Tesorería.

### Auditoría
- **CA-17** — THE system SHALL registrar de forma inmutable cada transición de estado de pago y cada decisión sobre un pago: usuario, estado anterior, estado nuevo, motivo, fecha/hora.

## 5. Requisitos no funcionales

### 5.1 Performance
- El listado de gestión de pagos pagina y filtra en el servidor; p95 ≤ 3s con 5.000 pedidos activos por empresa. Los indicadores se calculan en el servidor (regla del proyecto: métricas server-side).

### 5.2 Seguridad
- Toda operación filtrada por empresa (multi-tenant). Autorización por rol validada en el servidor para aprobar/rechazar/cambiar estado. La ruta del módulo entra al maestro de autorización de menú por rol.

### 5.3 Observabilidad
- Auditoría en colección dedicada (patrón `inventory_audit`), sin logs de consola como telemetría. Contadores de alertas generadas/resueltas consultables.

### 5.4 Resiliencia
- Aprobación/rechazo idempotentes: decidir dos veces sobre el mismo pago no duplica efectos (facturación/notificaciones). La detección de duplicados que falle no impide registrar el pago (best-effort con registro del fallo).

## 6. Out of scope (explícito)

- CxC / Cartera por cliente (cards con cupo, aging, DSO) — lista ClickUp aparte, fase 2.
- Cupo de crédito, plazo de pago por cliente (`payTermDays`/`payDueDate`) y aging por fecha límite — requiere campos nuevos de cliente, fase 2.
- Exportar cartera (Excel/PDF) y recordatorios de cobro multicanal — fase 2.
- OCR de comprobantes (capa 3 de anti-fraude), conciliación bancaria con extracto, recibo de pago PDF, notificación push al vendedor al rechazar — roadmap post-MVP de ClickUp.
- Sección "Finanzas" completa del menú (Facturación + CxC): el MVP agrega solo la entrada de Tesorería; la agrupación llega cuando existan los 3 módulos.
- Integración con APIs bancarias / pasarelas nuevas; pagos a proveedores (CxP).

## 7. Dependencias

- Estados de pago existentes del pedido (ya canónicos en frontend y backend).
- Registro de pagos existente (modal de asentar pago) — se extiende, no se reemplaza.
- Efectos existentes del estado Aprobado (facturación electrónica, notificaciones) — se reusan.
- Maestro de roles/plantillas para el rol nuevo "Tesorero" y autorización del menú.

## 8. [NEEDS CLARIFICATION]

- [x] Alcance MVP → **Núcleo + Historial** (resuelto 2026-07-02).
- [x] Activación → **flag por empresa, default OFF** (resuelto 2026-07-02).
- [x] Quién aprueba → **rol nuevo "Tesorero" + administradores; vendedor nunca, validado server-side** (resuelto 2026-07-02).
- [x] POS contado → **sigue aprobación inmediata** (resuelto 2026-07-02).

## 9. Riesgos identificados

- **R-01**: varios componentes recalculan el estado de pago en el cliente al cargar pedidos; pueden pisar el estado decidido por tesorería. El plan debe definir cómo el recálculo respeta los estados del flujo (análogo a `preAprobadoManual`).
- **R-02**: existe una divergencia actual que escribe estados fuera del enum canónico ("Pagado"/"Pago Parcial") en el asiento de pagos del backend — debe corregirse o el listado de tesorería no cuadrará.
- **R-03**: los comprobantes se guardan hoy con URL pública permanente; contienen datos financieros. Mitigación mínima en MVP: no exponer URLs fuera de la pantalla autorizada (endurecimiento completo, fase 2).
- **R-04**: el modal de registro de pago tiene un clon en POS; cambiar uno sin el otro genera comportamiento inconsistente.

## 10. Métricas de éxito post-launch

- 0 pagos con verificación auto-aprobada en empresas con flag ON (ventana: desde activación).
- ≥ 90% de pagos Pospendientes decididos en < 24h (primer mes en piloto).
- ≥ 1 alerta de duplicado real detectada y gestionada en piloto (validación del valor anti-fraude).

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren performance, seguridad, observabilidad.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto.
