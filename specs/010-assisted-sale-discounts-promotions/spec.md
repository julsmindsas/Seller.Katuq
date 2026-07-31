# Spec 010 — Integración de descuentos y promociones en la venta asistida

> Estado: draft | in-review | **approved** | superseded
> Autor(es): equipo Katuq + Claude
> Última actualización: 2026-07-24 (checkpoint humano superado — Q-01/Q-02/Q-03 resueltas, ver D-045)

## 1. Contexto / Por qué

El vendedor en la venta asistida necesita cerrar precios con dos mecanismos de descuento: **códigos** que el cliente/vendedor escribe, y **promociones automáticas** de catálogo (el producto aparece ya rebajado, sin código). Ambos mecanismos ya se construyeron (Feature A = códigos, Feature B = promociones) pero **fuera de la ceremonia SDD**, por lo que su intención nunca quedó capturada como criterios verificables (viola de facto el Artículo I). Esta spec formaliza retroactivamente ese comportamiento **como groundwork ya entregado** y especifica el trabajo que falta para cerrarlo: verificación end-to-end real y cierre de brechas conocidas.

## 2. Objetivo de negocio

Que en la venta asistida (POS/asistida) tanto códigos como promociones automáticas se apliquen **de punta a punta y de forma consistente**: lo que el vendedor ve en catálogo y carrito coincide exactamente con el total que persiste el pedido, sin doble descuento y sin sorpresas de precio. Resultado observable: 0 discrepancias entre el desglose mostrado al vendedor y el pedido persistido, en el conjunto de casos de aceptación.

## 3. User stories

- Como **vendedor** quiero **ingresar un código de descuento en el carrito** para **rebajar el precio de los ítems elegibles al cerrar la venta**.
- Como **vendedor** quiero **ver los productos en promoción ya rebajados en el catálogo y el carrito** para **cerrar la venta sin pedir ni escribir códigos**.
- Como **administrador comercial** quiero **que un código no se apile sobre un producto que ya está en promoción** para **no regalar margen por doble descuento**.
- Como **administrador comercial** quiero **saber cuántas veces se redimió cada código y en qué pedidos** para **controlar su uso y sus límites**.

## 4. Criterios de aceptación (notación EARS)

> `[AS-BUILT]` = comportamiento ya entregado por Feature A/B; esta spec lo ratifica y exige que el e2e lo valide. `[NEW]` = pendiente de implementar/cerrar en esta spec.

**Códigos (Feature A):**
- `[AS-BUILT]` WHEN el vendedor ingresa un código activo, vigente en fechas, con límite global y por cliente no excedidos y con el monto mínimo del carrito satisfecho, THE system SHALL aplicar el descuento correspondiente al carrito de venta asistida.
- `[AS-BUILT]` IF un código está inactivo, vencido, agotado por límite, o el carrito no alcanza el monto mínimo, THEN THE system SHALL rechazarlo con una razón clara y dejar el carrito sin cambios.
- `[AS-BUILT]` WHERE un código apunta a una categoría o a un producto específico, THE system SHALL descontar solo las líneas elegibles, no todo el carrito.
- `[AS-BUILT]` IF un código dirigido no tiene líneas elegibles en el carrito, THEN THE system SHALL rechazarlo e indicar que aplica solo a esos productos.
- `[AS-BUILT]` WHEN se confirma un pedido con un código aplicado, THE system SHALL registrar la redención exactamente una vez por pedido (idempotente), incrementar el uso y desactivar el código automáticamente al alcanzar su límite.

**Promociones automáticas (Feature B):**
- `[AS-BUILT]` WHERE existe una promoción activa y vigente que apunta a un producto o a su categoría, THE system SHALL mostrar ese producto en el catálogo con su precio promocional y un indicador visible de descuento, sin requerir código.
- `[AS-BUILT]` WHEN un producto en promoción se agrega al carrito de venta asistida, THE system SHALL usar el precio promocional en la línea, el subtotal y los impuestos mostrados al vendedor.
- `[AS-BUILT]` WHEN se confirma un pedido con productos en promoción, THE system SHALL congelar el precio promocional en el pedido (snapshot), de modo que un recálculo posterior use el precio guardado y no la promoción vigente en ese momento.

**No acumulación (código + promoción):**
- `[AS-BUILT]` WHILE una línea del carrito ya tiene precio promocional automático, THE system SHALL NO aplicar además el descuento de un código sobre esa línea (ni en base ni en impuestos).
- `[AS-BUILT]` WHEN coexisten un código y promociones en el carrito, THE system SHALL calcular el descuento del código solo sobre las líneas no promocionadas.

**Cierre de la integración (trabajo nuevo):**
- `[NEW]` THE system SHALL garantizar que el desglose de precio e impuestos mostrado al vendedor coincide con el pedido persistido, incluso cuando un código porcentual coexiste con una línea en promoción (hoy hay una diferencia solo de visualización).
- `[NEW]` WHEN se aplica un código de tipo envío gratis, THE system SHALL llevar el costo de envío a cero en el total del checkout.
- `[NEW]` WHERE se evalúa la vigencia de un descuento o promoción, THE system SHALL usar la hora local America/Bogotá para los bordes de inicio y fin.
- `[NEW]` IF un descuento porcentual excede el 100%, THEN THE system SHALL rechazarlo o toparlo, de forma que el total de una línea nunca quede por debajo de cero.

