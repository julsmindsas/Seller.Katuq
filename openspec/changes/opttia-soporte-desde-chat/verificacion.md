# D-545 — Candidato local implementado y verificado

Fecha: 2026-10-23. Daniel aprobó el diff concreto: «si aprobado, aplica el diff y sigue con el MCP y el chat». El servicio compartido se cambió **después** de verificar su base SHA-256 y esa aprobación. Su diff aprobado queda como artefacto histórico; no reaplicarlo. El bloque anterior se conserva en `verificacion-local.md`.

Este informe conserva la fotografía de implementación local. La autorización posterior de Git y despliegue de solo Opttia, el lote separado y sus resultados están en `publicacion.md`; no confundir el árbol combinado aquí probado con los tres archivos productivos publicados.

## Resultado y límites

Implementados backend Katuq, ADK/Opttia y Seller: describir → propuesta MCP → tarjeta → clic Crear ticket → mismo MCP → registro central → servicio habitual → número verificado. Borrador incompleto admite una aclaración acotada; no memoria general. Cancelar pendiente no escribe. Solo confirmar/reintentar la misma propuesta no vuelve a llamar al modelo o `/admit` ni consume otro mensaje.

La función nace apagada: `companies.featureFlags.opttiaSupportTickets === true` y acceso vigente de soporte, independiente de ventas. Dueño Daniel, revisión/retiro 2027-01-31; no se añade a empresas nuevas. No se escribieron flags, roles, datos comerciales ni se activó un comercio. No se creó un ticket real, se enviaron avisos reales o se invocó un modelo real en esta implementación.

No se hizo commit, push o despliegue de este cambio. Los gates 6.1–6.4 siguen pendientes: separar/autorizar publicación, desplegar apagado, activar piloto autorizado y probar un ticket real con autorización de sus avisos. El beneficio mensual, cuotas/modelos nativos, login de Opttia y otros canales permanecen fuera de alcance.

## Implementación

- **Backend:** `opttiaMcpGrant.readVerified`, `opttiaSupportProposal` (firma/normalización), `opttiaSupportMcp` (capacidad, esquema y protocolo), router existente, rama integrada de `create_support_ticket` y opción interna idempotente de `crearTicketSoporte`. Catálogo de flags ampliado, sin escrituras de configuración.
- **ADK:** `katuq_support_chat.py`, adaptador MCP autenticado y endpoint básico. Extraen/validan el alias SDK `meta`/wire `_meta`; el sobre queda solo en contexto efímero/evento de UI, nunca en FunctionResponse, prompt o mensajes del modelo. URLs únicamente aportadas por la persona, sin visitas, uploads o adjuntos de marca automáticos. Conserva cuatro herramientas/dos búsquedas documentales y la personalidad previa.
- **Seller:** contexto HTTP MCP opt-in, extensión compatible de `postSinLoader`, servicio dedicado de confirmación con timeout de transporte de 20 s, tipos/estado efímero separados y tarjeta standalone OnPush compatible con Angular 14. No HttpClient en componentes ni `/basic/v1/interrupt`. El encabezado D-540 sigue intacto; no vuelve el lanzador flotante.
- **UI:** datos exactos, identidad validada, evidencias y caducidad; estados draft/review/submitting/created/existing/uncertain/cancelled/expired/revoked. Número solo del resultado estructurado y enlace fijo `/misTickets`. El resultado creado/existente se resume para que su número no quede escondido debajo de todo el reporte. Consentimiento/sesión/empresa/token o SSE obsoleto no restauran una capacidad antigua. Se puede confirmar el último mensaje admitido aunque el cupo haya quedado en cero.

Autorización ligada a sesión/persona/empresa/herramienta/huella completa y orden de evidencias, máximo cinco minutos y no más que admisión original. Solo nombre exacto de herramienta; esquema cerrado sin comprobante/identidad/aprobación del modelo. Registro central también en las lecturas del router, con scopes mínimos por llamada. Rate-limit independiente de confirmación: seis/minuto totales por usuario/comercio, incluidos reintentos de una intención, sin sumar mensajes. Reutiliza el limitador existente **por proceso**, no un contador distribuido entre workers; la cuota diaria sí conserva su transacción original. No se almacena un bucket por nonce, para evitar crecimiento de memoria por propuesta.

