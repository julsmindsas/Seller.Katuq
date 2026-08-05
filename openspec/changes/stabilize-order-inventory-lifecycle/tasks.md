# Tasks

## 0. Checkpoint de negocio

- [x] 0.1 Confirmado por Daniel: solo `Pagado`, `Aprobado` o `PreAprobado` comprometen stock; los demás estados no descuentan.
- [x] 0.2 Confirmado por Daniel: salir de cualquiera de los estados que comprometen libera exactamente el efecto aplicado; cambiar entre estados que comprometen no genera otro movimiento.

## 1. Matriz e idempotencia

- [x] 1.1 Fixtures/contract tests para Venta Asistida, Shopify `Pagado`/`Aprobado`/`PreAprobado`, pago tardío, pendiente, transición entre estados elegibles, pérdida de elegibilidad, despacho manual, cambio de cantidad, cancelación y webhook repetido.
  - [x] 1.1.1 Política pura de pago: entrar, permanecer y salir del conjunto elegible; `Cancelado` prevalece sobre un `financialStatus` viejo.
  - [x] 1.1.2 Huella y emulador: commit, retry concurrente, cambio entre estados elegibles, cancelación, cancelación repetida, reactivación, aumento, disminución y cambio solo de precio.
  - [x] 1.1.3 Fixtures de entrada reales por controlador: Venta Asistida, POS, Shopify create/updated/paid y despacho manual.
    - [x] 1.1.3.1 Shopify `orders/paid`, retry de `orders/create`, cancelación repetida y evento stale en Firestore Emulator.
    - [x] 1.1.3.2 Shapes reales de Venta Asistida, POS, pago tardío, rechazo y despacho manual contra el servicio conectado.
    - [x] 1.1.3.3 Smoke HTTP de los entrypoints reales del controlador, sin servicios externos.
- [x] 1.2 Definir identidad estable por pedido+producto+bodega+revisión+versión del efecto para inventario y otra independiente para el push logístico.
- [x] 1.3 Persistir/consultar `orders/{orderId}.inventoryEffect` sin crear otra colección y calcular cambios solo por delta.

## 2. Orígenes, uno por vez

- [ ] 2.1 Venta Asistida: compromiso único al confirmar; crear guía no toca stock.
- [ ] 2.2 Shopify pagado al llegar: compromiso único y push automático elegible.
- [ ] 2.3 `orders/paid` y aliases `Pagado`/`Aprobado`/`PreAprobado`: misma transición canónica, tolerante a evento repetido o fuera de orden.
- [ ] 2.4 Cambios/reversas: delta exacto y referencia a movimientos originales; liberar solo si existe efecto aplicado.
  - [x] 2.4.1 Motor transaccional preparado: huella, saldo y movimiento confirman juntos; la reversa usa asignaciones aplicadas.
  - [x] 2.4.2 Conectar creación/edición, Venta Asistida, POS y webhooks Shopify detrás de flags, usando el pedido persistido completo.
  - [x] 2.4.3 El nodo histórico `katuq-inventory-adjust` del flow Shopify delega a `orders.inventoryEffect` en modo transaccional; no queda como segundo escritor.

## 3. Cereza y fallo cerrado

- [x] 3.0 Confirmar el estado actual: el binding OMS activo escucha solo `orders/create`; un pedido Shopify que nace pendiente no se envía automáticamente a Cereza al recibir después `orders/paid`.
- [x] 3.1 Integrar el contrato aprobado de `osmosis-push-multibodega-carrier`: mapping y carrier obligatorios.
- [x] 3.2 Considerar push exitoso solo con ID externo persistido; fallo conserva compromiso y marca atención reintentable.
- [x] 3.3 Probar lotes parciales por pedido; nunca cerrar todo como enviado si uno falla.
- [x] 3.4 Enrutar pago tardío por la misma operación de Logística/Despachos después de 3.1–3.3; no llamar Cereza directamente desde el ledger.
- [x] 3.5 Enrutar `orders/cancelled` por una huella de cancelación separada; si el push está en vuelo, esperar el ID externo, no revivir el pedido y cancelar una sola vez.

## 4. Rollout

- [x] 4.1 Flags separados `assisted_sale`, `pos`, `channel_order`, `return` y logística independiente, todos `legacy/off` por defecto.
- [ ] 4.2 OMS sombra y canarios en ese orden; diff/test/arranque/kill switch por origen.
- [ ] 4.3 Almacén Bombas recibe solo reglas neutrales aplicables; no activar Cereza/Shopify por herencia.
- [x] 4.4 Analizador reproducible del corte lógico OMS: pedidos, movimientos, auditorías y maestro de bodegas; solo lectura y sin datos personales en la salida.
- [ ] 4.5 Clasificar los pedidos históricos ambiguos; no crear huellas ni corregir saldos automáticamente.
