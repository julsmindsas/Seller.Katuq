## 0. Decisiones

- [x] 0.1 Aprobada por Daniel el 27-sep. El filtro del registro va primero; en modo WhatsApp el pedido también queda en Katuq; el aviso llega al entrar y por correo.
- [x] 0.2 Registrar D-324 en `specs/CONTRACT.md` (D-323 es de la propuesta de cuentas falsas).

## 1. Que la tienda no nazca vacía (independiente, primero)

- [x] 1.1 Prueba de contrato: el producto de la configuración inicial con 10 unidades sale disponible en la vitrina; sin inventario, también.
- [x] 1.2 `buildMinimalProduct`: `cantidadDisponible = initialQuantity` al crearlo. El write-set es solo el producto que se crea; no toca `inventory` ni precios.
- [x] 1.3 `savePaymentMethods`: "Nequi" y "Daviplata" reconocen "NEQUI - DAVIPLATA" y no duplican. Con prueba.
- [ ] 1.4 Foto opcional en el paso de producto, con el servicio de fotos de producto que ya existe.

## 2. Pedido por WhatsApp en la tienda

- [ ] 2.1 Prueba de contrato: `modoPedido` por defecto `"checkout"` (las tiendas de hoy no cambian); con `"whatsapp"`, se crea el pedido "Por confirmar" con la forma de pago "Acordar por WhatsApp" (cuenta en el tope del plan) y la respuesta trae el enlace de WhatsApp con el número del pedido.
- [ ] 2.2 `normalizarTienda` y el guard de fusión del editor aceptan `modoPedido`, con la lección de D-317: el campo nuevo en la lista del guard.
- [ ] 2.3 **Módulo sensible:** mostrar el diff de `crearPedido` (modo WhatsApp) a Daniel antes de aplicarlo.
- [ ] 2.3b `siteTienda.js`: con `modoPedido === "whatsapp"`, el carrito pide nombre y celular, crea el pedido y abre WhatsApp con el número. El modo del tope (`topeAlcanzado`) sigue abriendo WhatsApp sin crear pedido.
- [ ] 2.4 Editor de la tienda: la opción "Recibir los pedidos por WhatsApp", con aviso si falta el número.

## 3. Tienda en 1 clic

- [x] 3.1 Prueba de contrato de `POST /v1/onboarding/tienda`:
  - empresa del token;
  - idempotente;
  - por cada tipo de negocio, la plantilla y el `modoPedido` que corresponden;
  - tienda habilitada con bodega, `pagoEnLinea` en false sin pasarela propia;
  - respeta "1 tienda en gratis";
  - no escribe pedidos, inventario ni precios.
- [x] 3.2 `crearTiendaInicial` en `controllers/sites.js` (plantilla, generador sin IA, tienda lista, publicación compartida) y el endpoint.
- [ ] 3.3 `companies.tipoNegocio`: la pregunta en el paso de contexto, preseleccionada desde el registro.
- [x] 3.4 Paso de resultado:
  - "Publicar mi tienda";
  - luego "Verla", "Compartir por WhatsApp" y "Copiar para Instagram";
  - el plan real;
  - bandera `TIENDA_AL_REGISTRARSE`.
- [ ] 3.5 `npm run build` sin errores. Prueba de punta a punta en una empresa de prueba registrada por `/registrarse`, con producto con existencias, Nequi y efectivo.

## 4. Los ya registrados y la medición

- [ ] 4.1 Aviso en `/welcome` para registrados desde el 1-sep, sin sitios y con producto: borrador, vista previa y "Publicar".
- [ ] 4.1b Correo "Crea tu tienda en 1 clic": una sola vez por empresa verificada, con el enlace directo y la marca `invitacionTiendaEnviadaAt`. Script con `--dry-run` primero para los ya registrados.
- [x] 4.2 `primeraTiendaPublicadaAt` y el evento `sitio_publicado` en toda primera publicación (editor, Opttia, 1 clic).
- [ ] 4.3 Métrica semanal "tiendas en las primeras 24 h" en `platformMetrics` y en el panel del Super Admin, sin las empresas excluidas.
- [ ] 4.4 Contar a los 31 registros del 23 al 27-sep como línea de base (0 %) y registrarlo en CONTRACT.md.

## 5. Cierre (después de que salga el filtro del registro)

- [ ] 5.1 Despliegue con OK de Daniel, midiendo la rama contra producción. Verificar la primera tienda real publicada en 1 clic y registrarla en CONTRACT.md y en la memoria.
- [ ] 5.2 Retirar la bandera según el plan.
