# Informe ejecutivo mensual junto con la factura (ticket 1125)

> Estado: PROPUESTA — pendiente de aprobación de Daniel. No hay código. Decisión a registrar como D-XXX en `/specs/CONTRACT.md` al aprobarse.

## Por qué
Jairo propone mandarle a cada comercio, junto con la factura de su membresía, un informe de lo que vendió en el período, "como el extracto mensual de una cuenta bancaria". Hoy lo arma a mano en Excel (ejemplos: ventas de septiembre de ALMARA y de Café Escobar). La factura le dice al comercio cuánto paga; el informe le muestra qué obtuvo con Katuq, que es la razón por la que renueva.

## Qué cambia
- Katuq arma, por comercio y por ciclo de facturación, un informe de ventas de 1–2 páginas (PDF) con los mismos bloques del Excel de Jairo: indicadores del período, ventas por estado de pago, por forma de pago, por canal, por asesor, por ciudad y por día.
- El informe viaja en el mismo correo de la factura de la membresía.
- Opcional, a decidir: el Excel de detalle con el listado de pedidos, como en los ejemplos.

## Decisiones ya tomadas
- **Fecha base: la de entrega** (Daniel, 8-oct). El informe general de ALMARA usa entrega y el de Café Escobar usaba creación; el estándar es entrega.

## Decisiones abiertas (para aprobar)
1. **Cuándo sale.** Recomendado: junto con la factura, que hoy se emite cuando el comercio paga (D-272, hoy apagada en producción). Alternativa: junto con el aviso previo al corte (D-302), que no depende de la DIAN.
2. **Período.** Recomendado: el ciclo de facturación de la empresa (`cicloFacturacion.js`), el mismo rango que decide el escalón del cobro, para que informe y factura hablen de las mismas ventas. Alternativa: mes calendario.
3. **A quién.** Recomendado: todos los comercios con membresía activa, con un interruptor por empresa para apagarlo.
4. **Formato.** Recomendado: PDF de resumen adjunto; el Excel detallado solo bajo pedido.

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
