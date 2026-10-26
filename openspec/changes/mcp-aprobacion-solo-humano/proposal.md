> **Estado:** PROPUESTA + DISEÑO + TAREAS en un solo documento corto (cambio chico y de un solo tema). Decidido por Daniel el 2026-10-26 como opción **b** del desvío «el modelo puede aprobar» de `mcp-editar-pedidos` (D-550): se cierra en un cambio aparte, **antes** de encender `mcpOrderEditNotes`. Implementación en el árbol del backend (26-oct), SIN commit ni despliegue. ID de decisión (D-XXX): por reservar mirando `origin` (el contrato local va atrasado).

## Why

Hoy, cuando `update_order_status` (con `mcpOrderStatusApproval`) o `edit_order` proponen un cambio, el resultado que lee el modelo lleva el `comprobante` firmado, y los dos tienen `comprobante` y `motivo` en su `inputSchema`. Nada impide que el modelo lo reenvíe y aplique el cambio **sin que la persona apruebe**, ni que escriba el `motivo` del historial a nombre de ella. La aprobación de hoy es una intención, no un hecho (lo dice `services/mcp/confirmacion.js` de las herramientas viejas). Atar el comprobante al pedido y a la persona (revisión del 23-oct) no lo cierra: el modelo sigue leyéndolo.

El requisito de la spec de D-550 «El modelo SHALL NOT poder aprobar» no se cumplía. Mientras no se cumpla, ninguna edición de pedidos desde Claude se enciende.

## What Changes

La prueba de aprobación solo existe en un canal que el modelo no lee y solo se puede usar por una puerta que el modelo no puede llamar.

1. **El comprobante sale del texto que lee el modelo.** La propuesta de `update_order_status` y de `edit_order` ya no trae `comprobante` en su JSON. Viaja aparte, en el `_meta` del resultado (`katuq/aprobacion`), que el protocolo de pantallas entrega a la tarjeta y que un cliente no le pasa al modelo.
2. **`comprobante` y `motivo` salen del `inputSchema`** de las dos herramientas. Si el modelo manda un `comprobante` de todos modos, no se aplica nada y se responde «la aprobación solo la da la persona en la tarjeta».
3. **Una herramienta nueva, solo para la pantalla:** `approve_katuq_change` (`_meta.ui.visibility: ["app"]`, la visibilidad que el estándar de pantallas define para «callable solo por la app»). La tarjeta la llama con el comprobante y el motivo que escribió la persona. El servidor la deja aplicar únicamente las dos herramientas de pedidos, por la misma puerta única (`toolRegistry`), que vuelve a validar empresa, permisos, rol, solo lectura y bandera.
4. **Un marcador del servidor, no de los argumentos.** `toolRegistry` fija `mcpAprobacionTarjeta` en el contexto: `true` solo cuando la llamada viene de `approve_katuq_change`; en cualquier otra, `false`, aunque el contexto de entrada diga otra cosa. Las dos herramientas solo leen `comprobante` y `motivo` con ese marcador.
5. **La tarjeta** lee el comprobante del `_meta` y llama a `approve_katuq_change`. Si no le llega (un host que no lo entrega), no aplica nada y lo dice.

Las otras herramientas con tarjeta (`update_product`, soporte) no cambian: su comprobante sigue como hoy. Se pueden migrar después con el mismo mecanismo.

## Capabilities

### Modified Capabilities
- `mcp-order-editing` (de `mcp-editar-pedidos`): cumple el requisito «El modelo SHALL NOT poder aprobar».

## Impact

- **Backend:** `services/mcp/aprobacionPrivada.js` (nuevo), `services/mcp/confirmacion.js` (opción `soloTarjeta`), `tools/approveKatuqChange.js` (nuevo), `tools/updateOrderStatus.js`, `tools/editOrder.js`, `tools/toolRegistry.js`, `services/mcp/mcpService.js`, la tarjeta (`apps/_comun/propuesta.js`, `apps/confirmar/src/confirmar.js` y su compilado).
- **Front del Seller:** ninguno. **Sin colecciones nuevas, sin endpoints nuevos, sin bandera nueva.**
- **Write-set:** no cambia. La herramienta nueva no escribe nada por sí misma: delega en las dos de pedidos.
- **Cambio de costumbre:** un cliente MCP que no muestra pantallas (Claude Code en terminal, scripts) ya no puede aprobar estos cambios, ni los de F0 con la bandera encendida: se hacen desde Katuq. Es lo que se busca (falla cerrado).

## No-goals

- Cambiar las otras herramientas de escritura con tarjeta.
- Aprobar fuera de la tarjeta (por ejemplo desde la web de Katuq): sería otra propuesta, con su estado en Firestore.
- Garantizar nada sobre un host que muestre al modelo el `_meta` Y deje al modelo llamar herramientas marcadas solo para la app: ver Riesgos.

## Riesgos

- **Depende de cómo trate el host dos cosas del estándar:** que el `_meta` del resultado llegue a la pantalla y no al modelo, y que `visibility: ["app"]` esconda la herramienta del modelo. Para que el modelo apruebe solo, tendrían que fallar **las dos a la vez**; hoy basta con leer el texto de la propuesta. El servidor no puede comprobar el host: **hay que probarlo con una persona en Claude** (FLORECER) antes de encender cualquier bandera de D-550 (tarea 5.1).
- **Si el host no entrega el `_meta` a la pantalla**, la tarjeta no puede aprobar y falla cerrado (dice que no se aplicó nada). Ese caso se detecta en la misma prueba.
- Un `_meta` leído por el modelo no da el permiso por sí solo: sin poder llamar `approve_katuq_change` no aplica nada.
