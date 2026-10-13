## Context

Los flows se ejecutan en el backend (EC2, `services/flows/`). Hay tres caminos de entrada:
- el webhook directo, `POST /v1/flows/triggers/webhook/:flowId/:nodeId`;
- el despachador de polling y cron de `cronService`;
- la prueba desde el editor.

Los tres terminan en `flowEngine.startRun`, que valida y luego corre `flowExecutor`, el cual llama a `nodeExecutor` paso por paso.

**De qué depende hoy el webhook de OH MY STORE** (`shopify-orders-to-cereza-7e6ab5a3`, versión 22 del respaldo del 7-oct):
- Su `triggers` guardado: `{nodeId:'trigger', type:'webhook'}`.
- El atajo de `_executeOne`: un paso de inicio con registros inyectados devuelve el cuerpo crudo sin ejecutar su handler.
- `$node["persist"]` y `$node["trigger"]`, cuyos ids no tienen notas.
- La salida `main` en todas sus líneas.
- La validación estructural de `startRun`. Hoy valida poco porque el catálogo no carga.

**Trampa principal.** Si el catálogo carga sin más, `validator.validate` empieza a revisar esquemas en **cada** ejecución, y `nodeExecutor` toma `timeoutMs` e `idempotent` de cada paso. Una diferencia de esquema en un flow vivo dejaría de procesar pedidos.

## Goals / Non-Goals

**Goals:** que los pasos de control (Repetir, Elegir, Esperar), `$node`, las ramas, los pasos de inicio, encender/apagar/borrar y el horario hagan lo que la pantalla promete. Todo sin cambiar el resultado de ningún webhook o polling que hoy funciona.

**Non-Goals:**
- el blindaje del webhook (D-350);
- el modo prueba sin efectos;
- arreglar los conectores de SIIGO, World Office, Aliaddo, Envíame y Wompi;
- cambios de UI del panel;
- backfill de flows existentes.

## Decisions

### 1. El catálogo en ejecución sale de los módulos de cada paso
`nodeRegistry` ya carga cada `nodes/<grupo>/<tipo>.js`, y cada uno exporta su `spec`. Se agrega `nodeRegistry.getSpec(type)` y el validador lo usa.
- **Descartado:** generar `contracts/node-catalog.js` desde el `.ts`, porque es un tercer catálogo que se desincroniza; el `.ts` ya está desactualizado frente a `nodeCatalog.json`.
- `nodeCatalog.json` sigue siendo lo que sirve `GET /nodes/catalog` a la paleta. Se agrega una prueba que falla si el JSON y los specs de los módulos difieren en tipos o en campos obligatorios.

### 2. Validación en dos niveles
`validator.validate(flow, { level })` recibe un nivel:
- **`'structure'`:** ciclos, ids y pasos de inicio. Es lo único que usan `startRun` y `webhookTrigger`.
- **`'catalog'`:** agrega esquema, puertos, tipo desconocido y campos obligatorios.

Al **guardar**, los hallazgos del nivel catálogo vuelven como `warnings` y no bloquean. Al **encender** bloquean los errores de campos obligatorios, puertos inexistentes y tipo desconocido. Un flow ya encendido no se re-valida.

`nodeExecutor` mantiene **fijos** el timeout de 30 s y `isIdempotent=false`, sin leer el catálogo. Hay una sola excepción: el paso Esperar (decisión 6).

### 3. Bandera por comercio y sombra global
- Variable de entorno `FLOWS_MOTOR_MODO`. Su valor por defecto es `sombra`, y `off` la apaga como kill switch.
- Bandera de comercio `flowsMotorCorregido` en `companyFeatureFlags`, un booleano que solo vale con `true`. Pone a ese comercio en modo `on`.
- `flowExecutor` lee la bandera **una vez por ejecución**: una lectura del documento de la empresa.

Bajo la bandera solo quedan las dos reglas que cambian datos entre pasos:
- **Puertos `done` y `default`.** `done` pasa a `main[1]`. `default` pasa al último índice de `main`, es decir, `main[cases.length]`; hoy cae en `main[0]`.
- **Saltar ramas vacías.** Un paso que no es de inicio, cuyas entradas ya se cumplieron todas con 0 registros, queda en `skipped` con razón `sin_datos`. Sus salidas cuentan como cumplidas con 0 registros, así que los pasos de abajo también se saltan en cascada y un merge con la otra rama con datos sigue corriendo.

**En sombra**, el ejecutor calcula ambas versiones en cada ruteo y anota las diferencias en `flow_runs/{runId}.sombra.diferencias[]`: `{nodo, regla, registrosHoy, registrosCorregido}`. Va a lo sumo una escritura extra al final de la ejecución, en un documento que ya existe.

### 4. `$node` por id, con las notas como alias
`nodeOutputsByDisplayName[id]` se escribe siempre. Las notas se agregan como alias solo si no son el id de otro paso. El alias no pisa ids. Es un cambio aditivo y no necesita bandera: lo que hoy resuelve por notas sigue resolviendo.

### 5. Parámetros por registro como herramienta, sin estrenarse
`ctx.paramsForItem(i)` resuelve `rawParams` con `$json` igual al registro `i`. Los handlers actuales no lo llaman. Ningún paso lo declara en este cambio: queda listo para el cambio 2, donde la petición HTTP lo estrena bajo bandera.

### 6. Esperar con su propio límite
En `nodeExecutor`, si `flowNode.type === 'delay'`, el límite pasa a `max(30 s, ms + 5 s)` y `ECONNABORTED` no se reintenta. Hoy una espera de más de 30 s siempre falla, así que nadie la usa con éxito.

