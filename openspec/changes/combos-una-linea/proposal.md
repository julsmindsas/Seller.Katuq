# Propuesta: un combo se ve en una sola línea (ticket 1097)

## Por qué
ALMACEN BOMBAS cotiza y vende combos (ENSAMBLE MONOBLOQUE: bomba + motor + accesorio). Hoy Katuq los desglosa en sus productos (D-147, ticket 1086) y el cliente recibe tres líneas donde esperaba una. Bombas pide que el comercial decida si abre el combo; el desglose les importa a contabilidad e inventario, no al cliente.

## Qué cambia
- Las líneas que entran por un combo llevan la marca `combo` (nombre, instancia, unidades por combo, abierto/cerrado).
- Cerrado (por defecto) se ve en una sola fila con la suma de sus productos en la cotización (editor, PDF, enlace público), el carrito de la venta asistida, la orden de venta y el PDF/correo del pedido.
- "Abrir combo" / "Cerrar combo" en el editor de cotizaciones y en el carrito. El estado viaja de la cotización al pedido.

## No-goals
- No cambia el precio: el combo sigue sin precio propio; su valor es la suma de sus líneas (D-147).
- No cambia inventario ni SIIGO: cada producto se descuenta y se factura por separado. No se tocan `inventoryService.js`, `orderCalculationService.js` ni la facturación electrónica.
- No crea colecciones ni endpoints. No toca la comanda de producción ni el POS.

## Riesgos (módulos sensibles)
- Pedidos: solo se agrega un campo a las líneas; el backend las guarda tal cual (`{ ...order }`). Sin cambio de cálculo.
- Documentos: la fila del combo se arma con los mismos valores por línea que ya se pintaban; el total del documento no cambia (prueba de la vista pública).
- Write-set de inventario: sin cambios (no aplica).

Decisión: D-339 en `specs/CONTRACT.md`.