Persistencia: clave opaca estable, lectura exacta y `create()` condicional usando **la misma función y contador**. Sin intención, recorrido habitual. Ante incertidumbre, misma clave o error incierto; no alta alternativa. Un ganador dispara la rama habitual de avisos; no se promete entrega exactamente una vez ante una caída después de guardar. Write-set: `support`, `contadores/tickets` y avisos/bitácoras existentes. Los dobles rechazan otras colecciones/rutas. No cambia pedidos, inventario, productos, precios, pagos o facturas.

## Pruebas ejecutadas

| Bloque | Resultado | Alcance real |
|---|---:|---|
| Node: soporte, firma, MCP/protocolo, acceso, seguridad y ráfagas | 57/57 | Firebase/RTDB/avisos falsos; SDK/handshake reales en memoria |
| Catálogo de flags | 39/39 | Lector de datos falso, cero escritura; preserva otras banderas |
| ADK soporte + marca + política + stock/MCP | 26/26 | SDK/Runner reales, modelos/DB falsos; stock usa servidor HTTP fixture en loopback |
| Seller soporte + markdown + chat existente | 16/16 | TypeScript real transpileado, HTTP/SSE e identidad falsos |
| E2E entre los tres repositorios | Aprobado | ADK/SDK MCP/Express/JWT reales → Seller servicio/interceptor reales → persistencia en memoria |
| Angular producción | Exit 0 | Build completo del árbol local; ver avisos/límite de publicación abajo |
| Sintaxis backend/Python | Aprobada | Siete JS productivos con `node --check`; `py_compile` de archivos ADK propios |

Casos: bandera apagada/tipo incorrecto, usuario solo soporte sin ventas, rol/flag revocados, tenant/sesión/autor alterados, comprobante en argumentos, otra herramienta, URL sustituida manteniendo cantidad, expiración, doble clic/concurrencia, respuesta perdida, contador atrasado y 30 intenciones distintas. Compatibilidad del MCP genérico y creación normal sin intención comprobadas con dobles. Estado incierto reenvía exactamente la misma intención; nunca presenta una cancelación como reversión de una escritura enviada. Revisión final: reserva efímera antes del primer await de soporte en ADK; dos FunctionCall paralelas de una misma respuesta no sustituyen la propuesta ni consumen dos consultas. Se limpia también ante error y no mezcla empresas.

E2E: dos llamadas del modelo **simulado**, una propuesta, cero altas antes del clic, un ticket/una rama de notificación **en memoria**, un mensaje admitido; reintento devuelve mismo id/número y retirar permiso bloquea la confirmación. Centinelas y captura de las solicitudes reales al modelo/errores verifican ausencia de JWT, admisión, comprobante y sobre privados. El stdout privado del proceso fixture transporta SSE hacia el verificador; no se imprime ni persiste su contenido en evidencias.

SDK MCP: JSON-only responde 406; JSON+SSE responde 200. Inicialización/versión negociada, `_meta`, id JSON-RPC y `isError` probados; preflight usa el CORS vigente sin cambiar orígenes. Bearer/empresa/interceptor se conservan. El E2E confirma que la admisión emitida para ADK valida al confirmar desde Seller, sin key manual.

## Reproducción

Backend (`katuq_admin_back_firebase/`):

```sh
node --test functions/tests/opttiaSupportMcp.test.js functions/tests/opttiaSupportProtocol.test.js functions/tests/opttiaSupportProposal.test.js functions/tests/support/opttiaIntent.contract.test.js functions/tests/opttia-access.test.js functions/tests/opttia-mcp-security.test.js functions/tests/opttia-burst-limit.test.js
node functions/tests/companies/companyFeatureFlags.test.js
```

Seller:

```sh
node --test tests/opttia-support.test.js tests/opttia-chat-ui.test.js tests/opttia-markdown.test.js
node openspec/changes/opttia-soporte-desde-chat/qa/run-e2e.js /tmp/opttia-support-runtime.YpuOGp/bin/python
npm run build:prod
```

ADK (`kai/adk_agent/`):

