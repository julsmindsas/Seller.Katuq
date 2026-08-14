# Diseño — Monitoreo de trabajos programados

## Dónde vive la evidencia

Se reutiliza **`integration_audit`**, colección ya existente, con `type: "scheduled_job_run"`. No se crea colección nueva (regla de `openspec/config.yaml`).

Forma del documento:

```
type: "scheduled_job_run"
jobId: "woReceivablesSync" | "cereza-products-to-shopify-a5156643" | …
jobKind: "cron" | "flow"
company: string | null          // null para los que no son por empresa
startedAt: Timestamp
finishedAt: Timestamp | null    // null = interrumpido (R4)
durationMs: number | null
outcome: "success" | "partial" | "failed" | null
summary: string                 // ≤ 200 chars, legible: "1.727 docs · CxC $2.441.016.171 · 12 err"
errorMessage: string | null     // ≤ 300 chars (R3)
errorStep: string | null        // nodo o paso
```

**Por qué no una colección propia:** la regla del proyecto prohíbe colecciones nuevas sin aprobación explícita, y `integration_audit` ya es el sitio donde el backend deja evidencia de integraciones. Si al medir el volumen resulta que ensucia esa colección, se propone la separación aparte y con datos, no por anticipado.

## Volumen y retención

Medido el 2026-08-12: `fullpi-orders-status-pull-oms` corre ~1.178 veces/día y `cereza-products-to-shopify` ~250. Con veinte trabajos instrumentados, el orden de magnitud es **~2.000 documentos/día**.

Dos decisiones para que no se vuelva un problema:

1. **Los trabajos de alta frecuencia (cadencia < 5 min) escriben latido resumido**: un documento por trabajo y por hora, con contadores (`corridas`, `fallos`, `parciales`) y la última incidencia. Los de baja frecuencia escriben un documento por corrida. Se instrumentan **primero los de baja frecuencia**, se mide, y solo entonces se decide el resto.
2. **Retención de 30 días** para los documentos de latido, barrida por el cron de limpieza que ya existe. No se toca la retención del resto de `integration_audit`.

## Cómo se instrumenta sin cambiar comportamiento

Un envoltorio, no una modificación:

```
await conLatido({ jobId, jobKind, company }, async () => { …el trabajo tal cual… })
```

- Abre la evidencia, ejecuta el cuerpo **sin tocarlo**, cierra la evidencia con el desenlace.
- **La escritura de evidencia va en `try/catch` que traga el error** (R5): si Firestore falla, el trabajo sigue. Se sigue el patrón ya usado en `shadowAuditService` del backend, que devuelve la promesa ya protegida.
- El envoltorio **no captura ni transforma la excepción del cuerpo**: la registra y la vuelve a lanzar, para que el manejo de errores existente siga siendo el mismo.

Para los flows, el enganche natural es donde ya se escribe `flow_runs`, agregando los campos de error que hoy se pierden. Para los crones nativos, en `cronService.js`, en el punto donde ya se registra cada job.

## Catálogo de lo esperado

Archivo de configuración en el backend, no colección:

```
{ id: "woReceivablesSync",    nombre: "Cartera World Office", tipo: "periodico", cadencia: "0 4 * * *",  toleranciaMin: 90 }
{ id: "inventario-verificacion-diaria-oms", nombre: "Verificación diaria de inventario", tipo: "periodico", cadencia: "30 4 * * *", toleranciaMin: 90 }
{ id: "shopify-orders-to-cereza-7e6ab5a3",  nombre: "Shopify → Cereza",  tipo: "reactivo" }
```

`tipo: "reactivo"` es lo que evita el falso rojo de `shopify-orders-to-cereza` (7 días quieto) y `woo-orders-to-katuq` (21 días): su silencio es válido (R8).

## Endpoint

`GET /v1/monitor/trabajos` — un solo endpoint, en un router nuevo, con el middleware de superadmin ya existente (R12).

Devuelve el consolidado ya calculado en el backend: lista de trabajos con última corrida, desenlace, contadores de la ventana, bandera de `ausente`, y las incidencias recientes. **El cálculo de ausencia va en el backend**, no en el componente: es la regla de negocio de esta capacidad.

Ante error de lectura devuelve `estado: "indeterminado"` para el trabajo afectado, nunca `sano` (R13).

## Frontend

- Módulo lazy-loaded `monitor-trabajos`, colgado de `/superadmin`, protegido por `AdminGuard` (que ya existe y verifica `rol === 'Super Administrador'`).
- Servicio `MonitorTrabajosService extends BaseService` — nunca `HttpClient` directo (el interceptor agrega los headers de auth).
- Componentes con SRP: `resumen` (la tira de cifras), `lista-trabajos` (la tabla), `incidencias` (el detalle). Nada monolítico.
- **Sin capa de cache nueva.** Si la consulta va lenta, se optimiza el query o el índice en origen.
- **Sin `setTimeout` para sincronizar padre-hijo**: los hijos reciben datos por `@Input` y avisan por `@Output`.
- Refresco manual por botón. El auto-refresco queda fuera de esta propuesta: es la clase de detalle que se decide viendo la pantalla en uso.

### Tema

Tokens de `openspec/specs/design-system/spec.md`: acento `#5F3FE0`, tinta `#211F3A`, superficies lila, radios 16/11/20px, sombras violeta difusas, labels UPPERCASE muted, **plano sin gradientes**. Semánticos en par fuerte/fondo-suave para los cuatro estados (`sano`, `ausente`, `con fallos`, `indeterminado`). Prohibidos `#2196f3`, `#4361ee`, `#2563eb`, `#5c6ac4`, `#667eea`.

El estado se codifica **en forma además de color** (R15): franja de severidad al inicio de la fila más chip con texto, para que no dependa solo del color.

Maqueta aprobada visualmente por el usuario el 2026-08-12: el tablero publicado en <https://claude.ai/code/artifact/69db5304-fd82-45e2-865f-77c0187be7de>, que ya usa estos tokens y esta jerarquía (resumen → flujos → punto ciego → detalle → incidencias).

## Orden de construcción

El latido va **primero** y la pantalla **al final**, a propósito. Una pantalla que muestre solo los flows —lo que ya es observable— y omita los ocho crones ciegos daría una falsa sensación de control, que es peor que no tener pantalla. Se construye de abajo hacia arriba: evidencia → catálogo → consulta → pantalla.

## Alternativas descartadas

- **Leer los logs de pm2 desde el backend.** Frágil (el log rota y ya nos borró la causa de los 5 fallos del 11-ago), acopla la pantalla al formato de texto de los mensajes, y no funciona si algún día hay más de una instancia.
- **Una herramienta externa de observabilidad.** Resuelve más de lo que hace falta, mete un proveedor nuevo y datos de clientes fuera de la infraestructura propia. La pregunta es "¿corrió o no?", y eso Katuq ya lo puede responder con lo que guarda.
- **Deducir la salud desde `flow_runs` solamente.** Es lo que se hizo a mano para el tablero del 2026-08-12 y por eso se sabe que no alcanza: deja fuera los ocho crones nativos, que son justamente los que no se pueden ver.