**Ampliaciones surgidas en la verificación e2e (D-047):**
- `[NEW]` WHERE un producto/categoría tiene una promoción vigente, THE system SHALL mostrar el precio promocional en TODOS los catálogos de la venta asistida y del módulo de productos (incluido el catálogo filtrado por bodega), no solo en la búsqueda por término.
- `[NEW]` WHEN se confirma un pedido que aprovecha una promoción automática, THE system SHALL registrar en el historial de esa promoción una redención (pedido, cliente, monto descontado, productos), idempotente por pedido+promoción, e incrementar su contador de usos.
- `[NEW]` WHERE un producto solo trae el precio con IVA (sin el precio sin IVA), THE system SHALL derivar el precio sin IVA para aplicar la promoción en el checkout, de modo que el resultado coincida con el mostrado en el catálogo.

## 5. Requisitos no funcionales

### 5.1 Performance
- La aplicación de un código y el enriquecimiento de promociones en catálogo NO deben requerir índices compuestos nuevos ni lecturas por ítem que degraden el checkout (mantener el patrón actual de solo-igualdad + filtro en memoria).

### 5.2 Seguridad
- El endpoint de aplicar código exige autenticación y aislamiento por empresa (tenant). No se confía en montos calculados por el cliente para autorizar la redención.

### 5.3 Observabilidad
- El registro de redención es idempotente por pedido y trazable (pedido, código, monto, cliente, detalle denormalizado).

### 5.4 Accesibilidad (UI)
- El precio tachado y el indicador de promoción deben ser legibles y no depender solo del color para comunicar el descuento.

### 5.5 Resiliencia
- El enriquecimiento de promociones nunca rompe el catálogo: ante error, devuelve los productos intactos. El registro de redención no bloquea la creación del pedido.

## 6. Out of scope (explícito)

- Canales externos (WooCommerce/Shopify/360). Feature B es MVP solo POS/venta asistida (D-B3).
- Promociones store-wide (una promoción siempre apunta a categoría o producto — D-B5).
- Tipos de promoción distintos de porcentaje/valor_fijo (D-B4).
- **Gate de pago (`estadoPago=Pagado`) para redención en ventas online con link de pago — FUERA DE ALCANCE (follow-up, Q-02/D-045).** El MVP registra la redención al crear la orden; riesgo asumido y documentado (un código con límite se consume aunque el cliente no pague).
- Módulo de cotizaciones (spec 008) — no consume descuentos en esta spec.

## 7. Dependencias

- Módulo administrativo de descuentos/promociones (CRUD ya existente).
- Flujo de venta asistida: catálogo, carrito, checkout y creación de pedido.
- Entorno de prueba: backend local + frontend apuntando a local, login de `OH MY STORE` (ver memoria de entorno).

## 8. [NEEDS CLARIFICATION] — RESUELTO (2026-07-24, checkpoint humano / D-045)

- [x] **Q-01 — Alcance de los gaps opcionales:** → **DENTRO de 010.** Vigencia (UTC→America/Bogotá) y tope 100% se implementan y verifican en esta spec.
- [x] **Q-02 — Gate de pago para redención online:** → **FOLLOW-UP.** Se difiere; queda fuera de alcance (ver §6). Riesgo asumido y documentado.
- [x] **Q-03 — Cobertura del e2e:** → **SOLO LOCAL por ahora.** Verificación end-to-end contra `OH MY STORE` en local (back :3300 + front :4200). La validación contra producción se hace cuando se desbloquee el deploy (PEM de EC2).

## 9. Riesgos identificados

- **R-01:** El carrito de venta asistida usa un cálculo de precios en múltiples puntos; una corrección del desglose (criterio `[NEW]` de display) podría afectar casos no combinados. Mitigación: cubrir con los casos money-path ya existentes + e2e.
- **R-02:** La prueba end-to-end nunca se ha corrido en navegador; puede destapar diferencias no vistas en las pruebas unitarias del money-path. Mitigación: es justamente el objetivo central de esta spec.
- **R-03:** El deploy en EC2 está bloqueado por credenciales (PEM); sin deploy, la validación contra producción no es posible. Mitigación: validar en local primero; deploy es tarea separada.

## 10. Métricas de éxito post-launch

- 0 discrepancias entre desglose mostrado y pedido persistido en el set de casos de aceptación (unit + e2e).
- 0 casos de doble descuento (código sobre línea en promoción) en pedidos reales durante la primera semana.
- Redención registrada 1:1 con pedidos que llevan código, sin duplicados (idempotencia verificada).

---

**Checklist de revisión humana antes de aprobar:**
- [ ] No hay nombres de librerías/frameworks en la spec.
- [ ] Cada criterio EARS es testeable de forma binaria.
- [ ] NFRs cubren al menos performance, seguridad, observabilidad.
- [ ] Out of scope explícito.
- [ ] Bloque `[NEEDS CLARIFICATION]` resuelto (Q-01, Q-02, Q-03).
