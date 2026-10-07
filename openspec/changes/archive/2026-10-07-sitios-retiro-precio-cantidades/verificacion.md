# Verificación — D-369 (2026-10-07)

Backend: `5bd9abf801604fd0b9679449ba497338ec1f257b`, subido a `origin/backend-aws-security`. El mensaje del commit usa D-366, número provisional que otro trabajo publicó para impresión antes de sincronizar el canon; esta corrección de tiendas queda registrada definitivamente como D-369. No se reescribe historia remota.

## Resultado

94/94 regresiones del backend: pedido/retiro/cantidades 30, navegación del checkout de retiro 6, precio de ficha/selector/sesiones 17, carrito 18, medición 15 y reserva duplicada 8. Editor frontend D-363: 14/14. Total 108. Publicación: 304 correctas, cero fallas nuevas y las cuatro pendientes anteriores del generador. Sintaxis de seis archivos productivos/prueba existente y cuatro nuevas regresiones limpia. Diffs propios limpios.

Las regresiones ejecutan handler, orden, calculador y scripts generados reales contra dependencias en memoria; módulos externos/escrituras a maestros bloqueados. Tras retiro pasaban 27/29, quedaban suma y disponibilidad legacy; tras cantidades pasaron 29/29. La revisión independiente agregó punto sin ciudad con domicilio del comprador: falló y se corrigió, cerrando 30/30. Navegación de retiro fallaba en tres casos contra HEAD anterior. Precio original fallaba en los once casos; las seis pruebas nuevas de sesiones fallaban antes de su guardia. Carrito inicial fallaba en los quince primeros casos, y se añadieron tres controles de política de errores.

La suite antigua de publicación exigía textualmente la comparación por línea `p.cantidad > enBodega`; se quitó esa aserción obsoleta, conservando sus comprobaciones de origen/bodega y cubriendo cantidades con el handler real. No se relajan controles de tenant, auth o escrituras a maestros.

## Repetir sin red ni Firestore

Desde `katuq_admin_back_firebase/functions`:

```bash
node --test tests/sitios/*.test.js
npm run test:sitios-publicacion
```

Desde `Seller.Katuq`:

```bash
node --test tests/sitios/editor-guardado-concurrente.test.js
```

## Límites y siguiente paso

No se arrancó/reinició el backend local conectado a Firestore ni se desplegó esta tanda. Falta revisar visualmente el panel y efectuar una compra real tras publicar. El frontend solo cambia documentación; no requiere build por D-369.

Carritos sin base conocida, incluidos snapshots actuales traídos por correo, conservan importe hasta confirmar con el servidor. Se conserva el fallback anterior cuando no se puede leer inventario; la validación por carrito no hace atómica la reserva entre peticiones simultáneas ni cierra una caída entre descuento y marca. Disponibilidad global de variantes y las cuatro pendientes previas del generador quedan fuera de estos tres ajustes. Productos, precios/listas, auth, Shopify y servicio global de inventario intactos.
