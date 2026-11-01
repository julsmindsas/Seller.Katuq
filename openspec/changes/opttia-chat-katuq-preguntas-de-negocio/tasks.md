## 1. Backend — reglas compartidas (katuq_admin_back_firebase, módulo sensible: un cambio a la vez con diff y aprobación)

- [ ] 1.1 Leer `controllers/analytics.js:1095-1230`, `services/salesMetricOrder.js`, `tools/getTopProducts.js`, `services/metricasPropias.js` y `tools/dateHelpers.js` antes de editar
- [ ] 1.2 Crear `services/ventasPorVendedor.js` con `vendedorDelPedido(order)` (misma precedencia que el Dashboard). Probarla con pedidos de ejemplo: UserLite, texto, `usuarioEmail`, `vendedorId` y sin vendedor
- [ ] 1.3 Hacer que `controllers/analytics.js` use `vendedorDelPedido`, con prueba de paridad: mismos pedidos → misma clave, nombre, ventas y pedidos que antes
- [ ] 1.4 Extraer `lineasVendidas(order)` de `tools/getTopProducts.js` a un helper compartido. Prueba de paridad de `get_top_products` antes y después

## 2. Backend — `analyze_sales`

- [ ] 2.1 Verificar en solo lectura, con pedidos reales de FLORECER, ALMARA y OH MY STORE, el campo y el tipo de cada criterio de la tabla del diseño (canal, transportador, forma de entrega, ciudad, bodega). Ajustar la tabla si algo difiere y anotarlo en el diseño
- [ ] 2.2 Crear `tools/analyzeSales.js`:
  - `inputSchema` con `enum` cerrados y una descripción con ejemplos de preguntas ("mejor vendedor", "ventas por canal", "cuánto vendió…", "comparar con el mes pasado");
  - validación con errores que dicen los valores válidos.
- [ ] 2.3 Implementar la lectura acotada:
  - rango en hora de Colombia, `orderBy desc`, `.select()` de los campos necesarios;
  - tope `MCP_SALES_MAX_DOCS` (20.000 por defecto) y `partial`;
  - `zonacobro` y `bodegas` de la empresa, una lectura cada una.
- [ ] 2.4 Implementar el agrupado:
  - hasta 2 criterios; medidas; filtros normalizados (sin tildes ni mayúsculas);
  - `others` para las filas fuera del límite y filas "Sin <criterio>";
  - `lineLevel` para producto y categoría; `share`, `compareWithPrevious` con `previous` y `change` (sin división por cero);
  - `unmatched` con hasta 5 sugerencias.
- [ ] 2.5 Registrar en `tools/toolRegistry.js` y en `TOOL_PERMISSIONS` (`ventas.view`). Actualizar `tests/mcp/registryPermisos.test.js` y `tests/opttia-access.test.js`
- [ ] 2.6 Pruebas:
  - paridad con el Dashboard: total, pedidos y ventas por vendedor;
  - paridad con `get_top_products`;
  - pedido de las 9 p. m. del último día del mes en ese mes;
  - cancelados fuera salvo `includeCancelled`;
  - fila "Sin vendedor asignado";
  - comparación con período anterior vacío;
  - `unmatched`;
  - `partial` al tope;
  - ningún dato de comprador en la respuesta.
- [ ] 2.7 Contract test del write-set: con un doble de `db` que falla ante `set`, `update`, `add`, `delete` o `batch`, `analyze_sales` no escribe
- [ ] 2.8 Medir en local, en solo lectura, el tiempo y los documentos leídos de "ventas por vendedor del último mes con comparación" en la empresa con más pedidos. Anotar el resultado en el diseño

## 3. Backend — alcance, persona y módulos sin permiso

- [ ] 3.1 Agregar `alcanceDeContexto(context, company)` a `services/metricasPropias.js`. Probarlo con: vendedor con la opción prendida y apagada, administrador, directivo, persona no encontrada y llave sin persona
- [ ] 3.2 Aplicar `pedidoAlAlcance` en:
  - `analyze_sales`: solo la fila propia y filtro por otro vendedor en cero, con nota;
  - `get_order_analytics`: `sales_by_date`, `orders_by_status`, `revenue_summary` y `top_products`;
  - `get_sales_today`, `get_sales_by_period` y `get_top_products`.

  Una prueba por herramienta y `scope` en la respuesta.
