> **Estado:** diseño del cambio `mcp-aprobacion-solo-humano` (26-oct). Complementa `proposal.md`.

## Contexto verificado en el código (26-oct)

- La tarjeta recibe el resultado de la herramienta por `ui/notifications/tool-result` (`services/mcp/apps/_puente/puente.js`), con la forma completa de `CallToolResult` (`content`, `structuredContent`, `_meta`). Hoy lee el primer bloque de texto, que es **el mismo que lee el modelo**; de ahí que el comprobante viaje por el modelo.
- La tarjeta llama a la herramienta por `tools/call` a través del host. El servidor (`/mcp` sin estado) **no puede distinguir** quién llamó: una llamada de la tarjeta y una del modelo son iguales. Por eso la protección no puede ser «mirar quién llama»: tiene que ser (a) que el modelo no tenga la prueba y (b) que la puerta que la acepta no esté a su alcance.
- El estándar de pantallas (`@modelcontextprotocol/ext-apps` 1.7.5, `spec.types.d.ts`) define `_meta.ui.visibility: ["model" | "app"]`: `"app"` = «callable por la app desde este servidor», y `McpUiToolResultNotification.params` es un `CallToolResult` completo.

## Decisiones

1. **Prueba fuera del texto.** `propuestaPendiente({ soloTarjeta: true })` deja el comprobante como propiedad **no enumerable** del resultado (`services/mcp/aprobacionPrivada.js`, símbolo propio). `JSON.stringify` y el spread no la copian, así que cualquier camino que serialice el resultado (el REST de `/mcp/tools/call`, `/v1/opttia`, el texto MCP) la omite **por defecto**; solo `mcpService` la lee y la pone en `_meta['katuq/aprobacion']`. Una omisión por olvido deja la prueba oculta, no expuesta.
2. **Puerta propia.** `approve_katuq_change` (escritura, módulos `ventas/pedidos` y `despachos`, `_meta.ui.visibility: ["app"]`). Recibe `{ herramienta, argumentos, comprobante, motivo }`, rechaza cualquier herramienta fuera de `update_order_status` y `edit_order` y llama a `toolRegistry.ejecutarConAprobacion`.
3. **Marcador fijado por el servidor.** `toolRegistry._ejecutar` arma el contexto congelado con `mcpAprobacionTarjeta = (llamada por ejecutarConAprobacion)`, **sobrescribiendo** lo que traiga el contexto de entrada. `ejecutarConAprobacion` solo existe para las herramientas de una lista cerrada. Las dos herramientas leen `comprobante` y `motivo` solo con el marcador; sin él, un `comprobante` recibido da `aprobacion_no_humana` y no se escribe.
4. **Tarjeta.** `comprobanteDeResultado(result)` y `llamadaDeAprobacion(propuesta, comprobante, motivo)` (funciones puras, probadas en Node). Una propuesta con `aprobacionPor: "tarjeta"` se aprueba con `approve_katuq_change`; las demás (producto, soporte) siguen con su camino de hoy.
5. **Sin cambio de comportamiento sin bandera.** Sin `mcpOrderStatusApproval`, `update_order_status` es el de siempre (nunca leyó `comprobante`). `edit_order` ya nace apagada.

## Por qué no otras salidas

- *Atar el comprobante a la persona* (hecho el 23-oct): no ayuda; el modelo lo lee y lo reenvía en la misma sesión de la persona.
- *Guardar la aprobación en Firestore y aprobar desde la web de Katuq:* cierra el hueco sin depender del host, pero exige una colección nueva y pantalla en el Seller (otra propuesta, con aprobación). Queda como alternativa si la prueba en Claude muestra que el host expone el `_meta` o no respeta `visibility`.
- *Dejarlo con descripción «no lo inventes»:* es lo que había (opción a); un texto no es un control.
