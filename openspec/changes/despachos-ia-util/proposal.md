# Propuesta: IA de despachos que entregue valor

> Estado: en implementación por el /goal de Daniel (11-oct: "permea de IA los principales módulos, termina inventario y luego sigue con despachos"). Mismo principio y mismas piezas que la IA de inventarios (D-401). Solo lectura: no cambia estados, órdenes de envío ni transportadores.

## Por qué

En Despachos hoy no hay IA. Las "Recomendaciones KAI" de la pantalla las arma el navegador con frases fijas ("Priorizar zona Sur…") y zonas que no existen (Norte, Sur, Este, Oeste, Centro). Y la cola tiene problemas que nadie ve, medidos en producción el 11-oct (desde el servidor, solo lectura):

| Empresa | Pedidos activos | "Despachado" con fecha vencida (nunca pasó a Entregado) | Activos con saldo por cobrar | Entregados con fecha real de entrega |
|---|---|---|---|---|
| ALMARA FELICIDAD | 3.416 | 3.029 | 152 | 30 de 400 |
| OH MY STORE | 1.290 | 851 | 1.276 | 0 de 107 |
| CAFE ESCOBAR | 335 | 262 | 298 | 0 de 39 |
| ALMACEN BOMBAS | 24 | 6 | 20 | 0 de 12 |

- **"Urgente" ya no distingue nada:** casi todos los pedidos activos tienen la fecha pactada en el pasado (ALMARA 3.407 de 3.416). La regla actual ("entrega hoy o vencida") marca todo.
- **Despachados que nunca se cierran:** miles de pedidos quedan en "Despachado" para siempre. Con contraentrega, eso es plata en la calle que nadie persigue.
- **No hay cómo medir cumplimiento por transportador:** la fecha real de entrega casi nunca se registra.

## Qué cambia

**El código calcula, la IA prioriza y explica** (igual que en inventario: lo que invente se descarta; si Opttia falla, se ven las cifras).

1. **Qué despachar hoy.** La cola lista para despachar, en tramos: vencido hace 1–3 días, para hoy, para mañana. Agrupada por ciudad o zona para armar rutas ("12 pedidos para Envigado"). Lo vencido hace más de 3 días va a avisos, no a la cola: probablemente está desactualizado.
2. **Despachados sin cerrar y plata por cobrar.** Pedidos en "Despachado" hace más de 3 días, por transportador, con el saldo por cobrar de cada uno. La pregunta que responde: "¿a quién llamo y cuánta plata tiene?".
3. **Avisos.** Sin fecha de entrega, sin ciudad o dirección, despachado sin transportador, la transportadora reportó un problema, empacado o en despacho hace más de 2 días.
4. **Preguntarle a Opttia.** Una herramienta de solo lectura con estas cifras.
5. **En pantalla:** las "Recomendaciones KAI" falsas se reemplazan por este panel en Despachos.

## No-goals

- No cambia estados, ni crea o despacha órdenes, ni asigna transportadores. Cerrar un pedido sigue siendo la acción existente.
- No mide el cumplimiento por transportador todavía: la fecha real casi no existe. Fase 2, con el historial de estados.
- No corrige los datos viejos (miles de "Despachado" sin cerrar): los muestra para que el comercio decida.
- No manda a la IA datos personales del cliente final (nombre, teléfono, dirección exacta): solo número de pedido, ciudad, zona, montos y estados.

## Riesgos

- **Módulo sensible por cercanía (orders):** todo es lectura, filtrada por `company` y con `select` de los campos necesarios (ALMARA trae más de 3.000 pedidos activos).
- **Campos con varias formas** (transportador como texto u objeto, fecha de despacho en dos campos, zona en dos lugares): se normalizan en un solo punto y se prueban.

## Write-set

Ninguno: no escribe en Firestore.

## Capabilities

- `dispatch-insights`: qué despachar hoy, despachados sin cerrar y plata por cobrar, avisos, explicación de Opttia, herramienta MCP.
