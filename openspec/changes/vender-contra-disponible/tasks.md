# Tasks — vender-contra-disponible

## 0. Checkpoint de Daniel (nada se implementa antes)
- [x] 0.1 RESUELTAS (Daniel, 2026-08-10): configuración por empresa con default SIN bloqueo; POS y asistida iguales; productos sin registro de inventario siguen libres; espejos Fullpi/Cereza sí cuentan para el disponible.
- [x] 0.2 MEDIDO (`scripts/analizar-ventas-sin-disponible.js`, 90 días): OH MY STORE 2/176 (1,1%); CAFÉ ESCOBAR 25/137 (18,2%); ALMACÉN BOMBAS 3/12 (25%). El impacto no es parejo — de ahí la política por empresa.

## 1. Sombra (sin cambiar comportamiento)
- [x] 1.1 HECHO (`services/inventory/saleAvailabilityPolicy.js`, 10/10): evaluador puro con las 4 políticas conviviendo; sin cablear a la venta.
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
