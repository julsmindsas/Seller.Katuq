## 1. Utilidad y pruebas

- [x] 1.1 `shared/utils/entregas-mensajero.ts`: nombre del mensajero de un pedido (texto u objeto), entrega asignada, clave de la app, unión por nombre (empresa) y por id (independiente), nombre para mostrar y etiqueta de estado.
- [x] 1.2 `entregas-mensajero.spec.ts`: 16 pruebas (homónimos, id parecido, independiente con nombre de uno de empresa, sin empresa o sin pedidos).

## 2. Mapa de Despachos

- [x] 2.1 `despachos.component`: lista `entregasAsignadas` desde `orders` (con o sin ubicación) y entrada nueva del mapa; el nombre del pedido acepta texto u objeto.
- [x] 2.2 `mapa-ubicaciones`: decidir de nuevo quién se ve al cambiar los pedidos; independiente solo con pedido del comercio; lista bajo cada mensajero y fila «Pedidos» en la ficha.

## 3. App de mensajeros

- [x] 3.1 `Carrier.trackingId`: el independiente publica con el id de su ficha en la clave. Compila (`compileReleaseKotlin`).

## 4. Verificación

- [x] 4.1 Utilidades del mapa: 16 + 23 pruebas en verde; `ngc` sin errores nuevos.
- [ ] 4.2 Probar con un mensajero real en la calle (empresa e independiente) y revisar el panel con varios pedidos.
- [ ] 4.3 Publicar junto con la pantalla de independientes (D-514 y D-515) y la app v29.