### 7. Pasos de inicio derivados al guardar, en el backend
`create` y `update` usan `derivarTriggers(graph)` solo si el body **y** el documento guardado tienen `triggers` vacío. El tipo de disparador sale de un campo nuevo en el spec de cada paso de inicio, `triggerKind: 'webhook' | 'polling' | 'cron'`. Si falta, se usa la regla de hoy de `activate`, que se mueve a la misma función.

Los `triggers` cuyo `nodeId` no está en el grafo se quitan y vuelven como `warnings`. Los demás se guardan **byte a byte** igual que llegaron. `activate` usa la misma función solo cuando el flow no tiene triggers.
- **Descartado:** derivarlos en el front, porque deja dos lógicas distintas para lo mismo.

### 8. Encender, apagar, borrar y horario
- **`activate` y `deactivate`** devuelven `{ flow }`, y el front lo usa.
- **Guardado del editor:** deja de mandar `status`, y el backend ignora `status` en `update`. El estado solo cambia por encender y apagar.
- **`remove`:** apaga los bindings en el mismo batch.
- **Horario:** el editor escribe `config.cronExpression` y deja de escribir `config.cron`.
  - `update` sincroniza `intervalMinutes`, `cronExpression` y `timezone` del binding de ese paso solo si el flow está activo **y** el valor cambió.
  - Si el horario no cambió, el binding no se toca.

### 9. Pasos no disponibles
Un mapa `NO_DISPONIBLES` en `nodeRegistry` (tipo → mensaje de negocio) cubre:
- `siigo-invoice-create`
- `siigo-customer-upsert`
- `worldoffice-invoice-create`
- `aliaddo-fulfillment-create`
- `enviame-shipment-create`
- `wompi-payment-status`
- `kai-agent-invoke` (Genkit está obsoleto)

El catálogo los marca con `disponible:false`, la paleta los oculta y su handler lanza un error con `code:'PASO_NO_DISPONIBLE'` y el mensaje. Hoy ya fallan siempre; solo cambia el mensaje. Se confirma en producción que ningún flow activo los usa (tarea 0.2).

## Risks / Trade-offs

- **[Riesgo] Un flow activo de otro comercio depende del mal ruteo de `done` o `default`.** → La bandera y la sombra lo cubren. La tarea 0.2 lista los flows activos que usan Repetir o Elegir antes de encender. Si alguno tiene diferencias en sombra, se revisa con Daniel.
- **[Riesgo] Saltar una rama vacía deja sin ejecutar un paso que hoy hace algo útil con 0 registros**, por ejemplo un paso que "barre" sin entrada. → Mitigación:
  - Va bajo bandera y sombra.
  - Los pasos de inicio están exentos.
  - Si la sombra lo muestra, se agrega `ejecutaSinDatos:true` al spec de ese paso.
- **[Riesgo] Derivar triggers al guardar cambia flows existentes.** → Solo aplica cuando el flow guardado tiene `triggers` vacío. OH MY STORE los tiene. La tarea 0.2 cuenta cuántos flows activos están vacíos.
- **[Riesgo] Desplegar el backend arrastra cambios de otras sesiones**, porque la unidad de despliegue es la rama. → Diff contra producción antes de desplegar, y avisar.
- **[Trade-off] La sombra es global por defecto.** Cuesta una escritura por ejecución, pero da evidencia de todos los comercios sin pedir permisos.

## Migration Plan

1. Desplegar el backend con `FLOWS_MOTOR_MODO=sombra` y sin bandera en ningún comercio. Con eso, el comportamiento de ejecución es idéntico al de hoy y solo anota.
2. Desplegar el front: guardado sin `status`, encender que refresca, horario con `cronExpression`.
3. Encender la bandera en FLORECER y probar los escenarios de la spec.
4. Revisar una semana de sombra de OH MY STORE y de los demás comercios con flows activos.
5. Encender la bandera en OH MY STORE con el visto bueno de Daniel.

**Reversa:** `FLOWS_MOTOR_MODO=off` o quitar la bandera, sin desplegar.

## Mapa de producción (tarea 0.2, 2026-10-13, `scripts/flows-mapa-activos.js`)

Hay 9 flows activos: 8 de OH MY STORE y 1 de CAFE ESCOBAR. **Ninguno:**
- usa Repetir ni Elegir;
- tiene líneas por `done` o `default`;
- referencia `$node` por notas;
- tiene pasos no disponibles;
- tiene `triggers` vacíos;
- está borrado con bindings activos.

| Flow | Arranque | Pasos |
|------|----------|-------|
| `shopify-orders-to-cereza-7e6ab5a3` (v29) | webhook | 8 pasos, `$node` por id |
| `woo-orders-to-katuq-a786f1a8` (CAFE ESCOBAR) | webhook | Woo → map → order-upsert → inventory-adjust |
| `cereza-products-to-shopify-a5156643` (v55) | polling | mixto D-134 |
| `katuq-web-to-shopify` | polling | — |
| `fullpi-inventory-to-katuq-oms` | polling | — |
| `cereza-orders-status-pull-rdoavk0b`, `cereza-stock-sweep-oms`, `inventario-verificacion-diaria-oms` | cron | — |
| `fullpi-orders-status-pull-oms` | cron | ⚠️ `active` **sin binding activo**: no corre. Queda fuera de alcance; Fullpi está dormido. |

**Conclusión.** Las reglas de puertos, `$node` y pasos no disponibles no tocan ningún flow vivo. La única regla con posible efecto es **saltar ramas vacías**: en los flows de polling, cuando el paso de inicio no emite nada, los pasos de abajo hoy corren con 0 registros. La sombra lo medirá antes de encender.

## Open Questions

- ¿Algún paso de los flows de polling hace trabajo útil con 0 registros? Por ejemplo, `shopify-pricelist-sync` o `osmosis-order-create`. Se responde con la sombra y con la lectura de esos handlers (tarea 2.3).
