# Spec 014 — Finanzas MVP (sección de menú + CxC Cartera)

> Estado: **approved-by-goal** (directiva autónoma de Daniel 2026-07-02: "MVP módulo de finanzas, asegurar que funcione, desplegar y generar el menú" — checkpoints consolidados en la directiva; ver D-XXX en CONTRACT.md)
> Autor(es): Daniel (diseño en ClickUp, abril 2026) + Claude (investigación código real)
> Fuente de diseño: ClickUp workspace 31545745, folder `ideas` — tasks `86b9b7jv4` (menú Finanzas), `86b9b7dhd` (Cartera por Cliente), `86b9b7dyk` (Aging), `86b9b7e58` (cupo/DSO/plazo)
> Última actualización: 2026-07-02

## 1. Contexto / Por qué

Tesorería (spec 013) salió a producción esta semana, pero quedó como entrada suelta del menú. El diseño original de ClickUp (abril 2026) define una sección **Finanzas** que agrupa Facturación + Tesorería + CxC. De los tres sub-módulos, CxC (cartera) es el que no existe: hoy nadie ve cuánto le deben a la empresa agrupado por cliente, ni la antigüedad de esa deuda. El contador y el gerente lo necesitan para provisiones y decisiones de crédito; el dato ya existe (pedidos activos con saldo) — falta agregarlo y presentarlo.

## 2. Objetivo de negocio

El equipo financiero ve en un solo lugar: (a) cuánto debe cada cliente y hace cuánto, (b) la antigüedad total de la cartera por rangos, y (c) accede a Tesorería desde la misma sección. Medible: la pantalla CxC muestra cartera total idéntica a la suma de `faltaPorPagar` de pedidos activos de la empresa; aging calculado server-side.

## 3. User stories

- Como **gerente/contador** quiero ver la cartera agrupada por cliente (saldo, antigüedad, pedidos activos) para decidir a quién cobrar primero.
- Como **gerente/contador** quiero ver el aging de toda la cartera por rangos (corriente, 16-30, 31-60, 60+) para provisiones.
- Como **tesorero** quiero navegar entre Tesorería y CxC desde una sección Finanzas del menú.
- Como **administrador** quiero asignar la pantalla CxC por rol desde el maestro de roles, como cualquier otra pantalla.

## 4. Criterios de aceptación (notación EARS)

### Menú Finanzas
- **CA-01** — THE system SHALL mostrar una sección "Finanzas" en el menú lateral que agrupe las entradas de Tesorería (existente) y Cartera (CxC) (nueva).
- **CA-02** — WHERE el rol del usuario no tiene autorizada una ruta de la sección THE system SHALL ocultar esa entrada (mismo mecanismo de autorización de menú existente).
- **CA-03** — WHERE la empresa no tiene tesorería activa THE system SHALL seguir mostrando las entradas según autorización de rol (el flag de empresa gobierna el flujo de pagos, no el menú — comportamiento actual de Tesorería se conserva).

### CxC — datos server-side
- **CA-04** — THE system SHALL calcular la cartera **en el servidor** con la MISMA definición del KPI `carteraPendiente` de Tesorería (los números deben cuadrar entre pantallas): por cliente, suma del saldo pendiente de pedidos con estado de pago Pendiente, Pospendiente, PreAprobado o legacy "Pago Parcial"/"Procesando" (se excluyen Aprobado, Rechazado, Precancelado, Cancelado). Saldo = `faltaPorPagar` numérico, con fallback `total − anticipo` (clamp a 0).
- **CA-05** — THE system SHALL calcular el aging de cada pedido desde su fecha límite de pago: `payDueDate = fechaEntrega + payTermDays del cliente` (default 0 = contado). Rangos: corriente (≤15 días de vencido incluye no vencido), 16-30, 31-60, 60+.
- **CA-06** — WHERE el cliente tiene `creditLimit` configurado (> 0) THE system SHALL calcular `% de cupo usado = saldo pendiente / creditLimit` y marcar "excede cupo" cuando > 100%.
- **CA-07** — THE system SHALL responder con KPIs agregados: cartera total, cartera vencida (monto y % — vencida = fuera del rango corriente, es decir >15 días de vencido, coherente con la barra de aging y el diseño de ClickUp "cartera vencida mayor a 15 días"), DSO promedio ponderado, clientes que exceden cupo, y totales por rango de aging.
- **CA-08** — THE system SHALL filtrar todo por empresa (multi-tenant, header `company`) y denegar sin autenticación.

