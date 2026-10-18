# Tasks — devolver inventario de un pedido despachado que no se entregó

Ticket 1299, D-493. Módulo sensible (orders + inventario): un cambio a la vez,
con diff revisado.

## 0. Corrección del caso del ticket

- [x] 0.1 Prueba sin escribir de la devolución de gas-000008 (Punto Verde
      Vidagas): 1 RECARGA DE 10LB a BOD-PRINCIPAL (PUNTO VERDE JK - YUMBO), con
      `restoreStock`. Requiere salir del modo automático.
- [x] 0.2 Aplicarla y comprobar el movimiento `INGRESO_DEVOLUCION_CANCELACION`
      y el saldo +1.

## 1. Backend (katuq_admin_back_firebase/functions)

- [x] 1.1 `services/inventory/devolucionPorPagoCancelado.js`: argumento
      `mercanciaVolvio` y razón `MERCANCIA_VOLVIO_CONFIRMADA` (D2).
- [x] 1.2 Pruebas de la regla
      (`tests/inventory/devolucionPorPagoCancelado.test.js`):
      - despachado sin confirmación no devuelve;
      - despachado con confirmación devuelve;
      - pago ya muerto con confirmación no devuelve;
      - sin despachar devuelve igual que hoy.
      Script `test:devolucion-por-pago` en `package.json`.
- [x] 1.3 `restoreStock`: opción `confirmadoPor`, que agrega el campo y la
      observación (D3).
- [x] 1.4 `updateOrderInternal`:
      - leer y borrar `mercanciaVolvioABodega` de `updateData`;
      - pasarlo a la regla;
      - con `MERCANCIA_VOLVIO_CONFIRMADA`, llamar `devolverInventarioLegacy` con
        `confirmadoPor = userEmail`;
      - responder `devolucionInventario: true` cuando la devolución se dispara.
- [x] 1.5 Tesorería: `controllers/treasury.js` toma `mercanciaVolvioABodega` del
      body; `changeOrderPaymentState` lo pasa en `updatedOrder`.
- [x] 1.6 Correr las pruebas existentes de orders, tesorería e inventario que
      tocan estos archivos.

## 2. Front (Seller.Katuq)

- [x] 2.1 `shared/utils/pedido-mercancia-devuelta.ts`: `debePreguntarSiVolvio`
      y `preguntarSiVolvio()` (Swal de tres botones, D4), con spec de la
      función pura.
- [x] 2.2 `ventas/list/list.component.ts` `cambiarEstadoPago`:
      - preguntar antes de guardar;
      - con Cancelar, restaurar los valores originales;
      - enviar `mercanciaVolvioABodega`.
- [x] 2.3 (solo Tesorería; ver Desvíos) Hacer lo mismo en `pos/pos-list/list.component.ts` `cambiarEstadoPago`
      y en `tesoreria/components/cambiar-estado-pago`, con el servicio de
      Tesorería enviando el campo.
- [x] 2.4 Aviso de éxito: agregar "El inventario se devolvió a la bodega" solo si
      la respuesta trae `devolucionInventario: true`.
- [x] 2.5 Build de producción sin errores.

## 3. Cierre

- [x] 3.1 Registrar D-493 en `specs/CONTRACT.md`.
- [x] 3.2 (backend 875832f7, front 2026.10.18.7) Commit por repo (sin `git add -A`), push, deploy del backend y luego
      `npm run release`. Requieren salir del modo automático.
- [ ] 3.3 Verificar en FLORECER con un pedido de prueba despachado: cancelar el
      pago con "Sí, volvió", ver el ingreso en Movimientos de inventario y
      repetir con "No".
- [x] 3.4 (Resuelto el 2026-10-18 sin captura: el Chrome no tenía sesión; verificado con los datos) Cerrar el ticket 1299 como Resuelto, con captura y la nota para Punto
      Verde Vidagas.

## Desvíos

- 2.3: el POS no se tocó. `pos-list` llama `editarEstadoPago(cambioEstadoPagoModal, …)`
  pero la plantilla `#cambioEstadoPagoModal` no existe en su HTML, así que por
  ahí no se cambia el pago.
- 0.x: el script de corrección vive fuera del repo (scratchpad de la sesión); usa
  `restoreStock` tal cual. Resultado: +1 en BOD-PRINCIPAL, saldo 1 → 2.
