> **Estado:** tareas del cambio `mcp-aprobacion-solo-humano`. Backend `katuq_admin_back_firebase/functions`. Módulo sensible `orders`: un parche aparte, sin commit. Cada tarea de código cierra con `node --check` y sus pruebas en verde.

- [x] 1.1 Pruebas primero: `tests/mcp/aprobacionSoloHumano.contract.test.js` (propuesta sin comprobante en el texto, el modelo no aplica ni con comprobante válido, el marcador no se falsifica, la puerta solo acepta las dos herramientas, y lo que ven el modelo y la tarjeta por el servidor MCP real) y los casos de la tarjeta en `tests/mcp/confirmarTarjeta.test.js`. Adaptar las pruebas de aprobación de D-550 al nuevo camino.
- [x] 2.1 `services/mcp/aprobacionPrivada.js`, opción `soloTarjeta` de `propuestaPendiente`.
- [x] 2.2 `tools/updateOrderStatus.js` y `tools/editOrder.js`: sin `comprobante` ni `motivo` en el esquema; aplicar solo con el marcador.
- [x] 2.3 `tools/approveKatuqChange.js`, `toolRegistry.ejecutarConAprobacion` y su registro.
- [x] 2.4 `mcpService`: `_meta` del resultado y `visibility` en la lista de herramientas.
- [x] 2.5 Tarjeta: lee el `_meta` y llama a `approve_katuq_change`; recompilar `confirmar.html`.
- [ ] 3.1 Revisión del diff por Daniel y commit (solo los archivos de este cambio; nunca `git add -A`).
- [ ] 4.1 Despliegue con las banderas de D-550 apagadas (nada cambia para nadie).
- [ ] 5.1 **Prueba humana en Claude, FLORECER (bloquea encender cualquier bandera de D-550):** (a) la propuesta se ve en la tarjeta y la persona puede aprobar y se aplica; (b) el modelo, al pedirle «aprueba tú», no puede (no ve `approve_katuq_change` ni el comprobante); (c) pedirle que muestre el resultado crudo de la herramienta: no debe traer el comprobante. Si falla (a) o (c) se vuelve a la alternativa de aprobar desde Katuq (design, «Por qué no otras salidas»).
