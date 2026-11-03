> **Estado:** borrador — pendiente aprobación de Daniel.
> **Ticket:** 1506 («Saber cuánto tiempo está conectado cada usuario y cuántas sesiones abiertas tiene al mismo tiempo»; Julsmind, tipo idea, 1-nov).
> **Decisión:** D-634 (la asigna el orquestador).
> **Origen:** idea de Daniel García (`dgarciah@julsmind.com`), canal MCP.
> `design.md` y `tasks.md` se escriben después de aprobar esta propuesta. Sin código. Módulo sensible (auth y sesiones).

## Why

Daniel quiere medir el uso real de Katuq por comercio y por usuario, y detectar cuentas compartidas entre varias personas. Pide: tiempo conectado (día, semana, mes), primer ingreso y última actividad; sesiones abiertas al mismo tiempo con dispositivo y hora de última actividad; una vista para el administrador de cada comercio (solo sus usuarios) y otra general para el súper administrador.

El ticket no tiene comentarios ni adjuntos (leído completo el 3-nov; `date_add` 2026-11-01T16:49:09Z).

## Cómo funciona hoy (verificado en el código, solo lectura)

- **La sesión no existe en el servidor.** `createToken` (`functions/services/index.js:7-27`) firma un JWT de 24 h con `sub`, rol, correo y empresa, **sin identificador de sesión**. Se emite en dos lugares (`controllers/authentication.js:218` y `controllers/login.js:55`). `isAuth` (`middleware/auth.js`) solo decodifica el token y mira su `exp`: no consulta nada. No hay refresco ni cierre en el servidor; salir es borrar el `localStorage` (`auth.service.ts:305-321`).
- **Lo único guardado:** `ultimoIngreso` en cada ficha de `users` con ese correo (`authentication.js:300`), que `platformOverview.js:113` resume por comercio. Es la fecha del último login, no actividad. El ticket dice «del comercio»; en realidad se escribe por usuario y se resume por comercio.
- **`apiUsage` existe pero no sirve para esto.** `usageTracker` (`index.js:138`) escribe un registro por petición, pero con datos que manda el cliente: `userId` sale del encabezado `usage-code`, que el front llena con el código de autorización **de la empresa** (`http.interceptor.ts:272`), y `email`/`company` son encabezados sin firma. No trae dispositivo ni identificador de sesión. Ser un registro por petición, con Postgres, ya es el mayor volumen de escritura; no se le suma nada.
- **Hay un temporizador de 15 min** (`version-check.service.ts:34`), pero consulta un archivo estático del Hosting, no el backend. Sirve de patrón (corre fuera de la zona de Angular y escucha `focus`), no de latido.
- **El WebSocket de agentes** (`handlers/websocket-handler.js`) tiene `lastActivity`, pero solo en memoria y solo para el chat de agentes. No aplica.
- **Hallazgo, fuera de alcance:** el front acepta la sesión 48 h (`SESSION_DURATION_HOURS`, `auth.service.ts:402`), pero el token vence a las 24 h; manda el servidor (401).

## What Changes

### Fase 1 — Medir (sin tocar quién puede entrar)

1. **Un identificador de sesión (`sid`)** que el servidor crea en cada login y agrega al JWT como dato adicional. Los tokens sin `sid` siguen funcionando igual hasta que venzan.
2. **Una fila por sesión** con: empresa, usuario (correo), inicio, última actividad, cierre y motivo (`salio`, `inactiva`, `vencio`), navegador, sistema y tipo de equipo, y los segundos activos por día.
3. **Latido de actividad cada 5 minutos**, solo si la pestaña está visible y hubo uso (clic, teclado, navegación) en los últimos 5 minutos. Una pestaña abierta sin uso no cuenta. Si ya hubo una petición autenticada en esa ventana, el servidor la toma como actividad y no se manda latido aparte.
4. **Tiempo conectado** = suma de los intervalos entre latidos consecutivos que no pasen de 10 minutos, asignados al día (hora de Colombia) de cada latido.
5. **Sesiones abiertas** = sesiones sin cierre con última actividad en los últimos 10 minutos. Varias pestañas del mismo navegador son **una** sesión (comparten el login); otro navegador u otro equipo es otra.
6. **Vistas** (diseño según D-400, `cfg-pagina`):
   - **Mis sesiones:** cada usuario ve las suyas (transparencia).
   - **Administrador del comercio:** sus usuarios, con tiempo por día/semana/mes, primer ingreso, última actividad y sesiones abiertas, con una marca cuando hay 2 o más equipos distintos a la vez.
   - **Equipo Katuq:** resumen por comercio; el detalle por usuario solo para el equipo Katuq.

### Fase 2 — Políticas (otra decisión)

Si se quiere límite de sesiones simultáneas o aviso automático por cuenta compartida, se decide después de ver los datos reales de la fase 1.

### Fase 3 — «Cerrar otras sesiones» (propuesta aparte)

Cerrar una sesión a distancia exige que `isAuth` consulte una lista de `sid` revocados en cada petición. Eso toca el middleware de auth y suma una lectura por petición; por eso **no entra en esta propuesta**. Necesita su propia spec, su diff aprobado uno a uno y una medición de costo. Esta propuesta solo deja listo el `sid`, que es lo que esa fase necesita.

## Privacidad (Ley 1581 de 2012, tratamiento de datos personales)