- [ ] 3.3 Prueba de que `get_orders`, `search_orders`, `get_order_by_number`, `get_order_summary` y `get_orders_attention` no cambian para un vendedor restringido
- [ ] 3.4 En `routers/opttia.js`:
  - sumar `mcpUserEmail` y `mcpUserRole` al contexto de `execute`, sin quitar `userEmail` ni `userRole`;
  - en `/admit`, devolver `deniedModules` (etiquetas).

  Extender `tests/opttia-mcp-security.test.js`: llegan los dos campos, `deniedModules` no trae datos, y un parámetro `agente`, `company` o un correo ajeno no cambia el alcance.
- [ ] 3.5 Prueba de que `get_dispatch_plan` desde el chat aplica la regla por persona de En vivo
- [ ] 3.6 Correr las pruebas tocadas, `tests/opttia-access.test.js` y `tests/mcp/*`; arrancar el backend en local sin errores de carga

## 4. ADK — instrucción, permisos y seguimiento (kai/adk_agent)

- [ ] 4.1 Leer `endpoints/katuq_basic_chat_endpoint.py`, `tools/katuq_authenticated_mcp.py` y `tests/test_katuq_basic_chat.py`
- [ ] 4.2 Reescribir la instrucción según la decisión 6 del diseño y pasarle `deniedModules` de la admisión como dato. Actualizar las aserciones existentes de la instrucción
- [ ] 4.3 Agregar `_previous_questions(messages)` y el turno único con "Preguntas anteriores… / Pregunta actual…"; `current_query_only` sin cambios
- [ ] 4.4 Pruebas:
  - recorte y tope de 3, mensajes `assistant` descartados, front viejo con un solo mensaje;
  - instrucción escondida en el contexto sin efecto;
  - `deniedModules` vacío o ausente;
  - un solo crédito por pregunta.
- [ ] 4.5 Crear `tests/fixtures/katuq_chat_question_bank.json` con las 43 preguntas del diseño y una prueba de CI que valida su forma
- [ ] 4.6 Crear `scripts/run_katuq_chat_bank.py`:
  - corre el banco contra un ADK (local o producción) con un usuario administrador y uno vendedor restringido de FLORECER;
  - guarda por pregunta la herramienta usada, la respuesta y si pasó;
  - no imprime tokens.
- [ ] 4.7 Corrida local completa (ADK y backend locales sobre FLORECER) hasta llegar al 95 % y cero "no tengo herramientas" o remisiones en preguntas cubiertas. Si no se llega, ajustar descripciones e instrucción y repetir; no desplegar por debajo del umbral

## 5. Front — preguntas anteriores (Seller.Katuq)

- [ ] 5.1 En `shared/services/opttia-chat.service.ts`, `sendMessage` envía hasta 3 preguntas anteriores del usuario (sin `includeInContext: false`) más la actual
- [ ] 5.2 Verificar que "Nueva conversación" y el cambio de empresa o de usuario vacían el contexto (`clear`, `ensureSessionScope`)
- [ ] 5.3 `npm run build:prod` sin errores y revisión del diff de los environments

## 6. Despliegue y verificación

- [ ] 6.1 Desplegar el backend (procedimiento de PM2 del servidor) y verificar en FLORECER, como administrador, que el chat y el Dashboard dan el mismo total y las mismas ventas por vendedor en el mismo rango
- [ ] 6.2 Desplegar el ADK con la receta de respaldo y verificación por hash (rama `feat/claude-agent-sdk`, sin `git pull` pelado) y reiniciar `kai-adk`
- [ ] 6.3 Publicar el front (`git pull`, build desde la punta, candado de publicación)
- [ ] 6.4 Correr el banco contra producción con FLORECER y adjuntar el resultado
- [ ] 6.5 Con un vendedor de FLORECER: con la opción prendida ve solo su fila y sus cifras; con la opción apagada ve toda la empresa
- [ ] 6.6 Registrar el cierre en la bitácora de `specs/CONTRACT.md` (D-474) con commits, resultado del banco y huecos encontrados en otros módulos
