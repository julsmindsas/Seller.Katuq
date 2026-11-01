## Why

El chat de Opttia que se abre desde el botón flotante de Katuq no responde preguntas normales del negocio. Daniel, 17-oct: está diciendo que no tiene herramientas para consultas como "quién fue el mejor vendedor"; **"el chat debe responder toda clase de preguntas de ventas y demás"**.

Lo revisado en el código:

- **Las preguntas de ventas solo funcionan si calzan con una consulta fija.** El chat usa las herramientas que Katuq habilita por rol (`services/opttiaAccessPolicy.js:4`). Para ventas hay solo diez, y cada una responde una sola cosa:
  - ventas de hoy y ventas por período;
  - ventas por día, productos más vendidos, pedidos por estado, pendientes y resumen de ingresos (`tools/getOrderAnalytics.js:14`).

  Ninguna agrupa ni filtra por **vendedor, canal, tipo de pedido, forma de pago, ciudad, bodega, transportador, cupón, categoría, día de la semana u hora**. Ninguna compara contra el período anterior. Los datos sí están en cada pedido, y el Report Builder ya sabe leerlos (`services/reports/sources/orders.source.js`), pero el chat no tiene cómo pedirlos.
- **Sin herramienta, el modelo manda a opttia.com.** Su instrucción le ordena remitir "análisis extensos" a opttia.com (`adk_agent/endpoints/katuq_basic_chat_endpoint.py:54`). Para el comercio eso suena a "Opttia no sabe".
- **Si el rol no tiene permiso, el chat dice "no tengo herramientas".** El modelo solo recibe las herramientas permitidas, así que no puede distinguir "no existe" de "tu rol no lo ve" ni decirle a la persona que pida el permiso.
- **Las cifras de ventas de Opttia ignoran "cada vendedor ve solo sus métricas".**
  - El Dashboard y la bienvenida respetan esa opción (`services/metricasPropias.js`); Opttia le da a un vendedor las ventas de toda la empresa.
  - Además, el chat entrega a las herramientas la persona como `userEmail` (`routers/opttia.js:195`), pero ellas leen `mcpUserEmail`. Por eso tampoco aplica la regla por persona del plan de despachos (`tools/_planDespachos.js:47`).
- **El chat no recuerda la conversación.** Cada mensaje viaja solo (`opttia-chat.service.ts:212`) y el ADK descarta lo anterior (`current_query_only`). Si después de "¿quién vendió más en septiembre?" la persona pregunta "¿y en agosto?", el chat no sabe de qué se habla.

## What Changes

1. **Una consulta flexible de ventas.** Una herramienta nueva de solo lectura responde cualquier pregunta de ventas que agrupe, filtre, ordene o compare.
   - **Agrupa** hasta por dos criterios:
     - tiempo: día, semana, mes, día de la semana u hora;
     - quién y por dónde: vendedor, canal, tipo de pedido, estado, estado de pago, forma de pago, forma de entrega;
     - dónde: ciudad, departamento, bodega, transportador;
     - qué: cupón, producto o categoría.
   - **Mide** ventas, pedidos, ticket promedio, unidades, descuentos, envíos cobrados y saldo por cobrar.
   - **Filtra** por cualquiera de esos criterios.
   - **Compara** con el período anterior del mismo largo.

   Cuenta como Katuq: ventas como el Dashboard (sin cancelados, mismo total por pedido, mismo vendedor) y productos como "productos más vendidos", en hora de Colombia. Así responde "¿quién fue el mejor vendedor?", "¿qué canal vende más?", "¿cuánto vendió Laura en septiembre?", "¿qué se vende más en Medellín?" o "¿cómo vamos frente al mes pasado?".
2. **"Cada vendedor ve solo sus métricas" también en Opttia.** Si la empresa tiene la opción prendida y quien pregunta es de ventas, toda cifra de ventas cuenta solo sus pedidos; en un ranking de vendedores solo ve su fila. Lo decide el servidor, no el modelo. El chat entrega la persona a las herramientas con el nombre que ya usan los demás canales.
3. **El chat intenta antes de rendirse.**
   - Usa las herramientas autorizadas para cualquier pregunta de datos del negocio: ventas, clientes, productos, inventario, despachos y cartera.
   - Solo menciona opttia.com para acciones, automatizaciones o informes largos.
   - Si el rol no tiene el permiso, lo dice: "tu rol no tiene acceso a Clientes; pídeselo al administrador".
   - Si de verdad no hay herramienta, dice qué sí puede consultar.