- **Se guarda lo mínimo:** correo (ya existe), empresa, horas, navegador/sistema/tipo de equipo. **No** se guardan IP, ubicación, páginas visitadas, endpoints ni contenido.
- **Finalidad declarada:** seguridad de la cuenta y medición de uso. No es una herramienta de vigilancia de empleados; el comercio dueño de los datos decide cómo usar su vista.
- **Aviso visible:** la pantalla «Mis sesiones» y un texto en los términos explican qué se mide. La redacción legal la revisa Daniel o su asesor antes de encender la bandera.
- **Quién ve:** el usuario, sus datos; el administrador, solo su empresa (la del JWT firmado, nunca la del encabezado); el equipo Katuq, resumen por comercio y detalle solo con el guardia de equipo Katuq existente.
- **Retención (recomendada):** 13 meses de filas de sesión (permite comparar con el mismo mes del año anterior); después se borran. Ese borrado de datos propios de telemetría necesita el visto bueno de Daniel (D-579: no se borran registros de `katuq-db` sin su sí).

## Costo de escritura (PostgreSQL)

- **Una fila por login**; cada latido es un `update` de esa misma fila (nunca una fila nueva). Máximo 1 escritura cada 5 minutos por sesión activa, y el servidor ignora los latidos que lleguen con menos de 1 minuto de diferencia.
- Orden de magnitud: 200 sesiones activas × 8 h × 12 latidos/h ≈ **19 mil escrituras al día**, contra una escritura por petición de `apiUsage`. Se mide en sombra antes de abrir a todos.
- Índices en Postgres: `(empresa, usuario)` y `(empresa, última actividad)`. Las vistas siempre consultan por empresa y por rango de fechas, nunca barren la tabla completa.
- Los latidos no esperan respuesta ni bloquean al usuario; si fallan, se pierden en silencio y no se reintentan.

## Capabilities

### New Capabilities
- `user-sessions`: registro de sesiones, tiempo conectado y sesiones abiertas, con sus tres vistas.

### Modified Capabilities
- Ninguna archivada. El login añade el `sid` al token; la lógica de aceptar o rechazar un token **no cambia**.

## Impact

- **Backend:** `createToken` y los dos logins (añaden `sid`); un servicio y un router nuevos de sesiones (`/v1/sessions`, autenticados con `isAuth` y `requireJwtTenant`); un guardado del latido tomando la actividad de las peticiones. `middleware/auth.js` **no se modifica** en la fase 1.
- **Frontend:** un servicio que extiende `BaseService` (latido, `SKIP_LOADER`), el cierre en `logout`, y tres pantallas. El interceptor no cambia.
- **Datos (requiere aprobación, regla de colecciones nuevas):** **una** colección nueva, `userSessions`, que vive en Postgres vía el adaptador. Alternativa descartada: meterlo en la ficha del usuario (crece sin límite).
- **Bandera:** `featureFlags.userSessionTracking` por empresa y un interruptor global en `config/feature_flags` (D-505). Primero Julsmind, en sombra.
- **Write-set:** solo `userSessions`. No se escribe `users`, `apiUsage`, pedidos, pagos, inventario ni productos.

## No-goals

- Cerrar sesiones a distancia, limitar sesiones o expulsar usuarios (fases 2 y 3).
- Cambiar la duración del token, agregar refresco o alinear las 24/48 h.
- Debilitar, saltar o reemplazar `isAuth`, `requireJwtTenant` o el interceptor.
- Reutilizar o ampliar `apiUsage`. Registrar IP, ubicación o pantallas visitadas.
- Evaluar desempeño de personas ni calcular «productividad».

## Riesgos (módulo sensible: auth)

- **Tocar `createToken`.** Un error ahí rompe todos los logins. Se agrega el `sid` y se prueba el login de los dos caminos antes y después; si crear la fila falla, el login igual entrega el token (la medición nunca decide si alguien entra).
- **Datos falsos desde el cliente.** El `sid` y la empresa se leen del token firmado, nunca del cuerpo ni de encabezados. Un usuario no puede escribir sesiones de otro.
- **Privacidad.** Es el riesgo mayor: ver el tiempo de personas. Mitigado con datos mínimos, aviso, vista propia y retención; la revisión legal es previa al encendido.
- **Carga en Postgres.** Mitigada con el límite de latidos y la medición en sombra; se apaga con el interruptor global.
- **Cuentas con varias fichas** (el mismo correo con dos fichas en una empresa, caso del ticket 1471): la sesión se identifica por empresa + correo, no por ficha.

## Preguntas para Daniel

1. **¿Apruebas la colección nueva `userSessions`?** Recomendado: sí, una sola, con una fila por sesión.
2. **¿Cuánto tiempo se guarda el historial?** Recomendado: 13 meses y después se borra, con tu visto bueno al borrado programado.
3. **¿Quién ve el detalle por usuario?** Recomendado: cada usuario, lo suyo; el administrador, su empresa; el equipo Katuq, resumen por comercio y detalle por usuario solo con el guardia de equipo Katuq.
4. **¿Se puede cerrar una sesión a distancia?** Recomendado: no ahora. Se mide primero y se hace en la fase 3, con su propia propuesta.
5. **¿Se limita cuántas sesiones puede tener un usuario?** Recomendado: no. Primero se mide cuántos casos hay; el límite se decide en la fase 2 con datos.
6. **¿Se avisa a los usuarios?** Recomendado: sí, con la pantalla «Mis sesiones» y un texto en los términos, revisado antes de encender.
