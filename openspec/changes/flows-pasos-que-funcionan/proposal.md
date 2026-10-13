## Why

El módulo Automatizaciones (`/flows`) no se puede poner a funcionar como n8n. El problema no es solo de pantalla: el motor del servidor ejecuta mal varios pasos. La auditoría del 2026-10-11 lo comprobó leyendo el código y con simulaciones locales:

- **El motor corre sin su catálogo de pasos.** Busca `contracts/node-catalog`, que solo existe en `.ts`, y no lo carga.
- **Las ramas "Al terminar" y "Otro caso" entregan datos equivocados.**
- **`$node["X"]` se rompe si el paso tiene notas.**
- **Los pasos de una rama vacía se ejecutan igual.**
- **Los flows hechos a mano no reciben su webhook:** se guardan sin pasos de inicio y el endpoint responde 404.
- **Encender no se refleja en pantalla, y borrar no apaga el flow.**
- **Seis pasos de proveedor llaman funciones que no existen:** SIIGO factura, SIIGO cliente, World Office factura, Aliaddo, Envíame y Wompi.

Daniel lo pidió el 2026-10-13: «sí, pero ojo con dañar los webhooks ya funcionales de Shopify de OH MY STORE».

## What Changes

- **Catálogo como aviso, nunca como bloqueo en ejecución.** El motor carga el catálogo real. Lo usa para avisar de pasos incompletos al guardar y para bloquear el **encendido** de un flow incompleto. Una ejecución en curso (webhook, cron o polling) **nunca** se rechaza por el catálogo. Por eso no cambian los timeouts ni la idempotencia de los pasos existentes.
- **Ramas correctas.** La salida "Al terminar" del paso Repetir entrega el resultado final, y "Otro caso" del paso Elegir entrega los que no cayeron en ningún caso.
- **`$node["<id>"]` siempre funciona.** Cada paso queda disponible por su id. Las notas se mantienen como nombre alternativo solo si no chocan con un id, así que nada de lo que hoy funciona deja de funcionar.
- **Ramas vacías no ejecutan.** Un paso que recibe 0 registros por todas sus entradas no corre. Los pasos de inicio quedan exentos.
- **Parámetros por registro, solo para quien lo pida.** Un paso declarado "por registro" recibe sus parámetros resueltos para cada registro. Los pasos actuales no cambian.
- **Esperar más de 30 s.** El paso Esperar recibe un límite de tiempo igual a su espera más un margen.
- **Pasos de inicio en flows nuevos.** Al guardar un flow **sin** pasos de inicio, se derivan del grafo. Los flows que ya los tienen se guardan exactamente igual que hoy. Si un paso de inicio guardado apunta a un paso que ya no existe, se descarta ese paso de inicio en vez de bloquear el guardado.
- **Encender, apagar y borrar coherentes.**
  - Encender y apagar devuelven el flow, y la pantalla se actualiza.
  - El autoguardado deja de mandar el estado.
  - Borrar apaga los disparadores.
  - El horario guardado se aplica.
- **Pasos de proveedor rotos.** Se marcan "No disponible": salen de la paleta y, si un flow los tiene, fallan con un mensaje claro en vez de un error técnico. El arreglo real de cada uno es otro cambio.
- **Interruptor por comercio** (`flowsMotorCorregido`) para lo que cambia el comportamiento de ejecución: ramas, `$node` por id, ramas vacías y Esperar.
  - **Apagado:** el motor ejecuta como hoy.
  - **Modo sombra:** anota en la misma ejecución qué habría cambiado, sin cambiarlo.
  - **Encendido:** primero FLORECER; OH MY STORE solo con el visto bueno de Daniel después de revisar la sombra.

## Capabilities

### New Capabilities
- `flows-motor`: cómo ejecuta el motor de automatizaciones (catálogo, ramas, datos entre pasos, ramas vacías, pasos de inicio, encendido y borrado) y la garantía de no alterar los webhooks activos.

### Modified Capabilities
_(ninguna; no existe spec viva del motor en `openspec/specs/`)_

## No-goals

- **No se toca el camino del webhook.** Quedan igual el endpoint `/v1/flows/triggers/webhook/:flowId/:nodeId`, su respuesta, la ausencia de firma, la ausencia de dedup y el atajo que entrega el cuerpo crudo al primer paso. El blindaje del webhook es el cambio D-350 (`automatizaciones-sin-tecnicismos`).
- No se modifican los grafos ni los pasos de inicio de los flows existentes, ni se ejecuta ningún backfill sobre `flows`.
- No se arreglan los pasos de SIIGO, World Office, Aliaddo, Envíame ni Wompi. Solo se marcan como no disponibles.
- Fuera de alcance: modo prueba sin efectos, prueba de un paso suelto y datos fijados (cambio 2), y el selector de datos, el constructor de condiciones y el panel que no pierde lo escrito (cambio 3).
- No hay colecciones nuevas: la sombra se escribe en el documento de `flow_runs` de la misma ejecución.
- No se cambian la frecuencia ni los límites de los flows mixtos de OH MY STORE (D-134).

## Impact

- **Backend** (`katuq_admin_back_firebase/functions`):
  - `services/flows/{nodeExecutor,validator,flowExecutor,flowEngine}.js`
  - un catálogo cargable en JS
  - `nodes/flow-control/{loop,switch,delay}`
  - `controllers/flowsController.js` (update, remove, activate, deactivate)
  - `services/companyFeatureFlags.js`, para la bandera nueva
- **Frontend:**
  - `flow-editor.component.ts`, en el guardado de los pasos de inicio y en encender y apagar
  - `flow-list.component.ts`
  - `flows.service.ts`
  - el catálogo de respaldo
- **Flows de OH MY STORE.** Ninguno cambia de forma.
  - El de pedidos Shopify→Cereza (`shopify-orders-to-cereza-7e6ab5a3`) depende de los pasos de inicio guardados, del atajo del primer paso, de `$node["persist"]` y `$node["trigger"]` (ids sin notas) y del puerto `main`. Todo eso se conserva con la bandera apagada **y** encendida.
  - Se protege con una prueba de regresión que ejecuta su grafo real con un pedido de ejemplo.
- **Riesgo en módulos sensibles.** Pedidos e inventario se tocan solo de forma indirecta, por los flows que crean pedidos y descuentan stock. Por eso cada cambio de ejecución pasa por la bandera y la sombra antes de encenderse.
