## Context

- **El plan** sale de `companies.subscriptionPlan` (en minúsculas; vacío = `freemium`), igual que en `middleware/subscriptionValidator.js`. Los límites por plan viven en `config/subscriptionLimits.js`.
- **El tope de pedidos** (15 al mes en freemium) lo aplica hoy `validateOrderLimit` en `/v1/orders/create` (venta asistida), con el contador de `limitsService` (`createOrderWithinLimit` reinicia y consume el cupo de forma atómica). El checkout de la tienda (`crearPedido` en `controllers/sites.js`, que llama a `orderService.createOrder`) no lo consulta ni lo suma.
- **Impacto:** medido en producción el 2026-09-24, ninguna empresa gratis tiene tienda publicada.

## Goals / Non-Goals

**Goals**
- Una sola fuente para los límites.
- Hacerlos cumplir en el servidor: el front solo los muestra.
- Que el comprador nunca pierda un pedido ni pague uno que no se crea.

**Non-Goals**
- Comisión por venta.
- Cambiar los límites de venta asistida o POS.
- Tocar precios, productos o inventario.

## Decisions

1. **`utils/limitesPlan.js` (puro)** con `limitesTienda(plan)`, que devuelve la tabla de la propuesta, y `esGratis(plan)`.
   - Los números se agregan a `SUBSCRIPTION_LIMITS.freemium.tienda` y `paid.tienda` en `config/subscriptionLimits.js`: el mismo lugar de los demás límites. Son campos nuevos, sin tocar los existentes.
   - Alternativa descartada: números dispersos en cada controlador. Es el camino para que se contradigan.

2. **El plan en el render.** El render ya lee la empresa para el logo y el nombre (el "maestro"), así que `subscriptionPlan` sale de esa misma lectura, sin viaje extra. Si no se puede leer, se asume **pago**: un error de lectura no le quita nada a nadie.

3. **Tope de pedidos en la tienda** (módulo sensible: diff y aprobación explícita antes de aplicar).
   - **Antes de crear:** `limitsService.validateOrderLimit(company)`, que solo lee. Si no hay cupo, responde 403 con `{ codigo: "TOPE_PLAN", whatsapp }`, **antes** de crear el pedido o el enlace de pago.
   - **Después de crear:** se suma el pedido con el mismo contador de venta asistida.
   - Es un tope blando: dos compras simultáneas con el pedido 15 pueden dejarlo en 16. No se bloquea a nadie a mitad de compra.
   - **El render** calcula `topeAlcanzado` con la misma función y lo pasa a `CFG`. Con él, la tienda arranca directo en modo WhatsApp: el botón arma `wa.me/<teléfono de la tienda>` con el carrito resumido.

4. **Productos visibles:** los 50 más recientes por fecha de creación, en un orden estable entre visitas. Se aplica en el catálogo, las categorías, la ficha (404 fuera del tope), `sitemap.xml` y `llms.txt`.

5. **Configuración** (páginas, cupones, promociones, puntos de retiro, dominio, segunda tienda): se valida al guardar y al publicar, comparando contra lo que **quedaría activo**. Lo ya guardado no se borra.

6. **Marketing:**
   - `recordarCarritosAbandonados` salta a las empresas gratis.
   - `invitacionResena`, `crearResena` y el bloque de reseñas se apagan en gratis.
   - `correoComprador` ignora `tienda.correos` en gratis.
   - `cuposCorreo.CUPO_MENSUAL.gratis = 200`, más una campaña al mes que se valida en `programar`.
   - El despachador de automatizaciones solo corre "Volvió" en gratis.
   - `feedProductos` responde 404 en gratis.
   - `siteHtml.medicion` omite las conversiones de Ads y la API de conversiones en gratis.
   - `metricas` fuerza `dias = 1` en gratis.

7. **Opttia:** `generar` y `disenarConIA` cuentan las generaciones del mes, con el mismo mecanismo de conteo de IA que ya usa `limitsService` para los límites de IA de freemium.

8. **Front:**
   - Un `PlanService` pequeño lee `subscriptionPlan` de la empresa activa (`SecurityService`) y expone `limites`.
   - Las secciones bloqueadas se muestran con candado y abren el `upgrade-modal` que ya existe.
   - El panel muestra "Te quedan N pedidos este mes".

## Risks / Trade-offs

- **[Romper el checkout]** → La consulta del cupo es de solo lectura y va antes de todo. La suma va después y en su propio `try/catch`: si falla, el pedido ya existe y no se deshace. Hay prueba de punta a punta con y sin tope en una empresa de prueba gratis.
- **[Un premium temporal que no baja]** → El cron de vencimiento de suscripciones está apagado. Estos límites solo muerden a quien ya está en `freemium`. Queda anotado para Daniel.
- **[Comercio confundido porque un producto nuevo no aparece]** → El editor avisa "Tu plan muestra 50 productos; estos quedaron por fuera".

## Migration Plan

1. Los límites de configuración y de marketing, que no tocan el checkout.
2. El tope de pedidos de la tienda, con diff aprobado y prueba de punta a punta.
3. Despliegue después de la feria, junto con las campañas de correo, en ramas propias.
4. **Reversa:** `LIMITES_PLAN_GRATIS_TIENDA=false` (dueño: Daniel; retiro de la bandera el 2027-01-31) apaga todos los límites de tienda sin desplegar.

## Open Questions

1. ¿Los 50 productos visibles son los más recientes? La alternativa es que el comercio elija cuáles.
2. ¿Una empresa de prueba gratis para las pruebas de punta a punta? (FLORECER es premium).
