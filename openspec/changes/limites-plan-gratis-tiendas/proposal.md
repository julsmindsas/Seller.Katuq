## Why

Daniel pidió el 2026-09-24 que el plan gratis de Katuq deje operar la tienda, pero con límites "medio agresivos". Luego eligió la versión **más agresiva**: además, sin recordatorio de carrito abandonado, sin reseñas y con métricas solo del día.

Hoy el plan gratis no limita nada de la tienda, y hay un hueco: **los pedidos de la tienda no cuentan en el tope de 15 pedidos al mes**. Ese tope solo se aplica en venta asistida (`validateOrderLimit` en `/v1/orders/create`), así que un comercio gratis puede vender sin límite por su tienda.

Medición en producción, solo lectura, el 2026-09-24:
- 64 empresas gratis y 10 premium;
- solo 3 tiendas publicadas (ATELIER 90, FLORECER y OH MY STORE), las tres premium;
- **ninguna empresa gratis tiene tienda publicada**, así que los límites no le rompen nada a nadie hoy.

## What Changes

La regla de fondo: el límite cae sobre el comercio (lo que configura y cuánto crece), **nunca sobre el comprador**. Ningún pedido se rechaza después de pagado ni se pierde.

| | Gratis | Pago |
|---|---|---|
| Tiendas publicadas | 1 | Sin cambio |
| Dominio propio | No: solo `slug.katuq.com` | Sí |
| Sello "Hecho con Katuq" en el pie | Fijo | No aparece |
| Productos visibles en la tienda (y en sitemap y llms.txt) | 50 | Sin límite |
| Pedidos por la tienda | Cuentan en los 15 del mes. Al tope, el checkout cambia a "Pídelo por WhatsApp" hasta el mes siguiente o hasta que pague | Sin tope |
| Páginas propias | 3 | 12 |
| Cupones activos / promociones automáticas activas | 1 / 1 | Sin cambio |
| Puntos de retiro | 1 | 8 |
| Recordatorio de carrito abandonado | No (el carrito se sigue viendo en "Tus contactos", como gancho para mejorar el plan) | Sí |
| Recordatorio de pago abandonado | Sí: recupera pedidos que ya existen | Sí |
| Reseñas | No se piden ni se muestran | Sí |
| Correos de la tienda personalizables | No: salen con el texto estándar | Sí |
| Campañas de correo | 1 al mes, hasta 200 personas | 5.000 al mes |
| Remarketing automático | Solo "Volvió" | Todos |
| Catálogo para Google y Meta (`feed.xml`) | No | Sí |
| Medición | Analytics y píxel básicos | Además conversiones para pauta (Google Ads, API de conversiones de Meta) |
| Métricas de la tienda | Solo el día | 180 días |
| Opttia creando o rediseñando páginas | 3 al mes | Sin límite práctico |
| SEO, llms.txt, WebMCP, lista de deseos, cuenta del comprador | Sí | Sí |

- Lo bloqueado se ve en el editor con un candado y "Mejorar plan", con el modal de mejora que ya existe. No se esconde.
- Cambia un número aprobado en D-318: el cupo gratis de campañas baja de 500 a 200, con una campaña al mes.

## Capabilities

### New Capabilities
- `free-plan-store-limits`: límites de configuración y de lo visible de la tienda en el plan gratis.
- `free-plan-order-cap`: los pedidos de la tienda cuentan en el tope del plan y el checkout pasa a WhatsApp al llegar a él.
- `free-plan-marketing-limits`: carrito abandonado, reseñas, correos personalizables, campañas, remarketing, métricas, catálogo para pauta y Opttia en el plan gratis.

### Modified Capabilities
- Ninguna archivada. El cupo gratis de las campañas de correo (propuesta D-318, sin archivar) se ajusta en esa misma propuesta y queda como requisito en `free-plan-marketing-limits`.

## Impact

- **Backend:**
  - un módulo puro `utils/limitesPlan.js` con la tabla, en un solo lugar (se apoya en `config/subscriptionLimits.js`);
  - verificaciones en guardar, publicar, dominio, `crearPedido`, `feedProductos`, render, reseñas, carrito, `metricas`, `generar` y `disenarConIA`;
  - en el despachador y en el `programar` de campañas.
- **Front:** candados en el editor de sitios, en métricas y en Marketing.
- **Datos:** sin colecciones nuevas. El conteo de pedidos usa el mismo contador de la empresa que venta asistida (`limitsService`).
- **Módulo sensible (`orders`):** el checkout de la tienda **consulta** el cupo antes de crear el pedido y lo **suma** después, con el mismo servicio de venta asistida. Va con diff y aprobación explícita antes de aplicarlo, y con prueba de pedido de punta a punta.
- **Riesgo:**
  - dos compras simultáneas con el pedido 15 pueden dejar el conteo en 16: el tope es blando a propósito, para no bloquear a un comprador a mitad de compra;
  - el vencimiento de los premium temporales sigue apagado (cron de billing muerto desde abril), así que hoy casi nadie "baja" a gratis por sí solo.
- **No-goals:**
  - cobrar comisión por venta;
  - cambiar los límites de venta asistida o POS;
  - tocar precios, productos o inventario.
