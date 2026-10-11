# Propuesta: IA en clientes, cartera y pedidos (D-405)

> Estado: desplegado el 11-oct por el /goal de Daniel ("permea de IA los principales módulos"), después de inventario (D-401) y despachos (D-404). Solo lectura. Mismo principio: el código calcula, Opttia redacta, lo que invente se descarta.

## Por qué (medido en producción el 11-oct, solo lectura)

- **Clientes:** las métricas de clientes ya cuentan "clientes en alerta" y segmentos RFM, pero solo dan números: no dicen **quiénes** ni qué hacer. ALMARA: 7.712 clientes con compras en el año.
- **Cartera:** la pantalla Cartera (tesorería) muestra saldos y antigüedad, pero no ordena a quién cobrar primero. OH MY STORE tiene $840 M por cobrar, 80 % vencido; CAFÉ ESCOBAR 90 % vencido; ALMARA 86 %.
- **Pedidos:** nadie señala los pedidos que se están quedando (pagados sin empezar, sin producir con entrega hoy, sin pago hace días).

## Qué cambia

1. **Clientes para recuperar:** quienes compraban con frecuencia (3+ días de compra, cadencia ≥ 7 días) y llevan más de 1,5 veces su cadencia sin comprar (la misma regla de alerta de las métricas de clientes), los nuevos que compraron una sola vez hace 30–120 días y los mejores de 90 días. Opttia sugiere un mensaje de WhatsApp con `{nombre}`; el botón abre WhatsApp y **lo envía la persona**.
2. **A quién cobrar primero:** sobre **la misma cartera de tesorería** (`buildCartera`), primero lo vencido; solo la ven los roles de tesorería, como la pantalla Cartera. Opttia sugiere un mensaje de cobro para copiar.
3. **Pedidos que necesitan atención:** por producir con entrega hoy o mañana, pagados hace más de 3 días sin empezar, sin pago hace más de 2 días sin salir — sin contar contraentrega ni crédito ("CXC NOMINA", "PreAprobado"), que medidos en OH MY STORE daban 165 falsas alarmas.
4. **Herramientas MCP** `get_customer_insights` (clientes/view), `get_receivables_insights` (contabilidad/view) y `get_orders_attention` (ventas/view), también en el ADK.

## No-goals

- No envía mensajes: el enlace de WhatsApp lo abre y lo envía la persona.
- No registra pagos ni cambia estados.
- Opttia no recibe nombres, teléfonos ni documentos.

## Riesgos

- **Costo de lecturas:** clientes y pedidos leen 12 meses de pedidos (ALMARA ~12.000 con `select`). Por eso el panel **no se carga solo**: la persona toca "Ver con IA".
- **Alcance:** un vendedor restringido (métricas propias) ve solo sus pedidos; la cartera, solo tesorería y administración.
