# Spec 008.2 — Convertir cotización a pedido (hidratar venta asistida)

> Estado: **in-review** (pendiente checkpoint humano)
> Padre: [[008-cotizaciones-mvp]] · Fase: 008.2
> Fecha: 2026-06-22

## 1. Qué y por qué

Una cotización **aceptada** debe poder convertirse en un pedido con un clic. En vez de
crear el pedido directamente (lo que saltaría facturación/entrega/pago y duplicaría la
lógica del 360), el botón **lleva todo a la Venta Asistida ya pre-cargado**: cliente,
productos y todas sus configuraciones/precios. El vendedor solo completa facturación,
entrega y pago, y el pedido se crea por el flujo normal que ya existe.

**Valor:** elimina la re-captura manual del pedido a partir de una cotización aprobada;
reusa el flujo de venta probado; cero riesgo nuevo sobre inventario/fulfillment.

## 2. Alcance

**Incluye:**
- Botón "Convertir a pedido" en el **listado** (fila) y en el **editor**, habilitado
  **solo** si `estadoCotizacion === 'aceptada'`.
- Carga del cliente + líneas (con configuración, precio/IVA y overrides) de la cotización
  en la Venta Asistida, navegando a `crear-ventas` en su estado normal.
- Marcado de la cotización como **convertida** (`estadoCotizacion: 'convertida'`,
  `convertidaAPedido: true`, `pedidoGenerado: <nro>`) **únicamente cuando el pedido se
  crea de verdad** en la venta asistida.

**No incluye (out-of-scope):**
- Crear el pedido en backend desde la cotización (se descarta el `convertirAPedido`
  existente que crea el `order` directo).
- Portal/landing de aprobación por correo (es 008.3).
- Cambios a la lógica de inventario/fulfillment/precios de la venta asistida.
- Edición de la cotización después de convertida.

## 3. Criterios de aceptación (EARS)

- **AC-01** — CUANDO el usuario ve una cotización con `estadoCotizacion === 'aceptada'`,
  el sistema DEBE mostrar habilitado el botón "Convertir a pedido" (en lista y editor).
- **AC-02** — MIENTRAS la cotización NO esté `aceptada`, el botón "Convertir a pedido"
  DEBE estar oculto o deshabilitado (con motivo visible).
- **AC-03** — CUANDO el usuario pulsa "Convertir a pedido", el sistema DEBE cargar en la
  Venta Asistida el **cliente** de la cotización y **todas sus líneas** preservando
  producto, `configuracion`, `cantidad`, `_precioManualOverride` y `_ivaManualOverride`.
- **AC-04** — CUANDO se inicia la conversión, SI ya hay un carrito de venta asistida en
  curso, el sistema DEBE advertir y pedir confirmación antes de reemplazarlo.
- **AC-05** — CUANDO la venta asistida termina y **crea el pedido**, el sistema DEBE
  marcar la cotización origen como `convertida` con `pedidoGenerado = <nro pedido>`.
- **AC-06** — SI el usuario abandona la venta asistida sin crear el pedido, la cotización
  DEBE permanecer `aceptada` (no marcada como convertida) y reutilizable.
- **AC-07** — CUANDO una cotización ya está `convertida`, el sistema NO DEBE permitir
  convertirla de nuevo (botón oculto/deshabilitado).
- **AC-08** — El flujo de conversión NO DEBE escribir en `inventory` ni en `orders` por
  sí mismo; el único `order` que se crea es el de la venta asistida normal.

## 4. NFRs

- **N-01 Fidelidad de precios:** las líneas cargadas mantienen exactamente el precio/IVA
  que tenían en la cotización (mismos campos del modelo `Carrito`).
- **N-02 Aislamiento (R-01):** no contaminar una venta asistida activa sin confirmación
  (AC-04); el carrito singleton se limpia antes de cargar la cotización.
- **N-03 Multi-tenant:** marcado de conversión filtrado por `company`.
- **N-04 Idempotencia:** marcar dos veces la misma cotización no crea inconsistencias.

## 5. Decisiones tomadas (checkpoint previo)

- Gate de estado = **solo `aceptada`**.
- Botón en **lista y editor**.
- Marcado convertida = **cuando el pedido se cree de verdad** (no al hacer clic).
- Arquitectura = **hidratar la venta asistida** (no crear el order en backend).

## 6. Preguntas abiertas

- **Q-01:** ¿Cómo enlazar de vuelta el pedido creado con la cotización? Propuesta:
  pasar `cotizacionId`/`nro` a `crear-ventas` (sessionStorage/queryParam) y, en el
  handler de éxito de creación de pedido, llamar a un endpoint liviano
  `PATCH /v1/cotizaciones/:id/convertida`. (Se detalla en el plan.)
- **Q-02:** ¿Estampar también `cotizacionOrigen` en el `order` para trazabilidad? (sugerido sí, aditivo.)

## 7. Métrica de éxito

Desde una cotización `aceptada`: 1 clic → venta asistida pre-cargada con cliente+productos
idénticos → al crear el pedido, la cotización queda `convertida` enlazada al nro de pedido,
y `inventory`/`orders` solo registran el pedido normal (cero escrituras extra).
