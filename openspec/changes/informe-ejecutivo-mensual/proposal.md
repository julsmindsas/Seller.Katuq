# Informe ejecutivo mensual junto con la factura (ticket 1125)

> Estado: **APROBADA** (Daniel, 9-oct: "aprobado todo") e **IMPLEMENTADA en el backend, con la bandera apagada** (D-394). Faltan: publicar el botón de la consola (escrito, sin compilar) y la tarea 7, mostrarle el PDF a Daniel y a Jairo antes de encenderla en ningún comercio.

## Por qué
Jairo propone mandarle a cada comercio, junto con la factura de su membresía, un informe de lo que vendió en el período, "como el extracto mensual de una cuenta bancaria". Hoy lo arma a mano en Excel (ejemplos: ventas de septiembre de ALMARA y de Café Escobar). La factura le dice al comercio cuánto paga; el informe le muestra qué obtuvo con Katuq, que es la razón por la que renueva.

## Qué cambia
- Katuq arma, por comercio y por ciclo de facturación, un informe de ventas de 1–2 páginas (PDF) con los mismos bloques del Excel de Jairo: indicadores del período, ventas por estado de pago, por forma de pago, por canal, por asesor, por ciudad y por día.
- El informe viaja en el mismo correo de la factura de la membresía.
- Opcional, a decidir: el Excel de detalle con el listado de pedidos, como en los ejemplos.

## Decisiones ya tomadas
- **Fecha base: la de entrega** (Daniel, 8-oct). El informe general de ALMARA usa entrega y el de Café Escobar usaba creación; el estándar es entrega.

## Decisiones tomadas (D-394)
1. **Cuándo sale.** (a) **Por demanda**: en la ficha de cada empresa de la consola, "Informe de ventas" (período libre, por omisión el mes anterior). (b) **Con el comprobante de pago** (el correo "Pago confirmado") si la bandera `executiveSalesReport` de la empresa está encendida. *Desviación de la recomendación original:* no viaja en el correo de la factura DIAN, porque ese correo lo manda el proveedor y no admite adjuntos propios; el del comprobante es el que sale hoy con cada pago y no depende de que la emisión automática (D-272) esté encendida. Hoy casi ninguna membresía se paga por ese camino, así que el uso inmediato es por demanda.
2. **Período.** El ciclo de facturación del cobro (`periodStart` y `periodEnd` de la factura interna; el día del corte es del ciclo siguiente). Por demanda, el que se escoja (máximo 400 días).
3. **A quién.** Bandera `executiveSalesReport` (D-385), apagada por omisión. Julsmind puede bajar el informe de cualquier empresa; un comercio, solo el suyo y con la bandera encendida.
4. **Formato.** PDF de dos páginas en el tema canónico; el Excel detallado queda fuera.
## No-goals
- No crea colecciones nuevas ni endpoints "v2": reutiliza el cálculo de métricas de pedidos que ya existe en el backend.
- No toca pedidos, inventario ni consecutivos: solo lee `orders`.
- No cambia la factura, su XML ni el CUFE.
- No incluye datos personales de los clientes finales del comercio (documento, teléfono, dirección). Solo agregados.

## Riesgos
- **Módulo sensible (orders):** solo lectura, con filtro por `company`. El cálculo se hace en el servidor y sin cargar todos los pedidos a memoria (lección de D-273).
- **Cifras que no cuadran con lo que el comercio ve en Katuq:** si el informe y la pantalla de pedidos usan reglas distintas, el comercio lo va a discutir. El informe usa la misma fuente y la misma regla de pedidos cancelados que las métricas existentes; se verifica contra el Excel de ALMARA de septiembre (1.333 pedidos en el período, 1.281 netos).
- **Correo con adjunto grande:** el PDF de resumen pesa poco; el Excel detallado de ALMARA ya pesa 0,8 MB.
- **Sale con la factura:** si la emisión automática sigue apagada, el informe no sale solo. Por eso la alternativa del aviso previo.
