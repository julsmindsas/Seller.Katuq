# Tasks — vender-contra-disponible

## 0. Checkpoint de Daniel (nada se implementa antes)
- [ ] 0.1 Resolver las 4 decisiones abiertas del proposal: bloqueo duro vs aviso con permiso; si aplica igual a POS que a venta asistida; qué hacer con productos sin registro de inventario; si las bodegas espejo de un WMS externo cuentan igual.
- [ ] 0.2 Medir el costo de no hacer nada: cuántas ventas de los últimos 90 días se habrían bloqueado con cada política. Solo lectura, sobre pedidos y movimientos ya existentes. Sin este número la decisión es a ciegas.

## 1. Sombra (sin cambiar comportamiento)
- [ ] 1.1 Servicio de evaluación puro: recibe líneas, bodega y disponible; devuelve veredicto y faltante por producto. Con pruebas.
- [ ] 1.2 Bandera y política por empresa, con apagado inmediato y sin despliegue.
- [ ] 1.3 Enganche en el camino de creación de orden que SOLO evalúa y registra. Ninguna venta se detiene.
- [ ] 1.4 Evidencia por caso: producto, bodega, pedido, faltante y política que habría aplicado.

## 2. Observación
- [ ] 2.1 Correr la sombra en OMS al menos una semana y contar cuántas ventas se habrían bloqueado y de qué productos.
- [ ] 2.2 Sanear o decidir qué hacer con los saldos negativos heredados, que bloquearían de inmediato.
- [ ] 2.3 Presentar el conteo a Daniel: es el insumo para decidir encender, no un trámite.

## 3. Encendido gobernado
- [ ] 3.1 Encender en una empresa, con la política elegida, y vigilar los primeros días.
- [ ] 3.2 Mensaje al vendedor probado con alguien de ventas: tiene que poder decidir con lo que lee.
- [ ] 3.3 Extender empresa por empresa, cada una con su palabra.

## 4. Cierre
- [ ] 4.1 Contract test que falle si la validación escribe inventario, productos o precios.
- [ ] 4.2 Suites completas + build sin errores.
- [ ] 4.3 Registrar la decisión en CONTRACT y archivar el cambio.
