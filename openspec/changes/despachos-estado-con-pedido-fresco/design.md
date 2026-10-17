## Context

- `cambiarEstado(order, estado)` en `despachos.component.ts` recibe un código 0–5 desde dos lugares: el botón de estado de la lista (`(onChangeStatus)`) y `retirarPedido` (código 3: Despachado → Empacado al quitar un pedido de la orden de envío).
- Hoy la función muta el objeto `order` de la pantalla y llama `ventasService.editOrder(order)`. Ese servicio manda el pedido completo con `_baseVersion = order.date_upd`; con 409 devuelve `{ isStaleWrite: true, message }`.
- El backend ya tiene `GET /v1/orders/getOrderByNroPedido/:nroPedido` (`auth`, filtra por `company` del header, 404 si no existe) que responde `{ success, data: { _id, ...pedido } }`. El Seller no lo usaba.
- `VentasService.getOrderById` apunta a `/v1/orders/getById`, que no existe en el router: no sirve para releer.

## Decisions

### D1. Releer por número de pedido, no por id
`getOrderByNroPedido` es exacto (igualdad de `nroPedido` dentro de la empresa) y ya existe con auth. `byNroPedido` hace búsqueda difusa y devuelve una lista; no sirve para un reintento. No se crea ruta nueva.

### D2. Una función pura con la tabla de cambios
`aplicarCambioDeEstado(pedido, codigo, usuario)` en `despachos/estado-despacho.ts` reproduce exactamente el `switch` que hoy vive dentro de `cambiarEstado` (incluidos `empacador = usuario.name` en el código 1, `despachador = usuario` en 4 y 5, `"00"` como orden en el 4 y la marca `_estadoProcesoExplicitlyChanged` en 2 y 3). Se usa en el primer intento y en el reintento, así los dos guardan lo mismo. `estadoDestino(codigo)` da el estado al que lleva cada botón y reemplaza el primer `switch` de validación.

### D3. Reintento: releer, reaplicar, guardar una vez
```
cambiarEstado(order, codigo)
  ├─ validar (igual que hoy) y aplicarCambioDeEstado(order, …)
  └─ guardarCambioDeEstado(order, …, conReintento = true)
       ├─ ok   → cambioDeEstadoGuardado(order)   (lo mismo que hoy: refrescar, geocodificar si Despachado, aviso de éxito)
       └─ 409  → reintentarConPedidoFresco(order, …)
                  ├─ getPedidoPorNumero(order.nroPedido)
                  │    ├─ null / error         → mostrarErrorDeEstado(order, error original)
                  │    ├─ yaQuedoAsi(fresco)   → Object.assign(order, fresco); refrescar; toastr.info
                  │    └─ aplicarCambioDeEstado(fresco, …); editOrder(fresco)
                  │         ├─ ok  → Object.assign(order, fresco); cambioDeEstadoGuardado(order)
                  │         └─ err → mostrarErrorDeEstado(order, err)   (sin segundo reintento)
```
`Object.assign(order, fresco)` deja el objeto de la pantalla con los datos actuales (incluido el `date_upd` nuevo que `editOrder` adopta en `fresco`), para que la siguiente edición desde la misma pantalla no vuelva a chocar.

### D4. "Ya quedó así" se decide con estado y orden
`yaQuedoAsi(fresco, codigo)`: el estado del pedido fresco es el destino del botón y, para los códigos 2 y 3 (sacar de la orden), además no tiene `nroShippingOrder`. En ese caso no se escribe: evita una edición vacía que solo movería `date_upd` y dispararía efectos (historial, notificaciones).

### D5. Errores que no son 409 no reintentan
Un 400/403/500 del primer intento sale directo al aviso de hoy. El reintento es solo para `isStaleWrite`.

## Pruebas

`tests/despachos/estado-despacho.test.js` (node --test con ts-node, como `tests/ventas/precio-congelado-por-fecha.test.js`):
- `estadoDestino` para los seis códigos y uno desconocido.
- `aplicarCambioDeEstado` por código: campos que cambian, campos que no se tocan (carrito, pagos, totales), marca explícita solo en 2 y 3.
- `yaQuedoAsi`: Empacado sin orden vs. Empacado con orden para el código 3; Despachado para el 4; estado distinto → false.
- Simulación del flujo con un `editOrder` que rechaza la primera vez con `isStaleWrite` y acepta la segunda: una sola relectura, el segundo guardado lleva carrito y pagos del pedido fresco y el estado pedido.

Verificación manual pendiente (producción, con Yulie): quitar un pedido de una orden abierta después de que empaque lo marcó; debe quedar Empacado y fuera de la orden sin el aviso.
