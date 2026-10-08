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

En la verificación previa no se arrancó/reinició el backend local conectado a Firestore ni se desplegó esta tanda; el despliegue posterior se registra abajo. Falta revisar visualmente el panel y efectuar una compra real tras publicar. El frontend solo cambia documentación; no requiere build por D-369.

Carritos sin base conocida, incluidos snapshots actuales traídos por correo, conservan importe hasta confirmar con el servidor. Se conserva el fallback anterior cuando no se puede leer inventario; la validación por carrito no hace atómica la reserva entre peticiones simultáneas ni cierra una caída entre descuento y marca. Disponibilidad global de variantes y las cuatro pendientes previas del generador quedan fuera de estos tres ajustes. Productos, precios/listas, auth, Shopify y servicio global de inventario intactos.

## Despliegue autorizado — 2026-10-07, 19:05 COT

Daniel pidió «despliega». Backend real EC2 `13.222.206.185`: fast-forward desde `3711a45bde8dd889688bae3a0b524d1c2fbc2aef` hasta `5bd9abf801604fd0b9679449ba497338ec1f257b`. Se desplegó el commit probado, sin incorporar commits posteriores de origin. Archivos versionados limpios; archivos locales sin seguimiento conservados. Dependencias, lockfile, index y ecosystem sin cambios; no se ejecutó el script manual de reemisión D-368.

En el servidor: sintaxis de cinco archivos runtime correcta, 94/94 regresiones y publicación exit 0. Recarga con `pm2 reload katuq-api` como ubuntu (sin sudo), wait_ready: true, proceso online con PID 3459543. Crons y worker WooCommerce inicializados; sin errores de arranque de módulos/sintaxis/referencias detectados en los nuevos logs.

Después del cambio, cinco GET HTTP 200: API pública del sitio, portada, endpoint de productos, ficha JSON y HTML de `Esto es amor` en FLORECER. Scripts `versionSesion`, `refrescarPreciosCarrito` y guardia `!recoge()` presentes; CSP y precio catálogo/ficha coherentes. El producto no tenía variantes: precios por talla siguen verificados por regresiones offline. No se creó pedido ni se ejecutó pago de prueba. La compra real completa y la revisión visual del panel siguen pendientes. Frontend solo documentación; no se compilaron/publicaron cambios ajenos de Flows.