```sh
KATUQ_TEST_BACKEND_ROOT=/Users/danielga/Downloads/_Organizado/01_Katuq/Codigo/katuq_admin_back_firebase /tmp/opttia-support-runtime.YpuOGp/bin/python scripts/test_katuq_support_offline.py -q tests/test_katuq_support_chat.py tests/test_katuq_brand_agent.py tests/test_katuq_brand_budget.py tests/test_katuq_access_policy.py tests/test_katuq_access_integration.py::test_real_mcp_stock_quota_and_tenant
```

El runner aislado evita los `__init__` productivos que inicializan servicios ajenos. No certifica el arranque global del proceso productivo. Entorno temporal Python 3.13.7, google-adk 2.12.0, MCP 1.30.0; no se cambió requirements/lock/proveedor del proyecto. Las dependencias de tests se resolvieron conjuntamente para no mezclar versiones incompatibles de OpenTelemetry. Los intentos iniciales sin runtime fallaron al importar, y la comprobación temporal de dependencias detectó conflictos antes de resolverlos; no se cuentan como pruebas verdes. Se conserva aviso del alias `streamablehttp_client` obsoleto, sin migrarlo incidentalmente.

No se ejecutó `functions/tests/mcp/createSupportTicket.test.js` contra servicios reales, ni suites globales que pueden consultar Firestore/avisar/cobrar. Estas pruebas no certifican razonamiento de un modelo real, entrega de SMTP/Slack, todos los canales nativos o configuración productiva.

## QA visual

`qa/preview.ts` compila **los componentes reales** del chat, markdown y tarjeta, con SCSS real y estilos globales del build. Solo el proveedor del chat, contenedor, cuota/estados y navegación de ejemplo son falsos; no hay backend/modelo/identidad real en esa página. `build-preview.js` añade metadata DI exclusivamente al bundle JIT de QA, sin cambiar los componentes productivos.

Browser: ocho estados × 390 y 1440 px CSS, medidos por `innerWidth`, sin overflow horizontal en documento, mensajes o tarjeta. Texto legible, botones de confirmación/bloqueo correctos con 0/10 mensajes; cancelar por teclado, foco visible, completar reporte/cambiar a otra consulta y navegación real del fixture a `/misTickets` comprobados. Resumen de creado/existente visible con número. Override de viewport restaurado al finalizar; no se tocó una sesión productiva.

Conteos del SCSS tocado: gradientes **0 → 0**, primarios prohibidos **0 → 0**. Capturas en `/Users/danielga/.codex/visualizations/2026/09/03/01a06913-e34d-7df3-abba-b0b27c2aca1f/opttia-support-20261023/`, archivos `390-chat-*.jpg` y `1440-chat-*.jpg`. Capturas iniciales de tarjeta aislada se conservan, pero las del chat completo son la evidencia final. Solo datos ficticios; ninguna contraseña/token en capturas.

## Build, concurrencia y publicación pendiente

Build final local: `2026.10.23.8`; ambos environments y `assets/version.json` revisados tras el incremento automático. Compilación sin errores, con avisos CommonJS, selectores CSS globales y presupuesto inicial total de 7,26 MB sobre 2 MB; no se amplió el alcance para corregir dependencias/globales. `git diff --check` acotado limpio y OpenSpec estricto validado al cierre.

La rama siguió avanzando por otras sesiones (historial/pedidos, cotizaciones, sidebar, errores/fechas de Opttia y trabajo previo de marca). Se preservaron sus cambios; el router compartido conserva sus mensajes legibles y adaptador de resultados. El build refleja un árbol local concurrente/no limpio: **no es un artefacto autorizado para desplegar**. Antes de publicar: revisar/separar hunks propios en archivos compartidos —incluido ADK con el candidato anterior de marca—, autorización de commit/push, actualizar desde la punta sin pisar el árbol sucio y recompilar. No forzar el candado de publicación ni publicar candidatos ajenos implícitamente.

No se activó FLORECER ni otro comercio. Activación futura: script de flags existente con `--dry-run` primero y autorización específica; una prueba real necesita además permiso para abrir ticket y enviar los avisos normales. No borrar ni cerrar automáticamente ese ticket, no retroceder el contador. Reversión futura: apagar bandera y restaurar solo código acordado, preservando tickets/números.