### CxC — pantalla
- **CA-09** — THE system SHALL mostrar un tab "Cartera por Cliente" con: 4 KPIs (cartera total + clientes con saldo, vencida + %, DSO promedio, exceden cupo), filtros (búsqueda por nombre/NIT, riesgo: todos/vencida/cupo>80%/exceden, vendedor) y una card por cliente con: nombre + NIT + vendedor + pedidos activos, saldo pendiente, barra de cupo con semáforo, mini-barra de aging por rangos con colores, y DSO del cliente.
- **CA-10** — THE system SHALL mostrar un tab "Aging" con: 5 KPIs (monto + % por rango y total), barra horizontal segmentada por rangos con montos, y tabla por cliente (Cliente | NIT | Corriente | 16-30 | 31-60 | 60+ | Total) con footer de totales.
- **CA-11** — WHEN el usuario hace click en una card de cliente THE system SHALL mostrar el detalle de sus pedidos con saldo (nroPedido, fecha entrega, fecha límite, total, pagado, saldo, días vencido).

### Configuración por cliente
- **CA-12** — THE system SHALL permitir configurar por cliente `creditLimit` (cupo de crédito, default 0 = sin cupo) y `payTermDays` (plazo de pago en días, default 0 = contado) desde el formulario de cliente existente.

## 5. Requisitos no funcionales

- **Performance**: cálculo server-side sobre pedidos activos; p95 ≤ 3s con 5.000 pedidos activos por empresa. Sin capas de cache nuevas (regla del proyecto).
- **Seguridad**: multi-tenant por `company`; ruta nueva entra al maestro de autorización de menú por rol.
- **Observabilidad**: errores del endpoint con contexto (sin console.log de telemetría).
- **UI**: estilo flat con border-left de acento (sin gradientes), patrón KPI cards existente.

## 6. Out of scope (explícito)

- **Facturación Electrónica (Factus)** — integración completa nueva (OAuth2, mappers, notas crédito): lista ClickUp `901415247753`, spec propia futura. La sección Finanzas del menú queda lista para recibirla.
- Exportar cartera (Excel aging, PDF resumen) y Estado de Cuenta PDF por cliente — fase 2 (tasks `86b9b7ekn`, `86b9b7eca`).
- Recordatorios de cobro multicanal — fase 2 (depende de spec 009 WhatsApp).
- Alerta "excede cupo" al crear pedido en venta asistida — fase 2 (toca crear-ventas, alto riesgo de regresión).
- Badges dinámicos nuevos en el menú (clientes con saldo, cartera vencida) — fase 2; se conserva el badge existente de Tesorería si ya existe.
- Contadores de recordatorios enviados en cards — fase 2 (no existe la fuente de datos).

## 7. Dependencias

- Spec 013 Tesorería (en prod): router `/v1/treasury`, rol Tesorero, entrada de menú existente.
- Modelo de pedido: `PagosAsentados`, `anticipo`, `faltaPorPagar`, `estadoPago` (enum canónico), `fechaEntrega`, cliente embebido.
- Maestro de roles: autorización de la ruta nueva.

## 8. Riesgos identificados

- **R-01**: pedidos legacy con `estadoPago` fuera del enum ("Pagado"/"Pago Parcial") — el cálculo debe tolerarlos (tratarlos como no-cartera si están pagados).
- **R-02**: `faltaPorPagar` puede venir null/undefined en pedidos viejos — derivar de `total - anticipo` como fallback.
- **R-03**: pedidos sin `fechaEntrega` — usar fecha de creación como fallback para aging.
- **R-04**: volumen — empresas con miles de pedidos activos; query por `company + estadoPago in [...]` con índice existente del filtro optimizado.