4. **Preguntas de seguimiento.** Junto con la pregunta actual viajan las últimas tres preguntas de esa persona en la conversación, solo las preguntas. Las cifras se vuelven a consultar siempre. "Nueva conversación", el cambio de empresa o el cambio de usuario borran ese contexto.
5. **Banco de preguntas como prueba de aceptación.** Unas 40 preguntas reales de todos los módulos, con la herramienta que debe usar cada una. El cambio se acepta cuando el chat las responde con el modelo real.

## Capabilities

### New Capabilities

- `opttia-sales-questions`: la consulta flexible de ventas, qué criterios y medidas tiene, y su paridad con las cifras de Katuq.
- `opttia-seller-scope`: el alcance "cada vendedor ve solo sus métricas" en las cifras de ventas de Opttia, y la persona disponible para las herramientas.
- `opttia-chat-answers`: cómo responde el chat de Katuq: usar las herramientas antes de remitir, avisar la falta de permiso y medirse con el banco de preguntas.
- `opttia-chat-followups`: el contexto de preguntas anteriores en el chat del botón flotante.

### Modified Capabilities

- Ninguna de `openspec/specs/`. Hoy no hay spec del chat de Opttia.

## No-goals

- **Acciones:** el chat sigue siendo de solo consulta. No crea, edita ni cobra nada.
- **Datos que Katuq no guarda:** margen por costo, gastos, devoluciones o visitas a la tienda. Si el banco de preguntas muestra otro hueco en módulos sin herramienta (facturación electrónica, producción, compras, CRM), se anota y se propone aparte.
- **Datos de compradores:** la consulta de ventas no agrupa por cliente ni devuelve documentos, teléfonos o direcciones. Los mejores clientes ya los responde su propia herramienta.
- **Pedidos de un vendedor:** no se restringen la búsqueda ni el detalle de pedidos; la web tampoco los restringe.
- **Cobro y modelo:** no cambian el cupo de mensajes, los créditos, el modelo ni el límite de cuatro consultas por pregunta. La comparación viene en la misma consulta, sin gastar otra.
- **Memoria:** no se guarda la conversación en el servidor.
- **Otros chats y pantallas:** no se cambian el chat completo de opttia.com, WhatsApp, el Report Builder ni la forma de contar del Dashboard.

## Riesgos (módulo sensible: pedidos)

- **Solo lectura de `orders`.** Un contract test falla si la consulta o el alcance escriben en Firestore.
- **Cifras distintas a las de la web.** La consulta no copia reglas: usa las mismas funciones del Dashboard (total por pedido, vendedor del pedido, fechas de Colombia) y de "productos más vendidos". Pruebas de paridad lo verifican.
- **Empresas grandes.** Hay un tope de pedidos leídos por consulta, con solo los campos necesarios. Si se llega al tope, la respuesta dice que las cifras son parciales.
- **Fuga entre vendedores.** Un vendedor restringido no ve el ranking completo ni las cifras de un compañero, aunque lo nombre: el filtro sale del servidor.
- **Inyección por el contexto.** Solo viajan preguntas de la misma persona, con tope de largo, y Katuq revalida permisos en cada consulta.
- **El modelo escoge mal la herramienta.** El banco de preguntas lo mide antes de desplegar; si falla, se ajustan descripciones e instrucción, no se despliega a ciegas.

## Impact

- **Backend (`katuq_admin_back_firebase`):**
  - **Herramientas:** herramienta nueva de consulta de ventas, registrada en `tools/toolRegistry.js` y en el catálogo de Opttia con el permiso "ver ventas". Alcance en `get_sales_today`, `get_sales_by_period`, `get_top_products` y `get_order_analytics`.
  - **Funciones compartidas con el Dashboard y "productos más vendidos":** vendedor del pedido y líneas vendidas, sin cambiar su resultado.
  - **Router de Opttia** (`routers/opttia.js`): la persona va en el contexto de las herramientas y `/admit` devuelve los módulos sin permiso.
  - **Pruebas** de todo lo anterior.
- **ADK (`kai/adk_agent`):** `endpoints/katuq_basic_chat_endpoint.py` (instrucción, módulos sin permiso y preguntas anteriores), sus pruebas y el banco de preguntas. ⚠️ En producción el ADK tiene código vivo sin commitear: se despliega con la receta de respaldo.
- **Front (`Seller.Katuq`):** `shared/services/opttia-chat.service.ts` envía las preguntas anteriores. Sin cambios de pantalla.
- **Decisión:** D-474 en `specs/CONTRACT.md`.
