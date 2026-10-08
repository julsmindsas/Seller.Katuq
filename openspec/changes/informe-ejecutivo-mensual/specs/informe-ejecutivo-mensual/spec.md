# Spec — Informe ejecutivo mensual

Formato EARS. Sin decisiones de tecnología.

## Requisitos

1. WHEN se emite la factura de la membresía de un comercio con el informe activo, THE sistema SHALL adjuntar al mismo correo un informe ejecutivo de las ventas del ciclo de facturación que esa factura cobra.
2. THE informe SHALL contar los pedidos por **fecha de entrega** dentro del período.
3. THE informe SHALL mostrar: pedidos totales, cancelados, netos, % de cancelación, valor bruto, descuentos, envíos, IVA, ventas netas, ticket promedio, clientes únicos, % recaudado y saldo por pagar.
4. THE informe SHALL desglosar por estado de pago, forma de pago, canal, asesor, ciudad y día, y cada desglose SHALL sumar el mismo total de los indicadores.
5. IF un desglose no suma el total de los indicadores, THEN THE sistema SHALL NOT enviar el informe y SHALL registrar la inconsistencia.
6. THE informe SHALL NOT incluir documento, teléfono, correo ni dirección de clientes finales.
7. WHEN el comercio no tuvo pedidos entregados en el período, THE sistema SHALL enviar el informe con ceros y un texto que lo diga, no un correo vacío.
8. WHERE el interruptor del informe esté apagado para una empresa, THE sistema SHALL enviar solo la factura.
9. IF el informe no se puede generar, THEN THE sistema SHALL enviar la factura igualmente y SHALL registrar el fallo; el informe nunca retrasa ni bloquea la factura.
10. THE informe SHALL cumplir el tema de `openspec/specs/design-system/spec.md` (plano, sin gradientes).

## Escenarios

- **Cuadra con el Excel de Jairo.** Dado ALMARA con el período 1–30 de septiembre de 2026, el informe muestra 1.333 pedidos, 52 cancelados, 1.281 netos y ventas netas de $164.684.994,89, igual que su Excel.
- **Comercio sin ventas.** Dado un comercio sin entregas en el período, el informe sale con ceros y la factura no se retrasa.
- **Falla del informe.** Dado un error al calcular, el correo sale solo con la factura y queda el registro del fallo.
- **Privacidad.** El PDF no contiene ningún documento, teléfono, correo ni dirección de clientes finales.
- **Aislamiento.** Dados dos comercios con pedidos, el informe de uno nunca cuenta pedidos del otro.
