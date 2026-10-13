# Propuesta: cumplimiento por transportador (despachos, fase 2)

> Estado: APROBADO por Daniel el 13-oct-2026 ("A y B"). Parte A implementada en local; parte B, una integración a la vez con diff y OK. Sigue a D-404 (`despachos-ia-util`), que dejó esto como fase 2. Pedido por Daniel: "dale con despachos".

## Por qué

El comercio no sabe qué transportador le cumple. Hoy no hay forma de responder "¿Osmosis entrega a tiempo? ¿cuántos días se demora Prindel?". D-404 midió en producción que la fecha real de entrega casi nunca existe (ALMARA 30 de 400 entregados; OH MY STORE, CAFÉ ESCOBAR y ALMACEN BOMBAS, cero).

La idea original era medirlo con el historial de estados (`order_status_history`). Revisado el código el 13-oct, **el historial tampoco alcanza para los transportadores que más pesan**:

| Cómo llega un pedido a "Entregado" | ¿Deja fecha real? | ¿Deja historial? |
|---|---|---|
| App del mensajero (`editByTransporter`) | Sí | Sí |
| Webhook de Enviame | Sí | **No** |
| Cambio a mano en la pantalla, edición masiva | No | Sí |
| Opttia (`update_order_status`) | Sí | Sí |
| Webhook de Osmosis/Cereza | No | **No**, pero deja su propio aviso con fecha en el pedido (`integrations.osmosis.statusHistory`) |
| Sincronización por consulta de Osmosis, Fullpi, Prindel | No | **No** |
| Webhooks genéricos, Multiop, Aliaddo, Shopify, WooCommerce | No | **No** |
| POS (nace entregado) | No | No (no aplica) |

Osmosis, Prindel y Fullpi son justo los de los $416 M despachados sin cerrar de OH MY STORE. Si se mide solo con lo que hay, esos transportadores salen "sin datos" para siempre.

## Qué cambia

Dos partes. La primera es de solo lectura y sirve ya; la segunda arregla el origen y requiere su propia aprobación por tocar pedidos.

### Parte A — medir con lo que hay, sin inventar (solo lectura)

1. **Momento de entrega de cada pedido entregado** en los últimos 60 días, en este orden:
   1. la fecha real de entrega del pedido;
   2. el aviso de entrega que el webhook de Osmosis deja en el pedido;
   3. el primer paso a "Entregado" en el historial de estados (sin contar los cierres en lote desde la pantalla, que son contabilidad y no la entrega);
   4. si no hay ninguno, el pedido cuenta como **"sin fecha de entrega"**, no como a tiempo ni tarde.
2. **Por transportador:**
   - pedidos entregados;
   - cuántos tienen fecha;
   - días de despacho a entrega (mediana);
   - porcentaje entregado hasta la fecha pactada.
3. **Cobertura honesta.** Un transportador solo recibe calificación si tiene al menos 20 entregas con fecha y la cobertura es de 70 % o más. Si no, la pantalla dice "No se puede medir: de 493 entregas, 4 tienen fecha". Esa frase ya es un hallazgo para el comercio.
4. **En pantalla y en Opttia:** sección nueva "Cumplimiento por transportador" en el panel IA de Despachos y en la herramienta `get_dispatch_insights`. Opttia redacta; las cifras salen del código y lo inventado se descarta (igual que D-401 y D-404).

### Parte B — que toda entrega deje rastro (escritura, aprobación aparte)

Hacer que las sincronizaciones y webhooks de transportadoras registren el cambio de estado en el historial con la función que ya existe (`recordOrderStatusChange`). Solo **agrega** filas al historial: no cambia el pedido, ni su estado, ni cómo se sincroniza. Se hace una integración a la vez, empezando por las que pesan en plata: Osmosis/Cereza, Prindel, Fullpi y Enviame.

Medir no requiere B, pero sin B los transportadores grandes nunca van a tener datos.

## No-goals

- No corrige pedidos viejos ni rellena fechas que no existen (nada de inventar fechas pasadas).
- No cambia estados, ni sincronizaciones, ni la frecuencia de los crones.
- No califica al transportador con pocos datos: muestra "no se puede medir" y por qué.
- No manda datos personales del cliente a la IA.

## Riesgos

- **Pedidos (módulo sensible):** A es solo lectura, filtrada por `company`, con `select`.
  - El historial se consulta por `orderId in […]`, de a 30. Así no hace falta un índice nuevo.
  - Con ALMARA (unos 400 entregados en 60 días), son unas 14 consultas.
- **B toca las integraciones** que sincronizan con transportadoras. Cada una va como cambio aparte, con diff, prueba y aprobación. La escritura es la que ya hacen la pantalla y la app del mensajero, y si falla no tumba la sincronización (la función nunca lanza error).
- **Fecha real sin zona horaria:** la app del mensajero la manda como texto sin zona. Se lee como hora de Colombia, igual que En Vivo.

## Pendiente de medir antes de diseñar el detalle

Cobertura real por transportador en producción, últimos 60 días: entregados, con fecha real y con historial a "Entregado", en ALMARA, OH MY STORE, CAFÉ ESCOBAR y ALMACEN BOMBAS. Es solo lectura; está pendiente porque el acceso de lectura a producción está bloqueado en esta sesión.

## Write-set

- **Parte A:** ninguno.
- **Parte B:** `order_status_history` (solo agregar). Nada en `orders`.

## Capabilities

- `dispatch-insights` (modificada): suma "cumplimiento por transportador".
