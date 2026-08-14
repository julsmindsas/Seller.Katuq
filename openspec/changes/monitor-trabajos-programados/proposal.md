## Why

Katuq ejecuta solo, sin que nadie lo mire, unos veinte trabajos programados: flujos de integración con Cereza, Shopify y Fullpi, la verificación diaria de inventario, la cartera de World Office, la validación de mapeos de SIIGO, las encuestas, la entrada de mensajes. **Hoy no existe ninguna pantalla que diga si corrieron.**

El costo ya se pagó. El 2026-08-11 se perdieron horas persiguiendo un timeout en el modal de transportadoras; la causa —Cereza reanunciando los mismos productos sin parar, 16.266 avisos en 6 días para 1.062 productos— solo apareció leyendo el log del servidor por consola. El 2026-08-10 la verificación diaria de inventario **falló y nadie se enteró**: se descubrió al día siguiente, por casualidad, revisando otra cosa. Y un defecto de detección de cambios en el flow de Cereza dejó **39 productos sin precio durante meses** sin producir una sola alerta (D-170).

Tres huecos concretos, medidos el 2026-08-12 contra producción:

1. **Ocho trabajos programados no dejan rastro consultable.** Los crones nativos (`woReceivablesSync`, `siigoMappingValidation`, `satisfactionSurveyPromoter`, `whatsappInboundSync`, `full-inventory-sync`, `osmosis-order-sync`, `flowPollingDispatcher`, `flowRunZombieCleanup`) solo escriben al log de pm2, que se rota y no se puede consultar desde Katuq. No se pudo determinar si SIIGO corrió esa mañana.
2. **El motivo del fallo se guarda pero nadie lo ve.** `flow_runs` sí persiste `statusReason`, `errors[]` con código y mensaje, y el rastro completo en `nodeStates` — así se identificó, consultando la base a mano, que **1.519 de las 1.527 corridas fallidas de los últimos 8 días fueron `HANDLER_NOT_REGISTERED`**, un despliegue que dejó tres nodos sin registrar entre el 10 y el 11 de agosto. Lo que **no** se guarda es el detalle de las corridas `partial`: `error_port_items` dice que algunos ítems se desviaron, pero no cuáles (verificado en la parcial del 12-ago 10:00 UTC: `errors[]` vacío y `nodeStates` sin los ítems).
3. **Nadie avisa cuando algo *debió* correr y no corrió.** Un flow quieto y un flow roto se ven idénticos: `shopify-orders-to-cereza` lleva 7 días sin correr y `woo-orders-to-katuq` 21 días, y no hay forma de distinguir "no entraron pedidos" de "está roto".

El tercero es el que importa. Ver que todo está bien tiene poco valor; el valor está en enterarse de lo que no pasó.

## What Changes

- **Latido de ejecución para todo trabajo programado.** Cada cron nativo y cada flow registra, al empezar y al terminar, un documento con: qué es, cuándo arrancó, cuánto tardó, cómo salió y un resumen corto de lo que produjo. Se escribe en la colección **`integration_audit` ya existente**, con `type: "scheduled_job_run"` — **no se crea colección nueva** (regla de `openspec/config.yaml`).
- **Detalle de las corridas parciales.** Cuando una corrida quede `partial` por ítems desviados al error port, se registra **cuáles** ítems y por qué. El motivo de las corridas `failed` ya se persiste y no hay que tocarlo: basta con exponerlo.
- **Catálogo declarado de lo que debe correr.** Una lista, en configuración, de cada trabajo con su cadencia esperada y su tolerancia. Es lo que permite calcular "no corrió cuando debía" — sin ella solo se puede mostrar lo que sí pasó, que es la mitad inútil del problema.
- **Pantalla de superadmin en `/superadmin`**, solo lectura: semáforo general, lista de trabajos con su última corrida y su resultado, detalle de incidencias recientes con su motivo, y estado de los barridos de catálogo en curso.
- **Detección de ausencia.** La pantalla marca en rojo el trabajo cuya última corrida excede su cadencia esperada más la tolerancia.

### No-goals

- **No es visible para las empresas.** Decisión explícita del usuario (2026-08-12): solo superadmin. Es información de plomería y expone cómo funciona Katuq por dentro.
- **No se cambia el comportamiento de ningún flow ni cron.** Se les agrega el latido y nada más: ni frecuencia, ni cobertura, ni orden, ni límites.
- **No se crean canales de alerta** (WhatsApp, correo, push). Esta propuesta deja la ausencia *visible*; notificarla va aparte, cuando se sepa qué alertas valen la pena y cuáles serían ruido.
- **No se crean colecciones Firestore nuevas** ni endpoints "v2".
- **No se toca la lógica de inventario, órdenes ni consecutivos.** El latido de la verificación diaria de inventario se agrega en el borde del nodo, sin entrar en `dailyObservationService`.
- No se migran los `flow_runs` históricos (40.647 documentos) a ningún modelo nuevo.

### Write-set declarado

Esta capacidad es **de solo lectura sobre todo el dominio**. Lo único que escribe es su propia evidencia:

| Permitido escribir | Prohibido |
| --- | --- |
| `integration_audit` con `type: "scheduled_job_run"` | `products`, catálogo, precios, listas de precios |
| `flow_runs`: campos de error ya existentes en el documento de la corrida | `inventory`, `inventoryMovement` |
| — | `orders`, consecutivos |
| — | `InventoryLevel` de Shopify o cualquier escritura hacia un proveedor |

No lee ni escribe nada de Shopify, Cereza ni Fullpi: se alimenta solo de lo que Katuq ya guarda.

## Capabilities

### New Capabilities

- `monitor-trabajos-programados`: registro de ejecución de todo trabajo programado, detección de ausencia contra su cadencia declarada, y pantalla de superadmin que lo muestra.

### Modified Capabilities

_Ninguna._ Los flows y crones existentes no cambian de comportamiento; solo emiten evidencia adicional.

## Riesgos

- **Volumen de escritura.** `fullpi-orders-status-pull-oms` corre ~1.178 veces por día. Con veinte trabajos, el latido podría rondar las 2.000 escrituras diarias. Mitigación en `design.md`: latido resumido por trabajo y retención acotada; se mide antes de encender el resto.
- **Falsos rojos.** Un trabajo reactivo declarado con cadencia fija se pintaría en rojo aunque esté sano. Por eso el catálogo distingue trabajos *periódicos* de trabajos *reactivos*, y a estos últimos no se les exige cadencia.
- **Tocar el borde de módulos sensibles.** El latido entra en el nodo de verificación diaria de inventario. Va con diff y aprobación explícita antes de aplicar, un cambio a la vez, según la regla de módulos sensibles.
- **Falsa sensación de control.** Una pantalla que muestre solo los flows —lo fácil— y omita los ocho crones ciegos sería peor que no tenerla. Por eso el latido es la tarea 1 y la pantalla la última.

## Decisión a registrar

Al aprobarse, registrar en `/specs/CONTRACT.md` como el siguiente D-XXX disponible: monitoreo de trabajos programados, alcance solo superadmin, reutilizando `integration_audit` sin colección nueva, con la detección de ausencia como criterio de valor y no el semáforo verde.
